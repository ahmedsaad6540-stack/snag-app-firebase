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
// 4️⃣ HOUSEKEEPING PLAN — الجدول الشهري للتند والفواصل والجراج + الورديات الثلاث (587 بند)
// ══════════════════════════════════════════════════════════════════════════════

// 4A. Monthly Specialized Cleaning Schedule (30 Days — Tents, Canopies, Restaurant Joints, Garage CAT, Loading Area)
export const HK_MONTHLY_DAYS = [
  { day: 1,  main: "تنظيف تندة جوي اند جوس + تنظيف تندة BRGR", joints: "غسيل أرضية فواصل المطاعم – نطاق جوي اند جوس", side: "غسيل الأقماع", garage: "غسيل شارع مبنى 1 ومحيطه – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 2,  main: "تنظيف تندة دولاتو + تنظيف تندة Water Way", joints: "غسيل أرضية فواصل المطاعم – نطاق BRGR", side: "تمشيط الدواسات", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 3,  main: "تنظيف تندة آرت أوف فورم + تندة نورما + تندة كاف", joints: "غسيل أرضية فواصل المطاعم – نطاق دولاتو", side: "جرد الإنترلوك ضلع 1", garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 4,  main: "تنظيف تندة 1980 + تنظيف تندة بيبابل (Babel)", joints: "غسيل أرضية فواصل المطاعم – نطاق Water Way", side: "جرد الإنترلوك ضلع 2", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 5,  main: "تنظيف تندة برانش اند كيك + نظافة البنك العربي", joints: "غسيل أرضية فواصل المطاعم – نطاق آرت أوف فورم", side: "جرد الإنترلوك ضلع 3", garage: "غسيل شارع مبنى 3 ومحيطه – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 6,  main: "تنظيف تندة سوشي مي + تنظيف تندة نولا", joints: "غسيل أرضية فواصل المطاعم – نطاق نورما", side: "جرد الإنترلوك بالبوابة الرئيسية", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 7,  main: "تنظيف تندة أم شريف + تنظيف تندة بيبول اند بليس", joints: "غسيل أرضية فواصل المطاعم – نطاق كاف", side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع", garage: "غسيل الأقماع والحواجز الصفراء", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 8,  main: "تأسيس وتنظيف سلم ريتشارد", joints: "غسيل أرضية فواصل المطاعم – نطاق 1980", side: "غسيل الأقماع", garage: "غسيل شارع مبنى 1 ومحيطه – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 9,  main: "تأسيس وتنظيف سلم ريتشارد (استكمال)", joints: "غسيل أرضية فواصل المطاعم – نطاق بيبابل", side: "تمشيط الدواسات", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 10, main: "تأسيس وتنظيف سلم مظلوم", joints: "غسيل أرضية فواصل المطاعم – نطاق برانش اند كيك", side: "جرد الإنترلوك ضلع 1", garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 11, main: "فحص وتنظيف موضعي للكنب – ريسبشن 1 و3", joints: "غسيل أرضية فواصل المطاعم – نطاق سوشي مي", side: "جرد الإنترلوك ضلع 2", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 12, main: "تنظيف كانوبي مبنى 1", joints: "غسيل أرضية فواصل المطاعم – نطاق نولا", side: "جرد الإنترلوك ضلع 3", garage: "غسيل شارع مبنى 3 ومحيطه – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 13, main: "تنظيف كانوبي مبنى 2", joints: "غسيل أرضية فواصل المطاعم – نطاق أم شريف", side: "جرد الإنترلوك بالبوابة الرئيسية", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 14, main: "تنظيف كانوبي مبنى 3", joints: "غسيل أرضية فواصل المطاعم – نطاق بيبول اند بليس", side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع", garage: "غسيل الأقماع والحواجز الصفراء", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 15, main: "تنظيف كانوبي الأضلاع + نظافة الأسطح نصف الشهرية", joints: "غسيل أرضية فواصل المطاعم – نطاق جوي اند جوس", side: "غسيل الأقماع", garage: "غسيل شارع مبنى 1 ومحيطه – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 16, main: "تنظيف تندة جوي اند جوس + تنظيف تندة BRGR", joints: "غسيل أرضية فواصل المطاعم – نطاق BRGR", side: "تمشيط الدواسات", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 17, main: "تنظيف تندة دولاتو + تنظيف تندة Water Way", joints: "غسيل أرضية فواصل المطاعم – نطاق دولاتو", side: "جرد الإنترلوك ضلع 1", garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 18, main: "تنظيف تندة آرت أوف فورم + تندة نورما + تندة كاف", joints: "غسيل أرضية فواصل المطاعم – نطاق Water Way", side: "جرد الإنترلوك ضلع 2", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 19, main: "تنظيف تندة 1980 + تنظيف تندة بيبابل (Babel)", joints: "غسيل أرضية فواصل المطاعم – نطاق آرت أوف فورم", side: "جرد الإنترلوك ضلع 3", garage: "غسيل شارع مبنى 3 ومحيطه – جراج B1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 20, main: "تنظيف تندة برانش اند كيك + نظافة البنك العربي", joints: "غسيل أرضية فواصل المطاعم – نطاق نورما", side: "جرد الإنترلوك بالبوابة الرئيسية", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 21, main: "تنظيف تندة سوشي مي + تنظيف تندة نولا", joints: "غسيل أرضية فواصل المطاعم – نطاق كاف", side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع", garage: "غسيل الأقماع والحواجز الصفراء", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 22, main: "تنظيف تندة أم شريف + تنظيف تندة بيبول اند بليس", joints: "غسيل أرضية فواصل المطاعم – نطاق 1980", side: "غسيل الأقماع", garage: "غسيل شارع مبنى 1 ومحيطه – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 23, main: "تأسيس وتنظيف سلم ريتشارد", joints: "غسيل أرضية فواصل المطاعم – نطاق بيبابل", side: "تمشيط الدواسات", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 24, main: "تأسيس وتنظيف سلم ريتشارد (استكمال)", joints: "غسيل أرضية فواصل المطاعم – نطاق برانش اند كيك", side: "جرد الإنترلوك ضلع 1", garage: "غسيل الشارع الأوسط بين مبنى 1 و3 – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 25, main: "تأسيس وتنظيف سلم LMD", joints: "غسيل أرضية فواصل المطاعم – نطاق سوشي مي", side: "جرد الإنترلوك ضلع 2", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 26, main: "فحص وتنظيف موضعي للكنب – ريسبشن 1 و3", joints: "غسيل أرضية فواصل المطاعم – نطاق نولا", side: "جرد الإنترلوك ضلع 3", garage: "غسيل شارع مبنى 3 ومحيطه – جراج B2", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 27, main: "تنظيف كانوبي مبنى 1", joints: "غسيل أرضية فواصل المطاعم – نطاق أم شريف", side: "جرد الإنترلوك بالبوابة الرئيسية", garage: "تنظيف الإيبوكسي", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 28, main: "تنظيف كانوبي مبنى 2", joints: "غسيل أرضية فواصل المطاعم – نطاق بيبول اند بليس", side: "تنظيف أحواض الزرع واللايت بوكس وكشافات الأضلاع", garage: "غسيل الأقماع والحواجز الصفراء", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 29, main: "تنظيف كانوبي مبنى 3", joints: "غسيل تكميلي لفواصل المطاعم – حسب ملاحظات المشرف (1)", side: "غسيل الأقماع + تمشيط الدواسات", garage: "تنظيف المواسير العلوية بجراج 1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 30, main: "تنظيف كانوبي الأضلاع", joints: "غسيل تكميلي لفواصل المطاعم – حسب ملاحظات المشرف (2)", side: "تنظيف شامل للكنب – ريسبشن 1 و3 (مرة شهرياً)", garage: "تنظيف المواسير العلوية بجراج 1", loading: "تنظيف منطقة التحميل (يومياً)" },
  { day: 31, main: "مراجعة شاملة للتند والكانوبي والأسطح", joints: "غسيل تكميلي لفواصل المطاعم والمداخل", side: "جرد شامل للإنترلوك والدواسات", garage: "مراجعة نظافة جراج B1 و B2", loading: "تنظيف منطقة التحميل (يومياً)" },
]

// 4B. Housekeeping Granular Area / Element Filters (فلتر بنود وأماكن الهاوس كيبنج)
export const HK_ITEM_FILTERS = [
  { id: "all",                icon: "🧹", labelAr: "الكل (جميع البنود)",                 labelEn: "All HK Items" },
  { id: "reception",          icon: "🏢", labelAr: "نظافة الرسبشن والمداخل",            labelEn: "Reception & Entrances" },
  { id: "stairs",             icon: "🪜", labelAr: "السلالم (طوارئ • ريتشارد • مظلوم • LMD)", labelEn: "Stairs & Escalators" },
  { id: "emergency_doors",    icon: "🚪", labelAr: "أبواب الطوارئ وأبواب الخدمات",       labelEn: "Emergency & Service Doors" },
  { id: "fire_safety",        icon: "🧯", labelAr: "كبائن ومواسير الحريق والطفايات",     labelEn: "Fire Cabinets, Pipes & Extinguishers" },
  { id: "elevators",          icon: "🛗", labelAr: "المصاعد ومصاعد الخدمة",             labelEn: "Elevators & Service Lifts" },
  { id: "floors_corridors",   icon: "🚶‍♂️", labelAr: "الأدوار والممرات والحوائط والأسقف",  labelEn: "Floors, Corridors, Walls & Ceilings" },
  { id: "service_corridors",  icon: "🛠️", labelAr: "طرق الخدمات (Service Corridors)",   labelEn: "Service Corridors" },
  { id: "restrooms",          icon: "🚽", labelAr: "الحمامات والمصليات",                labelEn: "Restrooms & Prayer Rooms" },
  { id: "glass_mirrors",      icon: "🪟", labelAr: "الزجاج والمرايات وفريمات الوحدات",   labelEn: "Glass, Mirrors & Unit Frames" },
  { id: "plaza_wings",        icon: "⛲", labelAr: "البلازا والأضلاع والوحدات الفارغة",  labelEn: "Plaza, Wings & Vacant Units" },
  { id: "canopies_tents",     icon: "⛺", labelAr: "التند والكانوبي والأسطح",           labelEn: "Awnings, Canopies & Roofs" },
  { id: "restaurant_joints",  icon: "🍽️", labelAr: "فواصل المطاعم",                     labelEn: "Restaurant Floor Joints" },
  { id: "interlock_sidewalks",icon: "🧱", labelAr: "الإنترلوك والأرصفة والرامب والدواسات", labelEn: "Interlock, Ramps, Sidewalks & Mats" },
  { id: "garage_basement",    icon: "🚗", labelAr: "الجراج والبيزمنت (B1 / B2)",        labelEn: "Garage & Basement (B1 / B2)" },
  { id: "loading_back",       icon: "🚛", labelAr: "منطقة التحميل واللوكرز وغرفة القمامة (تأسيس وتطهير)", labelEn: "Loading Dock, Lockers & Rubbish Room (Deep Clean & Sanitize)" },
]

/**
 * Checks whether a Housekeeping task matches a selected HK_ITEM_FILTERS id
 */
export function matchesHkItemFilter(taskItem, filterId) {
  if (!filterId || filterId === "all") return true
  if (Array.isArray(taskItem.hkTags) && taskItem.hkTags.includes(filterId)) return true
  const text = `${taskItem.categoryAr || ""} ${taskItem.requiredTaskAr || ""}`
  switch (filterId) {
    case "reception":
      return /رسبشن|ريسبشن|الأثاث|الكنب|البوابة الرئيسية/i.test(text)
    case "stairs":
      return /سلالم|سلم|ريتشارد|مظلوم|LMD|هندريلات/i.test(text)
    case "emergency_doors":
      return /أبواب الطوارئ|الأبواب|باب/i.test(text)
    case "fire_safety":
      return /كبائن الحريق|كابينة الحريق|مواسير الحريق|الطفايات/i.test(text)
    case "elevators":
      return /المصاعد|مصاعد|مصعد/i.test(text)
    case "floors_corridors":
      return /المباني|تأسيس الدور|نظافة الدور|الأدوار|الحوائط|الأسقف|عالي السقف|الكاربت|فيش الكهرباء/i.test(text)
    case "service_corridors":
      return /طرق الخدمات|طرقة خدمات/i.test(text)
    case "restrooms":
      return /حمامات|الحمامات|المصلى|الأحواض|القواعد|الكبائن/i.test(text)
    case "glass_mirrors":
      return /الزجاج|المرايات|فريمات|الفريم/i.test(text)
    case "plaza_wings":
      return /البلازا|الأضلاع|ضلع|الوحدات الفارغة|التراسات|أعمدة الإنارة|اللايت بوكس|أحواض الزرع/i.test(text)
    case "canopies_tents":
      return /تندة|التند|كانوبي|الكانوبي|الأسطح/i.test(text)
    case "restaurant_joints":
      return /فواصل المطاعم/i.test(text)
    case "interlock_sidewalks":
      return /الإنترلوك|انترلوك|الدواسات|الأقماع|الأرصفة|الرامب/i.test(text)
    case "garage_basement":
      return /جراج|الجراج|بيزمنت|الإيبوكسي|الحواجز الصفراء|اللوفر|المواسير العلوية/i.test(text)
    case "loading_back":
      return /منطقة التحميل|اللوكر|Lockers|الكافيتريا|القمامة|تطهير|الشيلر|Chiller/i.test(text)
    default:
      return true
  }
}

// 4C. Dynamic Generator for the 3-Shift Weekly Checklists (Morning, Evening, Night)
export function getHousekeepingShiftChecklistForDay(dayName) {
  // Morning Shift (الوردية الصباحية)
  const morningStairsZone =
    dayName === "السبت" || dayName === "الثلاثاء"
      ? { zone: "مبنى 1 (A)", taskPrefix: "سحب سلالم مبنى 1" }
      : dayName === "الأحد" || dayName === "الأربعاء"
      ? { zone: "مبنى 2 (A-1/2)", taskPrefix: "سحب سلالم مبنى 2" }
      : dayName === "الاثنين" || dayName === "الخميس"
      ? { zone: "مبنى 3 (A)", taskPrefix: "سحب سلالم مبنى 3" }
      : { zone: "جميع المباني (A)", taskPrefix: "التشييك على سلالم المباني" }

  const morningServiceZone =
    dayName === "السبت" || dayName === "الثلاثاء"
      ? "مبنى 1 (A)"
      : dayName === "الأحد" || dayName === "الأربعاء"
      ? "مبنى 2 (A)"
      : dayName === "الاثنين" || dayName === "الخميس"
      ? "مبنى 3 (A)"
      : "مبنى 1 و 3"

  const morning = [
    // الرسبشن (6 بنود)
    { id: "m_rec_1", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception"], task: "متابعة نظافة الرسبشن — تنظيف الأتربة من الأسطح" },
    { id: "m_rec_2", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "glass_mirrors"], task: "متابعة نظافة الرسبشن — تنظيف المرايات والزجاج" },
    { id: "m_rec_3", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception"], task: "متابعة نظافة الرسبشن — تنظيف الأثاث والكنب" },
    { id: "m_rec_4", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "fire_safety"], task: "متابعة نظافة الرسبشن — تنظيف الطفايات" },
    { id: "m_rec_5", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "floors_corridors"], task: "متابعة نظافة الرسبشن — تنظيف الأرضية" },
    { id: "m_rec_6", shift: "morning", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "elevators"], task: "متابعة نظافة الرسبشن — تنظيف المصاعد" },
    // سلالم الطوارئ وأبواب الطوارئ (5 بنود)
    ...(dayName === "الجمعة"
      ? [
          { id: "m_st_fri", shift: "morning", area: "سلالم الطوارئ", zone: "A", tags: ["stairs"], task: "التشييك على سلالم المباني" },
          { id: "m_st_fri_doors", shift: "morning", area: "أبواب الطوارئ", zone: "A", tags: ["emergency_doors", "stairs"], task: "التشييك على نظافة أبواب الطوارئ" },
        ]
      : [
          { id: "m_st_1", shift: "morning", area: "سلالم الطوارئ", zone: morningStairsZone.zone, tags: ["stairs"], task: morningStairsZone.taskPrefix },
          { id: "m_st_2", shift: "morning", area: "سلالم الطوارئ", zone: morningStairsZone.zone, tags: ["stairs", "fire_safety"], task: "تنظيف كبائن الحريق بسلالم الطوارئ" },
          { id: "m_st_3", shift: "morning", area: "سلالم الطوارئ", zone: morningStairsZone.zone, tags: ["stairs", "floors_corridors"], task: "تنظيف الحوائط بسلالم الطوارئ" },
          { id: "m_st_4", shift: "morning", area: "سلالم الطوارئ", zone: morningStairsZone.zone, tags: ["stairs", "fire_safety"], task: "تنظيف مواسير الحريق بسلالم الطوارئ" },
          { id: "m_st_5", shift: "morning", area: "أبواب الطوارئ", zone: morningStairsZone.zone, tags: ["emergency_doors", "stairs"], task: "تنظيف أبواب الطوارئ من الداخل" },
        ]),
    // المباني وريتشارد
    ...(dayName === "السبت"
      ? [{ id: "m_bld_sat", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 1 / 2 / 3", tags: ["floors_corridors"], task: "التشييك على كل الأدوار والممرات" }]
      : dayName === "الجمعة"
      ? [
          { id: "m_bld_fri_1", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد + المصلى الرجالي", tags: ["floors_corridors", "restrooms"], task: "تأسيس الدور — عالي السقف + غسيل الكاربت بعد الغلق" },
          { id: "m_bld_fri_2", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد", tags: ["floors_corridors"], task: "تأسيس الدور — إزالة البقع من الحوائط" },
          { id: "m_bld_fri_3", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد", tags: ["elevators", "floors_corridors"], task: "تأسيس الدور — تنظيف مجر وأبواب المصاعد" },
          { id: "m_bld_fri_4", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد", tags: ["floors_corridors"], task: "تأسيس الدور — تنظيف فيش الكهرباء" },
          { id: "m_bld_fri_5", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد", tags: ["glass_mirrors", "floors_corridors"], task: "تأسيس الدور — غسيل الزجاج والفريم وفريمات الوحدات" },
          { id: "m_bld_fri_6", shift: "morning", area: "المباني وريتشارد", zone: "مبنى 3 A ريتشارد", tags: ["floors_corridors"], task: "تأسيس الدور — غسيل الأرضية" },
        ]
      : [
          { id: "m_bld_1", shift: "morning", area: "المباني وريتشارد", zone: "الأدوار", tags: ["restrooms", "floors_corridors"], task: "متابعة نظافة الدور — تنظيف الحمامات" },
          { id: "m_bld_2", shift: "morning", area: "المباني وريتشارد", zone: "الأدوار", tags: ["floors_corridors"], task: "متابعة نظافة الدور — تنظيف الأتربة من الأسطح" },
          { id: "m_bld_3", shift: "morning", area: "المباني وريتشارد", zone: "الأدوار", tags: ["floors_corridors"], task: "متابعة نظافة الدور — تنظيف الأرضية" },
          { id: "m_bld_4", shift: "morning", area: "المباني وريتشارد", zone: "الأدوار", tags: ["elevators", "floors_corridors"], task: "متابعة نظافة الدور — متابعة نظافة المصاعد" },
        ]),
    // طرق الخدمات (6 بنود)
    ...(dayName === "الجمعة"
      ? [{ id: "m_srv_fri", shift: "morning", area: "طرق الخدمات", zone: "مبنى 1 و 3", tags: ["service_corridors"], task: "التشييك على جميع طرق الخدمات" }]
      : [
          { id: "m_srv_1", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "floors_corridors"], task: "طرق الخدمات — تنظيف أسقف" },
          { id: "m_srv_2", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "floors_corridors"], task: "طرق الخدمات — تنظيف حوائط" },
          { id: "m_srv_3", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "fire_safety"], task: "طرق الخدمات — تنظيف كابينة الحريق" },
          { id: "m_srv_4", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "emergency_doors"], task: "طرق الخدمات — تنظيف الأبواب وأبواب الخدمة" },
          { id: "m_srv_5", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "floors_corridors"], task: "طرق الخدمات — تنظيف الأرضية" },
          { id: "m_srv_6", shift: "morning", area: "طرق الخدمات", zone: morningServiceZone, tags: ["service_corridors", "elevators"], task: "طرق الخدمات — تنظيف مصاعد الخدمة" },
        ]),
    // حمامات
    ...(dayName === "الجمعة"
      ? [
          { id: "m_wc_fri_1", shift: "morning", area: "الحمامات", zone: "حمامات المصلى", tags: ["restrooms"], task: "تأسيس الحمامات — تزعيف الهوايات وتنظيف الحوائط بالبلة" },
          { id: "m_wc_fri_2", shift: "morning", area: "الحمامات", zone: "حمامات المصلى", tags: ["restrooms"], task: "تأسيس الحمامات — تنظيف الكبائن والأبواب والقواعد من الداخل والخارج" },
          { id: "m_wc_fri_3", shift: "morning", area: "الحمامات", zone: "حمامات المصلى", tags: ["restrooms", "glass_mirrors"], task: "تأسيس الحمامات — تنظيف الأحواض والمرايات وأسفل الأحواض وغسيل الأرضية" },
        ]
      : [{ id: "m_wc_1", shift: "morning", area: "الحمامات", zone: "جميع المباني", tags: ["restrooms"], task: "متابعة نظافة الحمامات الدورية" }]),
    // البلازا (5 بنود)
    { id: "m_plz_1", shift: "morning", area: "البلازا", zone: "البلازا والكانوبي", tags: ["plaza_wings"], task: "متابعة نظافة البلازا — تنظيف الداست (Dust)" },
    { id: "m_plz_2", shift: "morning", area: "البلازا", zone: "البلازا والكانوبي", tags: ["plaza_wings", "reception"], task: "متابعة نظافة البلازا — تنظيف البوابة الرئيسية" },
    { id: "m_plz_3", shift: "morning", area: "البلازا", zone: "البلازا والكانوبي", tags: ["plaza_wings"], task: "متابعة نظافة البلازا — تنظيف الوحدات الفارغة" },
    { id: "m_plz_4", shift: "morning", area: "البلازا", zone: "البلازا والكانوبي", tags: ["plaza_wings", "restrooms"], task: "متابعة نظافة البلازا — تنظيف الحمامات" },
    { id: "m_plz_5", shift: "morning", area: "البلازا", zone: "البلازا والكانوبي", tags: ["plaza_wings"], task: "متابعة نظافة البلازا — تنظيف الأضلاع" },
    // منطقة التحميل وغرفة تجميع القمامة (شاملة مهمة تنظيف غرفة تجميع القمامة تأسيس نظافة - تطهير)
    { id: "m_ld_1", shift: "morning", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف منطقة التحميل الخارجية" },
    { id: "m_ld_2", shift: "morning", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف اللوكرز (Lockers)" },
    { id: "m_ld_3", shift: "morning", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف الكافيتريا" },
    { id: "m_ld_4", shift: "morning", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف غرفة تجميع القمامة" },
    { id: "m_ld_4_sanitize", shift: "morning", area: "غرفة تجميع القمامة", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)" },
    { id: "m_ld_5", shift: "morning", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف منطقة الشيلر (Chiller)" },
  ]

  // Evening Shift (الوردية المسائية)
  const eveningFloorTarget =
    dayName === "السبت"
      ? "مبنى 1 / 2 / 3 — التشييك على كل الأدوار"
      : dayName === "الأحد"
      ? "الدور الأول مبنى 1 / الخامس والسادس مبنى 2"
      : dayName === "الاثنين"
      ? "الدور الرابع مبنى 1 / 2"
      : dayName === "الثلاثاء"
      ? "الدور الثالث مبنى 1 / 2"
      : dayName === "الأربعاء"
      ? "الدور الثاني مبنى 1 / 2"
      : dayName === "الخميس"
      ? "التشييك على جميع الأدوار"
      : "مبنى 3 B البنك العربي + المصلى الحريمي"

  const eveningLoadingTask =
    dayName === "السبت"
      ? "تنظيف حوائط الرامب + تنظيف الأرصفة"
      : dayName === "الأحد"
      ? "غسيل الحوائط بداية من الرامب حتى مكتب المالية + عالي المنطقة"
      : dayName === "الاثنين"
      ? "غسيل الحوائط والأبواب للمنطقة المتبقية + عالي المنطقة"
      : dayName === "الثلاثاء"
      ? "باقي عالي منطقة التحميل + تنظيف حاجز اللوفر الفاصل للجراج"
      : dayName === "الأربعاء"
      ? "تنظيف الهوايات ببيزمنت 2 بالجراج"
      : dayName === "الخميس"
      ? "تأسيس الشيلر (Chiller)"
      : "تأسيس طرقة خدمات مصاعد ني (سقف + حوائط + مصعد + باب + أرضية)"

  const evening = [
    // الرسبشن (5 بنود)
    { id: "e_rec_1", shift: "evening", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception"], task: "تنظيف جزء من العالي بالرسبشن" },
    { id: "e_rec_2", shift: "evening", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "floors_corridors"], task: "إزالة البقع من الحوائط بالرسبشن" },
    { id: "e_rec_3", shift: "evening", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "floors_corridors"], task: "تنظيف فيش الكهرباء بالرسبشن" },
    { id: "e_rec_4", shift: "evening", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "glass_mirrors", "fire_safety"], task: "تنظيف المرايات والطفايات بالرسبشن" },
    { id: "e_rec_5", shift: "evening", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "elevators"], task: "تأسيس المصاعد من الداخل والخارج" },
    // سلالم الطوارئ وأبواب الطوارئ (B)
    { id: "e_st_1", shift: "evening", area: "سلالم الطوارئ", zone: "اتجاه B", tags: ["stairs"], task: "سحب سلالم الطوارئ (B) وتنظيف الحوائط والدرج" },
    { id: "e_st_2", shift: "evening", area: "سلالم الطوارئ", zone: "اتجاه B", tags: ["stairs", "fire_safety"], task: "تنظيف كبائن ومواسير الحريق بسلالم الطوارئ (B)" },
    { id: "e_st_3", shift: "evening", area: "أبواب الطوارئ", zone: "اتجاه B", tags: ["emergency_doors", "stairs"], task: "تنظيف أبواب الطوارئ من الداخل والخارج (B)" },
    // المباني وريتشارد (تأسيس الأدوار)
    { id: "e_bld_1", shift: "evening", area: "المباني وريتشارد", zone: eveningFloorTarget, tags: ["floors_corridors"], task: "تأسيس الدور — عالي السقف وإزالة البقع من الحوائط" },
    { id: "e_bld_2", shift: "evening", area: "المباني وريتشارد", zone: eveningFloorTarget, tags: ["elevators", "floors_corridors"], task: "تأسيس الدور — تنظيف مجر وأبواب المصاعد وفيش الكهرباء" },
    { id: "e_bld_3", shift: "evening", area: "المباني وريتشارد", zone: eveningFloorTarget, tags: ["glass_mirrors", "floors_corridors"], task: "تأسيس الدور — غسيل الزجاج والفريم وفريمات الوحدات وغسيل الأرضية" },
    // طرق الخدمات (B)
    { id: "e_srv_1", shift: "evening", area: "طرق الخدمات", zone: "اتجاه B", tags: ["service_corridors", "floors_corridors", "fire_safety"], task: "طرق الخدمات (B) — تنظيف أسقف وحوائط وكابينة الحريق والأرضية" },
    { id: "e_srv_2", shift: "evening", area: "طرق الخدمات", zone: "اتجاه B", tags: ["service_corridors", "emergency_doors", "elevators"], task: "طرق الخدمات (B) — تنظيف الأبواب ومصاعد الخدمة" },
    // تأسيس الحمامات
    { id: "e_wc_1", shift: "evening", area: "الحمامات", zone: eveningFloorTarget, tags: ["restrooms", "glass_mirrors"], task: "تأسيس الحمامات — تزعيف الهوايات وتنظيف الحوائط بالبلة والكبائن والقواعد والأحواض وغسيل الأرضية" },
    // البلازا
    { id: "e_plz_1", shift: "evening", area: "البلازا", zone: "البلازا", tags: ["plaza_wings", "restrooms"], task: "متابعة نظافة البلازا — تنظيف الداست والبوابة الرئيسية والوحدات الفارغة والحمامات والأضلاع" },
    // منطقة التحميل وغرفة القمامة
    { id: "e_ld_1", shift: "evening", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back", "interlock_sidewalks", "garage_basement"], task: eveningLoadingTask },
    { id: "e_ld_rubbish_sanitize", shift: "evening", area: "غرفة تجميع القمامة", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)" },
  ]

  // Night Shift (الوردية الليلية)
  const nightPlazaExtra =
    dayName === "السبت"
      ? "تنظيف أعمدة الإنارة بالأضلاع"
      : dayName === "الأحد"
      ? "تنظيف أحواض الزرع بالأضلاع"
      : dayName === "الاثنين"
      ? "تنظيف أبواب الطوارئ من الخارج بالأضلاع"
      : dayName === "الأربعاء"
      ? "تنظيف الإنترلوك بضلع 1"
      : dayName === "الخميس"
      ? "تنظيف الإنترلوك بضلع 2 و 3"
      : dayName === "الجمعة"
      ? "تنظيف أعمدة الإنارة والإنترلوك بالبوابة الرئيسية"
      : "مراجعة نظافة المشايات والأضلاع"

  const nightLoadingExtra =
    dayName === "السبت"
      ? "غسيل الرامب + غسيل ممر لـ 40"
      : dayName === "الأربعاء"
      ? "غسيل الأرضية + تأسيس اللوكر الرجالي + تنظيف الكافيتريا واللوكر الحريمي"
      : dayName === "الخميس"
      ? "غسيل الأرضية + تأسيس اللوكر الحريمي + تنظيف الكافيتريا واللوكر الرجالي"
      : dayName === "الجمعة"
      ? "غسيل الأرضية + تنظيف الهوايات ببيزمنت 1"
      : "غسيل الأرضية + تنظيف اللوكرات والكافيتريا"

  const night = [
    { id: "n_rec_1", shift: "night", area: "نظافة الرسبشن", zone: "المداخل والرسبشن", tags: ["reception", "floors_corridors"], task: "غسيل أرضية الرسبشن بالماكينة" },
    ...(dayName === "السبت"
      ? [{ id: "n_rit_1", shift: "night", area: "المباني وريتشارد", zone: "ريتشارد", tags: ["floors_corridors", "stairs"], task: "تنظيف عالي الدور الأول بريتشارد" }]
      : dayName === "الأحد"
      ? [{ id: "n_rit_1", shift: "night", area: "المباني وريتشارد", zone: "ريتشارد", tags: ["floors_corridors", "stairs"], task: "تنظيف عالي الدور الأرضي بريتشارد" }]
      : dayName === "الاثنين"
      ? [{ id: "n_rit_1", shift: "night", area: "المباني وريتشارد", zone: "ريتشارد", tags: ["floors_corridors", "garage_basement"], task: "تنظيف عالي دور بيزمنت 1 بريتشارد" }]
      : dayName === "الثلاثاء"
      ? [{ id: "n_rit_1", shift: "night", area: "المباني وريتشارد", zone: "ريتشارد", tags: ["floors_corridors", "garage_basement"], task: "تنظيف عالي دور بيزمنت 2 بريتشارد" }]
      : []),
    { id: "n_wc_1", shift: "night", area: "حمامات البلازا", zone: "البلازا", tags: ["restrooms", "plaza_wings", "glass_mirrors"], task: "تأسيس حمامات البلازا بالكامل ليلاً (هوايات + حوائط بالبلة + كبائن + قواعد + أحواض ومرايات + غسيل أرضية)" },
    { id: "n_plz_1", shift: "night", area: "البلازا", zone: "البلازا والمنطقة الخارجية", tags: ["plaza_wings"], task: "تأسيس وغسيل أرضية البلازا بالكامل والمنطقة الخارجية + غسيل التراسات للوحدات الفارغة" },
    {
      id: "n_plz_2",
      shift: "night",
      area: "البلازا والأضلاع",
      zone: "البلازا",
      tags: [
        "plaza_wings",
        "fire_safety",
        ...(dayName === "الاثنين" ? ["emergency_doors"] : []),
        ...(dayName === "الأربعاء" || dayName === "الخميس" || dayName === "الجمعة" ? ["interlock_sidewalks"] : []),
      ],
      task: `تنظيف أحواض الزرع والطفايات ونظافة المشايات + ${nightPlazaExtra}`,
    },
    { id: "n_ld_1", shift: "night", area: "منطقة التحميل", zone: "Loading Area", tags: ["loading_back", "interlock_sidewalks", "garage_basement"], task: nightLoadingExtra },
    // ★ تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)
    { id: "n_ld_rubbish_sanitize", shift: "night", area: "غرفة تجميع القمامة", zone: "Loading Area", tags: ["loading_back"], task: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)" },
  ]

  return { morning, evening, night }
}

export function getHousekeepingDayPlan(dateStr) {
  const dayName = getArabicDayName(dateStr)
  const dayOfMonth = Math.min(31, Math.max(1, Number((dateStr || "").split("-")[2]) || 1))
  const monthlyEntry = HK_MONTHLY_DAYS.find((d) => d.day === dayOfMonth) || HK_MONTHLY_DAYS[0]
  const shifts = getHousekeepingShiftChecklistForDay(dayName)

  const specializedTasks = [
    {
      id: "hk_spec_main",
      categoryAr: "أعمال التنظيف الرئيسية (التند والكانوبي والسلالم)",
      categoryEn: "Main Cleaning (Awnings, Canopies & Stairs)",
      tags: ["canopies_tents", "stairs", "reception"],
      taskAr: monthlyEntry.main,
    },
    {
      id: "hk_spec_joints",
      categoryAr: "غسيل أرضية فواصل المطاعم",
      categoryEn: "Restaurant Floor Joints Washing",
      tags: ["restaurant_joints", "plaza_wings"],
      taskAr: monthlyEntry.joints,
    },
    {
      id: "hk_spec_side",
      categoryAr: "الأعمال الجانبية والإنترلوك والدواسات",
      categoryEn: "Side Works, Interlock & Mats",
      tags: ["interlock_sidewalks", "plaza_wings", "reception"],
      taskAr: monthlyEntry.side,
    },
    {
      id: "hk_spec_garage",
      categoryAr: "أعمال الجراج (كات B1 / B2)",
      categoryEn: "Garage CAT Works (B1 / B2)",
      tags: ["garage_basement"],
      taskAr: monthlyEntry.garage,
    },
    {
      id: "hk_spec_loading",
      categoryAr: "منطقة التحميل والأسطح",
      categoryEn: "Loading Dock & Roofs",
      tags: ["loading_back", "canopies_tents", "emergency_doors"],
      taskAr:
        [1, 2, 3, 15, 16, 17].includes(dayOfMonth)
          ? `${monthlyEntry.loading} + 🔥 موعد نظافة الأسطح الشهري (إزالة المخلفات وتنظيف الأبواب والأرضية)`
          : monthlyEntry.loading,
    },
    {
      id: "hk_spec_rubbish_room_sanitize",
      categoryAr: "غرفة تجميع القمامة — تأسيس (نظافة - تطهير)",
      categoryEn: "Garbage Collection Room — Deep Cleaning & Sanitization",
      tags: ["loading_back"],
      taskAr: "تنظيف غرفة تجميع القمامة تأسيس (نظافة - تطهير)",
    },
  ]

  return {
    dayName,
    dayOfMonth,
    specializedTasks,
    shifts,
  }
}
