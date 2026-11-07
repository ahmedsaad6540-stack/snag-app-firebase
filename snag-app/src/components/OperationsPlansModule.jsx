import React, { useState, useEffect, useMemo, useRef } from "react"
import { db } from "../lib/firebase.js"
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"
import ExcelJS from "exceljs"
import toast from "react-hot-toast"
import CameraModal from "./CameraModal.jsx"
import { useLanguage } from "../i18n/LanguageContext.jsx"
import { canUser } from "../constants/permissions.js"
import {
  EXEC_STATUSES,
  getArabicDayName,
  LANDSCAPE_COMPANY_INFO,
  getLandscapeDayPlan,
  SPIDER_PLAN_INFO,
  getSpiderDayPlan,
  PEST_CONTROL_INFO,
  getPestControlDayPlan,
  HK_MONTHLY_DAYS,
  HK_NIGHT_SHIFT_MONTHLY_DAYS,
  HK_NIGHT_PLAN_NOTE,
  HK_MORNING_SHIFT_MONTHLY_DAYS,
  HK_MORNING_PLAN_NOTE,
  HK_EVENING_SHIFT_MONTHLY_DAYS,
  HK_EVENING_PLAN_NOTE,
  HK_ITEM_FILTERS,
  matchesHkItemFilter,
  getHousekeepingDayPlan,
} from "../constants/operationsPlansData.js"

const SECTORS = [
  {
    id: "all",
    icon: "📊",
    labelAr: "جميع القطاعات (شامل)",
    labelEn: "All 4 Sectors (Combined)",
    color: "#38bdf8",
    tradeId: "general",
    locationId: "plaza",
  },
  {
    id: "landscape",
    icon: "🌿",
    labelAr: "اللاندسكيب (جرين جاردن توب)",
    labelEn: "Landscape (Green Garden Top)",
    color: "#22c55e",
    tradeId: "landscape",
    locationId: "landscape-gardens",
  },
  {
    id: "spider",
    icon: "🧗‍♂️",
    labelAr: "السبايدر والواجهات (Spider)",
    labelEn: "Spider & Facades",
    color: "#0ea5e9",
    tradeId: "cleanliness",
    locationId: "mall-entrances",
  },
  {
    id: "pest",
    icon: "🦟",
    labelAr: "مكافحة الآفات (Pro Vision)",
    labelEn: "Pest Control (Pro Vision)",
    color: "#eab308",
    tradeId: "cleanliness",
    locationId: "service-corridors",
  },
  {
    id: "housekeeping",
    icon: "🧹",
    labelAr: "الهاوس كيبنج والنظافة (3 ورديات + شهري)",
    labelEn: "Housekeeping (3 Shifts + Monthly)",
    color: "#a855f7",
    tradeId: "cleanliness",
    locationId: "building-corridors",
  },
]

const PERIOD_MODES = [
  { id: "daily",   icon: "📅", labelAr: "التقرير والمتابعة اليومية (مطلوب النهارده)", labelEn: "Daily Plan & Execution Report" },
  { id: "weekly",  icon: "📆", labelAr: "التقرير الأسبوعي (تقييم الأداء الأسبوعي)",   labelEn: "Weekly Execution & Variance Report" },
  { id: "monthly", icon: "🗓️", labelAr: "الخطة والتقرير الشهري الشامل",              labelEn: "Monthly Master Action Plan & Report" },
]

function getTodayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function shiftDateIso(dateStr, deltaDays) {
  const [y, m, d] = (dateStr || getTodayIso()).split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function getMonthDates(yearMonth) {
  const [y, m] = (yearMonth || getTodayIso().slice(0, 7)).split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const list = []
  for (let d = 1; d <= daysInMonth; d++) {
    list.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
  }
  return list
}

/**
 * Builds the flat list of all scheduled tasks for a given date across all 4 sectors
 */
function buildAllTasksForDate(dateStr) {
  const dayName = getArabicDayName(dateStr)
  const items = []

  // 1. Landscape
  const landPlan = getLandscapeDayPlan(dateStr)
  for (const t of landPlan.tasks) {
    items.push({
      uid: `${dateStr}__landscape__${t.id}`,
      date: dateStr,
      dayName,
      sectorId: "landscape",
      sectorLabelAr: "اللاندسكيب (جرين جاردن توب)",
      categoryAr: t.zoneAr,
      shiftOrSlotAr: t.slotAr,
      requiredTaskAr: t.taskAr,
      extraMetaAr: "شركة جرين جاردن توب",
      defaultStatus: t.defaultStatus || "pending",
    })
  }

  // 2. Spider & Facades
  const spiderPlan = getSpiderDayPlan(dateStr)
  for (const t of spiderPlan.tasks) {
    items.push({
      uid: `${dateStr}__spider__${t.id}`,
      date: dateStr,
      dayName,
      sectorId: "spider",
      sectorLabelAr: "السبايدر والواجهات (Spider)",
      categoryAr: t.buildingAr,
      shiftOrSlotAr: t.scopeAr || spiderPlan.scopeAr || "أعمال الواجهات والمداخل",
      requiredTaskAr: t.taskAr,
      extraMetaAr: spiderPlan.scopeAr || "",
      defaultStatus: t.defaultStatus || "pending",
    })
  }

  // 3. Pest Control (Pro Vision)
  const pestPlan = getPestControlDayPlan(dateStr)
  for (const t of pestPlan.tasks) {
    items.push({
      uid: `${dateStr}__pest__${t.id}`,
      date: dateStr,
      dayName,
      sectorId: "pest",
      sectorLabelAr: "مكافحة الآفات (Pro Vision)",
      categoryAr: `${t.locationAr} (${t.pestTypeAr})`,
      shiftOrSlotAr: t.badgeAr,
      requiredTaskAr: t.actionAr,
      extraMetaAr: `المبيد: ${t.pesticideAr}`,
      defaultStatus: t.isScheduledToday ? "pending" : "na",
    })
  }

  // 4. Housekeeping (Monthly Specialized + 3 Shifts)
  const hkPlan = getHousekeepingDayPlan(dateStr)
  for (const st of hkPlan.specializedTasks) {
    items.push({
      uid: `${dateStr}__housekeeping__${st.id}`,
      date: dateStr,
      dayName,
      sectorId: "housekeeping",
      sectorLabelAr: "الهاوس كيبنج — الخطة الشهرية التخصصية",
      hkSubGroup: "specialized",
      hkTags: st.tags || [],
      categoryAr: st.categoryAr,
      shiftOrSlotAr: "خطة الشهر التخصصية",
      requiredTaskAr: st.taskAr,
      extraMetaAr: `يوم ${hkPlan.dayOfMonth} بالشهر`,
      defaultStatus: "pending",
    })
  }

  const shiftLabels = {
    morning: "🌅 الوردية الصباحية",
    evening: "🌇 الوردية المسائية",
    night:   "🌙 الوردية الليلية",
  }

  for (const shiftKey of ["morning", "evening", "night"]) {
    for (const chk of hkPlan.shifts[shiftKey]) {
      items.push({
        uid: `${dateStr}__housekeeping__${chk.id}`,
        date: dateStr,
        dayName,
        sectorId: "housekeeping",
        sectorLabelAr: "الهاوس كيبنج — متابعة الورديات",
        hkSubGroup: shiftKey,
        hkTags: chk.tags || [],
        categoryAr: `${chk.area} (${chk.zone})`,
        shiftOrSlotAr: shiftLabels[shiftKey],
        requiredTaskAr: chk.task,
        extraMetaAr: shiftLabels[shiftKey],
        defaultStatus: "pending",
      })
    }
  }

  return items
}

export default function OperationsPlansModule({ currentUser, notify, onAddSnag }) {
  const { lang, tr } = useLanguage()
  const userName = currentUser?.displayName || currentUser?.email || "مشرف التشغيل"
  const canModify = !currentUser || canUser(currentUser, "park-street", "edit") || canUser(currentUser, "snags", "add")
  const canExport = !currentUser || canUser(currentUser, "park-street", "export") || canUser(currentUser, "snags", "export")

  // Filters & Navigation State
  const [periodMode, setPeriodMode] = useState("daily") // "daily" | "weekly" | "monthly"
  const [activeSector, setActiveSector] = useState("all") // "all" | "landscape" | "spider" | "pest" | "housekeeping"
  const [selectedDate, setSelectedDate] = useState(getTodayIso)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0) // 0=Current 7 days around date, 1=Days 1-7, 2=Days 8-14, 3=Days 15-21, 4=Days 22-28, 5=Days 29-31
  const [hkFilterShift, setHkFilterShift] = useState("all") // "all" | "specialized" | "morning" | "evening" | "night"
  const [hkFilterItem, setHkFilterItem] = useState("all") // "all" | "reception" | "stairs" | "emergency_doors" | ...
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [records, setRecords] = useState({})
  const [exporting, setExporting] = useState(false)

  // Camera & Lightbox
  const [cameraTargetUid, setCameraTargetUid] = useState(null)
  const [uploadTargetUid, setUploadTargetUid] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const fileInputRef = useRef(null)

  const selectedYearMonth = selectedDate.slice(0, 7)

  // Real-time Firestore listener for `operations_action_logs`
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "operations_action_logs"),
      (snap) => {
        const map = {}
        snap.docs.forEach((d) => {
          map[d.id] = d.data()
        })
        setRecords(map)
      },
      (err) => {
        console.warn("operations_action_logs listener warning:", err.message)
      }
    )
    return () => unsub()
  }, [])

  async function saveSectorWorkforce(dateStr, sectorId, workforceText) {
    if (!canModify) return
    const wfUid = `${dateStr}__workforce__${sectorId}`
    const updated = {
      uid: wfUid,
      date: dateStr,
      sectorId,
      isWorkforceSummary: true,
      workforceCount: workforceText,
      inspector: userName,
      updatedAt: new Date().toISOString(),
    }
    setRecords((prev) => ({ ...prev, [wfUid]: updated }))
    try {
      await setDoc(
        doc(db, "operations_action_logs", wfUid),
        { ...updated, serverTimestamp: serverTimestamp() },
        { merge: true }
      )
    } catch (err) {
      console.error("Failed saving workforce log:", err)
    }
  }

  async function saveTaskRecord(taskItem, patch) {
    if (!canModify) {
      toast.error(tr("ليس لديك صلاحية التعديل (وضع القراءة فقط)", "Read-only mode: cannot modify records"))
      return
    }
    const existing = records[taskItem.uid] || {}
    const updated = {
      uid: taskItem.uid,
      date: taskItem.date,
      sectorId: taskItem.sectorId,
      requiredTaskAr: taskItem.requiredTaskAr,
      categoryAr: taskItem.categoryAr,
      shiftOrSlotAr: taskItem.shiftOrSlotAr,
      status: existing.status || taskItem.defaultStatus || "pending",
      workforceCount: existing.workforceCount ?? "",
      whatWasDone: existing.whatWasDone ?? "",
      reasonOrBasis: existing.reasonOrBasis ?? "",
      inspector: existing.inspector || userName,
      photos: existing.photos || [],
      ...patch,
      updatedAt: new Date().toISOString(),
    }

    setRecords((prev) => ({ ...prev, [taskItem.uid]: updated }))
    try {
      await setDoc(
        doc(db, "operations_action_logs", taskItem.uid),
        { ...updated, serverTimestamp: serverTimestamp() },
        { merge: true }
      )
    } catch (err) {
      console.error("Failed saving operation log:", err)
      toast.error(tr("تعذر حفظ التعديل في السحابة", "Failed to save to cloud"))
    }
  }

  async function markAllVisibleTasks(targetStatus) {
    if (!canModify) return
    const list = filteredDailyTasks
    if (list.length === 0) return
    const label = EXEC_STATUSES.find((s) => s.id === targetStatus)?.labelAr || targetStatus
    if (!window.confirm(tr(`هل تريد تحديث حالة جميع المهام المعروضة (${list.length} مهمة) إلى "${label}"؟`, `Set all ${list.length} visible tasks to "${label}"?`))) {
      return
    }
    const toastId = toast.loading(tr("جاري تحديث المهام...", "Updating tasks..."))
    try {
      for (const item of list) {
        await saveTaskRecord(item, {
          status: targetStatus,
          inspector: userName,
        })
      }
      toast.success(tr(`تم تحديث ${list.length} مهمة بنجاح!`, `Updated ${list.length} tasks!`), { id: toastId })
    } catch (e) {
      toast.error(tr("حدث خطأ أثناء التحديث الجماعي", "Bulk update error"), { id: toastId })
    }
  }

  async function compressImageFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX = 900
          let w = img.width, h = img.height
          if (w > h && w > MAX) { h = Math.round((h * MAX) / w); w = MAX }
          else if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX }
          canvas.width = w
          canvas.height = h
          canvas.getContext("2d").drawImage(img, 0, 0, w, h)
          resolve({
            id: Math.random().toString(36).slice(2, 9),
            name: file.name || `ops_${Date.now()}.jpg`,
            type: "image/jpeg",
            dataUrl: canvas.toDataURL("image/jpeg", 0.78),
          })
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleAddPhoto(taskItem, file) {
    if (!file || !taskItem) return
    const compressed = await compressImageFile(file)
    const rec = records[taskItem.uid] || {}
    const existingPhotos = rec.photos || []
    await saveTaskRecord(taskItem, {
      photos: [...existingPhotos, compressed].slice(0, 4),
    })
    toast.success(tr("📸 تم إرفاق الصورة بالتقرير اليومي", "📸 Photo attached to daily report"))
  }

  async function handlePromoteToSnag(taskItem) {
    if (!onAddSnag) return
    const rec = records[taskItem.uid] || {}
    const secMeta = SECTORS.find((s) => s.id === taskItem.sectorId) || SECTORS[0]
    const descParts = [
      `[${taskItem.sectorLabelAr} — ${taskItem.date} (${taskItem.dayName})]`,
      `المهمة المطلوبة: ${taskItem.requiredTaskAr}`,
      `الموقع/النطاق: ${taskItem.categoryAr}`,
    ]
    if (rec.workforceCount) descParts.push(`عدد العمالة: ${rec.workforceCount}`)
    if (rec.whatWasDone) descParts.push(`ملاحظات التنفيذ: ${rec.whatWasDone}`)
    if (rec.reasonOrBasis) descParts.push(`سبب عدم التنفيذ: ${rec.reasonOrBasis}`)

    await onAddSnag(
      {
        inspector: rec.inspector || userName,
        location: secMeta.locationId,
        description: descParts.join(" | "),
        trade: secMeta.tradeId,
        priority: "urgent",
        type: "operations",
        status: "open",
        userEmail: currentUser?.email || "",
      },
      (rec.photos || []).map((p) => ({
        id: p.id,
        name: p.name || "ops-photo.jpg",
        type: "image/jpeg",
        dataUrl: p.dataUrl,
      }))
    )
    toast.success(tr("🚨 تم ترحيل عدم التنفيذ إلى سجل الملاحظات العام!", "🚨 Promoted to Main Snags Log!"))
  }

  // ── Compute Dates for Current Period (Daily / Weekly / Monthly) ──
  const activeDatesList = useMemo(() => {
    if (periodMode === "daily") {
      return [selectedDate]
    }
    const monthDates = getMonthDates(selectedYearMonth)
    if (periodMode === "weekly") {
      if (selectedWeekIndex === 1) return monthDates.slice(0, 7)
      if (selectedWeekIndex === 2) return monthDates.slice(7, 14)
      if (selectedWeekIndex === 3) return monthDates.slice(14, 21)
      if (selectedWeekIndex === 4) return monthDates.slice(21, 28)
      if (selectedWeekIndex === 5) return monthDates.slice(28)
      // Default (0): 7 days starting from 6 days before selectedDate up to selectedDate (or week containing selectedDate)
      const idx = monthDates.indexOf(selectedDate)
      if (idx === -1) return monthDates.slice(0, 7)
      const startIdx = Math.floor(idx / 7) * 7
      return monthDates.slice(startIdx, startIdx + 7)
    }
    return monthDates
  }, [periodMode, selectedDate, selectedYearMonth, selectedWeekIndex])

  // ── Build Tasks for Active Period ──
  const allPeriodTasks = useMemo(() => {
    const list = []
    for (const dStr of activeDatesList) {
      const dayTasks = buildAllTasksForDate(dStr)
      for (const t of dayTasks) {
        if (activeSector !== "all" && t.sectorId !== activeSector) continue
        if (t.sectorId === "housekeeping") {
          if (hkFilterShift !== "all" && t.hkSubGroup !== hkFilterShift) continue
          if (hkFilterItem !== "all" && !matchesHkItemFilter(t, hkFilterItem)) continue
        }
        const rec = records[t.uid]
        const sectorDailyWf = records[`${dStr}__workforce__${t.sectorId}`]?.workforceCount || ""
        const effectiveStatus = rec?.status || t.defaultStatus || "pending"
        list.push({
          ...t,
          status: effectiveStatus,
          workforceCount: rec?.workforceCount !== undefined && rec?.workforceCount !== "" ? rec.workforceCount : sectorDailyWf,
          rawWorkforceCount: rec?.workforceCount ?? "",
          whatWasDone: rec?.whatWasDone || "",
          reasonOrBasis: rec?.reasonOrBasis || "",
          inspector: rec?.inspector || "",
          photos: rec?.photos || [],
          updatedAt: rec?.updatedAt || "",
        })
      }
    }
    return list
  }, [activeDatesList, activeSector, hkFilterShift, hkFilterItem, records])

  const filteredDailyTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allPeriodTasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false
      if (q) {
        const hay = `${t.sectorLabelAr} ${t.categoryAr} ${t.shiftOrSlotAr} ${t.requiredTaskAr} ${t.workforceCount} ${t.whatWasDone} ${t.reasonOrBasis} ${t.inspector}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allPeriodTasks, statusFilter, searchQuery])

  // ── KPIs for Current View (Daily / Weekly / Monthly) ──
  const kpis = useMemo(() => {
    let total = 0, done = 0, notDone = 0, partial = 0, pending = 0, na = 0
    const bySector = {
      landscape: { total: 0, done: 0, notDone: 0, partial: 0, pending: 0 },
      spider: { total: 0, done: 0, notDone: 0, partial: 0, pending: 0 },
      pest: { total: 0, done: 0, notDone: 0, partial: 0, pending: 0 },
      housekeeping: { total: 0, done: 0, notDone: 0, partial: 0, pending: 0 },
    }

    for (const t of allPeriodTasks) {
      if (t.status === "na") {
        na++
        continue
      }
      total++
      const sec = bySector[t.sectorId]
      if (sec) sec.total++
      if (t.status === "done") { done++; if (sec) sec.done++ }
      else if (t.status === "not_done") { notDone++; if (sec) sec.notDone++ }
      else if (t.status === "partial") { partial++; if (sec) sec.partial++ }
      else { pending++; if (sec) sec.pending++ }
    }

    const completionPct = total > 0 ? Math.round(((done + partial * 0.5) / total) * 100) : 0
    return { total, done, notDone, partial, pending, na, completionPct, bySector }
  }, [allPeriodTasks])

  // ══════════════════════════════════════════════════════════════════════════
  // 📊 EXPORT ENGINE: EXCEL (ExcelJS) • PDF / PRINT • WORD (.doc)
  // ══════════════════════════════════════════════════════════════════════════
  const periodTitleAr =
    periodMode === "daily"
      ? `التقرير اليومي (${selectedDate} — ${getArabicDayName(selectedDate)})`
      : periodMode === "weekly"
      ? `التقرير الأسبوعي (${activeDatesList[0]} إلى ${activeDatesList[activeDatesList.length - 1]})`
      : `التقرير الشهري الشامل (شهر ${selectedYearMonth})`

  const sectorTitleAr = SECTORS.find((s) => s.id === activeSector)?.labelAr || "جميع القطاعات"

  async function handleExportExcel() {
    if (exporting) return
    setExporting(true)
    const toastId = toast.loading(tr("⏳ جاري تجهيز ملف الإكسيل التفاعلي بالتنسيقات...", "⏳ Generating formatted Excel report..."))
    try {
      const wb = new ExcelJS.Workbook()
      wb.creator = "Smart Mall OS - Park Street"
      wb.created = new Date()

      // Sheet 1: Executive Summary & KPIs
      const wsSum = wb.addWorksheet("ملخص التنفيذ والمؤشرات", { views: [{ rightToLeft: true }] })
      wsSum.columns = [
        { width: 34 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
      ]

      const titleRow = wsSum.addRow([`PARK STREET MALL | ${periodTitleAr} — ${sectorTitleAr}`])
      wsSum.mergeCells("A1:G1")
      titleRow.height = 36
      titleRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        c.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      const subRow = wsSum.addRow([
        `تاريخ استخراج التقرير: ${new Date().toLocaleString("ar-EG")} | المشرف المسؤول: ${userName} | نسبة الإنجاز الإجمالية: ${kpis.completionPct}%`,
      ])
      wsSum.mergeCells("A2:G2")
      subRow.height = 24
      subRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      wsSum.addRow([])
      const hdr = wsSum.addRow([
        "القطاع التشغيلي / الشركة",
        "إجمالي المطلوب",
        "✓ تم التنفيذ",
        "◷ جاري / جزئي",
        "✗ لم يتم التنفيذ",
        "□ لم يُفحص",
        "نسبة الإنجاز %",
      ])
      hdr.height = 26
      hdr.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      for (const sec of SECTORS.filter((s) => s.id !== "all")) {
        const st = kpis.bySector[sec.id] || { total: 0, done: 0, partial: 0, notDone: 0, pending: 0 }
        const pct = st.total > 0 ? Math.round(((st.done + st.partial * 0.5) / st.total) * 100) : 0
        const r = wsSum.addRow([sec.labelAr, st.total, st.done, st.partial, st.notDone, st.pending, `${pct}%`])
        r.height = 22
        r.eachCell((c, colNo) => {
          c.alignment = { horizontal: colNo === 1 ? "right" : "center", vertical: "middle" }
          c.font = { name: "Arial", size: 11, bold: colNo === 1 || colNo === 7 }
          c.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          }
        })
      }

      // Sheet 2: Detailed Tasks Log
      const wsDet = wb.addWorksheet("تفاصيل المهام والمنفذ والملاحظات", {
        views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
      })
      wsDet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 12 },
        { width: 26 },
        { width: 28 },
        { width: 24 },
        { width: 44 },
        { width: 18 },
        { width: 22 },
        { width: 34 },
        { width: 34 },
        { width: 18 },
      ]

      const dTitle = wsDet.addRow([`سجل المتابعة التفصيلي للأعمال الميدانية — ${periodTitleAr}`])
      wsDet.mergeCells("A1:L1")
      dTitle.height = 32
      dTitle.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        c.font = { name: "Arial", size: 13, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      const dSub = wsDet.addRow([
        "يوضح هذا الجدول الأعمال المطلوب تنفيذها حسب الخطة المعتمدة، وحالة التنفيذ، وعدد العمالة الفعلي، وملاحظات المشرف",
      ])
      wsDet.mergeCells("A2:L2")
      dSub.height = 22
      dSub.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF94A3B8" } }
        c.alignment = { horizontal: "center", vertical: "middle" }
      })

      const dHdr = wsDet.addRow([
        "م",
        "التاريخ",
        "اليوم",
        "القطاع / الشركة",
        "الموقع / المبنى / النطاق",
        "الموعد / الوردية / البيان",
        "الأعمال المطلوبة حسب الخطة",
        "حالة التنفيذ",
        "عدد العمالة الفعلي",
        "البيان المنفذ / ملاحظات التنفيذ",
        "سبب عدم التنفيذ / الملاحظات",
        "المشرف المسؤول",
      ])
      dHdr.height = 28
      dHdr.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      })

      wsDet.autoFilter = { from: "A3", to: "L3" }

      filteredDailyTasks.forEach((t, idx) => {
        const stObj = EXEC_STATUSES.find((s) => s.id === t.status) || EXEC_STATUSES[0]
        const row = wsDet.addRow([
          idx + 1,
          t.date,
          t.dayName,
          t.sectorLabelAr,
          t.categoryAr,
          t.shiftOrSlotAr,
          t.requiredTaskAr,
          stObj.labelAr,
          t.workforceCount || "-",
          t.whatWasDone || (t.status === "done" ? "تم التنفيذ بالكامل وفق الخطة" : "-"),
          t.reasonOrBasis || "-",
          t.inspector || userName,
        ])
        row.height = 24
        const bgArgb =
          t.status === "done"
            ? "FFDCFCE7"
            : t.status === "not_done"
            ? "FFFEE2E2"
            : t.status === "partial"
            ? "FFFEF3C7"
            : "FFFFFFFF"

        row.eachCell((c, colNo) => {
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } }
          c.font = {
            name: "Arial",
            size: 10,
            bold: colNo === 8 || colNo === 7,
            color: {
              argb:
                t.status === "done"
                  ? "FF065F46"
                  : t.status === "not_done"
                  ? "FF991B1B"
                  : t.status === "partial"
                  ? "FF92400E"
                  : "FF1E293B",
            },
          }
          c.alignment = {
            horizontal: [1, 2, 3, 8].includes(colNo) ? "center" : "right",
            vertical: "middle",
            wrapText: true,
          }
          c.border = {
            top: { style: "thin", color: { argb: "FFCBD5E1" } },
            bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
            left: { style: "thin", color: { argb: "FFCBD5E1" } },
            right: { style: "thin", color: { argb: "FFCBD5E1" } },
          }
        })
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `تقرير_التشغيل_${periodMode}_${activeSector}_${selectedDate}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(tr("📊 تم تصدير شيت الإكسيل بنجاح!", "📊 Excel report exported successfully!"), { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error(tr("حدث خطأ أثناء تصدير الإكسيل", "Excel export failed"), { id: toastId })
    } finally {
      setExporting(false)
    }
  }

  function buildPrintableHtml() {
    const rowsHtml = filteredDailyTasks
      .map((t, i) => {
        const stObj = EXEC_STATUSES.find((s) => s.id === t.status) || EXEC_STATUSES[0]
        const rowBg =
          t.status === "done"
            ? "#ecfdf5"
            : t.status === "not_done"
            ? "#fef2f2"
            : t.status === "partial"
            ? "#fffbeb"
            : "#ffffff"
        return `<tr style="background:${rowBg}">
          <td style="text-align:center">${i + 1}</td>
          <td style="text-align:center">${t.date}<br/><small>${t.dayName}</small></td>
          <td><strong>${t.sectorLabelAr}</strong></td>
          <td>${t.categoryAr}<br/><small style="color:#475569">${t.shiftOrSlotAr}</small></td>
          <td><strong>${t.requiredTaskAr}</strong></td>
          <td style="text-align:center;font-weight:bold;color:${stObj.color}">${stObj.labelAr}</td>
          <td style="text-align:center">${t.workforceCount || "-"}</td>
          <td>${t.whatWasDone || (t.status === "done" ? "تم التنفيذ وفق الخطة" : "-")}</td>
          <td>${t.reasonOrBasis || "-"}</td>
          <td style="text-align:center">${t.inspector || userName}</td>
        </tr>`
      })
      .join("")

    return `<!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8"/>
      <title>تقرير خطط التشغيل — بارك ستريت</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 24px; color: #0f172a; direction: rtl; }
        .header { background: #0f172a; color: #fff; padding: 18px 24px; border-radius: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 18px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center; background: #f8fafc; }
        .kpi .val { font-size: 22px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #1e293b; color: #fff; padding: 10px 8px; border: 1px solid #334155; }
        td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
        @media print { .no-print { display: none; } body { margin: 8px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h2 style="margin:0 0 6px">PARK STREET MALL — نظام متابعة خطط التشغيل الميدانية</h2>
          <div style="font-size:14px;color:#38bdf8">${periodTitleAr} | القطاع: ${sectorTitleAr}</div>
        </div>
        <div style="text-align:left;font-size:12px">
          <div>تاريخ التقرير: ${new Date().toLocaleDateString("ar-EG")}</div>
          <div>المشرف: ${userName}</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="val" style="color:#0284c7">${kpis.total}</div><div>إجمالي المهام المطلوبة</div></div>
        <div class="kpi"><div class="val" style="color:#059669">${kpis.done}</div><div>✓ تم التنفيذ</div></div>
        <div class="kpi"><div class="val" style="color:#d97706">${kpis.partial}</div><div>◷ جاري / جزئي</div></div>
        <div class="kpi"><div class="val" style="color:#dc2626">${kpis.notDone}</div><div>✗ لم يتم التنفيذ</div></div>
        <div class="kpi"><div class="val" style="color:#7c3aed">${kpis.completionPct}%</div><div>نسبة الإنجاز</div></div>
      </div>
      <table>
        <thead>
          <tr>
            <th>م</th>
            <th>التاريخ</th>
            <th>القطاع / الشركة</th>
            <th>الموقع / الوردية</th>
            <th>الأعمال المطلوبة حسب الخطة</th>
            <th>الحالة</th>
            <th>عدد العمالة</th>
            <th>البيان المنفذ / ملاحظات التنفيذ</th>
            <th>سبب عدم التنفيذ / الملاحظات</th>
            <th>المشرف</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
    </html>`
  }

  function handleExportPDFPrint() {
    const html = buildPrintableHtml()
    const win = window.open("", "_blank")
    if (!win) {
      alert(tr("يرجى السماح بالنوافذ المنبثقة للطباعة", "Please allow popups to print report"))
      return
    }
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 400)
  }

  function handleExportWord() {
    const html = buildPrintableHtml()
    const blob = new Blob(["\ufeff", html], { type: "application/msword" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `تقرير_التشغيل_${periodMode}_${activeSector}_${selectedDate}.doc`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(tr("📝 تم تحميل ملف الـ Word بنجاح!", "📝 Word report downloaded!"))
  }

  return (
    <div style={s.wrap}>
      {/* ── Top Hero Banner ── */}
      <div style={s.hero}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={s.heroBadge}>
              PARK STREET MALL — INTEGRATED ACTION PLANS & DAILY/WEEKLY/MONTHLY REPORTS
            </div>
            <h2 style={s.heroTitle}>
              📅 {tr(
                "مركز خطط التشغيل والتقارير الذكية (اللاندسكيب • السبايدر • البيست كنترول • الهاوس كيبنج)",
                "Operations Action Plans & Reports Center (Landscape • Spider • Pest Control • Housekeeping)"
              )}
            </h2>
            <p style={s.heroSub}>
              {tr(
                "متابعة خطط العمل اليومية والأسبوعية والشهرية تلقائياً، وتسجيل عدد العمالة الفعلي وحالة التنفيذ والملاحظات الميدانية واستخراج التقارير بجميع الصيغ",
                "Track daily, weekly & monthly action plans, record actual workforce count, execution status & field notes, and export multi-format reports"
              )}
            </p>
          </div>

          {/* Export Buttons (Excel / PDF / Word) */}
          {canExport && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportExcel}
                style={{ ...s.exportBtn, background: "linear-gradient(135deg, #059669, #10b981)" }}
              >
                📊 {exporting
                  ? tr("جاري التصدير...", "Exporting...")
                  : tr(`تصدير إكسيل (${periodMode === "daily" ? "يومي" : periodMode === "weekly" ? "أسبوعي" : "شهري"})`, `Export Excel (${periodMode})`)}
              </button>
              <button
                type="button"
                onClick={handleExportPDFPrint}
                style={{ ...s.exportBtn, background: "linear-gradient(135deg, #0284c7, #2563eb)" }}
              >
                🖨️ {tr("تقرير PDF / طباعة", "PDF / Print Report")}
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                style={{ ...s.exportBtn, background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                📝 {tr("تصدير Word", "Export Word")}
              </button>
            </div>
          )}
        </div>

        {/* ── 3 Period Mode Switcher (Daily / Weekly / Monthly) ── */}
        <div style={s.periodTabs}>
          {PERIOD_MODES.map((pm) => {
            const active = periodMode === pm.id
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPeriodMode(pm.id)}
                style={{
                  ...s.periodBtn,
                  background: active ? "linear-gradient(135deg, #f59e0b, #ea580c)" : "rgba(15,23,42,0.85)",
                  color: active ? "#fff" : "#cbd5e1",
                  borderColor: active ? "#f59e0b" : "#334155",
                  boxShadow: active ? "0 4px 16px rgba(245,158,11,0.35)" : "none",
                }}
              >
                <span style={{ fontSize: 18 }}>{pm.icon}</span>
                <span>{lang === "ar" ? pm.labelAr : pm.labelEn}</span>
              </button>
            )
          })}
        </div>

        {/* ── Date / Week / Month Selector Bar ── */}
        <div style={s.dateBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
              🗓️ {tr("التاريخ المحدد:", "Target Date:")}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateIso(selectedDate, -1))}
              style={s.navDayBtn}
              title={tr("اليوم السابق", "Previous Day")}
            >
              ◀ {tr("السابق", "Prev")}
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={s.dateInput}
            />
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateIso(selectedDate, 1))}
              style={s.navDayBtn}
              title={tr("اليوم التالي", "Next Day")}
            >
              {tr("التالي", "Next")} ▶
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayIso())}
              style={{ ...s.navDayBtn, background: "#0ea5e9", color: "#fff", borderColor: "#0ea5e9" }}
            >
              📍 {tr("النهارده (اليوم)", "Today")}
            </button>
            <span style={{
              background: "rgba(56,189,248,0.16)",
              border: "1px solid #0284c7",
              color: "#e0f2fe",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
            }}>
              📆 {getArabicDayName(selectedDate)} — {selectedDate}
            </span>
          </div>

          {periodMode === "weekly" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "#fde047", fontWeight: 800 }}>
                {tr("اختر الأسبوع:", "Select Week:")}
              </span>
              {[
                { idx: 0, label: tr("أسبوع التاريخ المحدد", "Selected Date's Week") },
                { idx: 1, label: tr("الأسبوع 1 (1-7)", "Week 1 (1-7)") },
                { idx: 2, label: tr("الأسبوع 2 (8-14)", "Week 2 (8-14)") },
                { idx: 3, label: tr("الأسبوع 3 (15-21)", "Week 3 (15-21)") },
                { idx: 4, label: tr("الأسبوع 4 (22-28)", "Week 4 (22-28)") },
                { idx: 5, label: tr("نهاية الشهر (29-31)", "Month End (29-31)") },
              ].map((w) => (
                <button
                  key={w.idx}
                  type="button"
                  onClick={() => setSelectedWeekIndex(w.idx)}
                  style={{
                    ...s.navDayBtn,
                    background: selectedWeekIndex === w.idx ? "#f59e0b" : "#0f172a",
                    color: selectedWeekIndex === w.idx ? "#fff" : "#94a3b8",
                  }}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── KPI Summary Cards ── */}
        <div style={s.kpiGrid} className="mobile-kpi-grid">
          <KpiBox label={tr("إجمالي المطلوب", "Total Scheduled")} value={kpis.total} color="#38bdf8" />
          <KpiBox label={tr("✓ تم التنفيذ", "✓ Executed")} value={kpis.done} color="#10b981" />
          <KpiBox label={tr("◷ جاري / جزئي", "◷ Partial / WIP")} value={kpis.partial} color="#f59e0b" />
          <KpiBox label={tr("✗ لم يتم التنفيذ", "✗ Not Executed")} value={kpis.notDone} color="#ef4444" />
          <KpiBox label={tr("□ لم يُفحص", "□ Pending Check")} value={kpis.pending} color="#94a3b8" />
          <KpiBox label={tr("نسبة الالتزام والإنجاز", "Compliance Rate")} value={`${kpis.completionPct}%`} color="#c084fc" />
        </div>
      </div>

      {/* ── 5 Sector Selector Cards (All + 4 Operational Sectors) ── */}
      <div style={s.sectorGrid} className="mobile-kpi-grid">
        {SECTORS.map((sec) => {
          const active = activeSector === sec.id
          const st = sec.id === "all" ? kpis : (kpis.bySector[sec.id] || { total: 0, done: 0, notDone: 0 })
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSector(sec.id)}
              style={{
                ...s.sectorCard,
                border: active ? `2px solid ${sec.color}` : "1px solid #1e293b",
                background: active ? `${sec.color}18` : "#0a1628",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ fontSize: 24 }}>{sec.icon}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: st.notDone > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.18)",
                  color: st.notDone > 0 ? "#fca5a5" : "#6ee7b7",
                }}>
                  {st.notDone > 0 ? `✗ ${st.notDone} لم يتم` : `✓ ${st.done}/${st.total}`}
                </span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: active ? "#fff" : "#e2e8f0", marginTop: 8 }}>
                {lang === "ar" ? sec.labelAr : sec.labelEn}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Daily Workforce Attendance Bar (عدد العمالة غير ثابت ويُسجل يومياً) ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.85))",
        border: "1px solid #334155",
        borderRadius: 14,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
            👷 {tr(
              `تسجيل عدد العمالة الفعلي المتواجد يوم (${selectedDate} — ${getArabicDayName(selectedDate)}):`,
              `Actual Workforce Count on Site (${selectedDate}):`
            )}
          </div>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            {tr("عدد العمالة غير ثابت ويتم تسجيل العدد الفعلي المتواجد على أرض الواقع يومياً لكل قطاع أو لكل بند", "Workforce count is dynamic and recorded daily per sector or task")}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 8 }}>
          {SECTORS.filter((sc) => sc.id !== "all").map((sc) => {
            const wfVal = records[`${selectedDate}__workforce__${sc.id}`]?.workforceCount || ""
            return (
              <div
                key={sc.id}
                style={{
                  background: "#060d1a",
                  border: `1px solid ${sc.color}44`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <label style={{ fontSize: 11.5, fontWeight: 800, color: sc.color }}>
                  {sc.icon} {lang === "ar" ? sc.labelAr : sc.labelEn}
                </label>
                <input
                  style={s.miniInput}
                  placeholder={tr("اكتب عدد العمالة والمشرفين الفعلي اليوم...", "Enter actual workers & supervisors...")}
                  value={wfVal}
                  onChange={(e) => saveSectorWorkforce(selectedDate, sc.id, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Housekeeping Shift & Granular Item/Area Filters (When Housekeeping or All is active) ── */}
      {(activeSector === "housekeeping" || activeSector === "all") && (
        <div
          className="mobile-section-card"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "#0a1628",
            border: "1px solid #a855f755",
            borderRadius: 14,
            padding: "12px 16px",
            minWidth: 0,
          }}
        >
          {/* Row 1: Shift / Schedule Filter */}
          <div className="mobile-scroll-pills" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#c084fc" }}>
              🕐 {tr("فلتر ورديات الهاوس كيبنج:", "Housekeeping Shifts Filter:")}
            </span>
            {[
              { id: "all",     label: tr("الكل (الـ 3 ورديات)", "All (3 Shifts)") },
              { id: "morning", label: tr("🌅 الوردية الصباحية (جدول نوفمبر 2026 — 30 يوم)", "🌅 Morning Shift (Nov 2026 — 30 Days)") },
              { id: "evening", label: tr("🌇 الوردية المسائية (جدول نوفمبر 2026 — 30 يوم)", "🌇 Evening Shift (Nov 2026 — 30 Days)") },
              { id: "night",   label: tr("🌙 الوردية الليلية (جدول نوفمبر 2026 — 30 يوم)", "🌙 Night Shift (Nov 2026 — 30 Days)") },
            ].map((sh) => (
              <button
                key={sh.id}
                type="button"
                onClick={() => setHkFilterShift(sh.id)}
                style={{
                  ...s.filterPill,
                  background: hkFilterShift === sh.id ? "#a855f7" : "#060d1a",
                  color: hkFilterShift === sh.id ? "#fff" : "#cbd5e1",
                  borderColor: hkFilterShift === sh.id ? "#a855f7" : "#334155",
                }}
              >
                {sh.label}
              </button>
            ))}
          </div>

          {/* Row 2: Granular Housekeeping Area / Item Filter */}
          <div
            className="mobile-scroll-pills"
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              alignItems: "center",
              paddingTop: 8,
              borderTop: "1px solid #1e293b",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
              🧹 {tr("فلتر أعمدة جدول النظافة:", "Housekeeping Columns Filter:")}
            </span>
            {HK_ITEM_FILTERS.map((flt) => {
              const isSelected = hkFilterItem === flt.id
              return (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => {
                    setHkFilterItem(flt.id)
                    if (flt.id !== "all" && activeSector === "all") {
                      setActiveSector("housekeeping")
                    }
                  }}
                  style={{
                    ...s.filterPill,
                    background: isSelected ? "linear-gradient(135deg, #0284c7, #7c3aed)" : "#060d1a",
                    color: isSelected ? "#fff" : "#e2e8f0",
                    borderColor: isSelected ? "#38bdf8" : "#334155",
                    fontSize: 11.5,
                    padding: "6px 11px",
                  }}
                >
                  {flt.icon} {lang === "ar" ? flt.labelAr : flt.labelEn}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Search, Status Filter & Bulk Action Bar ── */}
      <div style={s.filterBar} className="mobile-stack-row">
        <input
          style={{ ...s.input, flex: 1, minWidth: 0 }}
          placeholder={tr("🔍 ابحث في المهام المطلوبة أو الموقع أو المبيد أو الملاحظات...", "🔍 Search tasks, locations, pesticides, or notes...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="mobile-scroll-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              ...s.filterPill,
              background: statusFilter === "all" ? "#38bdf8" : "#060d1a",
              color: statusFilter === "all" ? "#0f172a" : "#94a3b8",
            }}
          >
            {tr("الكل", "All")} ({allPeriodTasks.length})
          </button>
          {EXEC_STATUSES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              style={{
                ...s.filterPill,
                background: statusFilter === st.id ? st.color : "#060d1a",
                color: statusFilter === st.id ? "#fff" : st.color,
                borderColor: st.color,
              }}
            >
              {lang === "ar" ? st.labelAr : st.labelEn}
            </button>
          ))}
        </div>

        {canModify && periodMode === "daily" && (
          <button
            type="button"
            onClick={() => markAllVisibleTasks("done")}
            style={{
              background: "rgba(16,185,129,0.18)",
              border: "1px solid #10b981",
              color: "#6ee7b7",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            ✓ {tr("اعتماد المعروض كـ «تم التنفيذ»", "Mark Visible as Executed")}
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 🌙 NIGHT SHIFT 30-DAY MASTER TABLE (جدول أعمال النظافة والتأسيس | نوفمبر 2026) */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activeSector === "housekeeping" || activeSector === "all") &&
        (hkFilterShift === "all" || hkFilterShift === "night") &&
        (() => {
          const dayRowsWithStatus = HK_NIGHT_SHIFT_MONTHLY_DAYS.map((r) => {
            const daySummaryUid = `${r.date}__hk_night_day__${r.day}`
            const savedDayRec = records[daySummaryUid] || {}
            // Also check if all 5 daily night tasks for that date are marked done
            const mainTaskRec = records[`${r.date}__housekeeping__night_d${r.day}_main`]
            const effectiveStatus = savedDayRec.status || mainTaskRec?.status || "pending"
            const effectiveNotes = savedDayRec.whatWasDone ?? mainTaskRec?.whatWasDone ?? ""
            return {
              ...r,
              daySummaryUid,
              status: effectiveStatus,
              supervisorNotes: effectiveNotes,
            }
          })

          const totalPlanDays = dayRowsWithStatus.length // 30
          const executedDaysCount = dayRowsWithStatus.filter((r) => r.status === "done").length
          const remainingDaysCount = totalPlanDays - executedDaysCount
          const completionPct = Math.round((executedDaysCount / totalPlanDays) * 100)

          const cycleNightDayStatus = (row) => {
            if (!canModify) return
            const order = ["pending", "partial", "done", "not_done"]
            const nextStatus = order[(order.indexOf(row.status) + 1) % order.length]
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية الليلية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌙 الوردية الليلية",
              requiredTaskAr: `${row.main} | ${row.joints}`,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { status: nextStatus })
          }

          const saveNightDayNote = (row, noteVal) => {
            if (!canModify) return
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية الليلية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌙 الوردية الليلية",
              requiredTaskAr: `${row.main} | ${row.joints}`,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { whatWasDone: noteVal })
          }

          return (
            <div
              className="mobile-section-card"
              style={{
                ...s.card,
                border: "1.5px solid #a855f7",
                background: "linear-gradient(135deg, rgba(88,28,135,0.22), rgba(15,23,42,0.95))",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#c084fc", letterSpacing: 0.5 }}>
                    NIGHT SHIFT HOUSEKEEPING MASTER PLAN — NOVEMBER 2026
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: 17, fontWeight: 900, color: "#f8fafc", lineHeight: 1.4 }}>
                    🌙 {tr("جدول أعمال النظافة والتأسيس — الوردية الليلية | نوفمبر 2026", "Night Shift Cleaning & Foundation Schedule | November 2026")}
                  </h3>
                  <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                    {tr(
                      "خطة تنفيذ يومية مختصرة — تنظيف تندات المطاعم + غسيل أرضية الفواصل + الأعمال الجانبية والجراج والتحميل",
                      "Daily Execution Plan — Restaurant Awnings + Floor Joints + Side Works + Garage CAT + Loading Dock"
                    )}
                  </div>
                </div>
              </div>

              {/* 4 KPI Summary Strip matching the Excel header */}
              <div
                className="mobile-kpi-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>{tr("إجمالي أيام الخطة", "Total Plan Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#38bdf8", marginTop: 2 }}>{totalPlanDays}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 800 }}>{tr("تم التنفيذ", "Completed Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 2 }}>{executedDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#fcd34d", fontWeight: 800 }}>{tr("المتبقي", "Remaining Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{remainingDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#d8b4fe", fontWeight: 800 }}>{tr("نسبة الإنجاز", "Completion Rate")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#c084fc", marginTop: 2 }}>{completionPct}%</div>
                </div>
              </div>

              {/* Desktop Table View (> 768px) */}
              <div className="desktop-table-view" style={{ maxHeight: 540, overflowY: "auto", border: "1px solid #334155", borderRadius: 12 }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 95 }}>{tr("التاريخ", "Date")}</th>
                      <th style={{ ...s.th, width: 72 }}>{tr("اليوم", "Day")}</th>
                      <th style={{ ...s.th, color: "#c084fc" }}>{tr("أعمال التنظيف الرئيسية", "Main Cleaning Works")}</th>
                      <th style={{ ...s.th, color: "#38bdf8" }}>{tr("غسيل أرضية فواصل المطاعم", "Restaurant Floor Joints")}</th>
                      <th style={{ ...s.th, color: "#4ade80" }}>{tr("الأعمال الجانبية", "Side Works")}</th>
                      <th style={{ ...s.th, color: "#facc15" }}>{tr("أعمال الجراج (كات)", "Garage CAT Works")}</th>
                      <th style={{ ...s.th, width: 85, textAlign: "center" }}>{tr("منطقة التحميل", "Loading")}</th>
                      <th style={{ ...s.th, width: 115, textAlign: "center" }}>{tr("الحالة", "Status")}</th>
                      <th style={{ ...s.th, width: 190 }}>{tr("ملاحظات المشرف", "Supervisor Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRowsWithStatus.map((row) => {
                      const isSelectedDay = row.date === selectedDate
                      const stBadge =
                        row.status === "done"
                          ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                          : row.status === "partial"
                          ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                          : row.status === "not_done"
                          ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                          : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                      return (
                        <tr
                          key={row.day}
                          style={{
                            background: isSelectedDay ? "rgba(168,85,247,0.18)" : "transparent",
                            borderBottom: "1px solid #1e293b",
                          }}
                        >
                          <td
                            onClick={() => {
                              setSelectedDate(row.date)
                              setPeriodMode("daily")
                            }}
                            style={{ ...s.td, fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", cursor: "pointer" }}
                            title={tr("اضغط لعرض بنود هذا اليوم", "Click to select day")}
                          >
                            {isSelectedDay ? `📌 ${row.date}` : row.date}
                          </td>
                          <td style={{ ...s.td, fontWeight: 800, color: "#38bdf8" }}>{row.dayName}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: "#f8fafc", lineHeight: 1.5 }}>{row.main}</td>
                          <td style={{ ...s.td, color: "#e2e8f0", lineHeight: 1.5 }}>{row.joints}</td>
                          <td style={{ ...s.td, color: "#cbd5e1", lineHeight: 1.5 }}>{row.side}</td>
                          <td style={{ ...s.td, color: "#fde68a", lineHeight: 1.5 }}>{row.garage}</td>
                          <td style={{ ...s.td, textAlign: "center", fontWeight: 800, color: "#34d399" }}>{row.loading}</td>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => cycleNightDayStatus(row)}
                              style={{
                                background: stBadge.bg,
                                color: stBadge.color,
                                border: `1px solid ${stBadge.border}`,
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stBadge.label}
                            </button>
                          </td>
                          <td style={s.td}>
                            <input
                              type="text"
                              value={row.supervisorNotes}
                              onChange={(e) => saveNightDayNote(row, e.target.value)}
                              placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                              style={s.miniInput}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (≤ 768px — Native Phone Layout) */}
              <div className="mobile-cards-view" style={{ maxHeight: 520, overflowY: "auto", paddingRight: 2 }}>
                {dayRowsWithStatus.map((row) => {
                  const isSelectedDay = row.date === selectedDate
                  const stBadge =
                    row.status === "done"
                      ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                      : row.status === "partial"
                      ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                      : row.status === "not_done"
                      ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                      : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                  return (
                    <div
                      key={row.day}
                      style={{
                        background: isSelectedDay ? "rgba(168,85,247,0.18)" : "rgba(6,13,26,0.9)",
                        border: `1.5px solid ${isSelectedDay ? "#a855f7" : "#334155"}`,
                        borderRadius: 12,
                        padding: 12,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.18)", paddingBottom: 6 }}>
                        <span
                          onClick={() => {
                            setSelectedDate(row.date)
                            setPeriodMode("daily")
                          }}
                          style={{ fontWeight: 900, fontSize: 14, color: "#f8fafc", cursor: "pointer" }}
                        >
                          🗓️ {row.date} ({row.dayName})
                        </span>
                        <button
                          type="button"
                          onClick={() => cycleNightDayStatus(row)}
                          style={{
                            background: stBadge.bg,
                            color: stBadge.color,
                            border: `1px solid ${stBadge.border}`,
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {stBadge.label}
                        </button>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#f8fafc", lineHeight: 1.5 }}>
                        <strong style={{ color: "#c084fc" }}>⛺ الرئيسية: </strong>{row.main}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.5 }}>
                        <strong style={{ color: "#38bdf8" }}>🍽️ الفواصل: </strong>{row.joints}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                        <strong style={{ color: "#4ade80" }}>🧱 الجانبية: </strong>{row.side}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#fde68a", lineHeight: 1.5 }}>
                        <strong style={{ color: "#facc15" }}>🚗 الجراج (كات): </strong>{row.garage} | <strong style={{ color: "#34d399" }}>🚛 التحميل: </strong>{row.loading}
                      </div>
                      <input
                        type="text"
                        value={row.supervisorNotes}
                        onChange={(e) => saveNightDayNote(row, e.target.value)}
                        placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                        style={s.miniInput}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Footer Note from the Sheet */}
              <div style={{ marginTop: 10, fontSize: 12, color: "#cbd5e1", background: "rgba(15,23,42,0.75)", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px" }}>
                📌 <strong>{tr("ملاحظة:", "Note:")}</strong> {HK_NIGHT_PLAN_NOTE}
              </div>
            </div>
          )
        })()}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 🌅 MORNING SHIFT 30-DAY MASTER TABLE (جدول أعمال النظافة — الوردية الصباحية | نوفمبر 2026) */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activeSector === "housekeeping" || activeSector === "all") &&
        (hkFilterShift === "all" || hkFilterShift === "morning") &&
        (() => {
          const morningRowsWithStatus = HK_MORNING_SHIFT_MONTHLY_DAYS.map((r) => {
            const daySummaryUid = `${r.date}__hk_morning_day__${r.day}`
            const savedDayRec = records[daySummaryUid] || {}
            const firstTaskRec = records[`${r.date}__housekeeping__morning_d${r.day}_t1`]
            const effectiveStatus = savedDayRec.status || firstTaskRec?.status || "pending"
            const effectiveNotes = savedDayRec.whatWasDone ?? firstTaskRec?.whatWasDone ?? ""
            return {
              ...r,
              daySummaryUid,
              status: effectiveStatus,
              supervisorNotes: effectiveNotes,
            }
          })

          const totalPlanDays = morningRowsWithStatus.length // 30
          const executedDaysCount = morningRowsWithStatus.filter((r) => r.status === "done").length
          const remainingDaysCount = totalPlanDays - executedDaysCount
          const completionPct = Math.round((executedDaysCount / totalPlanDays) * 100)

          const cycleMorningDayStatus = (row) => {
            if (!canModify) return
            const order = ["pending", "partial", "done", "not_done"]
            const nextStatus = order[(order.indexOf(row.status) + 1) % order.length]
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية الصباحية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌅 الوردية الصباحية",
              requiredTaskAr: row.summaryText,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { status: nextStatus })
          }

          const saveMorningDayNote = (row, noteVal) => {
            if (!canModify) return
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية الصباحية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌅 الوردية الصباحية",
              requiredTaskAr: row.summaryText,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { whatWasDone: noteVal })
          }

          return (
            <div
              className="mobile-section-card"
              style={{
                ...s.card,
                border: "1.5px solid #f59e0b",
                background: "linear-gradient(135deg, rgba(180,83,9,0.20), rgba(15,23,42,0.95))",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#fbbf24", letterSpacing: 0.5 }}>
                    MORNING SHIFT HOUSEKEEPING MASTER PLAN — NOVEMBER 2026 (7-DAY CYCLE REPEATED ACROSS 30 DAYS)
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: 17, fontWeight: 900, color: "#f8fafc", lineHeight: 1.4 }}>
                    🌅 {tr("جدول أعمال النظافة — الوردية الصباحية | نوفمبر 2026 (مكرر على مدار الشهر)", "Morning Shift Cleaning Schedule | November 2026 (30 Days)")}
                  </h3>
                  <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                    {tr(
                      "خطة الوردية الصباحية (مهام الأيام من 1 إلى 7 مكررة طوال الشهر) — أدوار وحمامات المباني 1-2-3 • البلازا والأضلاع • المصليات • سلالم الطوارئ • الريسبشنات وتراس مبنى 1",
                      "Morning Shift 30-Day Plan — Buildings 1-2-3 Floors & Restrooms • Plaza & Wings • Prayer Rooms • Emergency Stairs • Receptions & Terrace"
                    )}
                  </div>
                </div>
              </div>

              {/* 4 KPI Summary Strip */}
              <div
                className="mobile-kpi-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>{tr("إجمالي أيام الخطة", "Total Plan Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", marginTop: 2 }}>{totalPlanDays}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 800 }}>{tr("تم التنفيذ", "Completed Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 2 }}>{executedDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#fcd34d", fontWeight: 800 }}>{tr("المتبقي", "Remaining Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{remainingDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(56,189,248,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#7dd3fc", fontWeight: 800 }}>{tr("نسبة الإنجاز", "Completion Rate")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#38bdf8", marginTop: 2 }}>{completionPct}%</div>
                </div>
              </div>

              {/* Desktop Table View (> 768px) */}
              <div className="desktop-table-view" style={{ maxHeight: 540, overflowY: "auto", border: "1px solid #334155", borderRadius: 12 }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 100 }}>{tr("التاريخ", "Date")}</th>
                      <th style={{ ...s.th, width: 85 }}>{tr("اليوم", "Day")}</th>
                      <th style={{ ...s.th, width: 150, color: "#fbbf24" }}>{tr("الأسبوع", "Week")}</th>
                      <th style={{ ...s.th, color: "#38bdf8" }}>{tr("الأعمال المطلوبة في الوردية الصباحية", "Morning Shift Scheduled Tasks")}</th>
                      <th style={{ ...s.th, width: 120, textAlign: "center" }}>{tr("الحالة", "Status")}</th>
                      <th style={{ ...s.th, width: 210 }}>{tr("ملاحظات المشرف", "Supervisor Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {morningRowsWithStatus.map((row) => {
                      const isSelectedDay = row.date === selectedDate
                      const stBadge =
                        row.status === "done"
                          ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                          : row.status === "partial"
                          ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                          : row.status === "not_done"
                          ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                          : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                      return (
                        <tr
                          key={row.day}
                          style={{
                            background: isSelectedDay ? "rgba(245,158,11,0.16)" : "transparent",
                            borderBottom: "1px solid #1e293b",
                          }}
                        >
                          <td
                            onClick={() => {
                              setSelectedDate(row.date)
                              setPeriodMode("daily")
                            }}
                            style={{ ...s.td, fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", cursor: "pointer" }}
                            title={tr("اضغط لعرض بنود هذا اليوم", "Click to select day")}
                          >
                            {isSelectedDay ? `📌 ${row.date}` : row.date}
                          </td>
                          <td style={{ ...s.td, fontWeight: 800, color: "#fbbf24" }}>{row.dayName}</td>
                          <td style={{ ...s.td, fontSize: 11.5, color: "#cbd5e1", fontWeight: 700 }}>{row.weekLabelAr}</td>
                          <td style={{ ...s.td, padding: "10px 12px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {row.taskObjects.map((item, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "rgba(15,23,42,0.9)",
                                    border: "1px solid rgba(56,189,248,0.3)",
                                    borderRadius: 8,
                                    padding: "5px 10px",
                                    fontSize: 12,
                                    color: "#f8fafc",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  <strong style={{ color: "#fbbf24" }}>{idx + 1}.</strong> {item.task}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => cycleMorningDayStatus(row)}
                              style={{
                                background: stBadge.bg,
                                color: stBadge.color,
                                border: `1px solid ${stBadge.border}`,
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stBadge.label}
                            </button>
                          </td>
                          <td style={s.td}>
                            <input
                              type="text"
                              value={row.supervisorNotes}
                              onChange={(e) => saveMorningDayNote(row, e.target.value)}
                              placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                              style={s.miniInput}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (≤ 768px — Native Phone Layout) */}
              <div className="mobile-cards-view" style={{ maxHeight: 520, overflowY: "auto", paddingRight: 2 }}>
                {morningRowsWithStatus.map((row) => {
                  const isSelectedDay = row.date === selectedDate
                  const stBadge =
                    row.status === "done"
                      ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                      : row.status === "partial"
                      ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                      : row.status === "not_done"
                      ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                      : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                  return (
                    <div
                      key={row.day}
                      style={{
                        background: isSelectedDay ? "rgba(245,158,11,0.16)" : "rgba(6,13,26,0.9)",
                        border: `1.5px solid ${isSelectedDay ? "#f59e0b" : "#334155"}`,
                        borderRadius: 12,
                        padding: 12,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.18)", paddingBottom: 6 }}>
                        <div>
                          <div
                            onClick={() => {
                              setSelectedDate(row.date)
                              setPeriodMode("daily")
                            }}
                            style={{ fontWeight: 900, fontSize: 14, color: "#f8fafc", cursor: "pointer" }}
                          >
                            🌅 {row.date} ({row.dayName})
                          </div>
                          <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{row.weekLabelAr}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cycleMorningDayStatus(row)}
                          style={{
                            background: stBadge.bg,
                            color: stBadge.color,
                            border: `1px solid ${stBadge.border}`,
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {stBadge.label}
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        {row.taskObjects.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              fontSize: 12.5,
                              color: "#f8fafc",
                              background: "rgba(15,23,42,0.75)",
                              border: "1px solid rgba(56,189,248,0.22)",
                              borderRadius: 8,
                              padding: "6px 8px",
                              lineHeight: 1.45,
                            }}
                          >
                            <strong style={{ color: "#fbbf24" }}>{idx + 1}. {item.area}: </strong>{item.task}
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={row.supervisorNotes}
                        onChange={(e) => saveMorningDayNote(row, e.target.value)}
                        placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                        style={s.miniInput}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Footer Note */}
              <div style={{ marginTop: 10, fontSize: 12, color: "#cbd5e1", background: "rgba(15,23,42,0.75)", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px" }}>
                📌 <strong>{tr("ملاحظة:", "Note:")}</strong> {HK_MORNING_PLAN_NOTE}
              </div>
            </div>
          )
        })()}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* 🌇 EVENING SHIFT 30-DAY MASTER TABLE (جدول أعمال النظافة والتأسيس — الوردية المسائية | نوفمبر 2026) */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {(activeSector === "housekeeping" || activeSector === "all") &&
        (hkFilterShift === "all" || hkFilterShift === "evening") &&
        (() => {
          const eveningRowsWithStatus = HK_EVENING_SHIFT_MONTHLY_DAYS.map((r) => {
            const daySummaryUid = `${r.date}__hk_evening_day__${r.day}`
            const savedDayRec = records[daySummaryUid] || {}
            const firstTaskRec = records[`${r.date}__housekeeping__evening_d${r.day}_t1`]
            const effectiveStatus = savedDayRec.status || firstTaskRec?.status || "pending"
            const effectiveNotes = savedDayRec.whatWasDone ?? firstTaskRec?.whatWasDone ?? ""
            return {
              ...r,
              daySummaryUid,
              status: effectiveStatus,
              supervisorNotes: effectiveNotes,
            }
          })

          const totalPlanDays = eveningRowsWithStatus.length // 30
          const executedDaysCount = eveningRowsWithStatus.filter((r) => r.status === "done").length
          const remainingDaysCount = totalPlanDays - executedDaysCount
          const completionPct = Math.round((executedDaysCount / totalPlanDays) * 100)

          const cycleEveningDayStatus = (row) => {
            if (!canModify) return
            const order = ["pending", "partial", "done", "not_done"]
            const nextStatus = order[(order.indexOf(row.status) + 1) % order.length]
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية المسائية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌇 الوردية المسائية",
              requiredTaskAr: row.summaryText,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { status: nextStatus })
          }

          const saveEveningDayNote = (row, noteVal) => {
            if (!canModify) return
            const fakeTask = {
              uid: row.daySummaryUid,
              date: row.date,
              dayName: row.dayName,
              sectorId: "housekeeping",
              categoryAr: "الوردية المسائية — خطة نوفمبر 2026",
              shiftOrSlotAr: "🌇 الوردية المسائية",
              requiredTaskAr: row.summaryText,
              status: row.status,
              whatWasDone: row.supervisorNotes,
            }
            saveTaskRecord(fakeTask, { whatWasDone: noteVal })
          }

          return (
            <div
              className="mobile-section-card"
              style={{
                ...s.card,
                border: "1.5px solid #0ea5e9",
                background: "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(15,23,42,0.95))",
                minWidth: 0,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#38bdf8", letterSpacing: 0.5 }}>
                    EVENING SHIFT HOUSEKEEPING MASTER PLAN — NOVEMBER 2026 (7-DAY CYCLE + DAILY CONSTANTS)
                  </div>
                  <h3 style={{ margin: "2px 0 4px 0", fontSize: 17, fontWeight: 900, color: "#f8fafc", lineHeight: 1.4 }}>
                    🌇 {tr("جدول أعمال النظافة والتأسيس — الوردية المسائية | نوفمبر 2026 (مكرر على مدار الشهر)", "Evening Shift Cleaning & Foundation Schedule | November 2026")}
                  </h3>
                  <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>
                    {tr(
                      "خطة الوردية المسائية (مهام التأسيس والمراجعة للأيام من 1 إلى 7 مكررة طوال الشهر) + ثوابت المتابعة اليومية: (تنظيف خلف المطاعم • تنظيف أرصفة الجراج)",
                      "Evening Shift 30-Day Plan — Buildings 1/2/3 Floors, B2 Stairs B, Prayer Room Foundation + Daily Constants (Behind Restaurants & Garage Sidewalks)"
                    )}
                  </div>
                </div>
              </div>

              {/* 4 KPI Summary Strip */}
              <div
                className="mobile-kpi-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 800 }}>{tr("إجمالي أيام الخطة", "Total Plan Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#38bdf8", marginTop: 2 }}>{totalPlanDays}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 800 }}>{tr("تم التنفيذ", "Completed Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 2 }}>{executedDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#fcd34d", fontWeight: 800 }}>{tr("المتبقي", "Remaining Days")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#f59e0b", marginTop: 2 }}>{remainingDaysCount}</div>
                </div>
                <div style={{ background: "rgba(15,23,42,0.85)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#d8b4fe", fontWeight: 800 }}>{tr("نسبة الإنجاز", "Completion Rate")}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#c084fc", marginTop: 2 }}>{completionPct}%</div>
                </div>
              </div>

              {/* Desktop Table View (> 768px) */}
              <div className="desktop-table-view" style={{ maxHeight: 540, overflowY: "auto", border: "1px solid #334155", borderRadius: 12 }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 95 }}>{tr("التاريخ", "Date")}</th>
                      <th style={{ ...s.th, width: 75 }}>{tr("اليوم", "Day")}</th>
                      <th style={{ ...s.th, width: 145, color: "#38bdf8" }}>{tr("الأسبوع", "Week")}</th>
                      <th style={{ ...s.th, color: "#f8fafc" }}>{tr("أعمال التأسيس والمراجعة الرئيسية (دورة الـ 7 أيام)", "Main Foundation & Review Task")}</th>
                      <th style={{ ...s.th, color: "#4ade80" }}>{tr("ثابت متابعة يومية (1): خلف المطاعم", "Daily Constant 1: Behind Restaurants")}</th>
                      <th style={{ ...s.th, color: "#facc15" }}>{tr("ثابت متابعة يومية (2): أرصفة الجراج", "Daily Constant 2: Garage Sidewalks")}</th>
                      <th style={{ ...s.th, width: 115, textAlign: "center" }}>{tr("الحالة", "Status")}</th>
                      <th style={{ ...s.th, width: 195 }}>{tr("ملاحظات المشرف", "Supervisor Notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eveningRowsWithStatus.map((row) => {
                      const isSelectedDay = row.date === selectedDate
                      const stBadge =
                        row.status === "done"
                          ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                          : row.status === "partial"
                          ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                          : row.status === "not_done"
                          ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                          : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                      return (
                        <tr
                          key={row.day}
                          style={{
                            background: isSelectedDay ? "rgba(14,165,233,0.18)" : "transparent",
                            borderBottom: "1px solid #1e293b",
                          }}
                        >
                          <td
                            onClick={() => {
                              setSelectedDate(row.date)
                              setPeriodMode("daily")
                            }}
                            style={{ ...s.td, fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", cursor: "pointer" }}
                            title={tr("اضغط لعرض بنود هذا اليوم", "Click to select day")}
                          >
                            {isSelectedDay ? `📌 ${row.date}` : row.date}
                          </td>
                          <td style={{ ...s.td, fontWeight: 800, color: "#38bdf8" }}>{row.dayName}</td>
                          <td style={{ ...s.td, fontSize: 11.5, color: "#cbd5e1", fontWeight: 700 }}>{row.weekLabelAr}</td>
                          <td style={{ ...s.td, fontWeight: 800, color: "#f8fafc", lineHeight: 1.5 }}>
                            🌇 {row.foundationTask}
                          </td>
                          <td style={{ ...s.td, color: "#86efac", fontWeight: 700, lineHeight: 1.5 }}>
                            🔄 {row.restaurantsBack}
                          </td>
                          <td style={{ ...s.td, color: "#fde047", fontWeight: 700, lineHeight: 1.5 }}>
                            🔄 {row.garageSidewalks}
                          </td>
                          <td style={{ ...s.td, textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => cycleEveningDayStatus(row)}
                              style={{
                                background: stBadge.bg,
                                color: stBadge.color,
                                border: `1px solid ${stBadge.border}`,
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {stBadge.label}
                            </button>
                          </td>
                          <td style={s.td}>
                            <input
                              type="text"
                              value={row.supervisorNotes}
                              onChange={(e) => saveEveningDayNote(row, e.target.value)}
                              placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                              style={s.miniInput}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (≤ 768px — Native Phone Layout) */}
              <div className="mobile-cards-view" style={{ maxHeight: 520, overflowY: "auto", paddingRight: 2 }}>
                {eveningRowsWithStatus.map((row) => {
                  const isSelectedDay = row.date === selectedDate
                  const stBadge =
                    row.status === "done"
                      ? { label: "✓ تم التنفيذ", bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                      : row.status === "partial"
                      ? { label: "⏳ جاري التنفيذ", bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                      : row.status === "not_done"
                      ? { label: "❌ لم يتم", bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                      : { label: "لم يبدأ", bg: "rgba(30,41,59,0.8)", color: "#94a3b8", border: "#475569" }
                  return (
                    <div
                      key={row.day}
                      style={{
                        background: isSelectedDay ? "rgba(14,165,233,0.18)" : "rgba(6,13,26,0.9)",
                        border: `1.5px solid ${isSelectedDay ? "#0ea5e9" : "#334155"}`,
                        borderRadius: 12,
                        padding: 12,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(148,163,184,0.18)", paddingBottom: 6 }}>
                        <div>
                          <div
                            onClick={() => {
                              setSelectedDate(row.date)
                              setPeriodMode("daily")
                            }}
                            style={{ fontWeight: 900, fontSize: 14, color: "#f8fafc", cursor: "pointer" }}
                          >
                            🌇 {row.date} ({row.dayName})
                          </div>
                          <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700 }}>{row.weekLabelAr}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => cycleEveningDayStatus(row)}
                          style={{
                            background: stBadge.bg,
                            color: stBadge.color,
                            border: `1px solid ${stBadge.border}`,
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {stBadge.label}
                        </button>
                      </div>
                      <div style={{ fontSize: 12.5, color: "#f8fafc", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 8, padding: "7px 9px", lineHeight: 1.5 }}>
                        <strong style={{ color: "#38bdf8" }}>🌇 المهمة التأسيسية لليوم: </strong>{row.foundationTask}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#86efac", lineHeight: 1.5 }}>
                        <strong>🔄 ثابت يومي (1): </strong>{row.restaurantsBack}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#fde047", lineHeight: 1.5 }}>
                        <strong>🔄 ثابت يومي (2): </strong>{row.garageSidewalks}
                      </div>
                      <input
                        type="text"
                        value={row.supervisorNotes}
                        onChange={(e) => saveEveningDayNote(row, e.target.value)}
                        placeholder={tr("ملاحظات المشرف...", "Supervisor notes...")}
                        style={s.miniInput}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Footer Note */}
              <div style={{ marginTop: 10, fontSize: 12, color: "#cbd5e1", background: "rgba(15,23,42,0.75)", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px" }}>
                📌 <strong>{tr("ملاحظة:", "Note:")}</strong> {HK_EVENING_PLAN_NOTE}
              </div>
            </div>
          )
        })()}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW A: MONTHLY MASTER SCHEDULE TABLES (When periodMode === "monthly") */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {periodMode === "monthly" && (
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc" }}>
                🗓️ {tr(`جدول خطة العمل الشهرية الكامل — شهر ${selectedYearMonth}`, `Full Monthly Master Action Plan — ${selectedYearMonth}`)}
              </h3>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {tr(
                  "اضغط على أي يوم في الجدول بالأسفل لفتح تفاصيل أعمال هذا اليوم وتسجيل ما تم وما لم يتم وملاحظاتك اليومية",
                  "Click any date row below to open that day's interactive execution checklist and record notes"
                )}
              </div>
            </div>
          </div>

          <div className="table-scroll" style={{ maxHeight: 520, overflowY: "auto", border: "1px solid #1e293b", borderRadius: 12 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>{tr("التاريخ", "Date")}</th>
                  <th style={s.th}>{tr("اليوم", "Day")}</th>
                  {(activeSector === "all" || activeSector === "landscape") && (
                    <>
                      <th style={{ ...s.th, color: "#4ade80" }}>🌿 {tr("اللاندسكيب (6-10 ص: الصيانة والنظافة)", "Landscape (6-10 AM)")}</th>
                      <th style={{ ...s.th, color: "#4ade80" }}>🌿 {tr("اللاندسكيب (10-1.5 م: الجزيرة الخارجية)", "Outer Island (10-1:30 PM)")}</th>
                    </>
                  )}
                  {(activeSector === "all" || activeSector === "spider") && (
                    <th style={{ ...s.th, color: "#38bdf8" }}>🧗‍♂️ {tr("السبايدر والواجهات (مبنى 1، 2، 3)", "Spider & Facades (B1, B2, B3)")}</th>
                  )}
                  {(activeSector === "all" || activeSector === "pest") && (
                    <th style={{ ...s.th, color: "#facc15" }}>🦟 {tr("البيست كنترول (Pro Vision)", "Pest Control (Pro Vision)")}</th>
                  )}
                  {(activeSector === "all" || activeSector === "housekeeping") && (
                    <th style={{ ...s.th, color: "#c084fc" }}>🧹 {tr("الهاوس كيبنج (الـ 3 ورديات: صباحية • مسائية • ليلية)", "Housekeeping (3 Shifts: Morning • Evening • Night)")}</th>
                  )}
                  <th style={s.th}>{tr("متابعة اليوم", "Inspect Day")}</th>
                </tr>
              </thead>
              <tbody>
                {activeDatesList.map((dStr) => {
                  const dayName = getArabicDayName(dStr)
                  const isFri = dayName === "الجمعة"
                  const land = getLandscapeDayPlan(dStr)
                  const spider = getSpiderDayPlan(dStr)
                  const pest = getPestControlDayPlan(dStr)
                  const hk = getHousekeepingDayPlan(dStr)

                  return (
                    <tr
                      key={dStr}
                      style={{
                        background: isFri ? "rgba(220,38,38,0.16)" : dStr === selectedDate ? "rgba(14,165,233,0.15)" : "transparent",
                        borderBottom: "1px solid #1e293b",
                      }}
                    >
                      <td style={{ ...s.td, fontWeight: 800, whiteSpace: "nowrap", color: "#f8fafc" }}>{dStr}</td>
                      <td style={{ ...s.td, fontWeight: 800, color: isFri ? "#fca5a5" : "#38bdf8" }}>{dayName}</td>

                      {(activeSector === "all" || activeSector === "landscape") && (
                        <>
                          <td style={s.td}>{isFri ? "إجازة أسبوعية" : land.tasks[0]?.taskAr}</td>
                          <td style={s.td}>{isFri ? "إجازة أسبوعية" : land.tasks[1]?.taskAr}</td>
                        </>
                      )}

                      {(activeSector === "all" || activeSector === "spider") && (
                        <td style={s.td}>
                          {isFri
                            ? "إجازة أسبوعية"
                            : spider.tasks.map((t) => t.taskAr).join(" | ")}
                        </td>
                      )}

                      {(activeSector === "all" || activeSector === "pest") && (
                        <td style={s.td}>
                          {pest.isTwiceWeeklyDay
                            ? "رش وفحص الـ 17 موقع + 🔥 فحص المصائد البيولوجية ومحطات القوارض"
                            : "رش وفحص الـ 17 موقع يومياً (زاحفة • طائرة • قوارض)"}
                        </td>
                      )}

                      {(activeSector === "all" || activeSector === "housekeeping") && (
                        <td style={s.td}>
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "#fbbf24" }}>🌅 الصباحية:</strong> {hk.morningEntry?.summaryText}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "#38bdf8" }}>🌇 المسائية:</strong> {hk.eveningEntry?.summaryText}
                          </div>
                          <div><strong style={{ color: "#c084fc" }}>🌙 الليلية (الرئيسية):</strong> {hk.nightEntry?.main}</div>
                          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                            <strong>الفواصل:</strong> {hk.nightEntry?.joints} | <strong>الجانبية:</strong> {hk.nightEntry?.side} | <strong>الجراج:</strong> {hk.nightEntry?.garage}
                          </div>
                        </td>
                      )}

                      <td style={{ ...s.td, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(dStr)
                            setPeriodMode("daily")
                          }}
                          style={{
                            background: "#0ea5e9",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📝 {tr("فتح تقرير اليوم", "Open Day Log")}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* VIEW B: INTERACTIVE EXECUTION LOG (Daily / Weekly / Filtered Tasks)     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      <div style={s.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc" }}>
              📋 {periodTitleAr} — {sectorTitleAr}
            </h3>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              {tr(
                `إجمالي المهام المعروضة: ${filteredDailyTasks.length} مهمة | حدد حالة كل مهمة وسجّل عدد العمالة وملاحظات التنفيذ`,
                `Showing ${filteredDailyTasks.length} scheduled tasks | Select execution status and record workforce & notes`
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredDailyTasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
              {hkFilterShift === "morning"
                ? tr("🌅 تم تفريغ بنود الوردية الصباحية القديمة — بانتظار تزويد جدول الوردية الصباحية الشهري", "🌅 Morning shift cleared — awaiting monthly Morning Shift schedule")
                : hkFilterShift === "evening"
                ? tr("🌇 تم تفريغ بنود الوردية المسائية القديمة — بانتظار تزويد جدول الوردية المسائية الشهري", "🌇 Evening shift cleared — awaiting monthly Evening Shift schedule")
                : tr("لا توجد مهام مطابقة للفلتر المحدد", "No tasks match the current filter")}
            </div>
          ) : (
            filteredDailyTasks.map((task, idx) => {
              const stObj = EXEC_STATUSES.find((st) => st.id === task.status) || EXEC_STATUSES[0]
              const secObj = SECTORS.find((sc) => sc.id === task.sectorId) || SECTORS[0]
              return (
                <div
                  key={task.uid}
                  style={{
                    background: "#060d1a",
                    border: `1px solid ${task.status === "not_done" ? "#ef4444" : task.status === "done" ? "#10b981" : "#1e293b"}`,
                    borderInlineStart: `4px solid ${secObj.color}`,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  {/* Top Row: Task Info & Status Buttons */}
                  <div className="mobile-stack-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{
                          background: `${secObj.color}22`,
                          color: secObj.color,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                        }}>
                          {secObj.icon} {task.sectorLabelAr}
                        </span>
                        <span style={{
                          background: "#0f172a",
                          color: "#38bdf8",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          border: "1px solid #1e293b",
                        }}>
                          🗓️ {task.date} ({task.dayName})
                        </span>
                        <span style={{
                          background: "#0f172a",
                          color: "#fde047",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          border: "1px solid #1e293b",
                        }}>
                          ⏰ {task.shiftOrSlotAr}
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 14.5, color: "#f8fafc", marginTop: 4, lineHeight: 1.5 }}>
                        {idx + 1}. {task.requiredTaskAr}
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        📍 {tr("الموقع / النطاق:", "Location / Scope:")} <strong style={{ color: "#cbd5e1" }}>{task.categoryAr}</strong>
                        {task.extraMetaAr ? ` • (${task.extraMetaAr})` : ""}
                      </div>
                    </div>

                    {/* Execution Status Buttons */}
                    <div className="mobile-btn-grid" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {EXEC_STATUSES.map((st) => {
                        const isCurrent = task.status === st.id
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => saveTaskRecord(task, { status: st.id })}
                            style={{
                              border: `1px solid ${isCurrent ? st.color : "#334155"}`,
                              background: isCurrent ? st.color : "#0f172a",
                              color: isCurrent ? "#fff" : st.color,
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
                    </div>
                  </div>

                  {/* Bottom Row: Workforce Count + Execution Notes + Non-execution Reason + Photo / Snag Actions */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 8,
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(30,41,59,0.7)",
                  }}>
                    <div>
                      <label style={s.miniLabel}>
                        👷 {tr("عدد العمالة الفعلي:", "Actual Workforce Count:")}
                      </label>
                      <input
                        style={s.miniInput}
                        placeholder={tr("اكتب عدد العمال والمشرفين...", "e.g. 4 workers + 1 supervisor...")}
                        value={task.workforceCount || ""}
                        onChange={(e) => saveTaskRecord(task, { workforceCount: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={s.miniLabel}>
                        📝 {tr("ملاحظات التنفيذ / البيان المنفذ:", "Execution Notes / Details:")}
                      </label>
                      <input
                        style={s.miniInput}
                        placeholder={tr("اكتب تفاصيل التنفيذ أو ملاحظات المشرف...", "Enter execution details or supervisor notes...")}
                        value={task.whatWasDone}
                        onChange={(e) => saveTaskRecord(task, { whatWasDone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={s.miniLabel}>
                        ⚠️ {tr("سبب عدم التنفيذ / الملاحظات الإضافية:", "Reason for Non-Execution / Remarks:")}
                      </label>
                      <input
                        style={{
                          ...s.miniInput,
                          borderColor: task.status === "not_done" ? "#ef4444" : "#1e293b",
                        }}
                        placeholder={tr("في حالة عدم التنفيذ اكتب السبب أو المعوقات...", "If not executed, specify reason or obstacle...")}
                        value={task.reasonOrBasis}
                        onChange={(e) => saveTaskRecord(task, { reasonOrBasis: e.target.value })}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => setCameraTargetUid(task)}
                        style={{ ...s.smallBtn, background: "#0284c7", color: "#fff" }}
                      >
                        📷 {tr("كاميرا", "Camera")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadTargetUid(task)
                          fileInputRef.current?.click()
                        }}
                        style={{ ...s.smallBtn, background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155" }}
                      >
                        📎 {tr("صورة", "Photo")} ({task.photos?.length || 0})
                      </button>
                      {task.status === "not_done" && (
                        <button
                          type="button"
                          onClick={() => handlePromoteToSnag(task)}
                          style={{ ...s.smallBtn, background: "#dc2626", color: "#fff" }}
                        >
                          🚨 {tr("تحويل لسناج", "Push to Snag")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attached Photos Preview */}
                  {task.photos?.length > 0 && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {task.photos.map((p) => (
                        <img
                          key={p.id}
                          src={p.dataUrl}
                          alt={p.name}
                          onClick={() => setLightboxImg(p.dataUrl)}
                          style={{ width: 54, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f && uploadTargetUid) {
            await handleAddPhoto(uploadTargetUid, f)
          }
          e.target.value = ""
        }}
      />

      {cameraTargetUid && (
        <CameraModal
          onCapture={(file) => handleAddPhoto(cameraTargetUid, file)}
          onClose={() => setCameraTargetUid(null)}
        />
      )}

      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "grid", placeItems: "center", zIndex: 9999, padding: 20,
          }}
        >
          <img src={lightboxImg} alt="preview" style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  )
}

function KpiBox({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(6,13,26,0.75)",
      border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`,
      borderRadius: 12,
      padding: "10px 14px",
      minWidth: 130,
      flex: "1 1 130px",
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700, marginTop: 2 }}>{label}</div>
    </div>
  )
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #064e3b 100%)",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(56,189,248,0.18)",
    color: "#7dd3fc",
    fontSize: 10.5,
    fontWeight: 800,
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 6,
  },
  heroTitle: { margin: 0, fontSize: 20, fontWeight: 900, color: "#fff" },
  heroSub: { margin: "6px 0 0", fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 },
  exportBtn: {
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#fff",
    fontWeight: 800,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  periodTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  },
  periodBtn: {
    border: "1.5px solid",
    borderRadius: 12,
    padding: "12px 14px",
    fontWeight: 800,
    fontSize: 13.5,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "all 0.2s",
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
    border: "1px solid #38bdf8",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 800,
  },
  navDayBtn: {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#cbd5e1",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  sectorGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))",
    gap: 10,
  },
  sectorCard: {
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    textAlign: "start",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    transition: "all 0.15s",
  },
  filterBar: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "9px 14px",
    color: "#e2e8f0",
    fontSize: 13,
  },
  filterPill: {
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 16,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12.5,
  },
  th: {
    background: "#0f172a",
    color: "#94a3b8",
    padding: "10px 8px",
    textAlign: "start",
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  td: {
    padding: "9px 8px",
    borderBottom: "1px solid rgba(30,41,59,0.6)",
    verticalAlign: "middle",
    color: "#e2e8f0",
  },
  miniLabel: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 4,
  },
  miniInput: {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#f8fafc",
    fontSize: 12.5,
  },
  smallBtn: {
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
}
