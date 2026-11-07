// ══════════════════════════════════════════════════════════════════════════════
// 💬 SMART WHATSAPP GROUPS & 3-SHIFT OPERATIONS ANALYZER ENGINE
// Supports: Maintenance • Operations • Security • Housekeeping • Safety (HSE)
// ══════════════════════════════════════════════════════════════════════════════

export const WA_GROUPS = [
  {
    id: "maintenance",
    icon: "🔧",
    labelAr: "جروب الصيانة (Maintenance)",
    labelEn: "Maintenance Group",
    color: "#f59e0b",
    snagTrade: "mep",
    subCategories: [
      { id: "elec",      labelAr: "كهرباء وإنارة",           labelEn: "Electrical & Lighting" },
      { id: "plumbing",  labelAr: "سباكة وصرف ومياه",        labelEn: "Plumbing & Drainage" },
      { id: "hvac",      labelAr: "تكييف وتبريد وتهوية",     labelEn: "HVAC & Cooling" },
      { id: "civil",     labelAr: "مدني وتشطيبات ودهانات",   labelEn: "Civil & Finishes" },
      { id: "elevators", labelAr: "مصاعد وسلالم كهربائية",   labelEn: "Elevators & Escalators" },
      { id: "doors",     labelAr: "أبواب وكوالين وزجاج",     labelEn: "Doors, Locks & Glass" },
      { id: "low_curr",  labelAr: "تيار خفيف وأنظمة ذكية",   labelEn: "Low Current & BMS" },
    ],
  },
  {
    id: "operations",
    icon: "⚙️",
    labelAr: "جروب التشغيل (Operations)",
    labelEn: "Operations Group",
    color: "#38bdf8",
    snagTrade: "general",
    subCategories: [
      { id: "daily_ops",  labelAr: "مهام تشغيلية يومية",       labelEn: "Daily Operational Tasks" },
      { id: "tenants",    labelAr: "طلبات ووحدات المستأجرين",  labelEn: "Tenants & Units Requests" },
      { id: "contractors",labelAr: "متابعة شركات ومقاولين",    labelEn: "Contractors Follow-up" },
      { id: "customer",   labelAr: "رحلة العميل والخدمات",     labelEn: "Customer Journey & Services" },
      { id: "landscape",  labelAr: "لاندسكيب وزراعة وري",     labelEn: "Landscape & Irrigation" },
    ],
  },
  {
    id: "security",
    icon: "🛡️",
    labelAr: "جروب الأمن (Security)",
    labelEn: "Security Group",
    color: "#0ea5e9",
    snagTrade: "security_cctv",
    subCategories: [
      { id: "gates",      labelAr: "البوابات والمداخل والتفتيش", labelEn: "Gates & Access Control" },
      { id: "cctv",       labelAr: "كاميرات المراقبة CCTV",     labelEn: "CCTV & Surveillance" },
      { id: "permits",    labelAr: "تصاريح دخول وأعمال",       labelEn: "Entry & Work Permits" },
      { id: "parking",    labelAr: "تنظيم الجراج والسيارات",    labelEn: "Parking & Traffic Control" },
      { id: "incidents",  labelAr: "بلاغات أمنية ومفقودات",     labelEn: "Security Incidents & Lost/Found" },
    ],
  },
  {
    id: "housekeeping",
    icon: "🧹",
    labelAr: "جروب النظافة (Housekeeping)",
    labelEn: "Housekeeping Group",
    color: "#a855f7",
    snagTrade: "cleanliness",
    subCategories: [
      { id: "hk_reception", labelAr: "نظافة الرسبشن والمداخل",    labelEn: "Reception & Entrances" },
      { id: "hk_restrooms", labelAr: "نظافة الحمامات والمصليات",  labelEn: "Restrooms & Prayer Rooms" },
      { id: "hk_plaza",     labelAr: "نظافة البلازا والأضلاع",    labelEn: "Plaza & Wings Cleaning" },
      { id: "hk_floors",    labelAr: "الأدوار والممرات والسلالم", labelEn: "Floors, Corridors & Stairs" },
      { id: "hk_loading",   labelAr: "منطقة التحميل والقمامة",    labelEn: "Loading Area & Waste" },
      { id: "hk_garage",    labelAr: "نظافة الجراج والبيزمنت",    labelEn: "Garage & Basement Cleaning" },
      { id: "hk_spider",    labelAr: "الواجهات والسبايدر والزجاج", labelEn: "Facades, Spider & Glass" },
    ],
  },
  {
    id: "safety",
    icon: "🧯",
    labelAr: "جروب السيفتي والسلامة (Safety)",
    labelEn: "Safety & HSE Group",
    color: "#ef4444",
    snagTrade: "fire_safety",
    subCategories: [
      { id: "fire_ext",    labelAr: "طفايات وكبائن الحريق",      labelEn: "Fire Extinguishers & Cabinets" },
      { id: "fire_alarm",  labelAr: "أجهزة إنذار الحريق والدخان", labelEn: "Fire Alarm & Smoke Detectors" },
      { id: "emerg_exits", labelAr: "مخارج وأبواب وسلالم الطوارئ", labelEn: "Emergency Exits & Stairs" },
      { id: "ppe_work",    labelAr: "مهمات السلامة وتصاريح الخطر", labelEn: "PPE & High-Risk Work Safety" },
      { id: "hazards",     labelAr: "مخاطر انزلاق / كهرباء / عوائق", labelEn: "Slip, Electrical & Path Hazards" },
    ],
  },
]

export const SHIFT_DEFINITIONS = [
  {
    id: "morning",
    icon: "🌅",
    labelAr: "الشيفت الصباحي (7 ص – 3 م)",
    labelEn: "Morning Shift (07:00 – 15:00)",
    shortAr: "صباحي",
    color: "#f59e0b",
  },
  {
    id: "evening",
    icon: "🌇",
    labelAr: "الشيفت المسائي (3 م – 11 م)",
    labelEn: "Evening Shift (15:00 – 23:00)",
    shortAr: "مسائي",
    color: "#38bdf8",
  },
  {
    id: "night",
    icon: "🌙",
    labelAr: "الشيفت الليلي (11 م – 7 ص)",
    labelEn: "Night Shift (23:00 – 07:00)",
    shortAr: "ليلي",
    color: "#a855f7",
  },
]

export const ORDER_STATUSES = [
  { id: "open",        labelAr: "🔴 مفتوح (لسه ما خلصش)", labelEn: "🔴 Open (Pending)",     color: "#ef4444", bg: "rgba(239,68,68,0.16)" },
  { id: "in_progress", labelAr: "⏳ جاري التنفيذ",        labelEn: "⏳ In Progress",        color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  { id: "done",        labelAr: "🟢 تم الإنجاز (خلص)",    labelEn: "🟢 Completed (Done)",   color: "#10b981", bg: "rgba(16,185,129,0.16)" },
]

/**
 * Determines which of the 3 shifts a given hour (0-23) belongs to:
 * - Morning: 07:00 to 14:59
 * - Evening: 15:00 to 22:59
 * - Night:   23:00 to 06:59
 */
export function detectShiftFromHour(hour24) {
  const h = Number(hour24)
  if (Number.isNaN(h)) return "morning"
  if (h >= 7 && h < 15) return "morning"
  if (h >= 15 && h < 23) return "evening"
  return "night"
}

export function parseTimeToShift(timeStr = "") {
  if (!timeStr) return { shift: "morning", formattedTime: "09:00" }
  const clean = timeStr.trim()
  // Match HH:MM and optional AM/PM or ص/م
  const m = clean.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm|ص|م|صباحاً|مساءً)?/)
  if (!m) return { shift: "morning", formattedTime: clean }
  let hr = parseInt(m[1], 10)
  const min = m[2]
  const mer = (m[3] || "").toLowerCase()
  if ((mer === "pm" || mer === "م" || mer === "مساءً") && hr < 12) hr += 12
  if ((mer === "am" || mer === "ص" || mer === "صباحاً") && hr === 12) hr = 0
  const shift = detectShiftFromHour(hr)
  return {
    shift,
    formattedTime: `${String(hr).padStart(2, "0")}:${min}`,
  }
}

/**
 * Detects location in Park Street Mall from message text
 */
export function detectMallLocation(text = "") {
  const t = text
  if (/مبنى\s*1|مبني\s*1|B1\s*مبنى|building\s*1/i.test(t)) return "مبنى 1"
  if (/مبنى\s*2|مبني\s*2|building\s*2/i.test(t)) return "مبنى 2"
  if (/مبنى\s*3|مبني\s*3|ريتشارد|building\s*3/i.test(t)) return "مبنى 3 (ريتشارد)"
  if (/بيزمنت\s*1|جراج\s*1|B1/i.test(t)) return "بيزمنت 1 (B1)"
  if (/بيزمنت\s*2|جراج\s*2|B2/i.test(t)) return "بيزمنت 2 (B2)"
  if (/رسبشن|ريسبشن|المدخل الرئيسي|البوابة الرئيسية/i.test(t)) return "الرسبشن والمداخل"
  if (/حمام|تواليت|دورة مياه|المصلى/i.test(t)) return "الحمامات والمصليات"
  if (/بلازا|البلازا|النافورة/i.test(t)) return "البلازا (The Plaza)"
  if (/ضلع\s*1|ضلع\s*2|ضلع\s*3|الأضلاع/i.test(t)) return "الأضلاع (Wings)"
  if (/منطقة التحميل|اللودينج|loading|القمامة|الرابش|الشيلر/i.test(t)) return "منطقة التحميل والخدمات"
  if (/سلم طوارئ|سلالم الطوارئ|باب طوارئ|أبواب الطوارئ/i.test(t)) return "سلالم وأبواب الطوارئ"
  if (/الجزيرة|اللاندسكيب|الفاليه/i.test(t)) return "اللاندسكيب والمنطقة الخارجية"
  return "عام / داخل المول"
}

/**
 * Classifies a WhatsApp message into Group + Sub-Category + Priority
 */
export function classifyWhatsAppMessage(text = "", forcedGroupId = "auto") {
  const t = text.trim()

  // Priority detection
  const isUrgent =
    /طارئ|عاجل|خطر|فوراً|حريق|دخان|تسريب شديد|ماس|عطل مصعد|محبوس|طفح|urgent|emergency/i.test(t)

  // Group & SubCategory rules
  let groupId = forcedGroupId !== "auto" ? forcedGroupId : "operations"
  let subCategoryId = "daily_ops"

  // 1. Safety / HSE keywords
  if (
    forcedGroupId === "safety" ||
    (forcedGroupId === "auto" &&
      /طفاية|طفايات|كابينة حريق|كبائن الحريق|إنذار حريق|انذار|دخان|مخرج طوارئ|سيفتي|سلامة|خوذة|حزام أمان|سقالة|خطر انزلاق|أعمال ساخنة/i.test(t))
  ) {
    groupId = "safety"
    if (/طفاية|طفايات|كابينة حريق|كبائن|خرطوم حريق/i.test(t)) subCategoryId = "fire_ext"
    else if (/إنذار|انذار|دخان|حساس|سارينة/i.test(t)) subCategoryId = "fire_alarm"
    else if (/مخرج طوارئ|باب طوارئ|سلم طوارئ|إخلاء/i.test(t)) subCategoryId = "emerg_exits"
    else if (/خوذة|حزام|مهمات سلامة|سبايدر|سقالة|تصريح خطر/i.test(t)) subCategoryId = "ppe_work"
    else subCategoryId = "hazards"
  }
  // 2. Security keywords
  else if (
    forcedGroupId === "security" ||
    (forcedGroupId === "auto" &&
      /أمن|الأمن|بوابة|كاميرا|كاميرات|CCTV|تصريح دخول|تصاريح|مفقودات|معثورات|مخالفة ركن|كلبش|حراسة|دخول بضاعة/i.test(t))
  ) {
    groupId = "security"
    if (/كاميرا|كاميرات|CCTV|شاشة مراقبة/i.test(t)) subCategoryId = "cctv"
    else if (/تصريح|تصاريح|دخول مقاول|دخول بضاعة/i.test(t)) subCategoryId = "permits"
    else if (/ركن|سيارة|عربية|جراج|مسار السيارات|مخالفة/i.test(t)) subCategoryId = "parking"
    else if (/مفقودات|معثورات|مشاجرة|بلاغ أمني|شكوى أمن/i.test(t)) subCategoryId = "incidents"
    else subCategoryId = "gates"
  }
  // 3. Housekeeping keywords
  else if (
    forcedGroupId === "housekeeping" ||
    (forcedGroupId === "auto" &&
      /نظافة|هاوس كيبنج|كنس|مسح|غسيل|تلميع|قمامة|رابش|سلة مهملات|صابون|مناديل|رائحة|انسكاب|تندة|كانوبي|انترلوك/i.test(t))
  ) {
    groupId = "housekeeping"
    if (/رسبشن|ريسبشن|مدخل|بوابة رئيسية|أثاث|كنب/i.test(t)) subCategoryId = "hk_reception"
    else if (/حمام|تواليت|مناديل|صابون|مصلى/i.test(t)) subCategoryId = "hk_restrooms"
    else if (/بلازا|أضلاع|ضلع|فواصل المطاعم|تراس/i.test(t)) subCategoryId = "hk_plaza"
    else if (/تحميل|لودينج|قمامة|رابش|لوكر/i.test(t)) subCategoryId = "hk_loading"
    else if (/جراج|بيزمنت|إيبوكسي/i.test(t)) subCategoryId = "hk_garage"
    else if (/واجهة|سبايدر|تندة|كانوبي|زجاج/i.test(t)) subCategoryId = "hk_spider"
    else subCategoryId = "hk_floors"
  }
  // 4. Maintenance keywords
  else if (
    forcedGroupId === "maintenance" ||
    (forcedGroupId === "auto" &&
      /صيانة|عطل|إصلاح|تصليح|لمبة|إنارة|كشاف|فيشة|كهرباء|قاطع|لوحة|تسريب|مياه|سباكة|صرف|انسداد|خلاط|شطاف|تكييف|فريون|تبريد|تكييفات|مصعد|أسانسير|سلم كهرباء|باب|كالون|مفصلة|رخام|بلاط|دهان|جبس/i.test(t))
  ) {
    groupId = "maintenance"
    if (/لمبة|إنارة|انارة|كشاف|اسبوت|فيشة|كهرباء|قاطع|كابل|لوحة كهرباء/i.test(t)) subCategoryId = "elec"
    else if (/تسريب|مياه|سباكة|صرف|انسداد|خلاط|شطاف|سيفون|محبس|مضخة/i.test(t)) subCategoryId = "plumbing"
    else if (/تكييف|تبريد|فريون|شيلر|مروحة|شفاط|هواية|HVAC/i.test(t)) subCategoryId = "hvac"
    else if (/مصعد|أسانسير|اسانسير|سلم كهرباء|سلالم كهربائية/i.test(t)) subCategoryId = "elevators"
    else if (/باب|أبواب|كالون|مقبض|مفصلة|ماكينة باب|زجاج مكسور/i.test(t)) subCategoryId = "doors"
    else if (/رخام|بلاط|سيراميك|دهان|حائط|سقف|جبس|انترلوك مكسور/i.test(t)) subCategoryId = "civil"
    else subCategoryId = "elec"
  }
  // 5. Operations keywords
  else {
    groupId = "operations"
    if (/مستأجر|وحدة|محل|مكتب|عيادة|فرع/i.test(t)) subCategoryId = "tenants"
    else if (/شركة|مقاول|توريد|عقد/i.test(t)) subCategoryId = "contractors"
    else if (/عميل|زائر|شكوى عميل|فاليه/i.test(t)) subCategoryId = "customer"
    else if (/زرع|لاندسكيب|ري|أشجار|نباتات/i.test(t)) subCategoryId = "landscape"
    else subCategoryId = "daily_ops"
  }

  // Ensure subCategoryId belongs to the chosen group
  const grpObj = WA_GROUPS.find((g) => g.id === groupId) || WA_GROUPS[0]
  const validSub = grpObj.subCategories.find((s) => s.id === subCategoryId) || grpObj.subCategories[0]

  return {
    groupId: grpObj.id,
    groupLabelAr: grpObj.labelAr,
    subCategoryId: validSub.id,
    subCategoryLabelAr: validSub.labelAr,
    priority: isUrgent ? "urgent" : "normal",
    locationAr: detectMallLocation(t),
  }
}

/**
 * Checks if a message is a status update (Completion / In-Progress) or a pure greeting/noise
 */
export function analyzeMessageIntent(text = "") {
  const clean = text.trim()
  if (!clean || clean.length < 2) return { type: "noise" }
  if (/^(صباح الخير|مساء الخير|السلام عليكم|وعليكم السلام|تمام|شكرا|شكراً|أوك|اوك|ok|👍|🙏)$/i.test(clean)) {
    return { type: "noise" }
  }
  if (/وسائط غير مدرجة|<Media omitted>|تم حذف هذه الرسالة/i.test(clean)) {
    return { type: "noise" }
  }

  // Check if it's a completion message
  const isCompletionReply =
    /^(تم|تمت|خلص|انتهى|تم الاصلاح|تم الإصلاح|تم التنفيذ|تمت النظافة|تمت المعالجة|تم الحل|تم تغيير|تم تركيب|تم الغلق|done|completed|fixed)/i.test(clean) ||
    /(تم الإصلاح بنجاح|تم الانتهاء من|تم حل المشكلة|وتم التشغيل|تم التنفيذ بالكامل|✅\s*تم|تم\s*✅)/i.test(clean)

  // Check if it's an in-progress update
  const isInProgressReply =
    /^(جاري|جارى|تحت التنفيذ|في الطريق|تم إبلاغ الفني|بانتظار قطع|جاري العمل|جاري المتابعة)/i.test(clean)

  // Check if it's a single line that contains BOTH the order and "تم" (e.g. "إصلاح لمبة مبنى 1 - تم")
  const hasOrderAndDone =
    clean.length > 22 &&
    /(إصلاح|صيانة|تنظيف|تركيب|تغيير|فحص|مراجعة|معالجة|عطل|تسريب|تكييف|إنارة|حمام|بلازا|مبنى)/i.test(clean) &&
    /(-\s*تم|—\s*تم|✅|تم التنفيذ|تم الإصلاح)/i.test(clean)

  if (hasOrderAndDone) {
    return { type: "order_already_done" }
  }
  if (isCompletionReply && clean.length < 85) {
    return { type: "completion_reply" }
  }
  if (isInProgressReply && clean.length < 85) {
    return { type: "progress_reply" }
  }

  return { type: "new_order" }
}

/**
 * Parses raw WhatsApp exported chat text or pasted messages into structured Shift Orders
 */
export function parseWhatsAppChatDump(rawText = "", defaultDate = "", forcedGroupId = "auto") {
  const lines = (rawText || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const parsedMessages = []

  // Common WhatsApp line patterns:
  // 1) [11/7/26, 9:15:00 AM] حسام مشرف: عطل تكييف في مبنى 1
  // 2) 07/11/2026, 14:22 - م. أحمد: تسريب مياه في حمام البلازا
  // 3) [09:30 ص، 2026/11/07] مشرف الأمن: ...
  // 4) 10:15 ص - محمد: ...
  // 5) Plain text lines: "09:15 | الصيانة | عطل اسبوتات مبنى 2 الدور الأول"
  const regexBracket = /^\[?(\d{1,4}[/-]\d{1,2}[/-]\d{1,4})[،,\s]+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م)?)\]?\s*[-–:]?\s*([^:]+):\s*(.+)$/
  const regexTimeFirst = /^\[?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm|ص|م)?)(?:[،,\s]+\d{1,4}[/-]\d{1,2}[/-]\d{1,4})?\]?\s*[-–:]?\s*([^:]+):\s*(.+)$/

  for (const line of lines) {
    let timeStr = ""
    let sender = "مشرف الميدان"
    let body = line

    const m1 = line.match(regexBracket)
    if (m1) {
      timeStr = m1[2]
      sender = m1[3].trim()
      body = m1[4].trim()
    } else {
      const m2 = line.match(regexTimeFirst)
      if (m2) {
        timeStr = m2[1]
        sender = m2[2].trim()
        body = m2[3].trim()
      } else {
        // Check if line starts with shift keyword like "[الشيفت الصباحي]" or time "14:20"
        const mSimple = line.match(/^(\d{1,2}:\d{2}\s*(?:ص|م|AM|PM)?)\s*[-|:]\s*(.+)$/i)
        if (mSimple) {
          timeStr = mSimple[1]
          body = mSimple[2].trim()
        }
      }
    }

    const { shift, formattedTime } = parseTimeToShift(timeStr)
    parsedMessages.push({
      rawLine: line,
      time: formattedTime,
      shift,
      sender,
      body,
    })
  }

  // Convert parsed messages into tracked Orders & link completion replies
  const orders = []
  for (const msg of parsedMessages) {
    const intent = analyzeMessageIntent(msg.body)
    if (intent.type === "noise") continue

    if (intent.type === "completion_reply" || intent.type === "progress_reply") {
      // Find the most recent open order that matches location/keywords or just the last open order
      const targetLoc = detectMallLocation(msg.body)
      let matchedOrder = null
      for (let i = orders.length - 1; i >= 0; i--) {
        if (orders[i].status !== "done") {
          if (targetLoc !== "عام / داخل المول" && orders[i].locationAr === targetLoc) {
            matchedOrder = orders[i]
            break
          }
        }
      }
      if (!matchedOrder) {
        for (let i = orders.length - 1; i >= 0; i--) {
          if (orders[i].status !== "done") {
            matchedOrder = orders[i]
            break
          }
        }
      }

      if (matchedOrder) {
        matchedOrder.status = intent.type === "completion_reply" ? "done" : "in_progress"
        matchedOrder.resolutionNote = `${msg.sender} (${msg.time}): ${msg.body}`
        matchedOrder.resolvedBy = msg.sender
        matchedOrder.resolvedAt = msg.time
        matchedOrder.resolvedShift = msg.shift
        continue
      }
    }

    const cls = classifyWhatsAppMessage(msg.body, forcedGroupId)
    const isAlreadyDone =
      intent.type === "order_already_done" ||
      /(✅|تم الإصلاح|تم التنفيذ|تمت النظافة|خلص)/i.test(msg.body)
    const isInProg =
      !isAlreadyDone && /(⏳|جاري العمل|جاري الإصلاح|تحت التنفيذ|بانتظار)/i.test(msg.body)

    orders.push({
      uid: `wa_${defaultDate || "today"}_${Math.random().toString(36).slice(2, 9)}`,
      date: defaultDate,
      time: msg.time || "09:00",
      shift: msg.shift,
      sender: msg.sender,
      description: msg.body,
      groupId: cls.groupId,
      groupLabelAr: cls.groupLabelAr,
      subCategoryId: cls.subCategoryId,
      subCategoryLabelAr: cls.subCategoryLabelAr,
      locationAr: cls.locationAr,
      priority: cls.priority,
      status: isAlreadyDone ? "done" : isInProg ? "in_progress" : "open",
      resolutionNote: isAlreadyDone ? "تم التأكيد في المحادثة ✅" : isInProg ? "جاري المتابعة في الشيفت ⏳" : "",
      resolvedBy: isAlreadyDone ? msg.sender : "",
      resolvedAt: isAlreadyDone ? msg.time : "",
    })
  }

  return orders
}

/**
 * Generates a realistic 3-Shift WhatsApp Groups conversation sample for Park Street Mall
 * so the user can test the analyzer with 1 click!
 */
export function getSampleThreeShiftsWhatsAppChat(dateStr = "2026-11-07") {
  return `[07:45 ص، ${dateStr}] م. محمود (مشرف صباحي): عطل في 4 اسبوتات إنارة بممر الدور الثاني مبنى 1 أمام الوحدات
[08:15 ص، ${dateStr}] مشرف الهاوس كيبنج: جاري غسيل وتلميع الرسبشن والمداخل الرئيسية لمبنى 1 ومبنى 3 وتم الانتهاء من المرايات ✅
[08:50 ص، ${dateStr}] كابتن أمن البوابة: كاميرا رقم 14 في بيزمنت 1 مسار السيارات فاصلة صورة وتحتاج مراجعة التيار الخفيف
[09:20 ص، ${dateStr}] فني الكهرباء حسن: تم تغيير الـ 4 اسبوتات بمبنى 1 الدور الثاني وتم التشغيل بنجاح ✅
[10:10 ص، ${dateStr}] مشرف السيفتي: طفاية الحريق بجوار سلم الطوارئ مبنى 2 الدور الثالث تحتاج إعادة تعبئة وفحص المؤشر
[11:05 ص، ${dateStr}] م. محمود (مشرف صباحي): تسريب مياه في شطاف ومحبس حمام الرجال بالبلازا، يرجى سرعة توجه فني السباكة فوراً
[11:40 ص، ${dateStr}] فني السباكة سعيد: تم إصلاح تسريب المياه وتغيير المحبس في حمام البلازا بالكامل ✅
[01:15 م، ${dateStr}] مشرف التشغيل: مطلوب مراجعة نظافة أحواض الزرع واللاندسكيب أمام كاف ودولاتو بالبلازا
[02:10 م، ${dateStr}] شركة اللاندسكيب: تم تنظيف وري أحواض الزرع أمام كاف ودولاتو بالكامل ✅
[03:30 م، ${dateStr}] م. كريم (مشرف مسائي): شكوى من وحدة إدارية بالدور الثالث مبنى 2 من ضعف التبريد في التكييف المركزي HVAC
[04:15 م، ${dateStr}] فني التكييف: جاري فحص وحدة المناولة والفلاتر للتكييف بالدور الثالث مبنى 2 وبانتظار شحن الفريون ⏳
[05:20 م، ${dateStr}] مشرف الهاوس كيبنج المسائي: وجود انسكاب مياه في ممر ريتشارد مبنى 3 وتم توجيه العامل وتجفيف الأرضية فوراً ✅
[06:40 م، ${dateStr}] مشرف السيفتي: وجود كراتين ومخلفات تعيق مخرج وباب الطوارئ الخلفي في منطقة التحميل، يرجى الإزالة العاجلة
[07:10 م، ${dateStr}] مشرف منطقة التحميل: تم إزالة الكراتين وفتح مسار باب الطوارئ بمنطقة التحميل بالكامل ✅
[08:30 م، ${dateStr}] م. كريم (مشرف مسائي): كسر في كالون ومفصلة باب غرفة خدمات النظافة بمبنى 1 الدور الأول ويحتاج تغيير كالون
[09:45 م، ${dateStr}] مشرف الأمن المسائي: تكدس سيارات عند منحدر النزول لبيزمنت 2 وتم توجيه أفراد الأمن لتنظيم المسار ✅
[11:20 م، ${dateStr}] مشرف الشيفت الليلي: بدء غسيل أرضية البلازا وفواصل المطاعم بالماكينة وتطهير حمامات البلازا
[12:30 ص، ${dateStr}] فني الصيانة الليلي: عطل في حساس باب المصعد رقم 2 بمبنى 3 ويحتاج ضبط ومراجعة شركة المصاعد صباحاً
[02:15 ص، ${dateStr}] مشرف الشيفت الليلي: تم الانتهاء من غسيل أرضية البلازا وتطهير حمامات البلازا وتفريغ غرفة القمامة بالكامل ✅
[04:00 ص، ${dateStr}] مشرف السيفتي الليلي: لوحة إنذار الحريق تعطي إشارة خطأ (Fault) في حساس دخان بيزمنت 2 وتحتاج فحص مهندس الأنظمة`
}
