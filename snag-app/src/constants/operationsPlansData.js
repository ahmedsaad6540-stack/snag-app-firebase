// ══════════════════════════════════════════════════════════════════════════════
// 📅 PARK STREET MALL — INTEGRATED OPERATIONS & ACTION PLANS DATA
// (Landscape • Spider & Facades • Pest Control • Housekeeping 3 Shifts & Monthly)
// ══════════════════════════════════════════════════════════════════════════════

export const EXEC_STATUSES = [
  { id: "pending", labelAr: "□ لم يُفحص",      labelEn: "□ Pending",       color: "#64748b", bg: "rgba(100,116,139,0.15)" },
  { id: "done",    labelAr: "✓ تم التنفيذ",    labelEn: "✓ Completed",     color: "#10b981", bg: "rgba(16,185,129,0.18)" },
  { id: "not_done",labelAr: "✗ لم يتم التنفيذ", labelEn: "✗ Not Executed",  color: "#ef4444", bg: "rgba(239,68,68,0.18)" },
  { id: "partial", labelAr: "◷ جاري / جزئي",   labelEn: "◷ Partial / WIP", color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  { id: "na",      labelAr: "— غير مطلوب",     labelEn: "— Not Required",  color: "#475569", bg: "rgba(71,85,105,0.12)" },
]

export const ARABIC_DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
]

export const WEEK_DAYS_ORDERED = [
  { id: "السبت",    en: "Saturday" },
  { id: "الأحد",    en: "Sunday" },
  { id: "الاثنين",  en: "Monday" },
  { id: "الثلاثاء", en: "Tuesday" },
  { id: "الأربعاء", en: "Wednesday" },
  { id: "الخميس",   en: "Thursday" },
  { id: "الجمعة",   en: "Friday" },
]

export function getArabicDayName(dateStr) {
  if (!dateStr) return "السبت"
  const [y, m, d] = dateStr.split("-").map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  return ARABIC_DAYS[dt.getDay()] || "السبت"
}

// ══════════════════════════════════════════════════════════════════════════════
// 1️⃣ LANDSCAPE MONTHLY ACTION PLAN — شركة جرين جاردن توب (Green Garden Top)
// ══════════════════════════════════════════════════════════════════════════════
export const LANDSCAPE_COMPANY_INFO = {
  companyAr: "شركة جرين جاردن توب (Green Garden Top)",
  companyEn: "Green Garden Top Co. (Landscape & Irrigation)",
  titleAr: "خطة عمل شهرية (Action Plan) — جدول صيانة ونظافة اللاندسكيب",
  titleEn: "Monthly Landscape Maintenance & Cleaning Action Plan",
  notesAr: [
    "مسح النباتات الداخلية باستمرار، وسيتم نظافة وري المكاتب يوم السبت من كل أسبوع.",
    "يتم العمل بناءً على ملاحظات فريق التشغيل.",
    "يتم إبلاغ إدارة الفاسيليتي (Facility Management) بأي ظواهر أو ملاحظات طارئة فوراً.",
  ],
  notesEn: [
    "Continuous wiping of indoor plants; office plants cleaning & watering every Saturday.",
    "Work is executed based on Operations Team observations.",
    "Facility Management must be notified immediately of any abnormal observations.",
  ],
}

/**
 * Generates the exact Landscape daily tasks for any date in any month,
 * matching the Green Garden Top monthly action plan table.
 */
export function getLandscapeDayPlan(dateStr) {
  const dayName = getArabicDayName(dateStr)
  const dayOfMonth = Number((dateStr || "").split("-")[2]) || 1

  if (dayName === "الجمعة") {
    return {
      isOffDay: true,
      dayName,
      tasks: [
        {
          id: "land_fri_off",
          slotAr: "طوال اليوم",
          slotEn: "All Day",
          zoneAr: "راحة أسبوعية (الجمعة) — طوارئ الري فقط",
          zoneEn: "Weekly Off (Friday) — Emergency Irrigation Only",
          taskAr: "متابعة طوارئ شبكات الري فقط (يوم الجمعة إجازة رسمية لعمالة الصيانة)",
          taskEn: "Emergency irrigation check only (Friday weekly rest)",
          defaultStatus: "na",
        },
      ],
    }
  }

  const byDay = {
    "السبت": {
      indoorTask: "كاف و دولاتو وجوي اند جوس و برجر (صيانة ونظافة أحواض الزرع)",
      indoorTaskEn: "Kaf, Dolato, Joy & Juice, and BRGR (Planters Maintenance & Cleaning)",
      islandTask: "من أمام أم ركانة بلازا إلى بداية كابيتال (الجزيرة الخارجية)",
      islandTaskEn: "From Om Rakana Plaza to Capital Entrance (Outer Island)",
      extraTask: "نظافة وري نباتات المكاتب الإدارية (السبت أسبوعياً) + مسح النباتات الداخلية",
      extraTaskEn: "Weekly Office Plants Cleaning & Watering (Every Saturday) + Indoor Plants Wiping",
    },
    "الأحد": {
      indoorTask: "برنش اند كيك وبابل و 1980 وبيسترو (صيانة ونظافة اللاندسكيب)",
      indoorTaskEn: "Brunch & Cake, Babel, 1980 & Bistro (Landscape Maintenance & Cleaning)",
      islandTask: "من بداية كابيتال إلى أول النافورة (الجزيرة الخارجية)",
      islandTaskEn: "From Capital Entrance to Fountain Start (Outer Island)",
      extraTask: "مسح النباتات الداخلية باستمرار ومتابعة شبكة الري",
      extraTaskEn: "Continuous indoor plants wiping & irrigation check",
    },
    "الاثنين": {
      indoorTask: "أمام أم شريف و مارزيان (صيانة ونظافة الأحواض والمسطحات)",
      indoorTaskEn: "In front of Em Sherif & Marzipan (Planters & Green Area Maintenance)",
      islandTask: "من أول النافورة إلى بداية العرب (الجزيرة الخارجية)",
      islandTaskEn: "From Fountain Start to Arab Bank Side (Outer Island)",
      extraTask: "مسح النباتات الداخلية باستمرار ومتابعة الزهور الموسمية",
      extraTaskEn: "Continuous indoor plants wiping & seasonal flowers check",
    },
    "الثلاثاء": {
      indoorTask: "ضلع واحد (1) مع نظافة البلازا",
      indoorTaskEn: "Wing / Side 1 + Plaza Landscape Cleaning",
      islandTask: "من بداية العرب إلى بداية جهينة (الجزيرة الخارجية)",
      islandTaskEn: "From Arab Bank Side to Juhayna Start (Outer Island)",
      extraTask: "مسح النباتات الداخلية باستمرار ومراجعة رشاشات الري",
      extraTaskEn: "Continuous indoor plants wiping & sprinklers inspection",
    },
    "الأربعاء": {
      indoorTask: "ضلع 2 مع نظافة البلازا",
      indoorTaskEn: "Wing / Side 2 + Plaza Landscape Cleaning",
      islandTask: "من بداية جهينة إلى أول ملف (الجزيرة الخارجية)",
      islandTaskEn: "From Juhayna Start to First U-Turn / Curve (Outer Island)",
      extraTask: "مسح النباتات الداخلية باستمرار وتهذيب الحشائش",
      extraTaskEn: "Continuous indoor plants wiping & lawn edging",
    },
    "الخميس": {
      indoorTask: (dayOfMonth === 1 || dayOfMonth === 15)
        ? "جزيرة الفالية (Valet Island) — صيانة ونظافة شاملة"
        : "ضلع 3 مع نظافة البلازا (وتركيز جزيرة الفالية أيام 1 و15)",
      indoorTaskEn: (dayOfMonth === 1 || dayOfMonth === 15)
        ? "Valet Island — Full Landscape Maintenance & Cleaning"
        : "Wing / Side 3 + Plaza Landscape Cleaning",
      islandTask: "من أول الملف إلى نهاية التبة (الجزيرة الخارجية)",
      islandTaskEn: "From First Curve to End of Hill / Slope (Outer Island)",
      extraTask: "مسح النباتات الداخلية باستمرار ومراجعة ملاحظات فريق التشغيل",
      extraTaskEn: "Continuous indoor plants wiping & Operations Team notes follow-up",
    },
  }

  const cfg = byDay[dayName] || byDay["السبت"]

  return {
    isOffDay: false,
    dayName,
    tasks: [
      {
        id: "land_slot1_indoor",
        slotAr: "من 6:00 ص إلى 10:00 ص",
        slotEn: "06:00 AM – 10:00 AM",
        zoneAr: "الصيانة والنظافة الداخلية (الممشى والأضلاع)",
        zoneEn: "Indoor / Promenade Landscape Maintenance",
        taskAr: cfg.indoorTask,
        taskEn: cfg.indoorTaskEn,
      },
      {
        id: "land_slot2_island",
        slotAr: "من 10:00 ص إلى 1:30 م",
        slotEn: "10:00 AM – 01:30 PM",
        zoneAr: "الجزيرة الخارجية (Outer Island)",
        zoneEn: "Outer Island Landscape",
        taskAr: cfg.islandTask,
        taskEn: cfg.islandTaskEn,
      },
      {
        id: "land_slot3_continuous",
        slotAr: "مستمر يومياً",
        slotEn: "Daily Continuous",
        zoneAr: "النباتات الداخلية والمكاتب",
        zoneEn: "Indoor Plants & Offices",
        taskAr: cfg.extraTask,
        taskEn: cfg.extraTaskEn,
      },
    ],
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2️⃣ SPIDER & FACADES WEEKLY/MONTHLY PLAN — جدول التشغيل الأسبوعي والشهري للسبايدر
// ══════════════════════════════════════════════════════════════════════════════
export const SPIDER_PLAN_INFO = {
  titleAr: "جدول التشغيل الأسبوعي والشهري لأعمال الـ Spider والواجهات — Park Street Mall",
  titleEn: "Weekly & Monthly Spider & Facade Operations Schedule — Park Street Mall",
  notesAr: [
    "1. مبنى 1 ومبنى 3: 5 أيام عمل أسبوعياً من السبت إلى الأربعاء (نظافة المبنى + البوابة الرئيسية والمداخل).",
    "2. مبنى 2: أعمال Spider لمدة 9 أيام عمل، مع وجود عامل نظافة أرضية منفصل عن فريق Spider، واستكمال أعمال الواجهة في الأسبوع التالي.",
    "3. يوم الخميس: لا يتم العمل على واجهات، ويتم العمل على المسطحات والمداخل وسلالم الكهرباء والهندريلات بالكامل وما يخص شغل الأرضي (يتم تسجيل عدد العمالة الفعلي المتواجد يومياً).",
  ],
  notesEn: [
    "1. Building 1 & Building 3: 5 working days/week from Saturday to Wednesday (Building facade + Main Gate & Entrances).",
    "2. Building 2: Spider rope-access works for 9 working days, with a dedicated ground cleaner separate from the Spider team.",
    "3. Thursday: No high facade work; full focus on flat surfaces, entrances, escalators, handrails & ground level works (actual workforce count is recorded daily).",
  ],
}

export function getSpiderDayPlan(dateStr) {
  const dayName = getArabicDayName(dateStr)

  if (dayName === "الجمعة") {
    return {
      isOffDay: true,
      dayName,
      scopeAr: "إجازة أسبوعية",
      scopeEn: "Weekly Rest (Off)",
      tasks: [
        {
          id: "spider_fri_off",
          buildingAr: "جميع المباني (1، 2، 3)",
          buildingEn: "All Buildings (1, 2, 3)",
          scopeAr: "إجازة أسبوعية",
          taskAr: "إجازة أسبوعية لفريق السبايدر والواجهات",
          taskEn: "Weekly rest day for Spider & Facade crew",
          defaultStatus: "na",
        },
      ],
    }
  }

  if (dayName === "الخميس") {
    return {
      isOffDay: false,
      dayName,
      scopeAr: "أعمال المسطحات والمداخل والأرضي (الخميس)",
      scopeEn: "Thursday Flat Surfaces, Entrances & Ground Works",
      tasks: [
        {
          id: "spider_thu_b2",
          buildingAr: "مبنى رقم 2 (خطة الواجهة)",
          buildingEn: "Building 2 (Facade Plan)",
          scopeAr: "خطة يوم الخميس",
          taskAr: "استكمال أعمال الواجهة بمبنى 2 (حسب خطة التنفيذ)",
          taskEn: "Complete facade works on Building 2 (per execution plan)",
        },
        {
          id: "spider_thu_ground",
          buildingAr: "المسطحات والمداخل وسلالم الكهرباء والهندريلات (B1/B2/B3)",
          buildingEn: "Flat Surfaces, Entrances, Escalators & Handrails",
          scopeAr: "خطة يوم الخميس (بدون واجهات علوية)",
          taskAr: "لا يتم العمل على واجهات — يتم العمل على المسطحات والمداخل وسلالم الكهرباء والهندريلات بالكامل وما يخص شغل الأرضي",
          taskEn: "No high facades — Full cleaning of canopies/flat surfaces, entrances, escalators, handrails & ground-level works",
        },
      ],
    }
  }

  // Saturday to Wednesday (السبت، الأحد، الاثنين، الثلاثاء، الأربعاء)
  return {
    isOffDay: false,
    dayName,
    scopeAr: "أعمال الواجهات والمداخل والسبايدر (السبت - الأربعاء)",
    scopeEn: "Facade, Main Gate & Spider Works (Sat – Wed)",
    tasks: [
      {
        id: "spider_b1",
        buildingAr: "مبنى رقم 1",
        buildingEn: "Building 1",
        scopeAr: "الواجهة + البوابة الرئيسية والمداخل",
        taskAr: "نظافة واجهة المبنى رقم 1 + البوابة الرئيسية والمداخل",
        taskEn: "Building 1 Facade Cleaning + Main Gate & Entrances",
      },
      {
        id: "spider_b2",
        buildingAr: "مبنى رقم 2 (Spider + أرضي)",
        buildingEn: "Building 2 (Spider + Ground)",
        scopeAr: "أعمال Spider + نظافة أرضية",
        taskAr: "عامل نظافة أرضية + أعمال Spider لواجهة مبنى 2 (ضمن دورة الـ 9 أيام عمل)",
        taskEn: "Ground-level cleaner + Spider rope-access facade cleaning on Building 2 (9-day cycle)",
      },
      {
        id: "spider_b3",
        buildingAr: "مبنى رقم 3",
        buildingEn: "Building 3",
        scopeAr: "الواجهة + البوابة الرئيسية والمداخل",
        taskAr: "نظافة واجهة المبنى رقم 3 + البوابة الرئيسية والمداخل",
        taskEn: "Building 3 Facade Cleaning + Main Gate & Entrances",
      },
      {
        id: "spider_manpower_check",
        buildingAr: "متابعة العمالة والإشراف والسلامة",
        buildingEn: "Crew Attendance & Safety Check",
        scopeAr: "حصر العمالة الفعلية ومهمات السلامة",
        taskAr: "حصر عدد عمال الواجهة والمدخل والمشرف المتواجدين فعلياً وفحص مهمات السلامة والأحزمة",
        taskEn: "Record actual crew attendance & inspect safety harnesses and equipment",
      },
    ],
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3️⃣ PEST CONTROL PLAN — شركة Pro Vision (خطة العمل لمول بارك ستريت)
// ══════════════════════════════════════════════════════════════════════════════
export const PEST_CONTROL_INFO = {
  companyAr: "شركة برو فيجن (Pro Vision Pest Control)",
  companyEn: "Pro Vision Pest Control Co.",
  titleAr: "خطة عمل مكافحة الحشرات والقوارض — مول بارك ستريت",
  titleEn: "Pest & Rodent Control Action Plan — Park Street Mall",
  pesticides: [
    { id: "voltam",     nameAr: "فولتام بلس (Voltam Plus)",       targetAr: "الحشرات الطائرة" },
    { id: "fipronil",   nameAr: "فيبرونيل (Fipronil)",            targetAr: "الحشرات الزاحفة" },
    { id: "timo",       nameAr: "تيمو (Timo)",                    targetAr: "طعوم القوارض" },
    { id: "rodent_bait",nameAr: "طعوم قوارض + كراسات لاصقة",      targetAr: "القوارض" },
    { id: "lambda",     nameAr: "لمبادا (Lambda)",                targetAr: "الحشرات الطائرة والزاحفة" },
    { id: "imidacloprid",nameAr: "اميدا كلوروبريد (Imidacloprid)", targetAr: "الحشرات الزاحفة والمحطات" },
  ],
  rulesAr: [
    "يتم عمل برنامج مكافحة الحشرات الزاحفة والحشرات الطائرة لجميع الأماكن المذكورة (17 موقع).",
    "يتم متابعة والتشيك على الأماكن يومياً.",
    "يتم متابعة المصائد البيولوجية مرتين في الأسبوع.",
    "يتم متابعة محطات القوارض (Bait Stations) والمحطات الفخارية مرتين أسبوعياً.",
  ],
}

export const PEST_LOCATIONS = [
  {
    id: "pc_b1",
    locationAr: "مبنى 1",
    locationEn: "Building 1",
    pestTypeAr: "الحشرات الزاحفة + الطائرة + القوارض",
    actionAr: "رش مبيد للحشرات الطائرة والزاحفة + فحص يومي للممرات والمداخل",
    actionEn: "Spray for flying & crawling insects + daily corridor inspection",
    pesticideAr: "فولتام بلس + فيبرونيل",
    freq: "daily",
  },
  {
    id: "pc_b2",
    locationAr: "مبنى 2",
    locationEn: "Building 2",
    pestTypeAr: "الحشرات الزاحفة + الطائرة + القوارض",
    actionAr: "رش مبيد لمكافحة الحشرات الزاحفة والطائرة + التشيك اليومي",
    actionEn: "Spray for crawling & flying insects + daily inspection",
    pesticideAr: "فيبرونيل + فولتام بلس",
    freq: "daily",
  },
  {
    id: "pc_b3",
    locationAr: "مبنى 3",
    locationEn: "Building 3",
    pestTypeAr: "الحشرات الزاحفة + الطائرة + القوارض",
    actionAr: "رش مبيد للحشرات الزاحفة والطائرة + متابعة نقاط الطعوم",
    actionEn: "Spray for crawling & flying insects + bait points check",
    pesticideAr: "فيبرونيل + تيمو",
    freq: "daily",
  },
  {
    id: "pc_wings",
    locationAr: "الأضلاع (Wings 1, 2, 3)",
    locationEn: "Mall Wings (1, 2, 3)",
    pestTypeAr: "الحشرات الطائرة والزاحفة + القوارض",
    actionAr: "رش الأضلاع + متابعة محطات الطعوم واللاصقات",
    actionEn: "Spray mall wings + check rodent bait stations & glue boards",
    pesticideAr: "لمبادا + طعوم قوارض",
    freq: "daily",
  },
  {
    id: "pc_basement1",
    locationAr: "بيزمنت 1 (B1)",
    locationEn: "Basement 1 (B1)",
    pestTypeAr: "القوارض + الحشرات الزاحفة والطائرة",
    actionAr: "رش بيزمنت 1 + متابعة البيت ستيشن وكراسات القوارض اللاصقة",
    actionEn: "B1 spraying + check Bait Stations & rodent glue traps",
    pesticideAr: "تيمو + لمبادا + طعوم قوارض",
    freq: "daily",
  },
  {
    id: "pc_basement2",
    locationAr: "بيزمنت 2 (B2)",
    locationEn: "Basement 2 (B2)",
    pestTypeAr: "القوارض + الحشرات الزاحفة والطائرة",
    actionAr: "رش بيزمنت 2 + متابعة محطات القوارض والبيت ستيشن",
    actionEn: "B2 spraying + check rodent Bait Stations",
    pesticideAr: "اميدا كلوروبريد + طعوم قوارض",
    freq: "daily",
  },
  {
    id: "pc_elec_rooms",
    locationAr: "غرف الكهرباء",
    locationEn: "Electrical Rooms",
    pestTypeAr: "القوارض + الحشرات الزاحفة",
    actionAr: "توزيع ومتابعة كراسات لاصقة للقوارض وطعوم جافة (بدون رش سوائل)",
    actionEn: "Place & inspect rodent glue boards & dry baits (no liquid spray)",
    pesticideAr: "كراسات لاصقة + طعوم قوارض (تيمو)",
    freq: "daily",
  },
  {
    id: "pc_rubbish_room",
    locationAr: "غرفة الرابش (تجميع القمامة)",
    locationEn: "Rubbish / Garbage Collection Room",
    pestTypeAr: "الحشرات الطائرة والزاحفة + القوارض",
    actionAr: "رش مكثف يومي لمكافحة الحشرات الطائرة والزاحفة + طعوم قوارض",
    actionEn: "Intensive daily spraying for flying & crawling insects + rodent baits",
    pesticideAr: "فولتام بلس + فيبرونيل + لمبادا",
    freq: "daily",
  },
  {
    id: "pc_staff_cafe",
    locationAr: "كافتيريا الاصطف (Staff Cafeteria)",
    locationEn: "Staff Cafeteria",
    pestTypeAr: "الحشرات الزاحفة والطائرة",
    actionAr: "مكافحة الحشرات الزاحفة والطائرة ومتابعة النظافة الوقائية",
    actionEn: "Crawling & flying insects treatment & preventive check",
    pesticideAr: "فيبرونيل + اميدا كلوروبريد",
    freq: "daily",
  },
  {
    id: "pc_outdoor",
    locationAr: "المنطقة الخارجية واللاندسكيب",
    locationEn: "Outdoor Area & Landscape",
    pestTypeAr: "الحشرات الطائرة + القوارض",
    actionAr: "رش المنطقة الخارجية + متابعة المصائد البيولوجية والمحطات الفخارية",
    actionEn: "Outdoor spraying + inspect biological traps & clay bait stations",
    pesticideAr: "فولتام بلس + لمبادا + تيمو",
    freq: "daily",
  },
  {
    id: "pc_restrooms",
    locationAr: "الحمامات (جميع المباني والبلازا)",
    locationEn: "Restrooms (All Buildings & Plaza)",
    pestTypeAr: "الحشرات الزاحفة والطائرة",
    actionAr: "رش البالوعات والأركان بمبيد الحشرات الزاحفة والطائرة",
    actionEn: "Treat drains & corners for crawling & flying insects",
    pesticideAr: "فيبرونيل + اميدا كلوروبريد",
    freq: "daily",
  },
  {
    id: "pc_restaurants_back",
    locationAr: "المناطق الخلفية للمطاعم",
    locationEn: "Restaurants Back-of-House Areas",
    pestTypeAr: "القوارض + الحشرات الزاحفة والطائرة",
    actionAr: "رش مكثف للحشرات الزاحفة والطائرة + متابعة البيت ستيشن والمصائد",
    actionEn: "Intensive treatment for crawling/flying insects + Bait Stations check",
    pesticideAr: "فولتام بلس + فيبرونيل + طعوم قوارض",
    freq: "daily",
  },
  {
    id: "pc_sewage_room",
    locationAr: "غرفة الصرف الصحي",
    locationEn: "Sewage / Drainage Room",
    pestTypeAr: "الحشرات الزاحفة + القوارض",
    actionAr: "رش غرفة الصرف الصحي لمكافحة الصراصير والحشرات الزاحفة + طعوم قوارض",
    actionEn: "Treat sewage room for cockroaches/crawling insects + rodent baits",
    pesticideAr: "فيبرونيل + لمبادا + تيمو",
    freq: "daily",
  },
  {
    id: "pc_lockers",
    locationAr: "اللوكر (غرف ملابس العاملين)",
    locationEn: "Staff Lockers",
    pestTypeAr: "الحشرات الزاحفة",
    actionAr: "التشيك اليومي ورش مبيد الحشرات الزاحفة",
    actionEn: "Daily inspection & crawling insects treatment",
    pesticideAr: "فيبرونيل + اميدا كلوروبريد",
    freq: "daily",
  },
  {
    id: "pc_plaza",
    locationAr: "البلازا (The Plaza)",
    locationEn: "The Plaza",
    pestTypeAr: "الحشرات الطائرة والزاحفة",
    actionAr: "رش محيط البلازا لمكافحة الحشرات الطائرة والزاحفة",
    actionEn: "Treat Plaza perimeter for flying & crawling insects",
    pesticideAr: "فولتام بلس + لمبادا",
    freq: "daily",
  },
  {
    id: "pc_admin",
    locationAr: "الإدارة (مكاتب الإدارة)",
    locationEn: "Management Offices",
    pestTypeAr: "الحشرات الزاحفة والطائرة",
    actionAr: "التشيك على مكاتب الإدارة ومعالجة آمنة للحشرات",
    actionEn: "Inspect management offices & apply safe insect treatment",
    pesticideAr: "اميدا كلوروبريد (جل/آمن)",
    freq: "daily",
  },
  {
    id: "pc_clinics",
    locationAr: "العيادات (جناح العيادات)",
    locationEn: "Clinics Wing",
    pestTypeAr: "الحشرات الزاحفة والطائرة",
    actionAr: "التشيك اليومي على ممرات العيادات ومكافحة الحشرات بدون رائحة",
    actionEn: "Daily inspection of clinics corridors & odorless insect control",
    pesticideAr: "اميدا كلوروبريد + فيبرونيل",
    freq: "daily",
  },
  // Twice-weekly specialized stations checks (Sunday & Wednesday)
  {
    id: "pc_bio_traps",
    locationAr: "المصائد البيولوجية (مرتين أسبوعياً)",
    locationEn: "Biological Traps (Twice Weekly)",
    pestTypeAr: "الحشرات الطائرة",
    actionAr: "متابعة وتنظيف وتجديد المصائد البيولوجية ومصائد الفرمونات (مرتين في الأسبوع)",
    actionEn: "Inspect, clean & renew biological traps (twice weekly)",
    pesticideAr: "جاذبات بيولوجية + لمبادا",
    freq: "twice_weekly",
  },
  {
    id: "pc_rodent_stations",
    locationAr: "محطات القوارض والمحطات الفخارية والبيت ستيشن (مرتين أسبوعياً)",
    locationEn: "Rodent Bait Stations & Clay Stations (Twice Weekly)",
    pestTypeAr: "القوارض",
    actionAr: "متابعة محطات القوارض (Bait Stations) والمحطات الفخارية وتجديد الطعوم واللاصقات (مرتين أسبوعياً)",
    actionEn: "Inspect rodent Bait Stations & clay stations, replenish baits & glue traps (twice weekly)",
    pesticideAr: "تيمو + طعوم قوارض + كراسات لاصقة",
    freq: "twice_weekly",
  },
]

export function getPestControlDayPlan(dateStr) {
  const dayName = getArabicDayName(dateStr)
  const isTwiceWeeklyDay = dayName === "الأحد" || dayName === "الأربعاء"
  return {
    dayName,
    isTwiceWeeklyDay,
    tasks: PEST_LOCATIONS.map((loc) => ({
      ...loc,
      isScheduledToday: loc.freq === "daily" || isTwiceWeeklyDay,
      badgeAr: loc.freq === "twice_weekly"
        ? (isTwiceWeeklyDay ? "🔥 موعد المتابعة نصف الأسبوعية اليوم" : "متابعة مرتين أسبوعياً (الأحد والأربعاء)")
        : "متابعة وتشيك يومي",
    })),
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4️⃣ HOUSEKEEPING PLAN — جداول الورديات الشهرية (نبدأ بجدول الوردية الليلية - نوفمبر 2026)
// ══════════════════════════════════════════════════════════════════════════════

// 4A. جدول أعمال النظافة والتأسيس — الوردية الليلية | نوفمبر 2026 (30 يوم)
export const HK_NIGHT_SHIFT_MONTHLY_DAYS = [
  {
    day: 1,
    date: "2026-11-01",
    dayName: "الأحد",
    main: "تنظيف تندة بيجوي اند جوس + تنظيف تندة BRGR",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيجوي اند جوس",
    side: "غسيل الأقماع",
    garage: "غسيل شارع مبنى 1 ومحيطه – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 2,
    date: "2026-11-02",
    dayName: "الاثنين",
    main: "تنظيف تندة دولاتو + تنظيف تندة بنزو",
    joints: "غسيل أرضية فواصل المطاعم – نطاق BRGR",
    side: "تمشيط الدواسات",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 3,
    date: "2026-11-03",
    dayName: "الثلاثاء",
    main: "تنظيف تندة ارت اوف فورم + تنظيف تندة نورما + تنظيف تندة كاف",
    joints: "غسيل أرضية فواصل المطاعم – نطاق دولاتو",
    side: "جرد الإنترلوك ضلع 1",
    garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 4,
    date: "2026-11-04",
    dayName: "الأربعاء",
    main: "تنظيف تندة بوكا + تنظيف تندة بيبابل",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بنزو",
    side: "جرد الإنترلوك ضلع 2",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 5,
    date: "2026-11-05",
    dayName: "الخميس",
    main: "تنظيف تندة برانش اند كيك + نظافة البنك العربي",
    joints: "غسيل أرضية فواصل المطاعم – نطاق آرت أوف فورم",
    side: "جرد الإنترلوك ضلع 3",
    garage: "غسيل شارع مبنى 3 ومحيطه – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 6,
    date: "2026-11-06",
    dayName: "الجمعة",
    main: "تنظيف تندة سوشي مي + تنظيف تندة نولا",
    joints: "غسيل أرضية فواصل المطاعم – نطاق نورما",
    side: "جرد الإنترلوك بالبوابة الرئيسية",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 7,
    date: "2026-11-07",
    dayName: "السبت",
    main: "تنظيف تندة ام شريف + تنظيف تندة بيبول اند بليس",
    joints: "غسيل أرضية فواصل المطاعم – نطاق كاف",
    side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع",
    garage: "غسيل الأقماع والحواجز الصفراء",
    loading: "يوميًا",
  },
  {
    day: 8,
    date: "2026-11-08",
    dayName: "الأحد",
    main: "تأسيس وتنظيف سلم ريتشارد",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بوكا",
    side: "غسيل الأقماع",
    garage: "غسيل شارع مبنى 1 ومحيطه – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 9,
    date: "2026-11-09",
    dayName: "الاثنين",
    main: "تأسيس وتنظيف سلم ريتشارد",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيبابل",
    side: "تمشيط الدواسات",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 10,
    date: "2026-11-10",
    dayName: "الثلاثاء",
    main: "تأسيس وتنظيف سلم مظلوم",
    joints: "غسيل أرضية فواصل المطاعم – نطاق برانش اند كيك",
    side: "جرد الإنترلوك ضلع 1",
    garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 11,
    date: "2026-11-11",
    dayName: "الأربعاء",
    main: "فحص وتنظيف موضعي للكنب – ريسبشن 1 و3",
    joints: "غسيل أرضية فواصل المطاعم – نطاق سوشي مي",
    side: "جرد الإنترلوك ضلع 2",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 12,
    date: "2026-11-12",
    dayName: "الخميس",
    main: "تنظيف كانوبي مبنى 1",
    joints: "غسيل أرضية فواصل المطاعم – نطاق نولا",
    side: "جرد الإنترلوك ضلع 3",
    garage: "غسيل شارع مبنى 3 ومحيطه – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 13,
    date: "2026-11-13",
    dayName: "الجمعة",
    main: "تنظيف كانوبي مبنى 2",
    joints: "غسيل أرضية فواصل المطاعم – نطاق أم شريف",
    side: "جرد الإنترلوك بالبوابة الرئيسية",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 14,
    date: "2026-11-14",
    dayName: "السبت",
    main: "تنظيف كانوبي مبنى 3",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيبول اند بليس",
    side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع",
    garage: "غسيل الأقماع والحواجز الصفراء",
    loading: "يوميًا",
  },
  {
    day: 15,
    date: "2026-11-15",
    dayName: "الأحد",
    main: "تنظيف كانوبي الأضلاع",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيجوي اند جوس",
    side: "غسيل الأقماع",
    garage: "غسيل شارع مبنى 1 ومحيطه – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 16,
    date: "2026-11-16",
    dayName: "الاثنين",
    main: "تنظيف تندة بيجوي اند جوس + تنظيف تندة BRGR",
    joints: "غسيل أرضية فواصل المطاعم – نطاق BRGR",
    side: "تمشيط الدواسات",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 17,
    date: "2026-11-17",
    dayName: "الثلاثاء",
    main: "تنظيف تندة دولاتو + تنظيف تندة بنزو",
    joints: "غسيل أرضية فواصل المطاعم – نطاق دولاتو",
    side: "جرد الإنترلوك ضلع 1",
    garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 18,
    date: "2026-11-18",
    dayName: "الأربعاء",
    main: "تنظيف تندة ارت اوف فورم + تنظيف تندة نورما + تنظيف تندة كاف",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بنزو",
    side: "جرد الإنترلوك ضلع 2",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 19,
    date: "2026-11-19",
    dayName: "الخميس",
    main: "تنظيف تندة بوكا + تنظيف تندة بيبابل",
    joints: "غسيل أرضية فواصل المطاعم – نطاق آرت أوف فورم",
    side: "جرد الإنترلوك ضلع 3",
    garage: "غسيل شارع مبنى 3 ومحيطه – جراج B1",
    loading: "يوميًا",
  },
  {
    day: 20,
    date: "2026-11-20",
    dayName: "الجمعة",
    main: "تنظيف تندة برانش اند كيك + نظافة البنك العربي",
    joints: "غسيل أرضية فواصل المطاعم – نطاق نورما",
    side: "جرد الإنترلوك بالبوابة الرئيسية",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 21,
    date: "2026-11-21",
    dayName: "السبت",
    main: "تنظيف تندة سوشي مي + تنظيف تندة نولا",
    joints: "غسيل أرضية فواصل المطاعم – نطاق كاف",
    side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع",
    garage: "غسيل الأقماع والحواجز الصفراء",
    loading: "يوميًا",
  },
  {
    day: 22,
    date: "2026-11-22",
    dayName: "الأحد",
    main: "تنظيف تندة ام شريف + تنظيف تندة بيبول اند بليس",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بوكا",
    side: "غسيل الأقماع",
    garage: "غسيل شارع مبنى 1 ومحيطه – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 23,
    date: "2026-11-23",
    dayName: "الاثنين",
    main: "تأسيس وتنظيف سلم ريتشارد",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيبابل",
    side: "تمشيط الدواسات",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 24,
    date: "2026-11-24",
    dayName: "الثلاثاء",
    main: "تأسيس وتنظيف سلم ريتشارد",
    joints: "غسيل أرضية فواصل المطاعم – نطاق برانش اند كيك",
    side: "جرد الإنترلوك ضلع 1",
    garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 25,
    date: "2026-11-25",
    dayName: "الأربعاء",
    main: "تأسيس وتنظيف سلم مظلوم",
    joints: "غسيل أرضية فواصل المطاعم – نطاق سوشي مي",
    side: "جرد الإنترلوك ضلع 2",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 26,
    date: "2026-11-26",
    dayName: "الخميس",
    main: "فحص وتنظيف موضعي للكنب – ريسبشن 1 و3",
    joints: "غسيل أرضية فواصل المطاعم – نطاق نولا",
    side: "جرد الإنترلوك ضلع 3",
    garage: "غسيل شارع مبنى 3 ومحيطه – جراج B2",
    loading: "يوميًا",
  },
  {
    day: 27,
    date: "2026-11-27",
    dayName: "الجمعة",
    main: "تنظيف كانوبي مبنى 1",
    joints: "غسيل أرضية فواصل المطاعم – نطاق أم شريف",
    side: "جرد الإنترلوك بالبوابة الرئيسية",
    garage: "تنظيف الإيبوكسي",
    loading: "يوميًا",
  },
  {
    day: 28,
    date: "2026-11-28",
    dayName: "السبت",
    main: "تنظيف كانوبي مبنى 2",
    joints: "غسيل أرضية فواصل المطاعم – نطاق بيبول اند بليس",
    side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع",
    garage: "غسيل الأقماع والحواجز الصفراء",
    loading: "يوميًا",
  },
  {
    day: 29,
    date: "2026-11-29",
    dayName: "الأحد",
    main: "تنظيف كانوبي مبنى 3",
    joints: "غسيل تكميلي لفواصل المطاعم – حسب ملاحظات المشرف (1)",
    side: "غسيل الأقماع + تمشيط الدواسات",
    garage: "تنظيف المواسير العلوية بجراج 1",
    loading: "يوميًا",
  },
  {
    day: 30,
    date: "2026-11-30",
    dayName: "الاثنين",
    main: "تنظيف كانوبي الأضلاع",
    joints: "غسيل تكميلي لفواصل المطاعم – حسب ملاحظات المشرف (2)",
    side: "تنظيف شامل للكنب – ريسبشن 1 و3 (مرة شهريًا)",
    garage: "تنظيف المواسير العلوية بجراج 1",
    loading: "يوميًا",
  },
]

export const HK_MONTHLY_DAYS = HK_NIGHT_SHIFT_MONTHLY_DAYS

export const HK_NIGHT_PLAN_NOTE =
  "توزيع غسيل فواصل المطاعم حسب نطاق كل مطعم؛ يُراجع المشرف المسارات الفعلية قبل التنفيذ. الأعمال اليومية بمنطقة التحميل مستمرة."

// 4B. Housekeeping Granular Area / Element Filters (فلتر بنود جدول النظافة)
export const HK_ITEM_FILTERS = [
  { id: "all",                 icon: "🧹", labelAr: "الكل (جميع البنود)",                                  labelEn: "All HK Items" },
  { id: "main_cleaning",       icon: "⛺", labelAr: "أعمال التنظيف الرئيسية (تندات • كانوبي • سلالم • ريسبشن)", labelEn: "Main Cleaning (Awnings, Canopies, Stairs, Reception)" },
  { id: "restaurant_joints",   icon: "🍽️", labelAr: "غسيل أرضية فواصل المطاعم",                             labelEn: "Restaurant Floor Joints" },
  { id: "side_works",          icon: "🧱", labelAr: "الأعمال الجانبية (الأقماع • الدواسات • الإنترلوك • أحواض الزرع)", labelEn: "Side Works (Cones, Mats, Interlock, Planters)" },
  { id: "garage_cat",          icon: "🚗", labelAr: "أعمال الجراج (كات B1 / B2 • الإيبوكسي • المواسير)",     labelEn: "Garage CAT Works (B1/B2, Epoxy, Pipes)" },
  { id: "loading_area",        icon: "🚛", labelAr: "منطقة التحميل (يوميًا)",                                labelEn: "Loading Area (Daily)" },
]

/**
 * Checks whether a Housekeeping task matches a selected HK_ITEM_FILTERS id
 */
export function matchesHkItemFilter(taskItem, filterId) {
  if (!filterId || filterId === "all") return true
  if (Array.isArray(taskItem.hkTags) && taskItem.hkTags.includes(filterId)) return true
  const text = `${taskItem.categoryAr || ""} ${taskItem.requiredTaskAr || ""}`
  switch (filterId) {
    case "main_cleaning":
      return /أعمال التنظيف الرئيسية|تندة|كانوبي|سلم| للكنب|البنك العربي/i.test(text)
    case "restaurant_joints":
      return /فواصل المطاعم/i.test(text)
    case "side_works":
      return /الأعمال الجانبية|الأقماع|الدواسات|الإنترلوك|أحواض الزرع|اللايت بوكس/i.test(text)
    case "garage_cat":
      return /أعمال الجراج|جراج|الإيبوكسي|المواسير العلوية|الحواجز الصفراء/i.test(text)
    case "loading_area":
      return /منطقة التحميل/i.test(text)
    default:
      return true
  }
}

// 4C. Dynamic Generator for the 3-Shift Monthly Checklists (Starting with Night Shift)
export function getHousekeepingShiftChecklistForDay(dayName, dayOfMonth = 1) {
  const safeDay = Math.min(30, Math.max(1, Number(dayOfMonth) || 1))
  const entry =
    HK_NIGHT_SHIFT_MONTHLY_DAYS.find((d) => d.day === safeDay) ||
    HK_NIGHT_SHIFT_MONTHLY_DAYS[0]

  // Morning Shift (الوردية الصباحية) — بانتظار تزويد جدول الوردية الصباحية من المستخدم
  const morning = []

  // Evening Shift (الوردية المسائية) — بانتظار تزويد جدول الوردية المسائية من المستخدم
  const evening = []

  // Night Shift (الوردية الليلية) — جدول أعمال النظافة والتأسيس الشهري (30 يوم)
  const night = [
    {
      id: `night_d${safeDay}_main`,
      shift: "night",
      area: "أعمال التنظيف الرئيسية",
      zone: `يوم ${safeDay} (${entry.dayName})`,
      tags: ["main_cleaning"],
      task: entry.main,
    },
    {
      id: `night_d${safeDay}_joints`,
      shift: "night",
      area: "غسيل أرضية فواصل المطاعم",
      zone: `يوم ${safeDay} (${entry.dayName})`,
      tags: ["restaurant_joints"],
      task: entry.joints,
    },
    {
      id: `night_d${safeDay}_side`,
      shift: "night",
      area: "الأعمال الجانبية",
      zone: `يوم ${safeDay} (${entry.dayName})`,
      tags: ["side_works"],
      task: entry.side,
    },
    {
      id: `night_d${safeDay}_garage`,
      shift: "night",
      area: "أعمال الجراج (كات)",
      zone: `يوم ${safeDay} (${entry.dayName})`,
      tags: ["garage_cat"],
      task: entry.garage,
    },
    {
      id: `night_d${safeDay}_loading`,
      shift: "night",
      area: "منطقة التحميل",
      zone: `يوم ${safeDay} (${entry.dayName})`,
      tags: ["loading_area"],
      task: `تنظيف منطقة التحميل (${entry.loading})`,
    },
  ]

  return { morning, evening, night, nightEntry: entry }
}

export function getHousekeepingDayPlan(dateStr) {
  const dayName = getArabicDayName(dateStr)
  const dayOfMonth = Math.min(30, Math.max(1, Number((dateStr || "").split("-")[2]) || 1))
  const nightEntry =
    HK_NIGHT_SHIFT_MONTHLY_DAYS.find((d) => d.day === dayOfMonth) ||
    HK_NIGHT_SHIFT_MONTHLY_DAYS[0]
  const shifts = getHousekeepingShiftChecklistForDay(dayName, dayOfMonth)

  // Empty specializedTasks to prevent duplicating Night Shift items
  const specializedTasks = []

  return {
    dayName,
    dayOfMonth,
    nightEntry,
    specializedTasks,
    shifts,
  }
}
