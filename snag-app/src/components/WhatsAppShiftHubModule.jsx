import React, { useState, useEffect, useMemo, useRef } from "react"
import { db } from "../lib/firebase.js"
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import ExcelJS from "exceljs"
import toast from "react-hot-toast"
import { useLanguage } from "../i18n/LanguageContext.jsx"
import { canUser } from "../constants/permissions.js"
import {
  WA_GROUPS,
  SHIFT_DEFINITIONS,
  ORDER_STATUSES,
  detectShiftFromHour,
  classifyWhatsAppMessage,
  parseWhatsAppChatDump,
} from "../utils/whatsappChatAnalyzer.js"

function getTodayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function WhatsAppShiftHubModule({
  currentUser,
  notify,
  onAddSnag,
  snags = [],
  onCycleSnagStatus,
  onUpdateSnag,
}) {
  const { lang, tr } = useLanguage()
  const userName = currentUser?.displayName || currentUser?.email || "مشرف التشغيل"
  const canModify =
    !currentUser ||
    canUser(currentUser, "whatsapp-hub", "edit") ||
    canUser(currentUser, "snags", "add")
  const canExport =
    !currentUser ||
    canUser(currentUser, "whatsapp-hub", "export") ||
    canUser(currentUser, "snags", "export")

  // State
  const [selectedDate, setSelectedDate] = useState(getTodayIso)
  const [dateScope, setDateScope] = useState("all_dates") // "all_dates" | "selected_date"
  const [includeAppSnags, setIncludeAppSnags] = useState(true)
  const [activeGroup, setActiveGroup] = useState("all")
  const [activeShift, setActiveShift] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [subCategoryFilter, setSubCategoryFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeKpiDrawer, setActiveKpiDrawer] = useState(null) // null | "maintenance" | "sla"

  const ordersSectionRef = useRef(null)
  const openAlertSectionRef = useRef(null)

  // Chat Parser State
  const [rawChatText, setRawChatText] = useState("")
  const [importTargetGroup, setImportTargetGroup] = useState("auto")
  const [showAnalyzerBox, setShowAnalyzerBox] = useState(true)
  const [showBotModal, setShowBotModal] = useState(false)

  // Quick Single Order State
  const [quickText, setQuickText] = useState("")
  const [quickGroup, setQuickGroup] = useState("auto")
  const [quickShift, setQuickShift] = useState("morning")
  const [quickSender, setQuickSender] = useState("")

  // Firestore Orders Map
  const [ordersMap, setOrdersMap] = useState({})
  const [exporting, setExporting] = useState(false)
  const txtFileInputRef = useRef(null)

  // Listen to `whatsapp_shift_orders` in Firestore & auto-purge any leftover demo/fake sample records
  useEffect(() => {
    const FAKE_DEMO_SENDERS = new Set([
      "م. محمود (مشرف صباحي)",
      "مشرف الهاوس كيبنج",
      "كابتن أمن البوابة",
      "فني الكهرباء حسن",
      "مشرف السيفتي",
      "فني السباكة سعيد",
      "مشرف التشغيل",
      "شركة اللاندسكيب",
      "م. كريم (مشرف مسائي)",
      "فني التكييف",
      "مشرف الهاوس كيبنج المسائي",
      "مشرف منطقة التحميل",
      "مشرف الأمن المسائي",
      "مشرف الشيفت الليلي",
      "فني الصيانة الليلي",
      "مشرف السيفتي الليلي",
    ])
    const unsub = onSnapshot(
      collection(db, "whatsapp_shift_orders"),
      (snap) => {
        const map = {}
        snap.docs.forEach((d) => {
          const data = d.data()
          if (
            FAKE_DEMO_SENDERS.has(data.sender) ||
            /عطل في 4 اسبوتات إنارة بممر الدور الثاني|كاميرا رقم 14 في بيزمنت 1 مسار السيارات|طفاية الحريق بجوار سلم الطوارئ مبنى 2|حساس باب المصعد رقم 2 بمبنى 3/.test(
              data.description || ""
            )
          ) {
            // Auto-delete fake sample records from Firestore
            deleteDoc(doc(db, "whatsapp_shift_orders", d.id)).catch(() => {})
            return
          }
          map[d.id] = { uid: d.id, ...data }
        })
        setOrdersMap(map)
      },
      (err) => {
        console.warn("whatsapp_shift_orders listener warning:", err.message)
      }
    )
    return () => unsub()
  }, [])

  // Convert real App Snags into unified Shift Order objects when `includeAppSnags` is active
  const normalizedAppSnags = useMemo(() => {
    if (!includeAppSnags || !Array.isArray(snags)) return []
    return snags.map((sn) => {
      const text = `${sn.description || ""} ${sn.location || ""} ${sn.trade || ""}`
      let forcedGrp = "auto"
      if (sn.trade === "mep" || sn.trade === "civil" || sn.type === "maintenance") forcedGrp = "maintenance"
      else if (sn.trade === "security_cctv") forcedGrp = "security"
      else if (sn.trade === "cleanliness") forcedGrp = "housekeeping"
      else if (sn.trade === "fire_safety") forcedGrp = "safety"

      const cls = classifyWhatsAppMessage(text, forcedGrp)
      const createdDate = sn.createdAt ? String(sn.createdAt).slice(0, 10) : selectedDate
      let timeStr = "10:00"
      let hr = 10
      if (sn.createdAt) {
        const dt = new Date(sn.createdAt)
        if (!Number.isNaN(dt.getTime())) {
          hr = dt.getHours()
          timeStr = `${String(hr).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
        }
      }
      const mappedStatus =
        sn.status === "resolved" || sn.status === "closed" || sn.status === "done"
          ? "done"
          : sn.status === "in_progress"
          ? "in_progress"
          : "open"

      return {
        uid: `snag_${sn.id}`,
        isFromMainSnags: true,
        rawSnag: sn,
        date: createdDate,
        time: timeStr,
        shift: detectShiftFromHour(hr),
        sender: sn.inspector || "سجل الملاحظات العام",
        description: sn.description || "ملاحظة مسجلة",
        groupId: cls.groupId,
        groupLabelAr: cls.groupLabelAr,
        subCategoryId: cls.subCategoryId,
        subCategoryLabelAr: cls.subCategoryLabelAr,
        locationAr: sn.location || cls.locationAr,
        priority: sn.priority === "urgent" || sn.priority === "high" ? "urgent" : cls.priority,
        status: mappedStatus,
        resolutionNote: sn.resolutionNote || (mappedStatus === "done" ? "تم الإنجاز في السجل العام ✅" : ""),
      }
    })
  }, [includeAppSnags, snags, selectedDate])

  // Combine WhatsApp orders + Live App Snags and filter by dateScope
  const dateOrders = useMemo(() => {
    const waList = Object.values(ordersMap)
    const combined = [...waList, ...normalizedAppSnags]
    return combined
      .filter((o) => (dateScope === "all_dates" ? true : o.date === selectedDate))
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
  }, [ordersMap, normalizedAppSnags, dateScope, selectedDate])

  // Filtered orders according to Group, Shift, Status, SubCategory, Search
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return dateOrders.filter((o) => {
      if (activeGroup !== "all" && o.groupId !== activeGroup) return false
      if (activeShift !== "all" && o.shift !== activeShift) return false
      if (statusFilter !== "all" && o.status !== statusFilter) return false
      if (subCategoryFilter !== "all" && o.subCategoryId !== subCategoryFilter) return false
      if (q) {
        const hay = `${o.description} ${o.groupLabelAr} ${o.subCategoryLabelAr} ${o.locationAr} ${o.sender} ${o.resolutionNote}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [dateOrders, activeGroup, activeShift, statusFilter, subCategoryFilter, searchQuery])

  // Comprehensive End-of-3-Shifts Analytics & Executive Summary Data
  const analytics = useMemo(() => {
    let total = 0,
      done = 0,
      open = 0,
      inProgress = 0,
      urgentOpen = 0,
      maintenanceTotal = 0,
      maintenanceOpen = 0,
      maintenanceDone = 0,
      opsTasksTotal = 0,
      opsTasksOpen = 0

    const byGroup = {}
    for (const g of WA_GROUPS) {
      byGroup[g.id] = {
        ...g,
        total: 0,
        done: 0,
        open: 0,
        inProgress: 0,
        subMap: {},
      }
      for (const sc of g.subCategories) {
        byGroup[g.id].subMap[sc.id] = { ...sc, total: 0, done: 0, open: 0, inProgress: 0 }
      }
    }

    const byShift = {
      morning: { total: 0, done: 0, open: 0, inProgress: 0 },
      evening: { total: 0, done: 0, open: 0, inProgress: 0 },
      night:   { total: 0, done: 0, open: 0, inProgress: 0 },
    }

    for (const o of dateOrders) {
      total++
      if (o.status === "done") done++
      else if (o.status === "in_progress") inProgress++
      else {
        open++
        if (o.priority === "urgent") urgentOpen++
      }

      if (o.groupId === "maintenance") {
        maintenanceTotal++
        if (o.status === "done") maintenanceDone++
        else maintenanceOpen++
      } else {
        opsTasksTotal++
        if (o.status !== "done") opsTasksOpen++
      }

      const grp = byGroup[o.groupId]
      if (grp) {
        grp.total++
        if (o.status === "done") grp.done++
        else if (o.status === "in_progress") grp.inProgress++
        else grp.open++

        const sub = grp.subMap[o.subCategoryId]
        if (sub) {
          sub.total++
          if (o.status === "done") sub.done++
          else if (o.status === "in_progress") sub.inProgress++
          else sub.open++
        }
      }

      const sh = byShift[o.shift] || byShift.morning
      sh.total++
      if (o.status === "done") sh.done++
      else if (o.status === "in_progress") sh.inProgress++
      else sh.open++
    }

    const completionPct = total > 0 ? Math.round(((done + inProgress * 0.4) / total) * 100) : 0
    const openOrdersList = dateOrders.filter((o) => o.status !== "done")

    return {
      total,
      done,
      open,
      inProgress,
      urgentOpen,
      maintenanceTotal,
      maintenanceOpen,
      maintenanceDone,
      opsTasksTotal,
      opsTasksOpen,
      completionPct,
      byGroup,
      byShift,
      openOrdersList,
    }
  }, [dateOrders])

  // Save or update an order in Firestore (supports both WhatsApp orders & synced Main Snags!)
  async function saveOrder(orderObj) {
    if (!canModify) {
      toast.error(tr("ليس لديك صلاحية التعديل", "No edit permission"))
      return
    }
    if (orderObj.isFromMainSnags && orderObj.rawSnag && onUpdateSnag) {
      const targetSnagStatus =
        orderObj.status === "done"
          ? "resolved"
          : orderObj.status === "in_progress"
          ? "in_progress"
          : "open"
      await onUpdateSnag(orderObj.rawSnag.id, {
        status: targetSnagStatus,
        resolutionNote: orderObj.resolutionNote || "",
      })
      toast.success(tr("🔄 تم تحديث حالة البلاغ وتحديث المؤشرات فوراً!", "🔄 Status & KPIs updated!"))
      return
    }
    const uid = orderObj.uid || `wa_${selectedDate}_${Math.random().toString(36).slice(2, 9)}`
    const payload = {
      ...orderObj,
      uid,
      date: orderObj.date || selectedDate,
      updatedAt: new Date().toISOString(),
    }
    setOrdersMap((prev) => ({ ...prev, [uid]: payload }))
    try {
      await setDoc(
        doc(db, "whatsapp_shift_orders", uid),
        { ...payload, serverTimestamp: serverTimestamp() },
        { merge: true }
      )
    } catch (e) {
      console.error("Failed saving WhatsApp shift order:", e)
      toast.error(tr("تعذر الحفظ في السحابة", "Cloud save failed"))
    }
  }

  async function handleDeleteOrder(uid) {
    if (!canModify) return
    setOrdersMap((prev) => {
      const next = { ...prev }
      delete next[uid]
      return next
    })
    try {
      await deleteDoc(doc(db, "whatsapp_shift_orders", uid))
      toast.success(tr("تم حذف البلاغ", "Order deleted"))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleClearDayOrders() {
    if (!canModify || dateOrders.length === 0) return
    if (!window.confirm(tr(`هل تريد مسح جميع بلاغات وأوردرات يوم ${selectedDate} (${dateOrders.length} بلاغ)؟`, `Clear all ${dateOrders.length} orders for ${selectedDate}?`))) {
      return
    }
    const toastId = toast.loading(tr("جاري مسح بلاغات اليوم...", "Clearing day orders..."))
    try {
      for (const o of dateOrders) {
        await deleteDoc(doc(db, "whatsapp_shift_orders", o.uid))
      }
      toast.success(tr("تم مسح بلاغات اليوم بنجاح", "Cleared day orders"), { id: toastId })
    } catch (e) {
      toast.error(tr("حدث خطأ أثناء المسح", "Error clearing orders"), { id: toastId })
    }
  }

  // Analyze pasted WhatsApp chat dump and save extracted orders
  async function handleAnalyzeChatText(textToAnalyze = rawChatText) {
    const clean = (textToAnalyze || "").trim()
    if (!clean) {
      toast.error(tr("الرجاء لصق رسائل جروب الواتساب أو رفع ملف المحادثة (.txt) أولاً", "Please paste WhatsApp group messages or upload a .txt file first"))
      return
    }
    const extracted = parseWhatsAppChatDump(clean, selectedDate, importTargetGroup)
    if (extracted.length === 0) {
      toast.error(tr("لم يتم العثور على أوردرات أو مهام صالحة في النص", "No actionable orders found in text"))
      return
    }

    const toastId = toast.loading(tr(`🧠 جاري تحليل وحفظ ${extracted.length} أوردر ومهمة من المحادثة...`, `Analyzing & saving ${extracted.length} orders...`))
    try {
      for (const ord of extracted) {
        await saveOrder(ord)
      }
      setRawChatText("")
      toast.success(
        tr(
          `✅ تم تحليل المحادثة واستخراج ${extracted.length} أوردر ومهمة وتصنيف المفتوح والمنتهي بنجاح!`,
          `✅ Extracted & classified ${extracted.length} orders across the 3 shifts!`
        ),
        { id: toastId }
      )
    } catch (e) {
      toast.error(tr("حدث خطأ أثناء حفظ التحليل", "Error saving analysis"), { id: toastId })
    }
  }

  async function handleAddQuickOrder(e) {
    e.preventDefault()
    if (!quickText.trim()) return
    const cls = classifyWhatsAppMessage(quickText, quickGroup)
    const nowTime = new Date().toTimeString().slice(0, 5)
    await saveOrder({
      uid: `wa_${selectedDate}_${Math.random().toString(36).slice(2, 9)}`,
      date: selectedDate,
      time: nowTime,
      shift: quickShift,
      sender: quickSender.trim() || userName,
      description: quickText.trim(),
      groupId: cls.groupId,
      groupLabelAr: cls.groupLabelAr,
      subCategoryId: cls.subCategoryId,
      subCategoryLabelAr: cls.subCategoryLabelAr,
      locationAr: cls.locationAr,
      priority: cls.priority,
      status: "open",
      resolutionNote: "",
    })
    setQuickText("")
    toast.success(tr("➕ تم تسجيل الأوردر وتصنيفه تلقائياً!", "➕ Order added & auto-classified!"))
  }

  async function handlePromoteOpenOrderToSnag(orderObj) {
    if (!onAddSnag) return
    const grp = WA_GROUPS.find((g) => g.id === orderObj.groupId) || WA_GROUPS[0]
    await onAddSnag(
      {
        inspector: orderObj.sender || userName,
        location: "plaza",
        description: `[بلاغ واتساب - ${orderObj.groupLabelAr} - ${orderObj.subCategoryLabelAr}] (${orderObj.locationAr}): ${orderObj.description}`,
        trade: grp.snagTrade || "general",
        priority: orderObj.priority === "urgent" ? "urgent" : "medium",
        type: "maintenance",
        status: "open",
        userEmail: currentUser?.email || "",
      },
      []
    )
    toast.success(tr("🚨 تم ترحيل الأوردر المفتوح إلى سجل السناج العام!", "🚨 Promoted open order to Main Snags Log!"))
  }

  async function handlePromoteAllOpenToSnags() {
    if (!onAddSnag || analytics.openOrdersList.length === 0) return
    if (
      !window.confirm(
        tr(
          `هل تريد ترحيل جميع الأوردرات والمهام المفتوحة التي لم تنتهِ (${analytics.openOrdersList.length} بلاغ) إلى سجل السناج العام لمتابعتها؟`,
          `Promote all ${analytics.openOrdersList.length} open orders to the Main Snags Log?`
        )
      )
    ) {
      return
    }
    const toastId = toast.loading(tr("جاري ترحيل الأوردرات المفتوحة...", "Promoting open orders..."))
    for (const o of analytics.openOrdersList) {
      await handlePromoteOpenOrderToSnag(o)
    }
    toast.success(tr("✅ تم ترحيل كافة الأوردرات المفتوحة لسجل السناج العام!", "✅ All open orders promoted to Snags Log!"), { id: toastId })
  }

  // Generate Executive Summary Text for WhatsApp Sharing
  function buildWhatsAppExecutiveSummaryText() {
    const lines = [
      `📊 *PARK STREET MALL — الملخص التنفيذي لنهاية الـ 3 شيفتات*`,
      `🗓️ *التاريخ:* ${selectedDate}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📌 *أولاً: إحصائية الأوردرات والمهام الإجمالية:*`,
      `• إجمالي البلاغات والأوردرات: *${analytics.total}*`,
      `• 🟢 ما تم إنجازه (خلص): *${analytics.done}*`,
      `• ⏳ جاري التنفيذ حالياً: *${analytics.inProgress}*`,
      `• 🔴 المفتوح (لسه ما خلصش): *${analytics.open}*`,
      `• 📈 نسبة الإنجاز الإجمالية: *${analytics.completionPct}%*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🔧 *ثانياً: تحليل أوردرات الصيانة والفئات:*`,
      `• إجمالي أوردرات الصيانة: *${analytics.maintenanceTotal}* (خلص: ${analytics.maintenanceDone} | متبقي مفتوح: ${analytics.maintenanceOpen})`,
    ]

    const maintSubMap = analytics.byGroup.maintenance?.subMap || {}
    for (const sub of Object.values(maintSubMap)) {
      if (sub.total > 0) {
        lines.push(`  ▫️ ${sub.labelAr}: ${sub.total} (خلص ${sub.done} | مفتوح ${sub.open + sub.inProgress})`)
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`🗂️ *ثالثاً: توزيع الجروبات التشغيلية الـ 5:*`)
    for (const g of WA_GROUPS) {
      const st = analytics.byGroup[g.id]
      if (st) {
        lines.push(`${g.icon} *${g.labelAr}:* إجمالي (${st.total}) — خلص: ${st.done} | مفتوح/جاري: ${st.open + st.inProgress}`)
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━`)
    lines.push(`⏰ *رابعاً: الأداء خلال الـ 3 شيفتات:*`)
    for (const sh of SHIFT_DEFINITIONS) {
      const sData = analytics.byShift[sh.id]
      lines.push(`${sh.icon} *${sh.labelAr}:* ${sData.total} بلاغ (خلص ${sData.done} | متبقي ${sData.open + sData.inProgress})`)
    }

    if (analytics.openOrdersList.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━━━━━━`)
      lines.push(`🚨 *خامساً: الأوردرات والمهام المفتوحة التي لم تنتهِ (مرحّلة للمتابعة):*`)
      analytics.openOrdersList.forEach((o, i) => {
        const statusIcon = o.status === "in_progress" ? "⏳" : "🔴"
        lines.push(`${i + 1}. ${statusIcon} [${o.groupLabelAr} - ${o.subCategoryLabelAr}] (${o.locationAr}): ${o.description}`)
      })
    } else {
      lines.push(`━━━━━━━━━━━━━━━━━━━━`)
      lines.push(`✅ *جميع الأوردرات والمهام المسجلة اليوم تم إنجازها بالكامل!*`)
    }

    return lines.join("\n")
  }

  function handleShareToWhatsApp() {
    const text = buildWhatsAppExecutiveSummaryText()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
  }

  function handleCopySummaryText() {
    const text = buildWhatsAppExecutiveSummaryText()
    navigator.clipboard.writeText(text)
    toast.success(tr("📋 تم نسخ الملخص التنفيذي! يمكنك لصقه في جروب الواتساب مباشرة", "📋 Executive summary copied to clipboard!"))
  }

  // Excel Export
  async function handleExportExcel() {
    if (exporting) return
    setExporting(true)
    const toastId = toast.loading(tr("⏳ جاري تجهيز شيت تحليل الواتساب والـ 3 شيفتات...", "⏳ Generating Excel report..."))
    try {
      const wb = new ExcelJS.Workbook()
      wb.creator = "Park Street Mall - WhatsApp Shift Analyzer"

      // Sheet 1: Executive Summary
      const wsSum = wb.addWorksheet("الملخص التنفيذي للـ 3 شيفتات", { views: [{ rightToLeft: true }] })
      wsSum.columns = [
        { width: 34 },
        { width: 22 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
      ]

      const r1 = wsSum.addRow([`PARK STREET MALL — الملخص التنفيذي لتحليل جروبات الواتساب والـ 3 شيفتات (${selectedDate})`])
      wsSum.mergeCells("A1:G1")
      r1.height = 34
      r1.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        c.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      wsSum.addRow([])
      const grpHdr = wsSum.addRow([
        "الجروب التشغيلي",
        "الفئة الفرعية",
        "إجمالي البلاغات",
        "🟢 خلص (تم الإنجاز)",
        "⏳ جاري التنفيذ",
        "🔴 مفتوح (لسه ما خلصش)",
        "نسبة الإنجاز %",
      ])
      grpHdr.height = 26
      grpHdr.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      for (const g of WA_GROUPS) {
        const gData = analytics.byGroup[g.id]
        const gPct = gData.total > 0 ? Math.round((gData.done / gData.total) * 100) : 0
        const gr = wsSum.addRow([g.labelAr, "إجمالي الجروب", gData.total, gData.done, gData.inProgress, gData.open, `${gPct}%`])
        gr.height = 24
        gr.eachCell((c) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
          c.font = { name: "Arial", size: 11, bold: true }
          c.alignment = { horizontal: "center", vertical: "middle" }
        })
        for (const sub of Object.values(gData.subMap)) {
          if (sub.total > 0) {
            const sPct = Math.round((sub.done / sub.total) * 100)
            const sr = wsSum.addRow(["↳", sub.labelAr, sub.total, sub.done, sub.inProgress, sub.open, `${sPct}%`])
            sr.eachCell((c) => {
              c.alignment = { horizontal: "center", vertical: "middle" }
              c.font = { name: "Arial", size: 10 }
            })
          }
        }
      }

      // Sheet 2: Detailed Orders Log
      const wsDet = wb.addWorksheet("سجل الأوردرات والمهام التفصيلي", {
        views: [{ rightToLeft: true, state: "frozen", ySplit: 2 }],
      })
      wsDet.columns = [
        { width: 6 },
        { width: 12 },
        { width: 22 },
        { width: 26 },
        { width: 24 },
        { width: 22 },
        { width: 46 },
        { width: 22 },
        { width: 34 },
        { width: 20 },
      ]

      const dTitle = wsDet.addRow([`تفاصيل أوردرات الصيانة والمهام التشغيلية عبر الـ 3 شيفتات (${selectedDate})`])
      wsDet.mergeCells("A1:J1")
      dTitle.height = 30
      dTitle.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        c.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      const dHdr = wsDet.addRow([
        "م",
        "التوقيت",
        "الشيفت",
        "الجروب",
        "الفئة الفرعية",
        "الموقع / المبنى",
        "تفاصيل الأوردر / المهمة التشغيلية",
        "الحالة (خلص / مفتوح)",
        "ما تم تنفيذه / رد الإغلاق",
        "المرسل",
      ])
      dHdr.height = 26
      dHdr.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })
      wsDet.autoFilter = { from: "A2", to: "J2" }

      filteredOrders.forEach((o, i) => {
        const shObj = SHIFT_DEFINITIONS.find((s) => s.id === o.shift) || SHIFT_DEFINITIONS[0]
        const stObj = ORDER_STATUSES.find((s) => s.id === o.status) || ORDER_STATUSES[0]
        const r = wsDet.addRow([
          i + 1,
          o.time,
          shObj.labelAr,
          o.groupLabelAr,
          o.subCategoryLabelAr,
          o.locationAr,
          o.description,
          stObj.labelAr,
          o.resolutionNote || "-",
          o.sender,
        ])
        r.height = 24
        const bg =
          o.status === "done"
            ? "FFDCFCE7"
            : o.status === "in_progress"
            ? "FFFEF3C7"
            : "FFFEE2E2"
        r.eachCell((c, colNo) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }
          c.font = { name: "Arial", size: 10, bold: colNo === 8 || colNo === 7 }
          c.alignment = { horizontal: [1, 2, 8].includes(colNo) ? "center" : "right", vertical: "middle", wrapText: true }
        })
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `تحليل_واتساب_3_شيفتات_${selectedDate}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(tr("📊 تم تصدير شيت الإكسيل بنجاح!", "📊 Excel exported!"), { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error(tr("حدث خطأ أثناء تصدير الإكسيل", "Excel export failed"), { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  function handlePrintReport() {
    const rowsHtml = filteredOrders
      .map((o, i) => {
        const shObj = SHIFT_DEFINITIONS.find((s) => s.id === o.shift) || SHIFT_DEFINITIONS[0]
        const stObj = ORDER_STATUSES.find((s) => s.id === o.status) || ORDER_STATUSES[0]
        const bg = o.status === "done" ? "#ecfdf5" : o.status === "in_progress" ? "#fffbeb" : "#fef2f2"
        return `<tr style="background:${bg}">
          <td style="text-align:center">${i + 1}</td>
          <td style="text-align:center">${o.time}<br/><small>${shObj.shortAr}</small></td>
          <td><strong>${o.groupLabelAr}</strong><br/><small>${o.subCategoryLabelAr}</small></td>
          <td>${o.locationAr}</td>
          <td><strong>${o.description}</strong></td>
          <td style="text-align:center;font-weight:bold;color:${stObj.color}">${stObj.labelAr}</td>
          <td>${o.resolutionNote || "-"}</td>
          <td style="text-align:center">${o.sender}</td>
        </tr>`
      })
      .join("")

    const html = `<!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8"/>
      <title>الملخص التنفيذي لتحليل جروبات الواتساب والـ 3 شيفتات — ${selectedDate}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 20px; color: #0f172a; direction: rtl; }
        .hdr { background: #0f172a; color: #fff; padding: 18px 22px; border-radius: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center; background: #f8fafc; }
        .kpi .v { font-size: 20px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
        th { background: #1e293b; color: #fff; padding: 8px; border: 1px solid #334155; }
        td { padding: 8px; border: 1px solid #cbd5e1; }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div>
          <h2 style="margin:0 0 6px">PARK STREET MALL — الملخص التنفيذي لتحليل جروبات الواتساب والـ 3 شيفتات</h2>
          <div style="color:#38bdf8;font-size:13px">التاريخ: ${selectedDate} | الصيانة • التشغيل • الأمن • النظافة • السيفتي</div>
        </div>
        <div style="text-align:left;font-size:12px">
          <div>نسبة الإنجاز: ${analytics.completionPct}%</div>
          <div>المشرف: ${userName}</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="v" style="color:#0284c7">${analytics.total}</div><div>إجمالي البلاغات</div></div>
        <div class="kpi"><div class="v" style="color:#d97706">${analytics.maintenanceTotal}</div><div>أوردرات الصيانة</div></div>
        <div class="kpi"><div class="v" style="color:#059669">${analytics.done}</div><div>🟢 خلص (تم الإنجاز)</div></div>
        <div class="kpi"><div class="v" style="color:#dc2626">${analytics.open}</div><div>🔴 مفتوح (لسه ما خلصش)</div></div>
        <div class="kpi"><div class="v" style="color:#7c3aed">${analytics.inProgress}</div><div>⏳ جاري التنفيذ</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>الوقت / الشيفت</th>
            <th>الجروب / الفئة</th>
            <th>الموقع</th>
            <th>الأوردر / المهمة التشغيلية</th>
            <th>الحالة</th>
            <th>ملاحظات الإغلاق / المتابعة</th>
            <th>المرسل</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
    </html>`

    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  const activeGroupObj = WA_GROUPS.find((g) => g.id === activeGroup)

  return (
    <div style={s.wrap}>
      {/* ── Hero Banner ── */}
      <div style={s.hero}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={s.heroBadge}>
              WHATSAPP GROUPS AI ANALYZER & 3-SHIFTS EXECUTIVE SUMMARY
            </div>
            <h2 style={s.heroTitle}>
              💬 {tr(
                "مركز تحليل جروبات الواتساب ومتابعة أوردرات الـ 3 شيفتات (الصيانة • التشغيل • الأمن • النظافة • السيفتي)",
                "WhatsApp Groups & 3-Shifts Operations Intelligence Hub"
              )}
            </h2>
            <p style={s.heroSub}>
              {tr(
                "يتابع رسائل جروبات الواتساب على مدار الـ 3 ورديات، ويحلل تلقائياً عدد أوردرات الصيانة والفئات، وإيه اللي خلص، وإيه المفتوح اللي لسه ما خلصش، ويصدر الملخص التنفيذي بضغطة زر",
                "Tracks WhatsApp groups across all 3 shifts, automatically classifies Maintenance orders & categories, identifies Completed vs. Open tasks, and generates the Executive Summary"
              )}
            </p>
          </div>

          {/* Top Action & Export Buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              style={{ ...s.btn, background: "linear-gradient(135deg, #16a34a, #15803d)" }}
            >
              📲 {tr("إرسال الملخص على واتساب", "Send Summary to WhatsApp")}
            </button>
            <button
              type="button"
              onClick={handleCopySummaryText}
              style={{ ...s.btn, background: "#0f172a", border: "1px solid #22c55e", color: "#4ade80" }}
            >
              📋 {tr("نسخ نص الملخص", "Copy Summary")}
            </button>
            {canExport && (
              <>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={handleExportExcel}
                  style={{ ...s.btn, background: "linear-gradient(135deg, #0284c7, #2563eb)" }}
                >
                  📊 {tr("تصدير Excel", "Export Excel")}
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={{ ...s.btn, background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  🖨️ {tr("تقرير PDF / طباعة", "PDF / Print")}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowBotModal(true)}
              style={{ ...s.btn, background: "linear-gradient(135deg, #ea580c, #d97706)" }}
            >
              🤖 {tr("ربط بوت الواتساب التلقائي (QR)", "Auto WhatsApp QR Bot")}
            </button>
          </div>
        </div>

        {/* Date Selector & Data Scope Controls */}
        <div style={s.dateBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
              🗓️ {tr("نطاق العرض:", "View Scope:")}
            </span>
            <button
              type="button"
              onClick={() => setDateScope("all_dates")}
              style={{
                ...s.smallBtn,
                background: dateScope === "all_dates" ? "#10b981" : "#0f172a",
                color: dateScope === "all_dates" ? "#fff" : "#cbd5e1",
                border: "1px solid #10b981",
              }}
            >
              🌐 {tr("كل البلاغات المسجلة", "All Recorded Dates")}
            </button>
            <button
              type="button"
              onClick={() => setDateScope("selected_date")}
              style={{
                ...s.smallBtn,
                background: dateScope === "selected_date" ? "#0ea5e9" : "#0f172a",
                color: dateScope === "selected_date" ? "#fff" : "#cbd5e1",
                border: "1px solid #0ea5e9",
              }}
            >
              📅 {tr("تاريخ محدد:", "Specific Date:")}
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value)
                  setDateScope("selected_date")
                }
              }}
              style={s.dateInput}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIncludeAppSnags((v) => !v)}
              style={{
                ...s.smallBtn,
                background: includeAppSnags ? "rgba(56,189,248,0.2)" : "#0f172a",
                color: includeAppSnags ? "#38bdf8" : "#94a3b8",
                border: `1px solid ${includeAppSnags ? "#38bdf8" : "#334155"}`,
              }}
            >
              {includeAppSnags
                ? tr("🔗 مدمج مع ملاحظات التطبيق الحية ✓", "🔗 Synced with Live App Snags ✓")
                : tr("💬 عرض رسائل الواتساب فقط", "💬 WhatsApp Messages Only")}
            </button>
            <button
              type="button"
              onClick={() => setShowAnalyzerBox((v) => !v)}
              style={{ ...s.smallBtn, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155" }}
            >
              {showAnalyzerBox ? tr("🔼 إخفاء نافذة لصق المحادثات", "Hide Chat Box") : tr("🔽 فتح نافذة لصق محادثات الواتساب", "Open Chat Analyzer")}
            </button>
            {Object.keys(ordersMap).length > 0 && canModify && (
              <button
                type="button"
                onClick={handleClearDayOrders}
                style={{ ...s.smallBtn, background: "rgba(239,68,68,0.18)", color: "#fca5a5", border: "1px solid #ef4444" }}
              >
                🗑️ {tr("مسح رسائل الواتساب", "Clear WhatsApp Messages")}
              </button>
            )}
          </div>
        </div>

        {/* 6 Interactive Executive KPIs (اضغط على أي كارت للفلترة والتفاعل الفوري) */}
        <div style={{ fontSize: 11.5, color: "#a7f3d0", fontWeight: 700, marginBottom: -6 }}>
          👆 {tr("اضغط على أي كارت بالأسفل لتصفية البلاغات وعرض تفاصيلها التفاعلية فوراً:", "Click any KPI card below to interactively filter & drill down:")}
        </div>
        <div style={s.kpiGrid}>
          <KpiCard
            label={tr("إجمالي البلاغات والمهام (3 شيفتات)", "Total Orders (3 Shifts)")}
            value={analytics.total}
            sub={tr(`منها ${analytics.opsTasksTotal} مهام تشغيلية وأمن ونظافة وسيفتي`, `${analytics.opsTasksTotal} ops/sec/hk/safety tasks`)}
            color="#38bdf8"
            active={activeGroup === "all" && statusFilter === "all" && activeShift === "all" && !activeKpiDrawer}
            badgeText={tr("عرض الكل", "Show All")}
            onClick={() => {
              setActiveGroup("all")
              setStatusFilter("all")
              setActiveShift("all")
              setSubCategoryFilter("all")
              setActiveKpiDrawer(null)
              ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          />
          <KpiCard
            label={tr("🔧 إجمالي أوردرات الصيانة", "🔧 Maintenance Orders")}
            value={analytics.maintenanceTotal}
            sub={tr(`خلص: ${analytics.maintenanceDone} | مفتوح: ${analytics.maintenanceOpen}`, `Done: ${analytics.maintenanceDone} | Open: ${analytics.maintenanceOpen}`)}
            color="#f59e0b"
            active={activeGroup === "maintenance" || activeKpiDrawer === "maintenance"}
            badgeText={activeGroup === "maintenance" ? tr("✓ مفعّل (اضغط للإلغاء)", "✓ Active Filter") : tr("اضغط لتفصيل الفئات", "Click for Categories")}
            onClick={() => {
              if (activeGroup === "maintenance" && activeKpiDrawer === "maintenance") {
                setActiveGroup("all")
                setSubCategoryFilter("all")
                setActiveKpiDrawer(null)
              } else {
                setActiveGroup("maintenance")
                setSubCategoryFilter("all")
                setActiveKpiDrawer("maintenance")
              }
            }}
          />
          <KpiCard
            label={tr("🟢 خلص (تم الإنجاز)", "🟢 Completed (Done)")}
            value={analytics.done}
            sub={tr("تم تأكيد الإغلاق والإنجاز ✅", "Confirmed completed ✅")}
            color="#10b981"
            active={statusFilter === "done"}
            badgeText={statusFilter === "done" ? tr("✓ مفعّل (اضغط للإلغاء)", "✓ Active Filter") : tr("اضغط لعرض المنجز", "Filter Completed")}
            onClick={() => {
              const next = statusFilter === "done" ? "all" : "done"
              setStatusFilter(next)
              ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          />
          <KpiCard
            label={tr("🔴 مفتوح (لسه ما خلصش)", "🔴 Open (Not Finished)")}
            value={analytics.open}
            sub={tr(`منها ${analytics.urgentOpen} بلاغ طارئ/عاجل`, `${analytics.urgentOpen} urgent open items`)}
            color="#ef4444"
            active={statusFilter === "open"}
            badgeText={statusFilter === "open" ? tr("✓ مفعّل (اضغط للإلغاء)", "✓ Active Filter") : tr("اضغط لعرض المفتوح", "Filter Open Items")}
            onClick={() => {
              const next = statusFilter === "open" ? "all" : "open"
              setStatusFilter(next)
              if (next === "open" && openAlertSectionRef.current) {
                openAlertSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
              } else {
                ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            }}
          />
          <KpiCard
            label={tr("⏳ جاري التنفيذ حالياً", "⏳ In Progress")}
            value={analytics.inProgress}
            sub={tr("تحت المتابعة في الشيفت", "Being worked on in shift")}
            color="#eab308"
            active={statusFilter === "in_progress"}
            badgeText={statusFilter === "in_progress" ? tr("✓ مفعّل (اضغط للإلغاء)", "✓ Active Filter") : tr("اضغط لعرض الجاري", "Filter In-Progress")}
            onClick={() => {
              const next = statusFilter === "in_progress" ? "all" : "in_progress"
              setStatusFilter(next)
              ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
          />
          <KpiCard
            label={tr("📈 نسبة الإنجاز بنهاية الشيفتات", "📈 3-Shift Completion Rate")}
            value={`${analytics.completionPct}%`}
            sub={tr("اضغط لتحليل نسب الـ 3 شيفتات والجروبات", "Click for 3-Shifts SLA breakdown")}
            color="#c084fc"
            active={activeKpiDrawer === "sla"}
            badgeText={activeKpiDrawer === "sla" ? tr("✓ إخفاء المؤشرات", "Hide Breakdown") : tr("اضغط لتحليل النسب", "Show SLA Bars")}
            onClick={() => setActiveKpiDrawer((prev) => (prev === "sla" ? null : "sla"))}
          />
        </div>

        {/* Interactive Drawer when Maintenance Card or SLA Card is clicked */}
        {activeKpiDrawer === "maintenance" && (
          <div style={{
            background: "rgba(15,23,42,0.92)",
            border: "1.5px solid #f59e0b",
            borderRadius: 14,
            padding: 14,
            marginTop: 4,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fde047" }}>
                🔧 {tr("تفصيل فئات أوردرات الصيانة (اضغط على أي فئة لعرض بلاغاتها):", "Maintenance Sub-Categories Interactive Breakdown:")}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubCategoryFilter("all")
                  setActiveKpiDrawer(null)
                }}
                style={{ ...s.tinyBtn, background: "#1e293b", color: "#cbd5e1" }}
              >
                ✖ {tr("إغلاق", "Close")}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 8 }}>
              {WA_GROUPS[0].subCategories.map((sc) => {
                const st = analytics.byGroup.maintenance?.subMap[sc.id] || { total: 0, done: 0, open: 0, inProgress: 0 }
                const selected = subCategoryFilter === sc.id
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setActiveGroup("maintenance")
                      setSubCategoryFilter(selected ? "all" : sc.id)
                      ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    style={{
                      background: selected ? "rgba(245,158,11,0.25)" : "#060d1a",
                      border: `1.5px solid ${selected ? "#f59e0b" : "#334155"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      textAlign: "start",
                      cursor: "pointer",
                      color: "#f8fafc",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 12.5, color: selected ? "#fde047" : "#e2e8f0" }}>
                      {lang === "ar" ? sc.labelAr : sc.labelEn}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 6 }}>
                      <span style={{ color: "#38bdf8", fontWeight: 800 }}>إجمالي: {st.total}</span>
                      <span style={{ color: "#4ade80" }}>✓ {st.done}</span>
                      <span style={{ color: "#f87171" }}>🔴 {st.open + st.inProgress}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeKpiDrawer === "sla" && (
          <div style={{
            background: "rgba(15,23,42,0.92)",
            border: "1.5px solid #c084fc",
            borderRadius: 14,
            padding: 14,
            marginTop: 4,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#e9d5ff" }}>
                📈 {tr("مؤشرات نسب الإنجاز التفاعلية عبر الـ 3 شيفتات والـ 5 جروبات:", "Interactive Completion Rate across 3 Shifts & 5 Groups:")}
              </div>
              <button
                type="button"
                onClick={() => setActiveKpiDrawer(null)}
                style={{ ...s.tinyBtn, background: "#1e293b", color: "#cbd5e1" }}
              >
                ✖ {tr("إغلاق", "Close")}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              { WA_GROUPS.map((g) => {
                const st = analytics.byGroup[g.id] || { total: 0, done: 0, inProgress: 0 }
                const pct = st.total > 0 ? Math.round(((st.done + st.inProgress * 0.4) / st.total) * 100) : 0
                return (
                  <div
                    key={g.id}
                    onClick={() => {
                      setActiveGroup(g.id)
                      ordersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    style={{ background: "#060d1a", border: `1px solid ${g.color}55`, borderRadius: 10, padding: 10, cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: g.color }}>
                      <span>{g.icon} {lang === "ar" ? g.labelAr : g.labelEn}</span>
                      <span>{pct}% ({st.done}/{st.total})</span>
                    </div>
                    <div style={{ height: 7, background: "#1e293b", borderRadius: 999, overflow: "hidden", marginTop: 6 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: g.color, transition: "width 0.3s" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 1. WHATSAPP CHAT PASTE / UPLOAD & QUICK ENTRY BOX                       */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showAnalyzerBox && (
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "#4ade80" }}>
                📥 {tr("تحليل رسائل جروبات الواتساب (نسخ ولصق المحادثة أو رفع ملف تصدير الدردشة)", "Analyze WhatsApp Group Messages (Copy/Paste or Upload Exported Chat)")}
              </h3>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                {tr(
                  "انسخ رسائل جروب (الصيانة / التشغيل / الأمن / النظافة / السيفتي) والصقها هنا — سيقوم النظام بفصل الأوردرات، ومعرفة الفئات، وربط ردود «تم ✅» بالأعطال ليعرف إيه اللي خلص وإيه اللي لسه مفتوح!",
                  "Paste messages from any WhatsApp group — the engine automatically extracts orders, categories, and links 'Done ✅' replies to identify open vs. completed items!"
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={importTargetGroup}
                onChange={(e) => setImportTargetGroup(e.target.value)}
                style={s.select}
              >
                <option value="auto">🧠 {tr("تصنيف ذكي تلقائي للجروب والفئة (Auto-Detect)", "Smart Auto-Detect Group & Category")}</option>
                {WA_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.labelAr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => txtFileInputRef.current?.click()}
                style={{ ...s.smallBtn, background: "#1e293b", color: "#38bdf8", border: "1px solid #0284c7" }}
              >
                📂 {tr("رفع ملف محادثة واتساب (.txt)", "Upload WhatsApp .txt")}
              </button>
              <input
                ref={txtFileInputRef}
                type="file"
                accept=".txt"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    const txt = await f.text()
                    setRawChatText(txt)
                    await handleAnalyzeChatText(txt)
                  }
                  e.target.value = ""
                }}
              />
            </div>
          </div>

          <textarea
            rows={5}
            value={rawChatText}
            onChange={(e) => setRawChatText(e.target.value)}
            placeholder={tr(
              "الصق رسائل جروب الواتساب هنا...\nمثال:\n[08:30 ص] م. محمود: عطل تكييف في الدور الثاني مبنى 1\n[09:15 ص] مشرف السيفتي: طفاية الحريق بجوار سلم مبنى 2 تحتاج تعبئة\n[10:00 ص] فني التكييف: تم إصلاح التكييف بالدور الثاني مبنى 1 وشحن الفريون ✅",
              "Paste WhatsApp chat messages here..."
            )}
            style={s.textarea}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => handleAnalyzeChatText(rawChatText)}
              style={{
                background: "linear-gradient(135deg, #16a34a, #059669)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontWeight: 900,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              🧠 {tr("تحليل المحادثة واستخراج الأوردرات والمفتوح والمنتهي الآن", "Analyze Chat & Extract Orders Now")}
            </button>

            {/* Quick Single Order Form */}
            <form onSubmit={handleAddQuickOrder} style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 280, justifyContent: "flex-end" }}>
              <select value={quickShift} onChange={(e) => setQuickShift(e.target.value)} style={s.select}>
                {SHIFT_DEFINITIONS.map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.icon} {sh.shortAr}
                  </option>
                ))}
              </select>
              <select value={quickGroup} onChange={(e) => setQuickGroup(e.target.value)} style={s.select}>
                <option value="auto">🧠 {tr("تلقائي", "Auto")}</option>
                {WA_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.icon} {g.labelAr}
                  </option>
                ))}
              </select>
              <input
                style={{ ...s.input, flex: 1, minWidth: 200 }}
                placeholder={tr("أو اكتب أوردر صيانة / مهمة تشغيلية سريعة هنا...", "Or type a quick order/task here...")}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
              />
              <button
                type="submit"
                style={{ ...s.smallBtn, background: "#0284c7", color: "#fff", padding: "9px 14px" }}
              >
                ➕ {tr("إضافة سريعة", "Quick Add")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 2. EXECUTIVE SUMMARY OF THE 3 SHIFTS & CATEGORIES BREAKDOWN             */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc" }}>
              📊 {tr(`الملخص التنفيذي وتحليل نهاية الـ 3 شيفتات (${selectedDate})`, `End-of-3-Shifts Executive Summary & Breakdown (${selectedDate})`)}
            </h3>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
              {tr(
                "ملخص شامل يوضح أداء الـ 3 شيفتات، وتفصيل فئات الصيانة والمهام التشغيلية، والأعمال المفتوحة التي لم تنتهِ",
                "Comprehensive breakdown across the 3 shifts, maintenance categories, operational groups, and open pending items"
              )}
            </div>
          </div>

          {analytics.openOrdersList.length > 0 && onAddSnag && (
            <button
              type="button"
              onClick={handlePromoteAllOpenToSnags}
              style={{
                background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🚨 {tr(`ترحيل جميع الأوردرات المفتوحة (${analytics.openOrdersList.length}) إلى سجل السناج العام`, `Push All Open Orders (${analytics.openOrdersList.length}) to Snags Log`)}
            </button>
          )}
        </div>

        {/* 3 Shifts Comparison Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10, marginBottom: 14 }}>
          {SHIFT_DEFINITIONS.map((sh) => {
            const st = analytics.byShift[sh.id]
            const pct = st.total > 0 ? Math.round((st.done / st.total) * 100) : 0
            const isSelected = activeShift === sh.id
            return (
              <div
                key={sh.id}
                onClick={() => setActiveShift(isSelected ? "all" : sh.id)}
                style={{
                  background: isSelected ? `${sh.color}18` : "#060d1a",
                  border: `1.5px solid ${isSelected ? sh.color : "#1e293b"}`,
                  borderRadius: 12,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: "#f8fafc" }}>
                    {sh.icon} {lang === "ar" ? sh.labelAr : sh.labelEn}
                  </span>
                  <span style={{ fontWeight: 900, fontSize: 13, color: sh.color }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
                  <span style={{ color: "#cbd5e1" }}>إجمالي: <strong>{st.total}</strong></span>
                  <span style={{ color: "#4ade80" }}>🟢 خلص: <strong>{st.done}</strong></span>
                  <span style={{ color: "#facc15" }}>⏳ جاري: <strong>{st.inProgress}</strong></span>
                  <span style={{ color: "#f87171" }}>🔴 مفتوح: <strong>{st.open}</strong></span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 5 Operational Groups & Sub-Categories Matrix */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {WA_GROUPS.map((g) => {
            const gData = analytics.byGroup[g.id]
            const active = activeGroup === g.id
            return (
              <div
                key={g.id}
                style={{
                  background: active ? `${g.color}15` : "#060d1a",
                  border: `1.5px solid ${active ? g.color : "#1e293b"}`,
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  onClick={() => {
                    setActiveGroup(active ? "all" : g.id)
                    setSubCategoryFilter("all")
                  }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: 8 }}
                >
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: g.color }}>
                    {g.icon} {lang === "ar" ? g.labelAr : g.labelEn}
                  </span>
                  <span style={{
                    background: "#0f172a",
                    border: `1px solid ${g.color}55`,
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                  }}>
                    {gData.total} بلاغ
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, fontSize: 11.5, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #1e293b" }}>
                  <span style={{ color: "#4ade80", fontWeight: 700 }}>🟢 خلص: {gData.done}</span>
                  <span style={{ color: "#facc15", fontWeight: 700 }}>⏳ جاري: {gData.inProgress}</span>
                  <span style={{ color: "#f87171", fontWeight: 700 }}>🔴 مفتوح: {gData.open}</span>
                </div>

                {/* Sub-categories breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {g.subCategories.map((sc) => {
                    const subSt = gData.subMap[sc.id] || { total: 0, done: 0, open: 0, inProgress: 0 }
                    const isSubSelected = subCategoryFilter === sc.id
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setActiveGroup(g.id)
                          setSubCategoryFilter(isSubSelected ? "all" : sc.id)
                        }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 11.5,
                          padding: "4px 7px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: isSubSelected ? "rgba(56,189,248,0.2)" : "rgba(15,23,42,0.6)",
                          color: subSt.total > 0 ? "#e2e8f0" : "#64748b",
                        }}
                      >
                        <span>{lang === "ar" ? sc.labelAr : sc.labelEn}</span>
                        <span style={{ fontWeight: 800 }}>
                          {subSt.total > 0 ? (
                            <>
                              <span style={{ color: "#38bdf8" }}>{subSt.total}</span>
                              {subSt.open + subSt.inProgress > 0 && (
                                <span style={{ color: "#f87171", marginInlineStart: 4 }}>
                                  (🔴 {subSt.open + subSt.inProgress} مفتوح)
                                </span>
                              )}
                            </>
                          ) : (
                            "0"
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 3. OPEN / PENDING ORDERS ALERT LIST (المفتوح واللي لسه ما خلصش)          */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {analytics.openOrdersList.length > 0 && (
        <div
          ref={openAlertSectionRef}
          style={{
            ...s.card,
            border: "1.5px solid #ef4444",
            background: "linear-gradient(135deg, rgba(127,29,29,0.18), rgba(10,22,40,0.95))",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: "#fca5a5" }}>
                🚨 {tr(
                  `قائمة الأوردرات والمهام المفتوحة التي لم تنتهِ بعد (${analytics.openOrdersList.length} بلاغ مفتوح / قيد التنفيذ)`,
                  `Open & Unfinished Orders Carried Over (${analytics.openOrdersList.length} items)`
                )}
              </h3>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 2 }}>
                {tr(
                  "هذه البلاغات وردت في جروبات الواتساب ولم يُسجل لها «تم الإنجاز» حتى الآن — يمكنك إغلاقها بضغطة زر أو ترحيلها لسجل السناج",
                  "These items were reported in WhatsApp groups and are still open — mark them done or push them to Snags"
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 8 }}>
            {analytics.openOrdersList.map((ord) => {
              const grp = WA_GROUPS.find((g) => g.id === ord.groupId) || WA_GROUPS[0]
              const sh = SHIFT_DEFINITIONS.find((s) => s.id === ord.shift) || SHIFT_DEFINITIONS[0]
              return (
                <div
                  key={ord.uid}
                  style={{
                    background: "#060d1a",
                    border: "1px solid #7f1d1d",
                    borderInlineStart: `4px solid ${grp.color}`,
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: grp.color }}>
                      {grp.icon} {ord.groupLabelAr} • {ord.subCategoryLabelAr}
                    </span>
                    <span style={{ fontSize: 11, color: "#fde047", fontWeight: 700 }}>
                      {sh.icon} {ord.time} ({sh.shortAr})
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#f8fafc" }}>{ord.description}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>📍 {ord.locationAr} | 👤 {ord.sender}</span>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button
                        type="button"
                        onClick={() =>
                          saveOrder({
                            ...ord,
                            status: "done",
                            resolutionNote: `تم الإغلاق والاعتماد بواسطة ${userName} ✅`,
                          })
                        }
                        style={{ ...s.tinyBtn, background: "#10b981", color: "#fff" }}
                      >
                        ✓ {tr("تم الإنجاز (خلص)", "Mark Done")}
                      </button>
                      {onAddSnag && (
                        <button
                          type="button"
                          onClick={() => handlePromoteOpenOrderToSnag(ord)}
                          style={{ ...s.tinyBtn, background: "#dc2626", color: "#fff" }}
                        >
                          🚨 {tr("لسجل السناج", "To Snag")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 4. FILTER BAR & DETAILED ORDERS LOG                                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div ref={ordersSectionRef} style={s.card}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <input
            style={{ ...s.input, flex: 1, minWidth: 220 }}
            placeholder={tr("🔍 ابحث في نص الرسالة أو الفئة أو الموقع أو اسم المرسل...", "🔍 Search orders, categories, locations, or sender...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Group Filter Pills */}
          <button
            type="button"
            onClick={() => {
              setActiveGroup("all")
              setSubCategoryFilter("all")
            }}
            style={{
              ...s.pill,
              background: activeGroup === "all" ? "#38bdf8" : "#060d1a",
              color: activeGroup === "all" ? "#0f172a" : "#cbd5e1",
            }}
          >
            {tr("كل الجروبات", "All Groups")} ({dateOrders.length})
          </button>
          {WA_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setActiveGroup(g.id)
                setSubCategoryFilter("all")
              }}
              style={{
                ...s.pill,
                background: activeGroup === g.id ? g.color : "#060d1a",
                color: activeGroup === g.id ? "#0f172a" : g.color,
                borderColor: g.color,
              }}
            >
              {g.icon} {lang === "ar" ? g.labelAr.split(" (")[0] : g.labelEn}
            </button>
          ))}

          {/* Status Filter Pills */}
          {ORDER_STATUSES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(statusFilter === st.id ? "all" : st.id)}
              style={{
                ...s.pill,
                background: statusFilter === st.id ? st.color : "#060d1a",
                color: statusFilter === st.id ? "#fff" : st.color,
                borderColor: st.color,
              }}
            >
              {lang === "ar" ? st.labelAr : st.labelEn}
            </button>
          ))}
        </div>

        {/* Sub-category filter bar when a specific group is selected */}
        {activeGroupObj && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #1e293b" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: activeGroupObj.color }}>
              {activeGroupObj.icon} {tr("فلتر الفئات الفرعية:", "Sub-Category Filter:")}
            </span>
            <button
              type="button"
              onClick={() => setSubCategoryFilter("all")}
              style={{
                ...s.pill,
                background: subCategoryFilter === "all" ? activeGroupObj.color : "#060d1a",
                color: subCategoryFilter === "all" ? "#0f172a" : "#cbd5e1",
              }}
            >
              {tr("الكل", "All")}
            </button>
            {activeGroupObj.subCategories.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSubCategoryFilter(sc.id)}
                style={{
                  ...s.pill,
                  background: subCategoryFilter === sc.id ? activeGroupObj.color : "#060d1a",
                  color: subCategoryFilter === sc.id ? "#0f172a" : "#e2e8f0",
                }}
              >
                {lang === "ar" ? sc.labelAr : sc.labelEn}
              </button>
            ))}
          </div>
        )}

        {/* Orders List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredOrders.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "#64748b" }}>
              {tr(
                "لا توجد رسائل أو أوردرات مسجلة حالياً — الصق محادثة جروب الواتساب الحقيقية بالأعلى أو ارفع ملف الدردشة (.txt) أو اربط البوت التلقائي",
                "No orders recorded yet — paste your real WhatsApp group chat above, upload a .txt export, or connect the QR Bot"
              )}
            </div>
          ) : (
            filteredOrders.map((ord, idx) => {
              const grp = WA_GROUPS.find((g) => g.id === ord.groupId) || WA_GROUPS[0]
              const sh = SHIFT_DEFINITIONS.find((s) => s.id === ord.shift) || SHIFT_DEFINITIONS[0]
              return (
                <div
                  key={ord.uid}
                  style={{
                    background: "#060d1a",
                    border: `1px solid ${ord.status === "done" ? "#10b981" : ord.status === "in_progress" ? "#f59e0b" : "#ef4444"}`,
                    borderInlineStart: `4px solid ${grp.color}`,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ background: `${grp.color}22`, color: grp.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                          {grp.icon} {ord.groupLabelAr}
                        </span>
                        <span style={{ background: "#0f172a", color: "#38bdf8", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, border: "1px solid #1e293b" }}>
                          🗂️ {ord.subCategoryLabelAr}
                        </span>
                        <span style={{ background: "#0f172a", color: sh.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, border: "1px solid #1e293b" }}>
                          {sh.icon} {ord.time} ({sh.shortAr})
                        </span>
                        <span style={{ background: "#0f172a", color: "#cbd5e1", padding: "2px 8px", borderRadius: 6, fontSize: 11, border: "1px solid #1e293b" }}>
                          📍 {ord.locationAr}
                        </span>
                        {ord.priority === "urgent" && (
                          <span style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 900, border: "1px solid #ef4444" }}>
                            🚨 طارئ / عاجل
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 14.5, color: "#f8fafc", marginTop: 4 }}>
                        {idx + 1}. {ord.description}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 2 }}>
                        👤 {tr("المرسل في الجروب:", "Sender:")} <strong style={{ color: "#e2e8f0" }}>{ord.sender}</strong>
                      </div>
                    </div>

                    {/* Status Buttons */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {ORDER_STATUSES.map((st) => {
                        const active = ord.status === st.id
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => saveOrder({ ...ord, status: st.id })}
                            style={{
                              border: `1px solid ${active ? st.color : "#334155"}`,
                              background: active ? st.color : "#0f172a",
                              color: active ? "#fff" : st.color,
                              borderRadius: 8,
                              padding: "6px 10px",
                              fontSize: 11.5,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {lang === "ar" ? st.labelAr : st.labelEn}
                          </button>
                        )
                      })}
                      {canModify && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(ord.uid)}
                          style={{ background: "transparent", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11 }}
                          title={tr("حذف", "Delete")}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resolution / Follow-up Note Row */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                    <input
                      style={{ ...s.input, flex: 1, minWidth: 220, padding: "6px 10px", fontSize: 12 }}
                      placeholder={tr("ملاحظة الإغلاق أو رد الفني في الجروب (مثال: تم الإصلاح بواسطة فني الكهرباء ✅)...", "Resolution note or technician reply...")}
                      value={ord.resolutionNote || ""}
                      onChange={(e) => saveOrder({ ...ord, resolutionNote: e.target.value })}
                    />
                    {ord.status !== "done" && onAddSnag && (
                      <button
                        type="button"
                        onClick={() => handlePromoteOpenOrderToSnag(ord)}
                        style={{ ...s.tinyBtn, background: "#dc2626", color: "#fff", padding: "7px 12px" }}
                      >
                        🚨 {tr("ترحيل لسجل السناج", "Push to Snag")}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: AUTOMATED WHATSAPP WEB QR BOT GUIDE                              */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {showBotModal && (
        <div
          onClick={() => setShowBotModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0f172a",
              border: "1px solid #38bdf8",
              borderRadius: 16,
              maxWidth: 680,
              width: "100%",
              padding: 22,
              color: "#f8fafc",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: "#38bdf8" }}>
                🤖 {tr("تشغيل بوت الواتساب التلقائي (WhatsApp Web QR Bot)", "Automated WhatsApp Web QR Bot Setup")}
              </h3>
              <button
                type="button"
                onClick={() => setShowBotModal(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
              >
                ✖
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
              {tr(
                "تم تجهيز مجلد البوت الأوتوماتيكي الكامل داخل المشروع في المسار whatsapp-bot/ ليرتبط بالواتساب عن طريق مسح QR Code (مثل واتساب ويب) ويقرأ رسائل جروبات (الصيانة، التشغيل، الأمن، النظافة، السيفتي) تلقائياً 24/7 ويسجلها في هذه الشاشة مباشرة!",
                "A complete Node.js WhatsApp Web Bot is included in the `whatsapp-bot/` folder. Scan the QR code once to automatically listen to your 5 groups 24/7 and sync live to this dashboard!"
              )}
            </p>

            <div style={{ background: "#060d1a", border: "1px solid #1e293b", borderRadius: 12, padding: 14, fontSize: 12.5, lineHeight: 1.8, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, color: "#4ade80", marginBottom: 6 }}>
                ⚡ خطوات تشغيل البوت الأوتوماتيكي على جهازك:
              </div>
              <div>1️⃣ افتح موجه الأوامر داخل مجلد البوت: <code>cd whatsapp-bot</code></div>
              <div>2️⃣ ثبّت الحزم مرة واحدة: <code>npm install</code></div>
              <div>3️⃣ شغّل البوت: <code>npm start</code></div>
              <div>4️⃣ سيظهر لك <strong>QR Code</strong> على الشاشة — امسحه من تطبيق الواتساب في هاتفك (الأجهزة المرتبطة).</div>
              <div>5️⃣ بمجرد الربط: أي رسالة تُكتب في جروب (الصيانة / التشغيل / الأمن / النظافة / السيفتي) ستظهر هنا تلقائياً، وعند كتابة <code>!تقرير</code> أو <code>!ملخص</code> في الجروب يرد البوت بالملخص التنفيذي للـ 3 شيفتات فوراً!</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowBotModal(false)}
                style={{ ...s.btn, background: "#0ea5e9" }}
              >
                {tr("حسناً، فهمت", "Got it")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color, active, badgeText, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active
          ? `linear-gradient(135deg, ${color}28, rgba(15,23,42,0.95))`
          : "rgba(6,13,26,0.85)",
        border: active ? `2px solid ${color}` : `1px solid ${color}44`,
        borderTop: `4px solid ${color}`,
        borderRadius: 14,
        padding: "12px 14px",
        flex: "1 1 170px",
        minWidth: 160,
        textAlign: "start",
        cursor: "pointer",
        boxShadow: active ? `0 0 18px ${color}40` : "none",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
          {badgeText && (
            <span style={{
              background: active ? color : "rgba(15,23,42,0.9)",
              color: active ? "#0f172a" : color,
              border: `1px solid ${color}66`,
              borderRadius: 999,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}>
              {badgeText}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#f8fafc", marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ fontSize: 11, color: active ? "#e2e8f0" : "#94a3b8", marginTop: 6 }}>{sub}</div>
    </button>
  )
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: {
    background: "linear-gradient(135deg, #064e3b 0%, #0f172a 55%, #1e1b4b 100%)",
    border: "1px solid #10b98155",
    borderRadius: 18,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(16,185,129,0.2)",
    color: "#6ee7b7",
    fontSize: 10.5,
    fontWeight: 800,
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 6,
  },
  heroTitle: { margin: 0, fontSize: 19, fontWeight: 900, color: "#fff" },
  heroSub: { margin: "6px 0 0", fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 },
  btn: {
    border: "none",
    borderRadius: 10,
    padding: "9px 14px",
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  smallBtn: {
    border: "none",
    borderRadius: 8,
    padding: "7px 12px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tinyBtn: {
    border: "none",
    borderRadius: 6,
    padding: "4px 9px",
    fontWeight: 800,
    fontSize: 11,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dateBar: {
    background: "rgba(6,13,26,0.7)",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  dateInput: {
    background: "#0f172a",
    border: "1px solid #10b981",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 800,
  },
  kpiGrid: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 16,
  },
  textarea: {
    width: "100%",
    background: "#060d1a",
    border: "1px solid #334155",
    borderRadius: 12,
    padding: 12,
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "inherit",
    lineHeight: 1.6,
    resize: "vertical",
  },
  input: {
    background: "#060d1a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e2e8f0",
    fontSize: 12.5,
  },
  select: {
    background: "#060d1a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: 700,
  },
  pill: {
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "6px 11px",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
  },
}
