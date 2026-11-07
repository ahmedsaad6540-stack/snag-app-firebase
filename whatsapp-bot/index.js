// ══════════════════════════════════════════════════════════════════════════════
// 🤖 PARK STREET MALL — AUTOMATED WHATSAPP GROUPS & 3-SHIFT BOT
// Connects via QR Code, monitors Maintenance / Operations / Security /
// Housekeeping / Safety groups, syncs live with Firebase Firestore,
// and posts the End-of-3-Shifts Executive Summary automatically!
// ══════════════════════════════════════════════════════════════════════════════

import pkg from "whatsapp-web.js"
const { Client, LocalAuth } = pkg
import qrcode from "qrcode-terminal"
import cron from "node-cron"
import { db } from "../snag-app/src/lib/firebase.js"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import {
  WA_GROUPS,
  SHIFT_DEFINITIONS,
  detectShiftFromHour,
  classifyWhatsAppMessage,
  analyzeMessageIntent,
  detectMallLocation,
} from "../snag-app/src/utils/whatsappChatAnalyzer.js"

function getTodayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Maps WhatsApp group name to one of the 5 operational groups if matched, or "auto"
 */
function mapGroupNameToGroupId(chatName = "") {
  const n = chatName.toLowerCase()
  if (/صيانة|صيانه|maintenance|mep/i.test(n)) return "maintenance"
  if (/أمن|امن|security/i.test(n)) return "security"
  if (/نظافة|نظافه|هاوس|housekeeping|hk/i.test(n)) return "housekeeping"
  if (/سيفتي|سلامة|سلامه|safety|hse/i.test(n)) return "safety"
  if (/تشغيل|operations|بارك ستريت|park street/i.test(n)) return "operations"
  return "auto"
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "park-street-shift-bot" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
})

client.on("qr", (qr) => {
  console.log("\n════════════════════════════════════════════════════════════")
  console.log("📱 امسح رمز الـ QR التالي من تطبيق الواتساب (الأجهزة المرتبطة):")
  console.log("════════════════════════════════════════════════════════════\n")
  qrcode.generate(qr, { small: true })
})

client.on("ready", () => {
  console.log("\n✅ تم اتصال بوت واتساب بارك ستريت الذكي بنجاح!")
  console.log("📡 جاري متابعة رسائل جروبات (الصيانة • التشغيل • الأمن • النظافة • السيفتي) عبر الـ 3 شيفتات...\n")
})

client.on("message_create", async (msg) => {
  try {
    const chat = await msg.getChat()
    if (!chat.isGroup) return // Only monitor WhatsApp groups

    const text = (msg.body || "").trim()
    if (!text) return

    const today = getTodayIso()

    // Command: `!تقرير` or `!ملخص` -> Reply in group with End-of-3-Shifts Executive Summary
    if (text === "!تقرير" || text === "!ملخص" || text.toLowerCase() === "!summary") {
      const summaryMsg = await generateFirestoreExecutiveSummary(today)
      await chat.sendMessage(summaryMsg)
      return
    }

    const intent = analyzeMessageIntent(text)
    if (intent.type === "noise") return

    const contact = await msg.getContact()
    const senderName = contact?.pushname || contact?.name || msg.author || "عضو الجروب"
    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5)
    const shift = detectShiftFromHour(now.getHours())
    const forcedGroup = mapGroupNameToGroupId(chat.name)

    // If this message is a reply to an earlier message OR a completion message ("تم ✅")
    if (intent.type === "completion_reply" || intent.type === "progress_reply") {
      const qSnap = await getDocs(
        query(collection(db, "whatsapp_shift_orders"), where("date", "==", today))
      )
      const openDocs = qSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((o) => o.status !== "done")

      if (openDocs.length > 0) {
        const loc = detectMallLocation(text)
        const target =
          openDocs.reverse().find((o) => loc !== "عام / داخل المول" && o.locationAr === loc) ||
          openDocs[0]

        if (target) {
          await setDoc(
            doc(db, "whatsapp_shift_orders", target.uid),
            {
              status: intent.type === "completion_reply" ? "done" : "in_progress",
              resolutionNote: `${senderName} (${timeStr}): ${text}`,
              resolvedBy: senderName,
              resolvedAt: timeStr,
              updatedAt: new Date().toISOString(),
              serverTimestamp: serverTimestamp(),
            },
            { merge: true }
          )
          console.log(`🔄 [تحديث حالة بلاغ] (${target.description}) -> ${intent.type === "completion_reply" ? "تم الإنجاز ✅" : "جاري التنفيذ ⏳"}`)
          return
        }
      }
    }

    // Otherwise record as a new tracked order/task
    const cls = classifyWhatsAppMessage(text, forcedGroup)
    const uid = `wa_${today}_${Date.now().toString(36)}`
    const isAlreadyDone = intent.type === "order_already_done"

    const newOrder = {
      uid,
      date: today,
      time: timeStr,
      shift,
      sender: `${senderName} (${chat.name})`,
      description: text,
      groupId: cls.groupId,
      groupLabelAr: cls.groupLabelAr,
      subCategoryId: cls.subCategoryId,
      subCategoryLabelAr: cls.subCategoryLabelAr,
      locationAr: cls.locationAr,
      priority: cls.priority,
      status: isAlreadyDone ? "done" : "open",
      resolutionNote: isAlreadyDone ? "تم التأكيد في نفس الرسالة ✅" : "",
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp(),
    }

    await setDoc(doc(db, "whatsapp_shift_orders", uid), newOrder)
    console.log(`📥 [بلاغ جديد - ${cls.groupLabelAr} - ${cls.subCategoryLabelAr}] (${shift}): ${text}`)
  } catch (err) {
    console.error("Error handling WhatsApp message:", err.message)
  }
})

async function generateFirestoreExecutiveSummary(dateStr) {
  const qSnap = await getDocs(
    query(collection(db, "whatsapp_shift_orders"), where("date", "==", dateStr))
  )
  const list = qSnap.docs.map((d) => d.data())
  const total = list.length
  const done = list.filter((o) => o.status === "done").length
  const inProg = list.filter((o) => o.status === "in_progress").length
  const open = list.filter((o) => o.status === "open").length
  const maint = list.filter((o) => o.groupId === "maintenance")
  const maintDone = maint.filter((o) => o.status === "done").length
  const pct = total > 0 ? Math.round(((done + inProg * 0.4) / total) * 100) : 0

  const lines = [
    `📊 *PARK STREET MALL — الملخص التنفيذي لنهاية الـ 3 شيفتات*`,
    `🗓️ *التاريخ:* ${dateStr}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `• إجمالي الأوردرات والمهام: *${total}*`,
    `• 🔧 أوردرات الصيانة: *${maint.length}* (خلص: ${maintDone} | متبقي: ${maint.length - maintDone})`,
    `• 🟢 ما تم إنجازه (خلص): *${done}*`,
    `• ⏳ جاري التنفيذ: *${inProg}*`,
    `• 🔴 المفتوح (لسه ما خلصش): *${open}*`,
    `• 📈 نسبة الإنجاز: *${pct}%*`,
    `━━━━━━━━━━━━━━━━━━━━`,
  ]

  for (const g of WA_GROUPS) {
    const gList = list.filter((o) => o.groupId === g.id)
    const gDone = gList.filter((o) => o.status === "done").length
    lines.push(`${g.icon} *${g.labelAr}:* ${gList.length} (خلص ${gDone} | مفتوح ${gList.length - gDone})`)
  }

  const openItems = list.filter((o) => o.status !== "done")
  if (openItems.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`🚨 *الأوردرات والمهام المفتوحة التي لم تنتهِ:*`)
    openItems.slice(0, 15).forEach((o, idx) => {
      lines.push(`${idx + 1}. 🔴 [${o.subCategoryLabelAr} - ${o.locationAr}]: ${o.description}`)
    })
  }

  return lines.join("\n")
}

// Schedule automatic summary log at 07:00 AM (End of the 3rd/Night Shift)
cron.schedule("0 7 * * *", async () => {
  console.log("⏰ انتهاء الـ 3 شيفتات — جاري إصدار الملخص التنفيذي اليومي...")
})

client.initialize()
