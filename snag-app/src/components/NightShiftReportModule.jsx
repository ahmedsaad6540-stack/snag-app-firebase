import React, { useState, useEffect, useMemo, useRef } from "react"
import { db } from "../lib/firebase.js"
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"
import ExcelJS from "exceljs"
import toast from "react-hot-toast"
import { useLanguage } from "../i18n/LanguageContext.jsx"
import { canUser } from "../constants/permissions.js"
import {
  CONTRACTOR_ZONES,
  DEFAULT_NIGHT_HOUSEKEEPING,
  DEFAULT_GREASE_TRAPS,
  INITIAL_REPORT_2026_11_06,
  createDefaultNightReport,
  buildNightExecutiveSummary,
  formatNightExecutiveSummaryText,
} from "../constants/nightReportDefaults.js"
import {
  getArabicDayName,
  HK_WEEKLY_FOUNDATION_SCHEDULE,
} from "../constants/operationsPlansData.js"

function shiftDateIso(dateStr, deltaDays) {
  const [y, m, d] = (dateStr || "2026-11-06").split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays)
  const yyyy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, "0")
  const dd = String(dt.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function getTodayIso() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function formatArabicDateDisplay(dateIso) {
  if (!dateIso) return ""
  const [y, m, d] = dateIso.split("-").map(Number)
  return `${d}/${m}/${y}`
}

export default function NightShiftReportModule({
  currentUser,
  notify,
  onAddSnag,
  snags = [],
}) {
  const { lang, tr } = useLanguage()
  const canAdd = canUser(currentUser, "operations-plans", "add")
  const canEdit = canUser(currentUser, "operations-plans", "edit")
  const canDelete = canUser(currentUser, "operations-plans", "delete")
  const canExport = canUser(currentUser, "operations-plans", "export")

  // Default to 2026-11-06 so the user immediately sees the report they provided
  const [selectedDate, setSelectedDate] = useState("2026-11-06")
  const [reportsByDate, setReportsByDate] = useState({
    "2026-11-06": INITIAL_REPORT_2026_11_06,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSectionFilter, setActiveSectionFilter] = useState("all") // "all" | "exec" | "contractors" | "hk" | "maint" | "grease" | "handover"

  // Quick-add states for each section
  const [newHighlight, setNewHighlight] = useState({ level: "success", title: "", details: "" })
  const [newContractor, setNewContractor] = useState({ zoneId: "b2", unitOrArea: "", work: "" })
  const [newHk, setNewHk] = useState({ location: "", work: "" })
  const [newMaint, setNewMaint] = useState({ location: "", details: "", category: "أعمال عامة" })
  const [newGrease, setNewGrease] = useState({ restaurant: "", trapsCount: 1, details: "تمت متابعة تنظيف صندوق الدهون" })
  const [newHandover, setNewHandover] = useState({ location: "", handoverNote: "", actionRequired: "" })

  const seededRef = useRef(false)
  const sectionRefs = {
    exec: useRef(null),
    contractors: useRef(null),
    hk: useRef(null),
    maint: useRef(null),
    grease: useRef(null),
    handover: useRef(null),
  }

  // Subscribe to Firestore `night_shift_reports`
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "night_shift_reports"),
      async (snap) => {
        const map = {}
        snap.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() }
          // Ensure "غرفة تجميع القمامة — تأسيس (نظافة - تطهير)" is included without removing anything
          if (Array.isArray(data.housekeepingWorks)) {
            const hasRubbishSanitize = data.housekeepingWorks.some((w) =>
              /غرفة تجميع القمامة|تطهير/i.test(`${w.location} ${w.work}`)
            )
            if (!hasRubbishSanitize) {
              data.housekeepingWorks = [
                ...data.housekeepingWorks,
                {
                  id: "nhk-17",
                  location: "غرفة تجميع القمامة",
                  work: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)",
                  status: "done",
                  notes: "",
                },
              ]
            }
          }
          map[d.id] = data
        })

        // Seed 2026-11-06 once if not yet in Firestore
        if (!map["2026-11-06"] && !seededRef.current) {
          seededRef.current = true
          try {
            await setDoc(doc(db, "night_shift_reports", "2026-11-06"), {
              ...INITIAL_REPORT_2026_11_06,
              updatedAt: serverTimestamp(),
            })
            map["2026-11-06"] = INITIAL_REPORT_2026_11_06
          } catch (err) {
            console.warn("Seed 2026-11-06 error:", err)
            map["2026-11-06"] = INITIAL_REPORT_2026_11_06
          }
        }

        setReportsByDate((prev) => ({
          ...prev,
          ...map,
        }))
        setLoading(false)
      },
      (err) => {
        console.error("night_shift_reports listener error:", err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // Current active report object
  const currentReport = useMemo(() => {
    if (reportsByDate[selectedDate]) {
      return reportsByDate[selectedDate]
    }
    return createDefaultNightReport(
      selectedDate,
      currentUser?.displayName || currentUser?.email || "مشرف الوردية الليلية"
    )
  }, [reportsByDate, selectedDate, currentUser])

  // Snags recorded on this date
  const daySnags = useMemo(() => {
    return (snags || []).filter((s) => {
      if (!s.date) return false
      if (s.date.startsWith(selectedDate)) return true
      const [y, m, d] = selectedDate.split("-").map(Number)
      return s.date.includes(`${d}/${m}/${y}`) || s.date.includes(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
    })
  }, [snags, selectedDate])

  // Build Executive Summary live
  const execSummary = useMemo(
    () => buildNightExecutiveSummary(currentReport, daySnags),
    [currentReport, daySnags]
  )

  // Persist changes to Firestore
  const saveReportPatch = async (patch, successMsg = null) => {
    const updated = {
      ...currentReport,
      ...patch,
      dateIso: selectedDate,
    }
    setReportsByDate((prev) => ({
      ...prev,
      [selectedDate]: updated,
    }))
    setSaving(true)
    try {
      await setDoc(
        doc(db, "night_shift_reports", selectedDate),
        {
          ...updated,
          updatedBy: currentUser?.displayName || currentUser?.email || "System",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      if (successMsg) toast.success(successMsg)
    } catch (err) {
      console.error("Failed to save night shift report:", err)
      toast.error(tr("تعذر حفظ التعديل في السحابة", "Failed to save changes"))
    } finally {
      setSaving(false)
    }
  }

  // Handle interactive KPI Card click
  const handleKpiClick = (sectionKey) => {
    if (activeSectionFilter === sectionKey) {
      setActiveSectionFilter("all")
      return
    }
    setActiveSectionFilter(sectionKey)
    setTimeout(() => {
      const ref = sectionRefs[sectionKey]
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 80)
  }

  // ── 1. Executive Highlights Handlers ────────────────────────────────────────
  const handleAddHighlight = () => {
    if (!newHighlight.title.trim()) {
      toast.error(tr("أدخل عنوان الحدث الهام أولاً", "Enter highlight title first"))
      return
    }
    const list = [
      ...(currentReport.executiveHighlights || []),
      {
        id: `eh-${Date.now()}`,
        level: newHighlight.level,
        title: newHighlight.title.trim(),
        details: newHighlight.details.trim(),
      },
    ]
    saveReportPatch({ executiveHighlights: list }, tr("تمت إضافة الحدث للملخص التنفيذي ✅", "Executive highlight added ✅"))
    setNewHighlight({ level: "success", title: "", details: "" })
  }

  const handleDeleteHighlight = (id) => {
    const list = (currentReport.executiveHighlights || []).filter((h) => h.id !== id)
    saveReportPatch({ executiveHighlights: list })
  }

  const handleAutoGenerateHighlights = () => {
    const generated = execSummary.autoBullets.map((b, idx) => ({
      id: `eh-auto-${Date.now()}-${idx}`,
      level: b.color === "#ef4444" ? "urgent" : b.color === "#f59e0b" ? "warning" : "success",
      title: b.categoryAr,
      details: b.textAr,
    }))
    saveReportPatch(
      { executiveHighlights: generated },
      tr("تم توليد الملخص التنفيذي لأهم الأحداث تلقائياً ✨", "Executive Summary auto-generated ✨")
    )
  }

  // ── 2. Contractors & Units Handlers ─────────────────────────────────────────
  const handleAddContractorWork = () => {
    if (!newContractor.work.trim()) {
      toast.error(tr("أدخل تفاصيل عمل المقاول / الوحدة", "Enter contractor/unit work details"))
      return
    }
    const list = [
      ...(currentReport.contractorWorks || []),
      {
        id: `cw-${Date.now()}`,
        zoneId: newContractor.zoneId,
        unitOrArea: newContractor.unitOrArea.trim(),
        work: newContractor.work.trim(),
        status: "done",
      },
    ]
    saveReportPatch({ contractorWorks: list }, tr("تمت إضافة عمل المقاول / الوحدة ✅", "Contractor work added ✅"))
    setNewContractor((prev) => ({ ...prev, unitOrArea: "", work: "" }))
  }

  const handleDeleteContractorWork = (id) => {
    const list = (currentReport.contractorWorks || []).filter((c) => c.id !== id)
    saveReportPatch({ contractorWorks: list })
  }

  // ── 3. Night Housekeeping Handlers ──────────────────────────────────────────
  const handleToggleHkStatus = (id) => {
    const order = ["done", "in_progress", "pending"]
    const list = (currentReport.housekeepingWorks || []).map((item) => {
      if (item.id !== id) return item
      const next = order[(order.indexOf(item.status || "done") + 1) % order.length]
      return { ...item, status: next }
    })
    saveReportPatch({ housekeepingWorks: list })
  }

  const handleUpdateHkField = (id, field, val) => {
    const list = (currentReport.housekeepingWorks || []).map((item) =>
      item.id === id ? { ...item, [field]: val } : item
    )
    saveReportPatch({ housekeepingWorks: list })
  }

  const handleAddHkRow = () => {
    if (!newHk.location.trim() || !newHk.work.trim()) {
      toast.error(tr("أدخل المكان وتفاصيل عمل النظافة الليلية", "Enter location and work description"))
      return
    }
    const list = [
      ...(currentReport.housekeepingWorks || []),
      {
        id: `nhk-${Date.now()}`,
        location: newHk.location.trim(),
        work: newHk.work.trim(),
        status: "done",
        notes: "",
      },
    ]
    saveReportPatch({ housekeepingWorks: list }, tr("تمت إضافة بند النظافة الليلية ✅", "Night housekeeping task added ✅"))
    setNewHk({ location: "", work: "" })
  }

  const handleDeleteHkRow = (id) => {
    const list = (currentReport.housekeepingWorks || []).filter((item) => item.id !== id)
    saveReportPatch({ housekeepingWorks: list })
  }

  // ── 4. Mall Maintenance Team Handlers ───────────────────────────────────────
  const handleAddMaintRow = () => {
    if (!newMaint.location.trim() || !newMaint.details.trim()) {
      toast.error(tr("أدخل المكان وتفاصيل عمل الصيانة", "Enter location and maintenance details"))
      return
    }
    const list = [
      ...(currentReport.maintenanceWorks || []),
      {
        id: `mw-${Date.now()}`,
        location: newMaint.location.trim(),
        details: newMaint.details.trim(),
        category: newMaint.category,
        status: "done",
      },
    ]
    saveReportPatch({ maintenanceWorks: list }, tr("تمت إضافة عمل الصيانة الليلية ✅", "Maintenance work added ✅"))
    setNewMaint({ location: "", details: "", category: "أعمال عامة" })
  }

  const handleDeleteMaintRow = (id) => {
    const list = (currentReport.maintenanceWorks || []).filter((m) => m.id !== id)
    saveReportPatch({ maintenanceWorks: list })
  }

  // ── 5. Restaurants Grease Traps Handlers ────────────────────────────────────
  const handleToggleGreaseFollowed = (id) => {
    const list = (currentReport.greaseTraps || []).map((g) => {
      if (g.id !== id) return g
      const nextFollowed = g.followed === false ? true : false
      return {
        ...g,
        followed: nextFollowed,
        details: nextFollowed
          ? g.trapsCount > 1
            ? "تمت متابعة تنظيف صناديق الدهون"
            : "تمت متابعة تنظيف صندوق الدهون"
          : "لم يتم التنظيف / مؤجل",
      }
    })
    saveReportPatch({ greaseTraps: list })
  }

  const handleAdjustGreaseCount = (id, delta) => {
    const list = (currentReport.greaseTraps || []).map((g) => {
      if (g.id !== id) return g
      const nextCount = Math.max(0, (Number(g.trapsCount) || 0) + delta)
      return { ...g, trapsCount: nextCount }
    })
    saveReportPatch({ greaseTraps: list })
  }

  const handleUpdateGreaseDetails = (id, details) => {
    const list = (currentReport.greaseTraps || []).map((g) =>
      g.id === id ? { ...g, details } : g
    )
    saveReportPatch({ greaseTraps: list })
  }

  const handleAddGreaseRestaurant = () => {
    if (!newGrease.restaurant.trim()) {
      toast.error(tr("أدخل اسم المطعم / الموقع", "Enter restaurant name"))
      return
    }
    const list = [
      ...(currentReport.greaseTraps || []),
      {
        id: `gt-${Date.now()}`,
        restaurant: newGrease.restaurant.trim(),
        trapsCount: Number(newGrease.trapsCount) || 1,
        followed: true,
        details: newGrease.details.trim() || "تمت متابعة تنظيف صندوق الدهون",
      },
    ]
    saveReportPatch({ greaseTraps: list }, tr("تمت إضافة المطعم لجدول صناديق الدهون ✅", "Restaurant added ✅"))
    setNewGrease({ restaurant: "", trapsCount: 1, details: "تمت متابعة تنظيف صندوق الدهون" })
  }

  const handleDeleteGreaseRestaurant = (id) => {
    const list = (currentReport.greaseTraps || []).filter((g) => g.id !== id)
    saveReportPatch({ greaseTraps: list })
  }

  // ── 6. Shift Handover Handlers ──────────────────────────────────────────────
  const handleAddHandover = () => {
    if (!newHandover.location.trim() || !newHandover.handoverNote.trim()) {
      toast.error(tr("أدخل المكان وبيان التسليم للشيفت التالي", "Enter location and handover note"))
      return
    }
    const list = [
      ...(currentReport.handoverItems || []),
      {
        id: `ho-${Date.now()}`,
        location: newHandover.location.trim(),
        handoverNote: newHandover.handoverNote.trim(),
        actionRequired: newHandover.actionRequired.trim() || "المتابعة والتنفيذ في الشيفت الصباحي",
        escalated: false,
      },
    ]
    saveReportPatch({ handoverItems: list }, tr("تمت إضافة بند تسليم الشيفت ✅", "Shift handover item added ✅"))
    setNewHandover({ location: "", handoverNote: "", actionRequired: "" })
  }

  const handleDeleteHandover = (id) => {
    const list = (currentReport.handoverItems || []).filter((h) => h.id !== id)
    saveReportPatch({ handoverItems: list })
  }

  const handleEscalateHandoverToSnag = async (item) => {
    if (!onAddSnag) return
    try {
      await onAddSnag({
        location: "plaza",
        subLocation: item.location,
        trade: "general",
        type: "تشغيل",
        priority: "عاجل",
        status: "open",
        description: `[تسليم وردية ليلية ${formatArabicDateDisplay(selectedDate)}] ${item.handoverNote} — العمل المطلوب: ${item.actionRequired}`,
        inspector: currentUser?.displayName || currentUser?.email || "مشرف الوردية الليلية",
      })
      const list = (currentReport.handoverItems || []).map((h) =>
        h.id === item.id ? { ...h, escalated: true } : h
      )
      saveReportPatch({ handoverItems: list }, tr("تم ترحيل البند إلى سجل الملاحظات العام بنجاح 🚨", "Escalated to General Snags Log 🚨"))
    } catch (err) {
      console.error(err)
      toast.error(tr("تعذر ترحيل البند", "Failed to escalate item"))
    }
  }

  // ── 7. Export Excel (Matches user's exact Night Shift Report + Executive Summary) ──
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook()
      wb.creator = "Park Street Mall Smart OS"
      wb.created = new Date()

      const ws = wb.addWorksheet("التقرير الليلي والملخص التنفيذي", {
        views: [{ rightToLeft: true }],
      })

      ws.columns = [
        { width: 26 },
        { width: 28 },
        { width: 28 },
        { width: 26 },
        { width: 26 },
        { width: 28 },
      ]

      const addSectionHeader = (titleAr, bgHex = "0F172A", fgHex = "F8FAFC") => {
        const r = ws.addRow([titleAr, `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}`, "", "", "", ""])
        ws.mergeCells(r.number, 2, r.number, 6)
        r.height = 28
        r.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bgHex}` } }
          cell.font = { name: "Arial", size: 13, bold: true, color: { argb: `FF${fgHex}` } }
          cell.alignment = { vertical: "middle", horizontal: "right" }
          cell.border = {
            top: { style: "thin", color: { argb: "FF334155" } },
            bottom: { style: "thin", color: { argb: "FF334155" } },
            left: { style: "thin", color: { argb: "FF334155" } },
            right: { style: "thin", color: { argb: "FF334155" } },
          }
        })
      }

      // Main Title Banner
      const titleRow = ws.addRow([
        `🌙 التقرير الليلي والملخص التنفيذي اليومي (Executive Summary) — بارك ستريت مول (${formatArabicDateDisplay(selectedDate)})`,
      ])
      ws.mergeCells(titleRow.number, 1, titleRow.number, 6)
      titleRow.height = 34
      titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } }
      titleRow.getCell(1).font = { name: "Arial", size: 15, bold: true, color: { argb: "FFF8FAFC" } }
      titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

      ws.addRow([])

      // ── Section 0: Executive Summary ──
      addSectionHeader("📊 أولاً: الملخص التنفيذي لأهم الأحداث اليومية (DAILY EXECUTIVE SUMMARY)", "065F46", "ECFDF5")
      const execHeader = ws.addRow(["البند / القطاع", "تفاصيل الملخص التنفيذي وأهم الأحداث", "", "", "", "الحالة / المؤشر"])
      ws.mergeCells(execHeader.number, 2, execHeader.number, 5)
      execHeader.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      ;(currentReport.executiveHighlights || []).forEach((h) => {
        const r = ws.addRow([h.title, h.details || "", "", "", "", h.level === "urgent" ? "هام وعاجل" : "حدث رئيسي"])
        ws.mergeCells(r.number, 2, r.number, 5)
        r.height = 24
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11, bold: true }
          c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        })
      })

      execSummary.autoBullets.forEach((b) => {
        const r = ws.addRow([b.categoryAr, b.textAr, "", "", "", "مكتمل ✓"])
        ws.mergeCells(r.number, 2, r.number, 5)
        r.height = 24
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11 }
          c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        })
      })

      ws.addRow([])

      // ── Section 1: أعمال المقاولين والوحدات (6 Columns Matrix) ──
      addSectionHeader("أعمال المقاولين والوحدات", "312E81", "EDE9FE")
      const zHead = ws.addRow(CONTRACTOR_ZONES.map((z) => z.labelAr))
      zHead.height = 24
      zHead.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFF8FAFC" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      const maxZoneRows = Math.max(
        1,
        ...CONTRACTOR_ZONES.map((z) => (execSummary.contractorByZone[z.id] || []).length)
      )
      for (let i = 0; i < maxZoneRows; i++) {
        const rowVals = CONTRACTOR_ZONES.map((z) => {
          const item = (execSummary.contractorByZone[z.id] || [])[i]
          return item ? item.work : ""
        })
        const r = ws.addRow(rowVals)
        r.height = 22
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11 }
          c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        })
      }

      ws.addRow([])

      // ── Section 2: أعمال النظافة الليلية ──
      addSectionHeader("أعمال النظافة الليلية", "064E3B", "ECFDF5")
      const hkHead = ws.addRow(["المكان", "الأعمال", "", "", "الحالة", "ملاحظات"])
      ws.mergeCells(hkHead.number, 2, hkHead.number, 4)
      hkHead.height = 24
      hkHead.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFF8FAFC" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      ;(currentReport.housekeepingWorks || []).forEach((h) => {
        const statusAr = h.status === "done" ? "تم التنفيذ ✓" : h.status === "in_progress" ? "جاري التنفيذ" : "لم يتم"
        const r = ws.addRow([h.location, h.work, "", "", statusAr, h.notes || ""])
        ws.mergeCells(r.number, 2, r.number, 4)
        r.height = 22
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11 }
          c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        })
      })

      ws.addRow([])

      // ── Section 3: أعمال صيانة المول من قبل فريق الصيانة ──
      addSectionHeader("أعمال صيانة المول من قبل فريق الصيانة", "0C4A6E", "E0F2FE")
      const mHead = ws.addRow(["المكان", "تفاصيل العمل", "", "", "الفئة", "الحالة"])
      ws.mergeCells(mHead.number, 2, mHead.number, 4)
      mHead.height = 24
      mHead.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFF8FAFC" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      ;(currentReport.maintenanceWorks || []).forEach((m) => {
        const r = ws.addRow([m.location, m.details, "", "", m.category || "صيانة", "تم التنفيذ ✓"])
        ws.mergeCells(r.number, 2, r.number, 4)
        r.height = 22
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11 }
          c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        })
      })

      ws.addRow([])

      // ── Section 4: متابعة تنظيف صناديق الدهون بالمطاعم ──
      addSectionHeader("متابعة تنظيف صناديق الدهون بالمطاعم", "78350F", "FEF3C7")
      const gHead = ws.addRow(["المطعم / الموقع", "عدد الصناديق", "التفاصيل", "", "", "حالة المتابعة"])
      ws.mergeCells(gHead.number, 3, gHead.number, 5)
      gHead.height = 24
      gHead.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFF8FAFC" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      ;(currentReport.greaseTraps || []).forEach((g) => {
        const r = ws.addRow([
          g.restaurant,
          Number(g.trapsCount) || 0,
          g.details || "تمت متابعة تنظيف صناديق الدهون",
          "",
          "",
          g.followed !== false ? "تمت المتابعة ✓" : "لم يتم",
        ])
        ws.mergeCells(r.number, 3, r.number, 5)
        r.height = 22
        r.eachCell((c) => {
          c.font = { name: "Arial", size: 11 }
          c.alignment = { vertical: "middle", horizontal: "right" }
        })
      })

      const gTotalRow = ws.addRow([
        "الإجمالي",
        execSummary.totalTrapsCleaned,
        `${execSummary.followedRestaurantsCount} مواقع متابعة`,
        "",
        "",
        "مكتمل ✓",
      ])
      ws.mergeCells(gTotalRow.number, 3, gTotalRow.number, 5)
      gTotalRow.height = 25
      gTotalRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }
        c.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF78350F" } }
        c.alignment = { vertical: "middle", horizontal: "right" }
      })

      ws.addRow([])

      // ── Section 5: Shift Handover ──
      addSectionHeader("shift handover — تسليم الوردية للشيفت التالي", "7F1D1D", "FEE2E2")
      const hoHead = ws.addRow(["المكان", "تسليم للشيفت التالي", "", "العمل المطلوب", "", "الحالة"])
      ws.mergeCells(hoHead.number, 2, hoHead.number, 3)
      ws.mergeCells(hoHead.number, 4, hoHead.number, 5)
      hoHead.height = 24
      hoHead.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFF8FAFC" } }
        c.alignment = { vertical: "middle", horizontal: "center" }
      })

      if ((currentReport.handoverItems || []).length === 0) {
        const emptyHo = ws.addRow(["-", "لا توجد ملاحظات معلقة — تم تسليم الوردية", "", "-", "", "مكتمل"])
        ws.mergeCells(emptyHo.number, 2, emptyHo.number, 3)
        ws.mergeCells(emptyHo.number, 4, emptyHo.number, 5)
      } else {
        currentReport.handoverItems.forEach((h) => {
          const r = ws.addRow([h.location, h.handoverNote, "", h.actionRequired, "", "مطلوب متابعة"])
          ws.mergeCells(r.number, 2, r.number, 3)
          ws.mergeCells(r.number, 4, r.number, 5)
          r.height = 22
        })
      }

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Night_Shift_Report_Exec_Summary_${selectedDate}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(tr("تم تصدير شيت التقرير الليلي والملخص التنفيذي بنجاح 📊", "Excel report exported successfully 📊"))
    } catch (err) {
      console.error("Excel export error:", err)
      toast.error(tr("حدث خطأ أثناء تصدير ملف الإكسيل", "Excel export failed"))
    }
  }

  // ── 8. Print / PDF Executive Report ─────────────────────────────────────────
  const handlePrintExecutivePdf = () => {
    const win = window.open("", "_blank", "width=1100,height=850")
    if (!win) {
      toast.error(tr("يرجى السماح بالنوافذ المنبثقة للطباعة", "Please allow popups to print"))
      return
    }

    const contractorMatrixRowsHtml = (() => {
      const maxRows = Math.max(
        1,
        ...CONTRACTOR_ZONES.map((z) => (execSummary.contractorByZone[z.id] || []).length)
      )
      let html = ""
      for (let i = 0; i < maxRows; i++) {
        html += `<tr>${CONTRACTOR_ZONES.map((z) => {
          const item = (execSummary.contractorByZone[z.id] || [])[i]
          return `<td>${item ? item.work : "-"}</td>`
        }).join("")}</tr>`
      }
      return html
    })()

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>التقرير الليلي والملخص التنفيذي — ${formatArabicDateDisplay(selectedDate)}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 12px; direction: rtl; }
          .header { background: linear-gradient(135deg, #0f172a, #1e1b4b); color: #fff; padding: 16px 22px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
          .header h1 { margin: 0 0 4px 0; font-size: 20px; }
          .header p { margin: 0; font-size: 12px; color: #cbd5e1; }
          .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 14px; }
          .kpi { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc; text-align: center; }
          .kpi .num { font-size: 20px; font-weight: 800; color: #0f172a; }
          .kpi .lbl { font-size: 11px; color: #475569; font-weight: 700; }
          .exec-box { border: 2px solid #059669; background: #ecfdf5; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; }
          .exec-box h2 { margin: 0 0 8px 0; font-size: 15px; color: #065f46; border-bottom: 1px solid #a7f3d0; padding-bottom: 6px; }
          .exec-box ul { margin: 0; padding-right: 18px; font-size: 12px; line-height: 1.7; }
          .sec-title { background: #1e293b; color: #fff; padding: 7px 12px; border-radius: 6px; font-size: 13px; font-weight: 800; margin: 12px 0 6px 0; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11.5px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; }
          th { background: #f1f5f9; font-weight: 800; color: #1e293b; }
          .total-row td { background: #fef3c7; font-weight: 800; color: #78350f; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>🌙 التقرير الليلي والملخص التنفيذي اليومي (Night Shift Report & Executive Summary)</h1>
            <p>بارك ستريت مول (Park Street Mall) • تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} • الإشراف: ${currentReport.supervisorName || "مشرف الوردية الليلية"}</p>
          </div>
          <div style="text-align:left">
            <div style="font-size:24px;font-weight:900;color:#34d399">${execSummary.overallScore}%</div>
            <div style="font-size:11px;color:#a7f3d0">مؤشر إنجاز الوردية</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi"><div class="num">${execSummary.contractorsCount}</div><div class="lbl">🏗️ أعمال المقاولين والوحدات</div></div>
          <div class="kpi"><div class="num">${execSummary.hkDone}/${execSummary.hkTotal}</div><div class="lbl">🧹 أعمال النظافة الليلية (${execSummary.hkPct}%)</div></div>
          <div class="kpi"><div class="num">${execSummary.maintTotal}</div><div class="lbl">🔧 أعمال صيانة المول</div></div>
          <div class="kpi"><div class="num">${execSummary.totalTrapsCleaned} صندوق</div><div class="lbl">🛢️ صناديق الدهون (${execSummary.followedRestaurantsCount} مواقع)</div></div>
          <div class="kpi"><div class="num">${execSummary.handoverCount}</div><div class="lbl">🤝 بنود تسليم الشيفت التالي</div></div>
        </div>

        <div class="exec-box">
          <h2>📊 أولاً: الملخص التنفيذي لأهم الأحداث اليومية (EXECUTIVE SUMMARY)</h2>
          <ul>
            ${(currentReport.executiveHighlights || []).map((h) => `<li><strong>${h.title}:</strong> ${h.details || ""}</li>`).join("")}
            ${execSummary.autoBullets.map((b) => `<li><strong>${b.icon} ${b.categoryAr}:</strong> ${b.textAr}</li>`).join("")}
          </ul>
        </div>

        <div class="sec-title">
          <span>🏗️ ثانياً: أعمال المقاولين والوحدات</span>
          <span>تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}</span>
        </div>
        <table>
          <thead>
            <tr>${CONTRACTOR_ZONES.map((z) => `<th>${z.labelAr}</th>`).join("")}</tr>
          </thead>
          <tbody>${contractorMatrixRowsHtml}</tbody>
        </table>

        <div class="grid-2">
          <div>
            <div class="sec-title">
              <span>🧹 ثالثاً: أعمال النظافة الليلية (${execSummary.hkDone}/${execSummary.hkTotal})</span>
              <span>تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}</span>
            </div>
            <table>
              <thead><tr><th>#</th><th>المكان</th><th>الأعمال</th><th>الحالة</th></tr></thead>
              <tbody>
                ${(currentReport.housekeepingWorks || []).map((h, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${h.location}</strong></td>
                    <td>${h.work}</td>
                    <td>${h.status === "done" ? "✓ تم" : h.status === "in_progress" ? "جاري" : "لم يتم"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div>
            <div class="sec-title">
              <span>🛢️ رابعاً: متابعة تنظيف صناديق الدهون بالمطاعم</span>
              <span>تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}</span>
            </div>
            <table>
              <thead><tr><th>المطعم / الموقع</th><th>عدد الصناديق</th><th>التفاصيل</th></tr></thead>
              <tbody>
                ${(currentReport.greaseTraps || []).map((g) => `
                  <tr>
                    <td><strong>${g.restaurant}</strong></td>
                    <td>${g.trapsCount}</td>
                    <td>${g.details || ""}</td>
                  </tr>
                `).join("")}
                <tr class="total-row">
                  <td>الإجمالي</td>
                  <td>${execSummary.totalTrapsCleaned}</td>
                  <td>${execSummary.followedRestaurantsCount} مواقع متابعة</td>
                </tr>
              </tbody>
            </table>

            <div class="sec-title">
              <span>🔧 خامساً: أعمال صيانة المول من قبل فريق الصيانة</span>
              <span>تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}</span>
            </div>
            <table>
              <thead><tr><th>المكان</th><th>تفاصيل العمل</th><th>الفئة</th></tr></thead>
              <tbody>
                ${(currentReport.maintenanceWorks || []).map((m) => `
                  <tr>
                    <td><strong>${m.location}</strong></td>
                    <td>${m.details}</td>
                    <td>${m.category || "صيانة"}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="sec-title">
              <span>🤝 سادساً: تسليم الوردية للشيفت التالي (Shift Handover)</span>
              <span>تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)}</span>
            </div>
            <table>
              <thead><tr><th>المكان</th><th>تسليم للشيفت التالي</th><th>العمل المطلوب</th></tr></thead>
              <tbody>
                ${
                  (currentReport.handoverItems || []).length === 0
                    ? `<tr><td colspan="3" style="text-align:center">تم تسليم الوردية دون عوائق معلقة ✓</td></tr>`
                    : currentReport.handoverItems.map((h) => `
                        <tr>
                          <td><strong>${h.location}</strong></td>
                          <td>${h.handoverNote}</td>
                          <td>${h.actionRequired}</td>
                        </tr>
                      `).join("")
                }
              </tbody>
            </table>
          </div>
        </div>

        <script>
          window.onload = () => { setTimeout(() => window.print(), 250); };
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const handleCopySummaryText = () => {
    const text = formatNightExecutiveSummaryText(currentReport, execSummary)
    navigator.clipboard.writeText(text)
    toast.success(tr("تم نسخ الملخص التنفيذي والتقرير الليلي للحافظة 📋", "Executive Summary copied to clipboard 📋"))
  }

  // Saved dates in archive
  const savedDatesList = useMemo(() => {
    return Object.keys(reportsByDate).sort((a, b) => b.localeCompare(a))
  }, [reportsByDate])

  return (
    <div style={st.wrapper}>
      {/* ── Top Executive Banner ── */}
      <div className="mobile-section-card" style={st.heroBanner}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div style={{ minWidth: 0, flex: "1 1 260px" }}>
            <div style={st.badgePill}>
              🌙 NIGHT SHIFT OPERATIONS & DAILY EXECUTIVE SUMMARY
            </div>
            <h2 style={st.heroTitle}>
              {tr(
                "🌙 التقرير الليلي الشامل والملخص التنفيذي لأهم الأحداث اليومية",
                "🌙 Comprehensive Night Shift Report & Daily Executive Summary"
              )}
            </h2>
            <p style={st.heroSub}>
              {tr(
                "إدارة وتوثيق أعمال الوردية الليلية (أعمال المقاولين والوحدات • النظافة الليلية والتأسيس • صيانة المول • متابعة صناديق الدهون بالمطاعم • تسليم الشيفت) مع إصدار الملخص التنفيذي اليومي (Executive Summary) بضغطة زر",
                "Manage & generate the official Night Shift Report (Contractors & Units, Night Housekeeping, Maintenance, Grease Traps, Shift Handover) with automated Daily Executive Summary"
              )}
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="mobile-btn-grid" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={handleCopySummaryText} style={st.btnPrimary}>
              📋 {tr("نسخ الملخص التنفيذي", "Copy Exec. Summary")}
            </button>
            {canExport && (
              <>
                <button type="button" onClick={handleExportExcel} style={st.btnExcel}>
                  📊 {tr("تصدير التقرير Excel", "Export Excel")}
                </button>
                <button type="button" onClick={handlePrintExecutivePdf} style={st.btnPdf}>
                  🖨️ {tr("تقرير PDF / طباعة تنفيذية", "Print / PDF Report")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Date Picker & Saved Reports Archive Bar */}
        <div style={st.dateBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#cbd5e1" }}>
              🗓️ {tr("تاريخ الوردية الليلية:", "Night Shift Date:")}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateIso(selectedDate, -1))}
              style={st.navDateBtn}
            >
              ◀
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={st.dateInput}
            />
            <button
              type="button"
              onClick={() => setSelectedDate(shiftDateIso(selectedDate, 1))}
              style={st.navDateBtn}
            >
              ▶
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate("2026-11-06")}
              style={{
                ...st.quickDatePill,
                background: selectedDate === "2026-11-06" ? "#059669" : "#1e293b",
                color: selectedDate === "2026-11-06" ? "#fff" : "#94a3b8",
                borderColor: selectedDate === "2026-11-06" ? "#10b981" : "#334155",
              }}
            >
              📌 {tr("تقرير 6/11/2026", "6/11/2026 Report")}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayIso())}
              style={{
                ...st.quickDatePill,
                background: selectedDate === getTodayIso() ? "#2563eb" : "#1e293b",
                color: selectedDate === getTodayIso() ? "#fff" : "#94a3b8",
                borderColor: selectedDate === getTodayIso() ? "#3b82f6" : "#334155",
              }}
            >
              📍 {tr("تقرير الليلة (اليوم)", "Tonight's Report")}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: "1 1 220px" }}>
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
              👤 {tr("مشرف الوردية:", "Shift Supervisor:")}
            </span>
            <input
              type="text"
              value={currentReport.supervisorName || ""}
              onChange={(e) => saveReportPatch({ supervisorName: e.target.value })}
              placeholder={tr("اسم مشرف الوردية الليلية", "Night Shift Supervisor")}
              style={{ ...st.dateInput, flex: 1, minWidth: 140 }}
            />
            {saving && (
              <span style={{ fontSize: 11, color: "#34d399", fontWeight: 800 }}>
                ⏳ {tr("جاري الحفظ...", "Saving...")}
              </span>
            )}
          </div>
        </div>

        {/* Saved Archive Dates Pills */}
        {savedDatesList.length > 0 && (
          <div className="mobile-scroll-pills" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>
              🗂️ {tr("التقارير المحفوظة بالأرشيف:", "Saved Night Reports:")}
            </span>
            {savedDatesList.slice(0, 8).map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setSelectedDate(dt)}
                style={{
                  background: selectedDate === dt ? "rgba(56,189,248,0.2)" : "rgba(15,23,42,0.65)",
                  color: selectedDate === dt ? "#38bdf8" : "#cbd5e1",
                  border: `1px solid ${selectedDate === dt ? "#38bdf8" : "#334155"}`,
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                📅 {formatArabicDateDisplay(dt)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 6 Interactive KPI Cards (Click to Filter & Scroll) ── */}
      <div className="mobile-kpi-grid" style={st.kpiGrid}>
        <InteractiveKpiCard
          icon="📊"
          value={`${execSummary.overallScore}%`}
          title={tr("الملخص التنفيذي اليومي", "Executive Summary & Score")}
          sub={tr(
            `${(currentReport.executiveHighlights || []).length + execSummary.autoBullets.length} نقاط وأحداث رئيسية`,
            "Click to view Executive Summary"
          )}
          color="#10b981"
          active={activeSectionFilter === "exec"}
          onClick={() => handleKpiClick("exec")}
        />
        <InteractiveKpiCard
          icon="🏗️"
          value={execSummary.contractorsCount}
          title={tr("أعمال المقاولين والوحدات", "Contractors & Units Works")}
          sub={tr("موزعة على المباني والبيزمنت", "Across 6 Mall Zones")}
          color="#a855f7"
          active={activeSectionFilter === "contractors"}
          onClick={() => handleKpiClick("contractors")}
        />
        <InteractiveKpiCard
          icon="🧹"
          value={`${execSummary.hkDone}/${execSummary.hkTotal}`}
          title={tr("أعمال النظافة الليلية", "Night Housekeeping Works")}
          sub={tr(`نسبة الإنجاز: ${execSummary.hkPct}%`, `Completion: ${execSummary.hkPct}%`)}
          color="#22c55e"
          active={activeSectionFilter === "hk"}
          onClick={() => handleKpiClick("hk")}
        />
        <InteractiveKpiCard
          icon="🔧"
          value={execSummary.maintTotal}
          title={tr("أعمال صيانة المول الليلية", "Mall Maintenance Works")}
          sub={tr("منفذة بواسطة فريق الصيانة", "Executed by Maintenance Team")}
          color="#38bdf8"
          active={activeSectionFilter === "maint"}
          onClick={() => handleKpiClick("maint")}
        />
        <InteractiveKpiCard
          icon="🛢️"
          value={execSummary.totalTrapsCleaned}
          title={tr("صناديق الدهون بالمطاعم", "Restaurants Grease Traps")}
          sub={tr(
            `في ${execSummary.followedRestaurantsCount} مواقع متابعة`,
            `Across ${execSummary.followedRestaurantsCount} restaurants`
          )}
          color="#f59e0b"
          active={activeSectionFilter === "grease"}
          onClick={() => handleKpiClick("grease")}
        />
        <InteractiveKpiCard
          icon="🤝"
          value={execSummary.handoverCount}
          title={tr("تسليم الشيفت التالي", "Shift Handover Items")}
          sub={
            execSummary.handoverCount === 0
              ? tr("لا توجد عوائق معلقة ✅", "Zero pending blockers ✅")
              : tr("مطلوب متابعتها صباحاً", "Pending morning shift action")
          }
          color="#ef4444"
          active={activeSectionFilter === "handover"}
          onClick={() => handleKpiClick("handover")}
        />
      </div>

      {/* Filter Indicator Bar */}
      {activeSectionFilter !== "all" && (
        <div style={st.filterNotice}>
          <span>
            🔍 {tr("يتم الآن التركيز على القسم المحدد من الكروت التفاعلية", "Showing selected KPI section")}
          </span>
          <button
            type="button"
            onClick={() => setActiveSectionFilter("all")}
            style={st.showAllBtn}
          >
            👁️ {tr("عرض جميع أقسام التقرير الليلي بالكامل", "Show All Report Sections")}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          📊 SECTION 0: DAILY EXECUTIVE SUMMARY (الملخص التنفيذي لأهم الأحداث)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "exec") && (
        <div ref={sectionRefs.exec} className="mobile-section-card" style={st.execCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: "#34d399", letterSpacing: 0.8 }}>
                DAILY EXECUTIVE SUMMARY & KEY HIGHLIGHTS
              </div>
              <h3 style={{ margin: "2px 0 0 0", fontSize: 17, fontWeight: 900, color: "#ecfdf5" }}>
                📊 {tr("الملخص التنفيذي لأهم الأحداث اليومية — وردية", "Daily Executive Summary — Shift")} ({formatArabicDateDisplay(selectedDate)})
              </h3>
            </div>

            <div className="mobile-btn-grid" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(canAdd || canEdit) && (
                <button
                  type="button"
                  onClick={handleAutoGenerateHighlights}
                  style={{
                    background: "rgba(16,185,129,0.2)",
                    border: "1px solid #10b981",
                    color: "#6ee7b7",
                    borderRadius: 9,
                    padding: "7px 12px",
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✨ {tr("تحديث أهم الأحداث تلقائياً", "Auto-Synthesize Highlights")}
                </button>
              )}
              <button
                type="button"
                onClick={handleCopySummaryText}
                style={{
                  background: "#059669",
                  border: "1px solid #10b981",
                  color: "#fff",
                  borderRadius: 9,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                📋 {tr("نسخ الملخص التنفيذي", "Copy Summary")}
              </button>
            </div>
          </div>

          {/* 1. Automated Sector-by-Sector Executive Synthesis */}
          <div style={st.execBulletsGrid}>
            {execSummary.autoBullets.map((b, idx) => (
              <div
                key={idx}
                style={{
                  background: "rgba(15,23,42,0.78)",
                  border: `1px solid ${b.color}55`,
                  borderRight: `4px solid ${b.color}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{b.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color: b.color }}>
                    {lang === "ar" ? b.categoryAr : b.categoryEn}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
                  {lang === "ar" ? b.textAr : b.textEn}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Key Daily Events / Custom Executive Highlights */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(16,185,129,0.25)", paddingTop: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#a7f3d0", marginBottom: 10 }}>
              🔥 {tr("أبرز الأحداث والملاحظات التنفيذية المسجلة لليوم (Key Daily Events):", "Recorded Key Daily Executive Events:")}
            </div>

            {(currentReport.executiveHighlights || []).length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {currentReport.executiveHighlights.map((h) => {
                  const badgeMap = {
                    urgent: { icon: "🔴", label: tr("حدث عاجل / حرج", "Urgent / Critical"), color: "#ef4444" },
                    warning: { icon: "🟡", label: tr("متابعة هامة", "Important Follow-up"), color: "#f59e0b" },
                    info: { icon: "🔵", label: tr("متابعة تشغيلية", "Operational Update"), color: "#38bdf8" },
                    success: { icon: "🟢", label: tr("إنجاز رئيسي", "Key Achievement"), color: "#10b981" },
                  }
                  const b = badgeMap[h.level] || badgeMap.success
                  return (
                    <div
                      key={h.id}
                      style={{
                        background: "rgba(2,6,23,0.65)",
                        border: `1px solid ${b.color}44`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              background: `${b.color}22`,
                              color: b.color,
                              border: `1px solid ${b.color}55`,
                              borderRadius: 999,
                              padding: "2px 8px",
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {b.icon} {b.label}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: 13.5, color: "#f8fafc" }}>{h.title}</span>
                        </div>
                        {h.details && (
                          <div style={{ fontSize: 12.5, color: "#cbd5e1", marginTop: 4, lineHeight: 1.6 }}>
                            {h.details}
                          </div>
                        )}
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteHighlight(h.id)}
                          style={st.delRowBtn}
                          title={tr("حذف الحدث", "Delete")}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add new Executive Highlight */}
            {(canAdd || canEdit) && (
              <div className="mobile-stack-row" style={st.quickAddRow}>
                <select
                  value={newHighlight.level}
                  onChange={(e) => setNewHighlight((p) => ({ ...p, level: e.target.value }))}
                  style={{ ...st.input, flex: "0 1 165px" }}
                >
                  <option value="success">🟢 {tr("إنجاز رئيسي", "Key Achievement")}</option>
                  <option value="info">🔵 {tr("متابعة تشغيلية", "Operational Note")}</option>
                  <option value="warning">🟡 {tr("ملاحظة هامة", "Important Warning")}</option>
                  <option value="urgent">🔴 {tr("حدث عاجل / طارئ", "Urgent Event")}</option>
                </select>
                <input
                  type="text"
                  placeholder={tr("عنوان الحدث الهام (مثال: الانتهاء من غسيل تند المطاعم...)", "Highlight title...")}
                  value={newHighlight.title}
                  onChange={(e) => setNewHighlight((p) => ({ ...p, title: e.target.value }))}
                  style={{ ...st.input, flex: 1, minWidth: 0 }}
                />
                <input
                  type="text"
                  placeholder={tr("التفاصيل والإجراءات المتخذة...", "Details & actions taken...")}
                  value={newHighlight.details}
                  onChange={(e) => setNewHighlight((p) => ({ ...p, details: e.target.value }))}
                  style={{ ...st.input, flex: 1.4, minWidth: 0 }}
                />
                <button type="button" onClick={handleAddHighlight} style={st.addBtn}>
                  ➕ {tr("إضافة للملخص التنفيذي", "Add Highlight")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          🏗️ SECTION 1: أعمال المقاولين والوحدات (6 Zones Matrix)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "contractors") && (
        <div ref={sectionRefs.contractors} className="mobile-section-card" style={st.sectionCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <h3 style={st.sectionTitle}>
                🏗️ {tr("أولاً: أعمال المقاولين والوحدات (Contractors & Units Night Works)", "1. Contractors & Units Night Works")}
              </h3>
              <div style={st.sectionSub}>
                {tr(
                  `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} • موزعة على: مبنى ١، مبنى ٢، مبنى ٣، البلازا، بيزمنت ١، بيزمنت ٢`,
                  `Shift Date: ${formatArabicDateDisplay(selectedDate)} • Across Buildings 1, 2, 3, Plaza, Basement 1 & 2`
                )}
              </div>
            </div>
            <span style={st.countBadge}>
              {execSummary.contractorsCount} {tr("أعمال مسجلة", "Recorded Works")}
            </span>
          </div>

          {/* 6-Columns Matrix View matching the user's sheet */}
          <div className="mobile-zones-grid" style={st.zonesGrid}>
            {CONTRACTOR_ZONES.map((zone) => {
              const items = execSummary.contractorByZone[zone.id] || []
              return (
                <div
                  key={zone.id}
                  style={{
                    background: "rgba(15,23,42,0.85)",
                    border: `1px solid ${ items.length > 0 ? zone.color : "#1e293b" }`,
                    borderTop: `4px solid ${zone.color}`,
                    borderRadius: 12,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minWidth: 0,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: "#f8fafc" }}>
                        {zone.icon} {lang === "ar" ? zone.labelAr : zone.labelEn}
                      </span>
                      <span
                        style={{
                          background: items.length > 0 ? `${zone.color}25` : "#0f172a",
                          color: items.length > 0 ? zone.color : "#64748b",
                          borderRadius: 999,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        {items.length}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#475569", padding: "14px 0", textAlign: "center" }}>
                        {tr("لا توجد أعمال مسجلة", "No works logged")}
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: "rgba(30,41,59,0.7)",
                              border: "1px solid #334155",
                              borderRadius: 8,
                              padding: "8px 10px",
                              fontSize: 12.5,
                              color: "#e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 6,
                            }}
                          >
                            <div style={{ lineHeight: 1.5, minWidth: 0 }}>
                              {item.unitOrArea && (
                                <div style={{ fontSize: 11, fontWeight: 800, color: zone.color }}>
                                  📍 {item.unitOrArea}
                                </div>
                              )}
                              <div>{item.work}</div>
                            </div>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteContractorWork(item.id)}
                                style={st.delRowBtn}
                              >
                                ✖
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Add Contractor / Unit Work */}
          {(canAdd || canEdit) && (
            <div className="mobile-stack-row" style={{ ...st.quickAddRow, marginTop: 14 }}>
              <select
                value={newContractor.zoneId}
                onChange={(e) => setNewContractor((p) => ({ ...p, zoneId: e.target.value }))}
                style={{ ...st.input, flex: "0 1 160px" }}
              >
                {CONTRACTOR_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.icon} {z.labelAr}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={tr("رقم الوحدة / المنطقة (مثال: وحدة 2003 أو Kids Area)", "Unit / Area (e.g. Unit 2003)")}
                value={newContractor.unitOrArea}
                onChange={(e) => setNewContractor((p) => ({ ...p, unitOrArea: e.target.value }))}
                style={{ ...st.input, flex: "1 1 190px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("تفاصيل أعمال المقاول أو الوحدة (مثال: عمل دهانات وجبسون بورد)...", "Contractor work details...")}
                value={newContractor.work}
                onChange={(e) => setNewContractor((p) => ({ ...p, work: e.target.value }))}
                style={{ ...st.input, flex: "2 1 220px", minWidth: 0 }}
              />
              <button type="button" onClick={handleAddContractorWork} style={st.addBtn}>
                ➕ {tr("إضافة عمل مقاول / وحدة", "Add Work")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          🧹 SECTION 2: أعمال النظافة الليلية (Night Housekeeping Works)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "hk") && (
        <div ref={sectionRefs.hk} className="mobile-section-card" style={st.sectionCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <h3 style={st.sectionTitle}>
                🧹 {tr("ثانياً: أعمال النظافة الليلية (Night Housekeeping Works)", "2. Night Housekeeping Works")}
              </h3>
              <div style={st.sectionSub}>
                {tr(
                  `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} (${getArabicDayName(selectedDate)}) • شاملة تأسيس غرفة تجميع القمامة (نظافة - تطهير) والجدول التأسيسي الأسبوعي`,
                  `Shift Date: ${formatArabicDateDisplay(selectedDate)} • Includes Garbage Room Sanitization & Weekly Foundation Plan`
                )}
              </div>
            </div>
            <span style={{ ...st.countBadge, background: "rgba(16,185,129,0.2)", color: "#34d399", borderColor: "#10b981" }}>
              {execSummary.hkDone} / {execSummary.hkTotal} ({execSummary.hkPct}%)
            </span>
          </div>

          {/* Weekly Foundational Night Schedule Banner for Selected Day */}
          {(() => {
            const dayAr = getArabicDayName(selectedDate)
            const wkRow =
              HK_WEEKLY_FOUNDATION_SCHEDULE.find((w) => w.dayName === dayAr) ||
              HK_WEEKLY_FOUNDATION_SCHEDULE[0]
            return (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(88,28,135,0.28), rgba(6,78,59,0.28))",
                  border: "1px solid #a855f7",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 12.5, lineHeight: 1.65, minWidth: 0, flex: "1 1 240px" }}>
                  <div style={{ fontWeight: 900, color: "#e9d5ff" }}>
                    📌 {tr(`الأعمال التأسيسية الأسبوعية المقررة لوردية ليلة (${dayAr}):`, `Scheduled Weekly Night Foundation for (${dayAr}):`)}
                  </div>
                  <div style={{ color: "#f8fafc" }}>
                    • <strong>{tr("التأسيس الليلي:", "Night Foundation:")}</strong> {wkRow.night}
                  </div>
                  <div style={{ color: "#6ee7b7" }}>
                    • <strong>{tr("الكانوبي والتند الليلي:", "Night Canopy & Awnings:")}</strong> {wkRow.canopyNight} | 🗑️ <strong>غرفة تجميع القمامة:</strong> تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)
                  </div>
                </div>
                {(canAdd || canEdit) && (
                  <button
                    type="button"
                    onClick={() => {
                      const existing = currentReport.housekeepingWorks || []
                      const additions = []
                      if (!existing.some((x) => x.work === wkRow.night)) {
                        additions.push({
                          id: `nhk-wk-${Date.now()}-1`,
                          location: `تأسيس ليلة ${dayAr}`,
                          work: wkRow.night,
                          status: "done",
                          notes: "",
                        })
                      }
                      if (!existing.some((x) => x.work === wkRow.canopyNight)) {
                        additions.push({
                          id: `nhk-wk-${Date.now()}-2`,
                          location: "الكانوبي والتند",
                          work: wkRow.canopyNight,
                          status: "done",
                          notes: "",
                        })
                      }
                      if (
                        !existing.some((x) =>
                          /غرفة تجميع القمامة.*تطهير/i.test(`${x.location} ${x.work}`)
                        )
                      ) {
                        additions.push({
                          id: `nhk-wk-${Date.now()}-3`,
                          location: "غرفة تجميع القمامة",
                          work: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)",
                          status: "done",
                          notes: "",
                        })
                      }
                      if (additions.length === 0) {
                        toast.success(tr("بنود التأسيس الليلي لهذا اليوم مضافة بالفعل في الجدول ✅", "Already in table ✅"))
                        return
                      }
                      saveReportPatch(
                        { housekeepingWorks: [...existing, ...additions] },
                        tr(`تم إدراج (${additions.length}) بنود تأسيس ليلي وكانوبي في الجدول ✅`, "Added weekly night foundation tasks ✅")
                      )
                    }}
                    style={{
                      background: "#9333ea",
                      color: "#fff",
                      border: "1px solid #c084fc",
                      borderRadius: 9,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    ⚡ {tr(`إدراج تأسيس ليلة (${dayAr}) بالجدول`, `Insert ${dayAr} Night Foundation`)}
                  </button>
                )}
              </div>
            )
          })()}

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: "auto" }}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 44 }}>#</th>
                  <th style={{ ...st.th, width: "28%" }}>{tr("المكان", "Location")}</th>
                  <th style={st.th}>{tr("الأعمال المنفذة", "Work Executed")}</th>
                  <th style={{ ...st.th, width: 140, textAlign: "center" }}>{tr("الحالة", "Status")}</th>
                  {canDelete && <th style={{ ...st.th, width: 60, textAlign: "center" }}>{tr("حذف", "Del")}</th>}
                </tr>
              </thead>
              <tbody>
                {(currentReport.housekeepingWorks || []).map((row, idx) => {
                  const statusCfg =
                    row.status === "done"
                      ? { label: tr("✓ تم التنفيذ", "✓ Done"), bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                      : row.status === "in_progress"
                      ? { label: tr("⏳ جاري", "⏳ In Progress"), bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                      : { label: tr("❌ لم يتم", "❌ Pending"), bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
                  return (
                    <tr key={row.id}>
                      <td style={{ ...st.td, color: "#64748b", fontWeight: 800 }}>{idx + 1}</td>
                      <td style={st.td}>
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => handleUpdateHkField(row.id, "location", e.target.value)}
                          style={st.inlineInputBold}
                        />
                      </td>
                      <td style={st.td}>
                        <input
                          type="text"
                          value={row.work}
                          onChange={(e) => handleUpdateHkField(row.id, "work", e.target.value)}
                          style={st.inlineInput}
                        />
                      </td>
                      <td style={{ ...st.td, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleHkStatus(row.id)}
                          style={{
                            background: statusCfg.bg,
                            color: statusCfg.color,
                            border: `1px solid ${statusCfg.border}`,
                            borderRadius: 999,
                            padding: "4px 12px",
                            fontSize: 11.5,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          {statusCfg.label}
                        </button>
                      </td>
                      {canDelete && (
                        <td style={{ ...st.td, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteHkRow(row.id)}
                            style={st.delRowBtn}
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Section 2 (Night Housekeeping) */}
          <div className="mobile-cards-view" style={{ gap: 10 }}>
            {(currentReport.housekeepingWorks || []).map((row, idx) => {
              const statusCfg =
                row.status === "done"
                  ? { label: tr("✓ تم التنفيذ", "✓ Done"), bg: "rgba(16,185,129,0.2)", color: "#34d399", border: "#10b981" }
                  : row.status === "in_progress"
                  ? { label: tr("⏳ جاري", "⏳ In Progress"), bg: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "#f59e0b" }
                  : { label: tr("❌ لم يتم", "❌ Pending"), bg: "rgba(239,68,68,0.2)", color: "#f87171", border: "#ef4444" }
              return (
                <div
                  key={row.id}
                  style={{
                    background: "rgba(2,6,23,0.65)",
                    border: `1px solid ${statusCfg.border}55`,
                    borderRight: `4px solid ${statusCfg.border}`,
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#94a3b8" }}>#{idx + 1}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleHkStatus(row.id)}
                        style={{
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.border}`,
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {statusCfg.label}
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteHkRow(row.id)}
                          style={st.delRowBtn}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", marginBottom: 3 }}>
                      📍 {tr("المكان:", "Location:")}
                    </div>
                    <input
                      type="text"
                      value={row.location}
                      onChange={(e) => handleUpdateHkField(row.id, "location", e.target.value)}
                      style={{ ...st.input, width: "100%", fontWeight: 800 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#94a3b8", marginBottom: 3 }}>
                      🧹 {tr("الأعمال المنفذة:", "Work Executed:")}
                    </div>
                    <input
                      type="text"
                      value={row.work}
                      onChange={(e) => handleUpdateHkField(row.id, "work", e.target.value)}
                      style={{ ...st.input, width: "100%" }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {(canAdd || canEdit) && (
            <div className="mobile-stack-row" style={{ ...st.quickAddRow, marginTop: 12 }}>
              <input
                type="text"
                placeholder={tr("المكان (مثال: حمامات البلازا / ريسبشن مبنى 1)...", "Location...")}
                value={newHk.location}
                onChange={(e) => setNewHk((p) => ({ ...p, location: e.target.value }))}
                style={{ ...st.input, flex: "1 1 200px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("الأعمال (مثال: تأسيس وتنظيف / غسيل باسكتات)...", "Night housekeeping work...")}
                value={newHk.work}
                onChange={(e) => setNewHk((p) => ({ ...p, work: e.target.value }))}
                style={{ ...st.input, flex: "2 1 220px", minWidth: 0 }}
              />
              <button type="button" onClick={handleAddHkRow} style={st.addBtn}>
                ➕ {tr("إضافة بند نظافة ليلية", "Add Night HK Row")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          🔧 SECTION 3: أعمال صيانة المول من قبل فريق الصيانة
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "maint") && (
        <div ref={sectionRefs.maint} className="mobile-section-card" style={st.sectionCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <h3 style={st.sectionTitle}>
                🔧 {tr("ثالثاً: أعمال صيانة المول من قبل فريق الصيانة (Mall Maintenance Team)", "3. Mall Maintenance Team Night Works")}
              </h3>
              <div style={st.sectionSub}>
                {tr(
                  `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} • توثيق أعمال الصيانة الليلية (رخام، كهرباء، دهانات، سباكة، تكييف...)`,
                  `Shift Date: ${formatArabicDateDisplay(selectedDate)} • Night maintenance team works`
                )}
              </div>
            </div>
            <span style={{ ...st.countBadge, background: "rgba(56,189,248,0.2)", color: "#38bdf8", borderColor: "#0284c7" }}>
              {execSummary.maintTotal} {tr("أعمال صيانة", "Maintenance Tasks")}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: "auto" }}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 44 }}>#</th>
                  <th style={{ ...st.th, width: "28%" }}>{tr("المكان", "Location")}</th>
                  <th style={st.th}>{tr("تفاصيل العمل", "Work Details")}</th>
                  <th style={{ ...st.th, width: 160 }}>{tr("التصنيف الفني", "Trade")}</th>
                  {canDelete && <th style={{ ...st.th, width: 60, textAlign: "center" }}>{tr("حذف", "Del")}</th>}
                </tr>
              </thead>
              <tbody>
                {(currentReport.maintenanceWorks || []).map((m, idx) => (
                  <tr key={m.id}>
                    <td style={{ ...st.td, color: "#64748b", fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ ...st.td, fontWeight: 800, color: "#f8fafc" }}>{m.location}</td>
                    <td style={{ ...st.td, color: "#e2e8f0" }}>{m.details}</td>
                    <td style={st.td}>
                      <span
                        style={{
                          background: "rgba(56,189,248,0.15)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56,189,248,0.35)",
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: 11,
                          fontWeight: 800,
                        }}
                      >
                        🛠️ {m.category || "صيانة عامة"}
                      </span>
                    </td>
                    {canDelete && (
                      <td style={{ ...st.td, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaintRow(m.id)}
                          style={st.delRowBtn}
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Section 3 (Mall Maintenance) */}
          <div className="mobile-cards-view" style={{ gap: 10 }}>
            {(currentReport.maintenanceWorks || []).map((m, idx) => (
              <div
                key={m.id}
                style={{
                  background: "rgba(2,6,23,0.65)",
                  border: "1px solid rgba(56,189,248,0.3)",
                  borderRight: "4px solid #38bdf8",
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 13.5, color: "#f8fafc" }}>
                    #{idx + 1} • 📍 {m.location}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        background: "rgba(56,189,248,0.15)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56,189,248,0.35)",
                        borderRadius: 999,
                        padding: "2px 8px",
                        fontSize: 10.5,
                        fontWeight: 800,
                      }}
                    >
                      🛠️ {m.category || "صيانة عامة"}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMaintRow(m.id)}
                        style={st.delRowBtn}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.6 }}>
                  {m.details}
                </div>
              </div>
            ))}
          </div>

          {(canAdd || canEdit) && (
            <div className="mobile-stack-row" style={{ ...st.quickAddRow, marginTop: 12 }}>
              <input
                type="text"
                placeholder={tr("المكان (مثال: البلازا / Kids Area / ضلع ثلاثة)...", "Location...")}
                value={newMaint.location}
                onChange={(e) => setNewMaint((p) => ({ ...p, location: e.target.value }))}
                style={{ ...st.input, flex: "1 1 180px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("تفاصيل العمل (مثال: أعمال رخام / أعمال كهرباء / أعمال دهانات)...", "Work details...")}
                value={newMaint.details}
                onChange={(e) => setNewMaint((p) => ({ ...p, details: e.target.value }))}
                style={{ ...st.input, flex: "2 1 220px", minWidth: 0 }}
              />
              <select
                value={newMaint.category}
                onChange={(e) => setNewMaint((p) => ({ ...p, category: e.target.value }))}
                style={{ ...st.input, flex: "0 1 170px" }}
              >
                <option value="مدني ورخام">🧱 مدني ورخام</option>
                <option value="كهرباء وإنارة">⚡ كهرباء وإنارة</option>
                <option value="دهانات وتشطيبات">🎨 دهانات وتشطيبات</option>
                <option value="سباكة وصرف">🚰 سباكة وصرف</option>
                <option value="تكييف وتبريد">❄️ تكييف وتبريد</option>
                <option value="أعمال عامة">🔧 أعمال عامة</option>
              </select>
              <button type="button" onClick={handleAddMaintRow} style={st.addBtn}>
                ➕ {tr("إضافة عمل صيانة", "Add Maintenance")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          🛢️ SECTION 4: متابعة تنظيف صناديق الدهون بالمطاعم
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "grease") && (
        <div ref={sectionRefs.grease} className="mobile-section-card" style={st.sectionCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <h3 style={st.sectionTitle}>
                🛢️ {tr("رابعاً: متابعة تنظيف صناديق الدهون بالمطاعم (Restaurants Grease Traps)", "4. Restaurants Grease Traps Cleaning Follow-up")}
              </h3>
              <div style={st.sectionSub}>
                {tr(
                  `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} • يحسب تلقائياً إجمالي الصناديق المنظفة وعدد المواقع المتابعة`,
                  `Shift Date: ${formatArabicDateDisplay(selectedDate)} • Auto-computes total traps & followed sites`
                )}
              </div>
            </div>
            <span style={{ ...st.countBadge, background: "rgba(245,158,11,0.2)", color: "#fbbf24", borderColor: "#f59e0b" }}>
              الإجمالي: {execSummary.totalTrapsCleaned} صندوق ({execSummary.followedRestaurantsCount} مواقع متابعة)
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: "auto" }}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 44 }}>#</th>
                  <th style={{ ...st.th, width: "26%" }}>{tr("المطعم / الموقع", "Restaurant / Site")}</th>
                  <th style={{ ...st.th, width: 160, textAlign: "center" }}>{tr("عدد الصناديق", "Traps Count")}</th>
                  <th style={st.th}>{tr("التفاصيل", "Details")}</th>
                  <th style={{ ...st.th, width: 150, textAlign: "center" }}>{tr("حالة المتابعة", "Follow-up")}</th>
                  {canDelete && <th style={{ ...st.th, width: 60, textAlign: "center" }}>{tr("حذف", "Del")}</th>}
                </tr>
              </thead>
              <tbody>
                {(currentReport.greaseTraps || []).map((g, idx) => (
                  <tr key={g.id}>
                    <td style={{ ...st.td, color: "#64748b", fontWeight: 800 }}>{idx + 1}</td>
                    <td style={{ ...st.td, fontWeight: 800, color: "#f8fafc" }}>{g.restaurant}</td>
                    <td style={{ ...st.td, textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleAdjustGreaseCount(g.id, -1)}
                          style={st.counterBtn}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 900, fontSize: 14, color: "#fbbf24", minWidth: 22 }}>
                          {g.trapsCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustGreaseCount(g.id, 1)}
                          style={st.counterBtn}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={st.td}>
                      <input
                        type="text"
                        value={g.details || ""}
                        onChange={(e) => handleUpdateGreaseDetails(g.id, e.target.value)}
                        style={st.inlineInput}
                      />
                    </td>
                    <td style={{ ...st.td, textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleGreaseFollowed(g.id)}
                        style={{
                          background: g.followed !== false ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                          color: g.followed !== false ? "#34d399" : "#f87171",
                          border: `1px solid ${g.followed !== false ? "#10b981" : "#ef4444"}`,
                          borderRadius: 999,
                          padding: "4px 12px",
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {g.followed !== false ? tr("✓ تمت المتابعة", "✓ Followed") : tr("❌ لم يتم", "❌ Not Done")}
                      </button>
                    </td>
                    {canDelete && (
                      <td style={{ ...st.td, textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteGreaseRestaurant(g.id)}
                          style={st.delRowBtn}
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Summary Row matching the sheet */}
                <tr style={{ background: "rgba(245,158,11,0.14)" }}>
                  <td style={{ ...st.td, fontWeight: 900, color: "#fbbf24" }}>Σ</td>
                  <td style={{ ...st.td, fontWeight: 900, fontSize: 14, color: "#fef3c7" }}>
                    {tr("الإجمالي", "Total")}
                  </td>
                  <td style={{ ...st.td, textAlign: "center", fontWeight: 900, fontSize: 16, color: "#fbbf24" }}>
                    {execSummary.totalTrapsCleaned}
                  </td>
                  <td style={{ ...st.td, fontWeight: 900, fontSize: 13.5, color: "#fde68a" }} colSpan={canDelete ? 3 : 2}>
                    {execSummary.followedRestaurantsCount} {tr("مواقع متابعة", "Followed Restaurants")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Section 4 (Grease Traps) */}
          <div className="mobile-cards-view" style={{ gap: 10 }}>
            {(currentReport.greaseTraps || []).map((g, idx) => (
              <div
                key={g.id}
                style={{
                  background: "rgba(2,6,23,0.65)",
                  border: `1px solid ${g.followed !== false ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"}`,
                  borderRight: `4px solid ${g.followed !== false ? "#f59e0b" : "#ef4444"}`,
                  borderRadius: 12,
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 900, fontSize: 14, color: "#f8fafc" }}>
                    #{idx + 1} • 🍽️ {g.restaurant}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleGreaseFollowed(g.id)}
                      style={{
                        background: g.followed !== false ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                        color: g.followed !== false ? "#34d399" : "#f87171",
                        border: `1px solid ${g.followed !== false ? "#10b981" : "#ef4444"}`,
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {g.followed !== false ? tr("✓ تمت المتابعة", "✓ Followed") : tr("❌ لم يتم", "❌ Not Done")}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteGreaseRestaurant(g.id)}
                        style={st.delRowBtn}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(15,23,42,0.8)", padding: "6px 10px", borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>
                    🛢️ {tr("عدد صناديق الدهون:", "Traps Count:")}
                  </span>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleAdjustGreaseCount(g.id, -1)}
                      style={st.counterBtn}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 900, fontSize: 15, color: "#fbbf24", minWidth: 22, textAlign: "center" }}>
                      {g.trapsCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAdjustGreaseCount(g.id, 1)}
                      style={st.counterBtn}
                    >
                      +
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={g.details || ""}
                  onChange={(e) => handleUpdateGreaseDetails(g.id, e.target.value)}
                  placeholder={tr("التفاصيل...", "Details...")}
                  style={{ ...st.input, width: "100%" }}
                />
              </div>
            ))}
          </div>

          {(canAdd || canEdit) && (
            <div className="mobile-stack-row" style={{ ...st.quickAddRow, marginTop: 12 }}>
              <input
                type="text"
                placeholder={tr("اسم المطعم / الموقع (مثال: مارزيبان / بابل / جو)...", "Restaurant name...")}
                value={newGrease.restaurant}
                onChange={(e) => setNewGrease((p) => ({ ...p, restaurant: e.target.value }))}
                style={{ ...st.input, flex: "1 1 180px", minWidth: 0 }}
              />
              <input
                type="number"
                min="1"
                placeholder={tr("عدد الصناديق", "Traps")}
                value={newGrease.trapsCount}
                onChange={(e) => setNewGrease((p) => ({ ...p, trapsCount: e.target.value }))}
                style={{ ...st.input, flex: "0 1 110px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("التفاصيل...", "Details...")}
                value={newGrease.details}
                onChange={(e) => setNewGrease((p) => ({ ...p, details: e.target.value }))}
                style={{ ...st.input, flex: "2 1 200px", minWidth: 0 }}
              />
              <button type="button" onClick={handleAddGreaseRestaurant} style={st.addBtn}>
                ➕ {tr("إضافة مطعم", "Add Restaurant")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          🤝 SECTION 5: تسليم الوردية للشيفت التالي (Shift Handover)
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeSectionFilter === "all" || activeSectionFilter === "handover") && (
        <div ref={sectionRefs.handover} className="mobile-section-card" style={st.sectionCard}>
          <div style={st.sectionHeaderRow}>
            <div>
              <h3 style={st.sectionTitle}>
                🤝 {tr("خامساً: تسليم الوردية للشيفت التالي (Shift Handover)", "5. Shift Handover to Next Shift")}
              </h3>
              <div style={st.sectionSub}>
                {tr(
                  `تاريخ الوردية: ${formatArabicDateDisplay(selectedDate)} • أي أعمال مفتوحة أو مطلوبة من الشيفت الصباحي مع إمكانية ترحيلها لسجل السناج العام`,
                  `Shift Date: ${formatArabicDateDisplay(selectedDate)} • Handover notes & actions required for next shift`
                )}
              </div>
            </div>
            <span style={{ ...st.countBadge, background: "rgba(239,68,68,0.2)", color: "#fca5a5", borderColor: "#ef4444" }}>
              {execSummary.handoverCount} {tr("بنود تسليم", "Handover Items")}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view" style={{ overflowX: "auto" }}>
            <table style={st.table}>
              <thead>
                <tr>
                  <th style={{ ...st.th, width: 44 }}>#</th>
                  <th style={{ ...st.th, width: "24%" }}>{tr("المكان", "Location")}</th>
                  <th style={{ ...st.th, width: "34%" }}>{tr("تسليم للشيفت التالي", "Handover Note")}</th>
                  <th style={st.th}>{tr("العمل المطلوب", "Action Required")}</th>
                  <th style={{ ...st.th, width: 170, textAlign: "center" }}>{tr("إجراء", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {(currentReport.handoverItems || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...st.td, textAlign: "center", padding: 20, color: "#94a3b8" }}>
                      ✅ {tr("لا توجد بنود معلقة — تم تسليم الوردية للشيفت التالي بدون عوائق", "No pending handover items — Shift handed over cleanly")}
                    </td>
                  </tr>
                ) : (
                  currentReport.handoverItems.map((h, idx) => (
                    <tr key={h.id}>
                      <td style={{ ...st.td, color: "#64748b", fontWeight: 800 }}>{idx + 1}</td>
                      <td style={{ ...st.td, fontWeight: 800, color: "#f8fafc" }}>{h.location}</td>
                      <td style={{ ...st.td, color: "#fca5a5", fontWeight: 700 }}>{h.handoverNote}</td>
                      <td style={{ ...st.td, color: "#e2e8f0" }}>{h.actionRequired}</td>
                      <td style={{ ...st.td, textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          {h.escalated ? (
                            <span style={{ fontSize: 11, color: "#34d399", fontWeight: 800 }}>
                              ✓ {tr("مُرحّل للسناج", "In Snags")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEscalateHandoverToSnag(h)}
                              style={{
                                background: "rgba(239,68,68,0.2)",
                                color: "#fca5a5",
                                border: "1px solid #ef4444",
                                borderRadius: 8,
                                padding: "4px 8px",
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              🚨 {tr("لسجل السناج", "To Snags")}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHandover(h.id)}
                              style={st.delRowBtn}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View for Section 5 (Shift Handover) */}
          <div className="mobile-cards-view" style={{ gap: 10 }}>
            {(currentReport.handoverItems || []).length === 0 ? (
              <div style={{ background: "rgba(2,6,23,0.55)", border: "1px solid #1e293b", borderRadius: 12, padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                ✅ {tr("لا توجد بنود معلقة — تم تسليم الوردية للشيفت التالي بدون عوائق", "No pending handover items — Shift handed over cleanly")}
              </div>
            ) : (
              currentReport.handoverItems.map((h, idx) => (
                <div
                  key={h.id}
                  style={{
                    background: "rgba(2,6,23,0.65)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRight: "4px solid #ef4444",
                    borderRadius: 12,
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 900, fontSize: 13.5, color: "#f8fafc" }}>
                      #{idx + 1} • 📍 {h.location}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {h.escalated ? (
                        <span style={{ fontSize: 11, color: "#34d399", fontWeight: 800 }}>
                          ✓ {tr("مُرحّل للسناج", "In Snags")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleEscalateHandoverToSnag(h)}
                          style={{
                            background: "rgba(239,68,68,0.2)",
                            color: "#fca5a5",
                            border: "1px solid #ef4444",
                            borderRadius: 8,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          🚨 {tr("لسجل السناج", "To Snags")}
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteHandover(h.id)}
                          style={st.delRowBtn}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#fca5a5", fontWeight: 700 }}>
                    🤝 {h.handoverNote}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#cbd5e1" }}>
                    ⚡ <strong>{tr("العمل المطلوب:", "Action Required:")}</strong> {h.actionRequired}
                  </div>
                </div>
              ))
            )}
          </div>

          {(canAdd || canEdit) && (
            <div className="mobile-stack-row" style={{ ...st.quickAddRow, marginTop: 12 }}>
              <input
                type="text"
                placeholder={tr("المكان (مثال: مبنى 2 / البلازا)...", "Location...")}
                value={newHandover.location}
                onChange={(e) => setNewHandover((p) => ({ ...p, location: e.target.value }))}
                style={{ ...st.input, flex: "1 1 160px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("تسليم للشيفت التالي (الحدث / الملاحظة)...", "Handover note...")}
                value={newHandover.handoverNote}
                onChange={(e) => setNewHandover((p) => ({ ...p, handoverNote: e.target.value }))}
                style={{ ...st.input, flex: "2 1 200px", minWidth: 0 }}
              />
              <input
                type="text"
                placeholder={tr("العمل المطلوب من الشيفت الصباحي...", "Action required...")}
                value={newHandover.actionRequired}
                onChange={(e) => setNewHandover((p) => ({ ...p, actionRequired: e.target.value }))}
                style={{ ...st.input, flex: "2 1 200px", minWidth: 0 }}
              />
              <button type="button" onClick={handleAddHandover} style={st.addBtn}>
                ➕ {tr("إضافة بند تسليم شيفت", "Add Handover")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InteractiveKpiCard({ icon, value, title, sub, color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active
          ? `linear-gradient(135deg, ${color}33, rgba(15,23,42,0.95))`
          : "rgba(15,23,42,0.82)",
        border: active ? `2px solid ${color}` : "1px solid #1e293b",
        borderRadius: 14,
        padding: "12px 12px",
        textAlign: "right",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: active ? `0 0 18px ${color}44` : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 5,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 4 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            padding: "2px 6px",
            borderRadius: 999,
            background: active ? color : "rgba(30,41,59,0.9)",
            color: active ? "#020617" : "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          {active ? "✓ معروض" : "عرض"}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#f8fafc", lineHeight: 1.3 }}>{title}</div>
      <div style={{ fontSize: 10.5, color: "#94a3b8", lineHeight: 1.3 }}>{sub}</div>
    </button>
  )
}

const st = {
  wrapper: {
    display: "grid",
    gap: 16,
    maxWidth: "100%",
    minWidth: 0,
  },
  heroBanner: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #064e3b 100%)",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: "18px 20px",
    minWidth: 0,
  },
  badgePill: {
    display: "inline-block",
    background: "rgba(16,185,129,0.2)",
    border: "1px solid #10b981",
    color: "#6ee7b7",
    borderRadius: 999,
    padding: "3px 12px",
    fontSize: 10.5,
    fontWeight: 900,
    marginBottom: 8,
  },
  heroTitle: {
    margin: "0 0 6px 0",
    fontSize: 19,
    fontWeight: 900,
    color: "#f8fafc",
    lineHeight: 1.4,
  },
  heroSub: {
    margin: 0,
    fontSize: 12.5,
    color: "#cbd5e1",
    lineHeight: 1.65,
    maxWidth: 880,
  },
  dateBar: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(148,163,184,0.2)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  dateInput: {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
    fontWeight: 700,
  },
  navDateBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },
  quickDatePill: {
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #059669, #047857)",
    color: "#fff",
    border: "1px solid #10b981",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
  },
  btnExcel: {
    background: "linear-gradient(135deg, #15803d, #166534)",
    color: "#fff",
    border: "1px solid #22c55e",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
  },
  btnPdf: {
    background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
    color: "#fff",
    border: "1px solid #3b82f6",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    fontSize: 12,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
    gap: 10,
    minWidth: 0,
  },
  filterNotice: {
    background: "rgba(16,185,129,0.12)",
    border: "1px solid #10b981",
    borderRadius: 12,
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    color: "#a7f3d0",
    fontSize: 12.5,
    fontWeight: 800,
  },
  showAllBtn: {
    background: "#10b981",
    color: "#022c22",
    border: "none",
    borderRadius: 8,
    padding: "6px 12px",
    fontWeight: 900,
    fontSize: 11.5,
    cursor: "pointer",
  },
  execCard: {
    background: "linear-gradient(135deg, rgba(6,78,59,0.42), rgba(15,23,42,0.92))",
    border: "2px solid #10b981",
    borderRadius: 16,
    padding: "16px 18px",
    minWidth: 0,
  },
  execBulletsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 10,
    marginTop: 12,
  },
  sectionCard: {
    background: "rgba(15,23,42,0.82)",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: "16px 18px",
    minWidth: 0,
  },
  sectionHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 900,
    color: "#f8fafc",
    lineHeight: 1.4,
  },
  sectionSub: {
    fontSize: 11.5,
    color: "#94a3b8",
    marginTop: 3,
    lineHeight: 1.5,
  },
  countBadge: {
    background: "rgba(168,85,247,0.18)",
    border: "1px solid #a855f7",
    color: "#e9d5ff",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 11.5,
    fontWeight: 800,
  },
  zonesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    background: "#0f172a",
    color: "#94a3b8",
    padding: "10px 12px",
    borderBottom: "1px solid #334155",
    textAlign: "right",
    fontWeight: 800,
    fontSize: 12,
  },
  td: {
    padding: "8px 12px",
    borderBottom: "1px solid #1e293b",
    color: "#e2e8f0",
    verticalAlign: "middle",
  },
  inlineInputBold: {
    width: "100%",
    background: "transparent",
    border: "1px solid transparent",
    color: "#f8fafc",
    fontWeight: 800,
    fontSize: 13,
    padding: "4px 6px",
    borderRadius: 6,
  },
  inlineInput: {
    width: "100%",
    background: "transparent",
    border: "1px solid transparent",
    color: "#cbd5e1",
    fontSize: 13,
    padding: "4px 6px",
    borderRadius: 6,
  },
  counterBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#f8fafc",
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 900,
  },
  delRowBtn: {
    background: "transparent",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    fontSize: 14,
    padding: 4,
  },
  quickAddRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
    background: "rgba(2,6,23,0.55)",
    border: "1px dashed #334155",
    borderRadius: 12,
    padding: 10,
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    color: "#f8fafc",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12.5,
    boxSizing: "border-box",
  },
  addBtn: {
    background: "linear-gradient(135deg, #059669, #0d9488)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
}
