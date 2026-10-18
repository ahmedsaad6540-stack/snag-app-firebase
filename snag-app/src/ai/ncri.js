/**
 * 🧠 NCRI v2.0 — Neural Classification & Risk Intelligence
 * محرك التصنيف الذكي المتطور مع نسبة ثقة وكشف التخصصات المتعددة
 */

const TRADE_KB = {
  electrical: {
    label: "كهرباء", icon: "⚡", risk: 1.3,
    kw: { "كهرب":5,"كهربائي":5,"لمبة":4,"إنارة":4,"اضاءة":4,"إضاءة":4,"قاطع":4,"مقبس":4,"فيشة":3,"بريزة":3,"كابل":3,"سلك":3,"طبلون":5,"شورت":5,"ماس كهربائي":5,"محول":3,"مولد":4,"فيوز":4,"تيار":4,"فولت":4,"كشاف":3,"كشافات":3,"ليد":3,"ليدات":3,"انقطاع التيار":5,"لوحة التوزيع":5,"لمبة محروقة":4,"صعق":5,"شرار":5,"power":3,"electric":4,"light":2,"switch":2,"socket":3,"cable":3,"panel":3 },
    ng: { "ماس كهربائي":6,"لوحة توزيع":5,"أسلاك مكشوفة":6,"تماس كهربائي":6,"حمل زائد":5,"انقطاع تيار":6 }
  },
  ac: {
    label: "تكييف وتهوية", icon: "❄️", risk: 1.0,
    kw: { "تكييف":5,"مكيف":5,"تهوية":4,"تبريد":4,"فريون":5,"فلتر":3,"مروحة":3,"دكت":4,"تشيلر":5,"كمبروسر":5,"ثرموستات":4,"سبلت":4,"كاسيت":4,"وحدة تكييف":5,"شفاط":3,"hvac":5,"ac":4,"cooling":3 },
    ng: { "تنقيط المكيف":5,"عدم تبريد":5,"تسريب فريون":6,"مكيف يقطر":5,"دكت مكسور":5,"ثلج على المكيف":5 }
  },
  plumbing: {
    label: "سباكة", icon: "🔧", risk: 1.1,
    kw: { "سباك":5,"سباكة":5,"مياه":3,"ماء":3,"صرف":4,"حنفية":5,"تسريب":4,"تسرب":4,"مغسلة":4,"مواسير":5,"ماسورة":5,"بالوعة":4,"مجاري":4,"خلاط":4,"سيفون":4,"مضخة":4,"سخان":4,"محبس":4,"انسداد":5,"طفح":5,"تسليك":5,"عوامة":4 },
    ng: { "خلاط مكسور":5,"تهريب مياه":6,"خزان يطفح":6,"بانيو مسدود":5,"ضغط مياه ضعيف":5 }
  },
  fire: {
    label: "أنظمة إطفاء", icon: "🔥", risk: 2.0,
    kw: { "حريق":5,"إطفاء":5,"sprinkler":5,"طفاية":5,"إنذار":4,"fire":5,"دخان":4,"كاشف دخان":5,"إنذار حريق":5,"خرطوم حريق":5,"مضخة إطفاء":5,"fm200":5,"صندوق حريق":5 },
    ng: { "طفاية فارغة":5,"حساس دخان":5,"نظام اطفاء":6,"تسريب مياه الحريق":6 }
  },
  security: {
    label: "أمن ومراقبة", icon: "📹", risk: 1.4,
    kw: { "كاميرا":5,"كاميرات":5,"مراقبة":4,"أمن":3,"cctv":5,"nvr":5,"dvr":5,"بوابة":3,"إنتركم":4,"بصمة":4,"تحكم دخول":5,"barrier":3 },
    ng: { "كاميرا لا تعمل":5,"باب لا يفتح بالكارت":5,"فقدان تسجيل":5,"بوابة الكترونية":4 }
  },
  carpentry: {
    label: "نجارة", icon: "🪵", risk: 0.8,
    kw: { "باب":3,"أبواب":4,"خشب":4,"نجار":5,"نجارة":5,"قفل":3,"مفصل":3,"يد الباب":4,"كوالين":4,"ضلفة":4,"دولاب":3,"خزانة":3,"باركيه":4,"كاونتر":3,"رف":2,"درج":2 },
    ng: { "باب لا يغلق":5,"مفصلة مكسورة":5,"دولاب مكسور":4,"خشب منتفخ":4 }
  },
  painting: {
    label: "دهانات", icon: "🎨", risk: 0.6,
    kw: { "دهان":5,"دهانات":5,"paint":4,"طلاء":4,"تقشر":4,"تقشير":4,"بوية":4,"صبغ":4,"ورنيش":3,"لاكيه":3,"معجون":3 },
    ng: { "دهان متقشر":5,"بقع رطوبة":4,"ورق حائط ممزق":4,"إعادة دهان":4 }
  },
  restoration: {
    label: "ترميمات", icon: "🏗️", risk: 1.2,
    kw: { "ترميم":5,"ترميمات":5,"إعادة بناء":4,"تجديد":3,"لياسة":4,"مساح":3 },
    ng: { "سقوط محارة":5,"انهيار جدار":6,"تجديد كامل":4,"ترميم واجهة":5 }
  },
  gypsum: {
    label: "جبس بورد", icon: "📦", risk: 1.1,
    kw: { "جبس":5,"جبس بورد":5,"gypsum":5,"سقف ساقط":5,"سقف معلق":4,"كرانيش":4 },
    ng: { "تشقق سقف":5,"سقوط سقف":6,"جبس مشقق":5,"كورنيش مكسور":4 }
  },
  walls: {
    label: "حوائط وبلاط", icon: "🧱", risk: 0.8,
    kw: { "بلاط":5,"سيراميك":5,"رخام":4,"حوائط":3,"جدار":3,"بورسلين":4,"أرضيات":3,"جرانيت":4,"فواصل":3,"روبة":4 },
    ng: { "بلاطة مكسورة":5,"سيراميك طالع":5,"هبوط ارضية":5,"رخام مشروخ":5,"وزرة مكسورة":4 }
  },
  civil: {
    label: "أعمال مدنية", icon: "🏛️", risk: 1.5,
    kw: { "مدني":4,"خرسانة":5,"هبوط":4,"شرخ":4,"شروخ":4,"تشقق":4,"أساسات":5,"عزل":4,"عزل مائي":5,"حديد تسليح":5,"صدأ":3 },
    ng: { "شروخ خرسانة":6,"صدأ حديد":5,"تسريب سقف":5,"تجمعات مياه":5 }
  },
  cleanliness: {
    label: "نظافة ومكافحة", icon: "🧹", risk: 0.7,
    kw: { "نظافة":5,"تنظيف":5,"غسيل":3,"كنس":4,"قمامة":4,"زبالة":4,"نفايات":4,"أتربة":3,"غبار":3,"رائحة":3,"حشرات":5,"مكافحة":5,"فئران":5,"صراصير":5,"نمل":4,"قوارض":5,"رش حشرات":5,"مبيد":4,"ذباب":4 },
    ng: { "رائحة كريهة":5,"مكافحة حشرات":6,"رش مبيدات":5 }
  },
  landscape: {
    label: "لاند سكيب", icon: "🌿", risk: 0.6,
    kw: { "لاند سكيب":5,"لاندسكيب":5,"landscape":5,"حديقة":5,"حدائق":5,"أشجار":4,"شجرة":4,"زرع":4,"زراعة":5,"نجيل":5,"نجيلة":5,"عشب":4,"ورد":3,"أزهار":3,"نخل":4,"نخيل":4,"ري":4,"رش مياه":4,"مرشات":4,"sprinkler":4,"irrigation":5,"تنسيق حدائق":5,"ممر حديقة":4,"مسطحات خضراء":5,"تقليم":4,"أسمدة":3,"سماد":3,"حشائش":3,"آفات زراعية":4,"ديدان":3,"تسميد":3,"شتلات":3,"أحواض زرع":4,"حوض زرع":4,"مظلات":3,"جلسات خارجية":3,"نافورة":3,"بحيرة صناعية":3 },
    ng: { "تنسيق حدائق":6,"مسطح أخضر":5,"شجرة ميتة":5,"ري بالتنقيط":5,"رشاشات مياه":5,"حشائش طويلة":4,"أشجار جافة":5,"حوض زراعة":4 }
  },
  general: { label: "أعمال عامة", icon: "🔩", risk: 0.5, kw: {}, ng: {} }
}

const DANGER_COMBOS = [
  { kw: ["مياه","كهرب"], reason: "مياه + كهرباء = خطر صعق" },
  { kw: ["تسريب","كهرب"], reason: "تسريب قرب كهرباء = خطر" },
  { kw: ["حريق","مغلق"], reason: "حريق + مخرج مغلق = كارثة" },
  { kw: ["سقوط","سقف"], reason: "سقوط سقف = خطر مباشر" },
  { kw: ["انهيار","جدار"], reason: "انهيار هيكلي = خطر" },
  { kw: ["غاز","تسريب"], reason: "تسريب غاز = خطر انفجار" },
  { kw: ["محبوس","مصعد"], reason: "شخص محبوس في المصعد = طوارئ" },
]

function analyze(text, kb) {
  let score = 0, maxP = 0
  const matched = []
  for (const [k, w] of Object.entries(kb.kw)) {
    maxP += w
    if (text.includes(k.toLowerCase())) { score += w; matched.push(k) }
  }
  for (const [k, w] of Object.entries(kb.ng)) {
    maxP += w
    if (text.includes(k.toLowerCase())) { score += w; matched.push(k) }
  }
  const confidence = maxP > 0 ? Math.min(100, Math.round((score / Math.max(maxP * 0.15, 1)) * 100)) : 0
  return { score, matched, confidence }
}

function scorePriority(text) {
  const urgentKw = ["عاجل","خطير","طوارئ","فوري","حريق","انقطاع","خطر","سقوط","emergency","critical","urgent","danger","فيضان","ماس كهربائي","شورت","محبوس","صعق","انهيار","كارثة","توقف تام"]
  const medKw = ["متوسط","يحتاج متابعة","مهم","medium","ضعيف","ضعف أداء","بطيء"]
  if (urgentKw.some(k => text.includes(k))) return "urgent"
  if (medKw.some(k => text.includes(k))) return "medium"
  return "normal"
}

function scoreType(text, trade) {
  const m = ["صيانة","إصلاح","تصليح","عطل","عطلان","خربان","مكسور","لا يعمل","لا تعمل","تالف","محروق","استبدال","تسريب","انسداد","لحام"]
  const o = ["تشغيل","تفعيل","ضبط","برمجة","إعداد","تركيب","install","setup","ربط","توصيل","اختبار","فحص","معايرة"]
  const c = ["نظافة","تنظيف","غسيل","كنس","قمامة","زبالة","أتربة","غبار","رائحة","حشرات","تعقيم","مكافحة","رش حشرات"]
  const ms = m.filter(k=>text.includes(k)).length
  const os = o.filter(k=>text.includes(k)).length
  const cs = c.filter(k=>text.includes(k)).length
  if (trade === "cleanliness" && cs === 0 && ms === 0 && os === 0) return "cleanliness"
  if (cs > ms && cs > os) return "cleanliness"
  if (os > ms) return "operations"
  return "maintenance"
}

export function classifyNCRI(desc = "") {
  const t = desc.toLowerCase().trim()
  if (!t) return { primaryTrade:"general",primaryConfidence:0,primaryLabel:"أعمال عامة",primaryIcon:"🔩",secondaryTrades:[],type:"maintenance",priority:"normal",priorityEscalated:false,dangerAlerts:[],riskScore:0,detailedAnalysis:{} }

  const results = {}
  let best = "general", bestScore = 0, bestConf = 0

  for (const [id, kb] of Object.entries(TRADE_KB)) {
    if (id === "general") continue
    const a = analyze(t, kb)
    if (a.score > 0) {
      results[id] = { trade:id, label:kb.label, icon:kb.icon, score:a.score, confidence:a.confidence, matched:a.matched, riskLevel:Math.round(a.score * kb.risk) }
      if (a.score > bestScore) { bestScore = a.score; best = id; bestConf = a.confidence }
    }
  }

  const dangers = DANGER_COMBOS.filter(c => c.kw.every(k => t.includes(k))).map(c => ({ reason: c.reason, suggestedPriority: "urgent" }))
  let priority = scorePriority(t)
  let escalated = false
  if (dangers.length > 0 && priority !== "urgent") { priority = "urgent"; escalated = true }

  const sorted = Object.values(results).sort((a,b) => b.score - a.score)
  const secondary = sorted.slice(1).filter(t => t.confidence > 20).slice(0, 2)

  let risk = 0
  const maxR = Object.values(results).reduce((m,r) => Math.max(m, r.riskLevel), 0)
  risk += Math.min(40, maxR * 3)
  if (priority === "urgent") risk += 40
  else if (priority === "medium") risk += 20
  else risk += 5
  risk += dangers.length * 15
  risk = Math.min(100, risk)

  return {
    primaryTrade: best,
    primaryConfidence: bestConf,
    primaryLabel: TRADE_KB[best]?.label || "أعمال عامة",
    primaryIcon: TRADE_KB[best]?.icon || "🔩",
    secondaryTrades: secondary,
    type: scoreType(t, best),
    priority,
    priorityEscalated: escalated,
    dangerAlerts: dangers,
    riskScore: risk,
    detailedAnalysis: results,
  }
}

export function getConfidenceBreakdown(desc = "") {
  const r = classifyNCRI(desc)
  return Object.values(r.detailedAnalysis).sort((a,b) => b.confidence - a.confidence)
    .map(x => ({ tradeId:x.trade, label:x.label, icon:x.icon, confidence:x.confidence, keywords:x.matched }))
}

export function classifyTradeNCRI(desc = "") { return classifyNCRI(desc).primaryTrade }
