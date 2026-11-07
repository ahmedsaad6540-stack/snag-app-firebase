// ══════════════════════════════════════════════════════════════════════════════
// 🌙 NIGHT SHIFT REPORT & DAILY EXECUTIVE SUMMARY — TEMPLATES & HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export const CONTRACTOR_ZONES = [
  { id: "b1",       labelAr: "مبنى ١",   labelEn: "Building 1", color: "#38bdf8", icon: "🏢" },
  { id: "b2",       labelAr: "مبنى ٢",   labelEn: "Building 2", color: "#a855f7", icon: "🏢" },
  { id: "b3",       labelAr: "مبنى ٣",   labelEn: "Building 3", color: "#ec4899", icon: "🏢" },
  { id: "plaza",    labelAr: "البلازا",  labelEn: "The Plaza",  color: "#10b981", icon: "⛲" },
  { id: "basement1",labelAr: "بيزمنت ١", labelEn: "Basement 1", color: "#f59e0b", icon: "🚗" },
  { id: "basement2",labelAr: "بيزمنت ٢", labelEn: "Basement 2", color: "#06b6d4", icon: "🚙" },
]

export const DEFAULT_NIGHT_HOUSEKEEPING = [
  { id: "nhk-1",  location: "حمامات البلازا",                 work: "تأسيس وتنظيف حمامات البلازا",                        status: "done", notes: "" },
  { id: "nhk-2",  location: "ريسبشن مبنى 1",                  work: "نظافة ريسبشن مبنى 1",                               status: "done", notes: "" },
  { id: "nhk-3",  location: "ريسبشن مبنى 3",                  work: "نظافة ريسبشن مبنى 3",                               status: "done", notes: "" },
  { id: "nhk-4",  location: "ريسبشن 2 المكاتب",               work: "نظافة ريسبشن العيادات",                             status: "done", notes: "" },
  { id: "nhk-5",  location: "ريسبشن 2 العيادات",              work: "نظافة ريسبشن المكاتب",                              status: "done", notes: "" },
  { id: "nhk-6",  location: "Bebabel & 1980",                 work: "غسيل تند",                                          status: "done", notes: "" },
  { id: "nhk-7",  location: "مداخل المباني في Basement 1",     work: "نظافة مداخل المباني في Basement 1",                  status: "done", notes: "" },
  { id: "nhk-8",  location: "مداخل المباني في Basement 2",     work: "نظافة مداخل المباني في Basement 2",                  status: "done", notes: "" },
  { id: "nhk-9",  location: "سلال المهملات / الباسكتات",       work: "غسيل باسكتات البلازا",                              status: "done", notes: "" },
  { id: "nhk-10", location: "ساحة ومداخل التحميل",             work: "نظافة منطقة التحميل وحمامات العاملين والكافيتريا",    status: "done", notes: "" },
  { id: "nhk-11", location: "main lobby",                     work: "سلم main lobby نظافة يدوي",                         status: "done", notes: "" },
  { id: "nhk-12", location: "smoking area",                   work: "مراجعة على نظافة غرفة التدخين",                     status: "done", notes: "" },
  { id: "nhk-13", location: "بيزمنت 2",                       work: "أعمال نظافة شارع cat",                              status: "done", notes: "" },
  { id: "nhk-14", location: "PLAZA",                          work: "تأسيس البلازا",                                     status: "done", notes: "" },
  { id: "nhk-15", location: "main lobby",                     work: "سحب المياه وتنظيف 3 الأدوار",                       status: "done", notes: "" },
  { id: "nhk-16", location: "PLAZA",                          work: "فواصل المطاعم",                                     status: "done", notes: "" },
  { id: "nhk-17", location: "غرفة تجميع القمامة",             work: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)",    status: "done", notes: "" },
]

export const DEFAULT_GREASE_TRAPS = [
  { id: "gt-1",  restaurant: "مارزيبان",           trapsCount: 2, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-2",  restaurant: "برجر",               trapsCount: 1, followed: true, details: "تمت متابعة تنظيف صندوق الدهون" },
  { id: "gt-3",  restaurant: "بيكل",               trapsCount: 2, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-4",  restaurant: "بابل",               trapsCount: 4, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-5",  restaurant: "سوشي مي",            trapsCount: 2, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-6",  restaurant: "ساتشي – الدور الخامس", trapsCount: 2, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-7",  restaurant: "أم شريف",            trapsCount: 2, followed: true, details: "تمت متابعة تنظيف صناديق الدهون" },
  { id: "gt-8",  restaurant: "1980",               trapsCount: 1, followed: true, details: "تمت متابعة تنظيف صندوق الدهون" },
  { id: "gt-9",  restaurant: "ساتشي – الدور السادس", trapsCount: 1, followed: true, details: "تمت متابعة تنظيف صندوق الدهون" },
  { id: "gt-10", restaurant: "joe",                trapsCount: 1, followed: true, details: "تمت متابعة تنظيف صندوق الدهون" },
]

export const INITIAL_REPORT_2026_11_06 = {
  dateIso: "2026-11-06",
  supervisorName: "مشرف الوردية الليلية",
  workforceCount: "فريق الوردية الليلية (نظافة + صيانة + إشراف)",
  executiveHighlights: [
    {
      id: "eh-1",
      level: "success",
      title: "إنجاز خطة التأسيس والنظافة الليلية الشاملة بنسبة 100%",
      details: "تم الانتهاء من تأسيس البلازا، غسيل التند (Bebabel & 1980)، غسيل باسكتات البلازا، تنظيف الريسبشنات بالمباني (1، 2، 3)، مداخل البيزمنت B1/B2، ومنطقة التحميل.",
    },
    {
      id: "eh-2",
      level: "info",
      title: "متابعة أعمال المقاولين والتشطيبات الليلية بالوحدات والبيزمنت",
      details: "تمت متابعة أعمال الدهانات والجبسون بورد بوحدة 2003 ووحدة 2001 في مبنى 2، وأعمال الدهانات والصنفرة بمنطقة Kids Area في بيزمنت 2.",
    },
    {
      id: "eh-3",
      level: "success",
      title: "إتمام الرقابة البيئية وتنظيف 18 صندوق دهون في 10 مطاعم",
      details: "تمت متابعة تنظيف صناديق الدهون بالكامل في: بابل (4)، مارزيبان (2)، بيكل (2)، سوشي مي (2)، ساتشي الدور 5 (2)، أم شريف (2)، برجر (1)، 1980 (1)، ساتشي الدور 6 (1)، وجو (1).",
    },
    {
      id: "eh-4",
      level: "warning",
      title: "تنفيذ أعمال صيانة ليلية في البلازا و Kids Area وضلع 3",
      details: "قام فريق صيانة المول بتنفيذ أعمال رخام بالبلازا، أعمال كهرباء في Kids Area، وأعمال دهانات في ضلع ثلاثة.",
    },
  ],
  contractorWorks: [
    {
      id: "cw-1",
      zoneId: "b2",
      unitOrArea: "وحدة 2003",
      work: "اعمال وحده 2003 عمل دهانات وجبسون بورد",
      status: "done",
      notes: "",
    },
    {
      id: "cw-2",
      zoneId: "b2",
      unitOrArea: "وحدة 2001",
      work: "اعمال وحده 2001 اعمال دهانات كراسي والترابيزات",
      status: "done",
      notes: "",
    },
    {
      id: "cw-3",
      zoneId: "basement2",
      unitOrArea: "Kids Area - بيزمنت 2",
      work: "اعمال دهانات وصنفره في بيزمنت 2 kids area",
      status: "done",
      notes: "",
    },
  ],
  housekeepingWorks: JSON.parse(JSON.stringify(DEFAULT_NIGHT_HOUSEKEEPING)),
  maintenanceWorks: [
    {
      id: "mw-1",
      location: "البلازا",
      details: "اعمال رخام",
      category: "مدني ورخام",
      status: "done",
    },
    {
      id: "mw-2",
      location: "kids area",
      details: "اعمال كهرباء",
      category: "كهرباء وإنارة",
      status: "done",
    },
    {
      id: "mw-3",
      location: "ضلع ثلاثه",
      details: "اعمال دهانات",
      category: "دهانات وتشطيبات",
      status: "done",
    },
  ],
  greaseTraps: JSON.parse(JSON.stringify(DEFAULT_GREASE_TRAPS)),
  handoverItems: [],
  generalNotes: "",
}

/**
 * Creates a fresh default night report for any given date.
 */
export function createDefaultNightReport(dateIso, userName = "") {
  if (dateIso === "2026-11-06") {
    return JSON.parse(JSON.stringify(INITIAL_REPORT_2026_11_06))
  }
  return {
    dateIso,
    supervisorName: userName || "مشرف الوردية الليلية",
    workforceCount: "فريق الوردية الليلية",
    executiveHighlights: [],
    contractorWorks: [],
    housekeepingWorks: JSON.parse(JSON.stringify(DEFAULT_NIGHT_HOUSEKEEPING)),
    maintenanceWorks: [],
    greaseTraps: JSON.parse(JSON.stringify(DEFAULT_GREASE_TRAPS)),
    handoverItems: [],
    generalNotes: "",
  }
}

/**
 * Generates structured Executive Summary metrics and narrative points from a report object.
 */
export function buildNightExecutiveSummary(report, daySnags = []) {
  const contractorWorks = report?.contractorWorks || []
  const hkWorks = report?.housekeepingWorks || []
  const maintWorks = report?.maintenanceWorks || []
  const greaseTraps = report?.greaseTraps || []
  const handoverItems = report?.handoverItems || []
  const highlights = report?.executiveHighlights || []

  const hkDone = hkWorks.filter((w) => w.status === "done").length
  const hkTotal = hkWorks.length
  const hkPct = hkTotal > 0 ? Math.round((hkDone / hkTotal) * 100) : 0

  const maintDone = maintWorks.filter((m) => m.status !== "open").length
  const maintTotal = maintWorks.length

  const followedRestaurantsList = greaseTraps.filter((g) => g.followed !== false)
  const followedRestaurantsCount = followedRestaurantsList.length
  const totalTrapsCleaned = followedRestaurantsList.reduce(
    (sum, g) => sum + (Number(g.trapsCount) || 0),
    0
  )

  // Group contractor works by zone
  const contractorByZone = {}
  for (const zone of CONTRACTOR_ZONES) {
    contractorByZone[zone.id] = contractorWorks.filter((c) => c.zoneId === zone.id)
  }

  // Overall completion score
  const totalTasksCount = hkTotal + maintTotal + greaseTraps.length
  const completedTasksCount = hkDone + maintDone + followedRestaurantsCount
  const overallScore =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 100

  // Auto-generate executive bullet points
  const autoBullets = []

  // 1. Contractors summary
  if (contractorWorks.length > 0) {
    const activeZonesSummary = CONTRACTOR_ZONES
      .map((z) => {
        const items = contractorByZone[z.id] || []
        if (items.length === 0) return null
        return `${z.labelAr} (${items.map((i) => i.work).join(" + ")})`
      })
      .filter(Boolean)
      .join(" | ")

    autoBullets.push({
      icon: "🏗️",
      categoryAr: "أعمال المقاولين والوحدات الليلية",
      categoryEn: "Contractors & Units Night Works",
      color: "#a855f7",
      textAr: `تمت متابعة (${contractorWorks.length}) أعمال مقاولين ووحدات خلال الوردية الليلية موزعة على: ${activeZonesSummary}.`,
      textEn: `Monitored (${contractorWorks.length}) contractor/unit night works across: ${activeZonesSummary}.`,
    })
  } else {
    autoBullets.push({
      icon: "🏗️",
      categoryAr: "أعمال المقاولين والوحدات الليلية",
      categoryEn: "Contractors & Units Night Works",
      color: "#64748b",
      textAr: "لم تُسجل أعمال مقاولين أو وحدات استثنائية خلال هذه الوردية الليلية.",
      textEn: "No contractor or unit night works recorded during this shift.",
    })
  }

  // 2. Night Housekeeping summary
  if (hkTotal > 0) {
    const sampleLocations = hkWorks
      .filter((w) => w.status === "done")
      .slice(0, 6)
      .map((w) => w.location)
      .join("، ")
    const pendingHk = hkWorks.filter((w) => w.status !== "done")
    autoBullets.push({
      icon: "🧹",
      categoryAr: "أعمال النظافة الليلية والتأسيس",
      categoryEn: "Night Housekeeping & Deep Cleaning",
      color: "#10b981",
      textAr:
        pendingHk.length === 0
          ? `تم إنجاز خطة النظافة الليلية بالكامل (${hkDone}/${hkTotal} موقع — بنسبة 100%) وشملت: ${sampleLocations}، وسائر نقاط التأسيس الليلي.`
          : `تم إنجاز (${hkDone} من ${hkTotal}) موقع نظافة ليلية بنسبة (${hkPct}%)، ويتبقى متابعة (${pendingHk.length}) موقع: ${pendingHk.map((p) => p.location).join("، ")}.`,
      textEn: `Completed ${hkDone}/${hkTotal} night housekeeping & deep-cleaning locations (${hkPct}%).`,
    })
  }

  // 3. Maintenance Team summary
  if (maintTotal > 0) {
    const maintSummary = maintWorks
      .map((m) => `${m.location}: ${m.details}`)
      .join(" • ")
    autoBullets.push({
      icon: "🔧",
      categoryAr: "أعمال فريق صيانة المول الليلية",
      categoryEn: "Mall Maintenance Team Night Works",
      color: "#38bdf8",
      textAr: `نفذ فريق صيانة المول (${maintTotal}) أعمال صيانة ليلية شملت: ${maintSummary}.`,
      textEn: `Mall maintenance team executed (${maintTotal}) night maintenance tasks: ${maintSummary}.`,
    })
  } else {
    autoBullets.push({
      icon: "🔧",
      categoryAr: "أعمال فريق صيانة المول الليلية",
      categoryEn: "Mall Maintenance Team Night Works",
      color: "#64748b",
      textAr: "لم تُسجل أعمال صيانة ليلية خاصة في جدول الوردية.",
      textEn: "No night maintenance works logged in this shift.",
    })
  }

  // 4. Grease Traps summary
  if (greaseTraps.length > 0) {
    const trapsDetails = followedRestaurantsList
      .map((g) => `${g.restaurant} (${g.trapsCount})`)
      .join("، ")
    autoBullets.push({
      icon: "🛢️",
      categoryAr: "متابعة تنظيف صناديق الدهون بالمطاعم",
      categoryEn: "Restaurants Grease Traps Inspection",
      color: "#f59e0b",
      textAr: `تمت متابعة وتنظيف إجمالي (${totalTrapsCleaned}) صندوق دهون في (${followedRestaurantsCount}) مواقع/مطاعم: ${trapsDetails}.`,
      textEn: `Inspected & verified cleaning of (${totalTrapsCleaned}) grease traps across (${followedRestaurantsCount}) restaurants.`,
    })
  }

  // 5. Shift Handover & Day Snags summary
  const openDaySnags = (daySnags || []).filter((s) => s.status !== "closed")
  if (handoverItems.length > 0 || openDaySnags.length > 0) {
    const hoText = handoverItems
      .map((h) => `${h.location} (${h.handoverNote} ← المطلوب: ${h.actionRequired})`)
      .join(" | ")
    autoBullets.push({
      icon: "🤝",
      categoryAr: "تسليم الوردية للشيفت التالي (Shift Handover)",
      categoryEn: "Shift Handover & Pending Actions",
      color: "#ef4444",
      textAr:
        handoverItems.length > 0
          ? `يوجد (${handoverItems.length}) بند تسليم للشيفت الصباحي: ${hoText}${openDaySnags.length > 0 ? ` — بالإضافة إلى (${openDaySnags.length}) ملاحظة مفتوحة بسجل السناج العام.` : ""}`
          : `لا توجد بنود معلقة بجدول تسليم الوردية، ويوجد (${openDaySnags.length}) ملاحظة مفتوحة في سجل السناج العام للمتابعة.`,
      textEn: `${handoverItems.length} shift handover items & ${openDaySnags.length} open snags for next shift follow-up.`,
    })
  } else {
    autoBullets.push({
      icon: "✅",
      categoryAr: "تسليم الوردية للشيفت التالي (Shift Handover)",
      categoryEn: "Shift Handover Status",
      color: "#22c55e",
      textAr: "تم تسليم الوردية للشيفت الصباحي بنجاح دون وجود أعطال حرجة معلقة.",
      textEn: "Shift handed over cleanly to morning shift with zero critical blockers.",
    })
  }

  return {
    contractorsCount: contractorWorks.length,
    contractorByZone,
    hkDone,
    hkTotal,
    hkPct,
    maintDone,
    maintTotal,
    followedRestaurantsCount,
    totalRestaurantsCount: greaseTraps.length,
    totalTrapsCleaned,
    handoverCount: handoverItems.length,
    highlightsCount: highlights.length,
    overallScore,
    autoBullets,
  }
}

/**
 * Formats the complete Night Shift Report + Executive Summary as clean text for sharing/copying.
 */
export function formatNightExecutiveSummaryText(report, summary) {
  const lines = []
  lines.push(`🌙 *التقرير الليلي والملخص التنفيذي اليومي (Executive Summary)*`)
  lines.push(`🏢 *بارك ستريت مول — Park Street Mall*`)
  lines.push(`🗓️ *تاريخ الوردية:* ${report.dateIso}`)
  if (report.supervisorName) lines.push(`👤 *المسؤول / المشرف:* ${report.supervisorName}`)
  lines.push(`📈 *مؤشر الإنجاز العام للوردية:* ${summary.overallScore}%`)
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)

  lines.push(`📊 *أولاً: الملخص التنفيذي لأهم الأحداث (EXECUTIVE SUMMARY):*`)
  if ((report.executiveHighlights || []).length > 0) {
    report.executiveHighlights.forEach((h, idx) => {
      const badge = h.level === "urgent" ? "🔴" : h.level === "warning" ? "🟡" : "🟢"
      lines.push(`${badge} *${ idx + 1 }. ${h.title}:* ${h.details || ""}`)
    })
    lines.push(``)
  }
  summary.autoBullets.forEach((b) => {
    lines.push(`${b.icon} *${b.categoryAr}:* ${b.textAr}`)
  })

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🏗️ *ثانياً: أعمال المقاولين والوحدات (${summary.contractorsCount}):*`)
  if ((report.contractorWorks || []).length === 0) {
    lines.push(`• لا توجد أعمال مقاولين مسجلة`)
  } else {
    report.contractorWorks.forEach((c) => {
      const z = CONTRACTOR_ZONES.find((z) => z.id === c.zoneId)
      lines.push(`• [${z ? z.labelAr : c.zoneId}] ${c.unitOrArea ? `${c.unitOrArea}: ` : ""}${c.work}`)
    })
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🧹 *ثالثاً: أعمال النظافة الليلية (${summary.hkDone}/${summary.hkTotal} — ${summary.hkPct}%):*`)
  ;(report.housekeepingWorks || []).forEach((h, idx) => {
    const icon = h.status === "done" ? "✅" : h.status === "in_progress" ? "⏳" : "❌"
    lines.push(`${idx + 1}. ${icon} *${h.location}:* ${h.work}`)
  })

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🔧 *رابعاً: أعمال صيانة المول (${summary.maintTotal}):*`)
  if ((report.maintenanceWorks || []).length === 0) {
    lines.push(`• لا توجد أعمال صيانة مسجلة`)
  } else {
    report.maintenanceWorks.forEach((m, idx) => {
      lines.push(`${idx + 1}. 🛠️ *${m.location}:* ${m.details}`)
    })
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🛢️ *خامساً: متابعة تنظيف صناديق الدهون بالمطاعم (الإجمالي: ${summary.totalTrapsCleaned} صندوق في ${summary.followedRestaurantsCount} مواقع):*`)
  ;(report.greaseTraps || []).forEach((g) => {
    const icon = g.followed !== false ? "✅" : "❌"
    lines.push(`• ${icon} *${g.restaurant}:* (${g.trapsCount}) صندوق — ${g.details || ""}`)
  })

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`)
  lines.push(`🤝 *سادساً: تسليم الوردية للشيفت التالي (Shift Handover):*`)
  if ((report.handoverItems || []).length === 0) {
    lines.push(`• تم تسليم الوردية دون ملاحظات معلقة ✅`)
  } else {
    report.handoverItems.forEach((h, idx) => {
      lines.push(`${idx + 1}. 📍 *${h.location}:* ${h.handoverNote} ⬅️ المطلوب: ${h.actionRequired}`)
    })
  }

  return lines.join("\n")
}
