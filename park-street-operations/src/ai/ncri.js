"use strict";

/**
 * NCRI v2 — Natural Language Classification & Resolution Intelligence
 * Ported from snag-app/src/ai/ncri.js & snag-app/src/utils/classify.js for Park Street Operations Slack App.
 */

const TRADE_KEYWORDS = {
  electrical: {
    high: [
      "ماس كهربائي", "شرز", "دخان كهرباء", "انقطاع تيار", "لوحة كهرباء", "كابل عاري", "صعق",
      "short circuit", "spark", "power outage", "exposed wire", "electrical fire", "electrical panel"
    ],
    medium: [
      "كشاف", "إنارة", "لمبة", "إضاءة", "فيشة", "مفتاح كهرباء", "بريزة", "ليد", "سبوت",
      "ترانس", "قاطع", "أوتوماتيك", "توزيع كهرباء", "عمود إنارة", "خلية ضوئية",
      "light", "lighting", "bulb", "lamp", "socket", "switch", "led", "spotlight", "breaker", "Electrical"
    ]
  },
  hvac: {
    high: [
      "توقف تكييف", "تسريب فريون", "عطل شيلر", "حريق تكييف",
      "chiller down", "ac failure", "freon leak", "hvac emergency"
    ],
    medium: [
      "تكييف", "تبريد", "فريون", "وحدة خارجية", "وحدة داخلية", "فان كويل", "دكت",
      "جريلة", "ثرموستات", "شفاط", "تهوية", "كمبروسر", "شيلر", "مروحة",
      "ac", "hvac", "air condition", "cooling", "duct", "grille", "thermostat", "exhaust fan", "ventilation", "HVAC"
    ]
  },
  plumbing: {
    high: [
      "انفجار ماسورة", "غرق", "طفح مجاري", "تسريب مياه كبير", "كسر خط رئيسي",
      "pipe burst", "flooding", "sewage overflow", "major leak"
    ],
    medium: [
      "سباكة", "تسريب", "مياه", "ماسورة", "حنفية", "خلاط", "سيفون", "صرف", "مجاري",
      "بيبة", "بالوعة", "مضخة", "ماتور مياه", "محبس", "سخان", "قاعدة حمام", "مغسلة", "حوض", "شطاف",
      "plumbing", "leak", "water", "pipe", "faucet", "mixer", "flush", "drain", "sewer", "pump", "valve", "heater", "sink", "Plumbing"
    ]
  },
  civil: {
    high: [
      "انهيار", "سقوط سقف", "شرخ إنشائي", "هبوط أرضي", "كسر رخام خطير",
      "collapse", "ceiling fall", "structural crack", "sinkhole"
    ],
    medium: [
      "مدني", "رخام", "سيراميك", "بلاط", "إنترلوك", "بلدورة", "خرسانة", "محارة", "جبس",
      "جبس بورد", "سقف ساقط", "شرخ", "كسر", "حفرة", "أرضية", "حائط", "جدار", "عمود", "عزل",
      "civil", "marble", "ceramic", "tile", "interlock", "curb", "concrete", "plaster", "gypsum",
      "ceiling", "crack", "broken", "pothole", "floor", "wall", "waterproofing", "Civil"
    ]
  },
  painting: {
    high: [],
    medium: [
      "دهان", "نقاشة", "تقشير", "رطوبة", "بوية", "معجون", "لون", "طلاء", "خدش حائط", "تشوه بصري",
      "paint", "painting", "peeling", "dampness", "putty", "color", "coating", "wall scratch", "Painting"
    ]
  },
  carpentry: {
    high: [
      "كسر باب رئيسي", "سقوط باب",
      "main door broken", "door fell"
    ],
    medium: [
      "نجارة", "باب خشب", "مفصلة", "كالون", "مقبض", "قفل", "دفاش", "رداد", "برواز", "خشب",
      "مكتب", "دولاب", "شباك", "ألوميتال",
      "carpentry", "wood door", "hinge", "lock", "handle", "door closer", "frame", "wood", "cabinet", "window", "Carpentry"
    ]
  },
  glass_metal: {
    high: [
      "كسر زجاج", "شرخ زجاج كبير", "سقوط لوح زجاج", "كسر هاندريل",
      "shattered glass", "broken glass", "falling glass", "broken handrail"
    ],
    medium: [
      "زجاج", "سيكوريت", "معدن", "ستانلس", "حديد", "هاندريل", "درابزين", "واجهة زجاجية", "مراية", "مرآة",
      "glass", "tempered", "metal", "stainless", "iron", "handrail", "railing", "facade", "mirror"
    ]
  },
  fire_safety: {
    high: [
      "إنذار حريق", "طفاية فارغة", "تسريب خط حريق", "عطل رشاش", "باب طوارئ مغلق", "دخان", "حريق",
      "fire alarm", "empty extinguisher", "fire line leak", "sprinkler fault", "blocked exit", "smoke", "fire"
    ],
    medium: [
      "حريق", "طفاية", "صندوق حريق", "خرطوم حريق", "رشاش", "كاشف دخان", "لوحة إنذار",
      "مخرج طوارئ", "سلامة", "إخلاء", "سهم مضيء",
      "fire", "extinguisher", "hose reel", "sprinkler", "smoke detector", "alarm panel", "emergency exit", "safety", "Safety", "Firefighting"
    ]
  },
  elevators: {
    high: [
      "احتجاز بأسانسير", "توقف مصعد", "توقف سلم كهربائي", "عطل مصعد",
      "trapped in elevator", "elevator stuck", "escalator stopped", "lift down"
    ],
    medium: [
      "أسانسير", "مصعد", "سلم كهربائي", "إسكاليتور", "زرار مصعد", "باب مصعد",
      "elevator", "lift", "escalator"
    ]
  },
  security_cctv: {
    high: [
      "توقف كاميرات", "عطل بوابة دخول", "كسر ذراع باركينج", "اختراق أمني",
      "cctv down", "gate failure", "barrier broken", "security breach"
    ],
    medium: [
      "كاميرا", "مراقبة", "أمن", "حراسة", "بوابة", "ذراع باركينج", "أكسس كنترول", "انتركم", "تفتيش",
      "camera", "cctv", "security", "guard", "gate", "barrier", "access control", "intercom", "Security", "Low Current"
    ]
  },
  cleaning: {
    high: [
      "تراكم قمامة كبير", "انسداد كامل", "رائحة كريهة شديدة", "مخلفات خطرة",
      "major trash buildup", "severe odor", "hazardous waste"
    ],
    medium: [
      "نظافة", "قمامة", "أتربة", "غسيل", "تلميع", "سلة مهملات", "باسكت", "أوساخ",
      "بقع", "مخلفات", "ردش", "تعقيم", "صابون", "مناديل", "رائحة", "هاوس كيبنج",
      "cleaning", "trash", "garbage", "dust", "wash", "polish", "bin", "dirt", "stain",
      "debris", "sanitize", "soap", "tissue", "odor", "smell", "housekeeping", "Housekeeping", "Soft Service"
    ]
  },
  landscape: {
    high: [
      "سقوط شجرة", "انفجار شبكة ري",
      "fallen tree", "irrigation burst"
    ],
    medium: [
      "زراعة", "لاندسكيب", "شجر", "نخل", "نجيلة", "أحواض زرع", "ري", "تقليم", "ورق شجر", "نباتات",
      "landscape", "tree", "palm", "grass", "lawn", "planter", "irrigation", "pruning", "leaves", "plants", "Landscape"
    ]
  },
  signage: {
    high: [
      "سقوط لافتة", "ماس يافطة",
      "falling sign", "signage short circuit"
    ],
    medium: [
      "يافطة", "لافتة", "لوحة إرشادية", "توجيه", "بانر", "توتم", "حروف مضيئة", "ترقيم",
      "sign", "signage", "wayfinding", "banner", "totem", "illuminated letters", "numbering"
    ]
  },
  parking: {
    high: [
      "حادث جراج", "توقف نظام التذاكر", "غلق مخرج جراج",
      "parking accident", "ticketing down", "parking exit blocked"
    ],
    medium: [
      "باركينج", "جراج", "موقف", "مطب", "تخطيط أرضي", "مصد عجلات", "مراية عاكسة", "فالت", "تذكرة باركينج",
      "parking", "garage", "speed bump", "line marking", "wheel stopper", "convex mirror", "valet", "ticket"
    ]
  }
};

const TRADE_TO_APP_TRADE = {
  electrical: "Electrical",
  hvac: "HVAC",
  plumbing: "Plumbing",
  civil: "Civil",
  painting: "Painting",
  carpentry: "Carpentry",
  glass_metal: "Civil",
  fire_safety: "Firefighting",
  elevators: "Mechanical",
  security_cctv: "Low Current",
  cleaning: "Housekeeping",
  landscape: "Landscape",
  signage: "Operations",
  parking: "Traffic"
};

const TRADE_TO_SECTOR = {
  electrical: "customer-journey",
  hvac: "customer-journey",
  plumbing: "customer-journey",
  civil: "customer-journey",
  painting: "customer-journey",
  carpentry: "customer-journey",
  glass_metal: "customer-journey",
  fire_safety: "security",
  elevators: "customer-journey",
  security_cctv: "security",
  cleaning: "customer-journey",
  landscape: "landscape",
  signage: "traffic-parking",
  parking: "traffic-parking"
};

const TRADE_TO_TYPE = {
  electrical: "maintenance",
  hvac: "maintenance",
  plumbing: "maintenance",
  civil: "maintenance",
  painting: "maintenance",
  carpentry: "maintenance",
  glass_metal: "maintenance",
  fire_safety: "operations",
  elevators: "maintenance",
  security_cctv: "operations",
  cleaning: "cleanliness",
  landscape: "cleanliness",
  signage: "operations",
  parking: "operations"
};

const URGENCY_KEYWORDS = {
  critical: [
    "خطر", "طوارئ", "فوري", "حريق", "دخان", "ماس", "غرق", "انفجار", "سقوط", "احتجاز",
    "إصابة", "عاجل جداً", "توقف كامل", "انقطاع", "كسر خطير", "مكشوف", "تهديد",
    "danger", "emergency", "immediate", "fire", "smoke", "short circuit", "flooding",
    "burst", "falling", "trapped", "injury", "critical", "complete outage", "exposed", "hazard"
  ],
  high: [
    "عاجل", "مهم", "تسريب", "عطل", "توقف", "مكسور", "لا يعمل", "معطل", "شكوى عميل",
    "تشوه شديد", "انسداد", "رائحة كريهة",
    "urgent", "important", "leak", "fault", "stopped", "broken", "not working", "out of order",
    "customer complaint", "blocked", "bad odor", "high"
  ],
  low: [
    "بسيط", "روتيني", "تجميلي", "صيانة دورية", "ملاحظة", "تحسين", "دهان خفيف", "تلميع",
    "minor", "routine", "cosmetic", "periodic", "note", "improvement", "touch up", "polish", "low"
  ]
};

const LOCATION_PATTERNS = [
  { pattern: /(?:مبنى|building|bldg|b)\s*([1-9]|[a-g])/i, map: (m) => `Building ${String(m[1]).toUpperCase()}` },
  { pattern: /(?:بلازا|plaza)/i, map: () => "Plaza" },
  { pattern: /(?:جراج|باركينج|موقف|parking|basement|بيزمنت)/i, map: () => "Basement" },
  { pattern: /(?:لاندسكيب|حديقة|landscape)/i, map: () => "Landscape" },
  { pattern: /(?:سلم|درج|stairs)/i, map: () => "Stairs" },
  { pattern: /(?:سطح|روف|roof)/i, map: () => "Roof" },
  { pattern: /(?:بوابة|مدخل|gate)\s*([1-9])?/i, map: () => "Gates" },
  { pattern: /(?:حمام|دورة مياه|تويلت|restroom|wc|toilet)/i, map: () => "Restrooms" },
  { pattern: /(?:مسجد|مصلى|mosque)/i, map: () => "Plaza" },
  { pattern: /lmd/i, map: () => "Plaza" }
];

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "أ")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function classifyNCRI(text, context = {}) {
  const raw = String(text || "").trim();
  const normalized = normalizeText(raw);

  if (!raw) {
    return {
      category: "general",
      trade: context.trade || "Civil",
      type: context.type || "maintenance",
      priority: context.priority || "normal",
      urgencyLevel: "normal",
      sector: context.sector || "customer-journey",
      suggestedLocation: context.location || "Plaza",
      confidence: 0.3,
      matchedKeywords: [],
      suggestedAction: "فحص البند وتحديد الإجراء التصحيحي المناسب",
      estimatedSlaHours: 24
    };
  }

  const scores = {};
  const matchedKeywords = [];
  let highSeverityTrigger = false;

  for (const [category, groups] of Object.entries(TRADE_KEYWORDS)) {
    scores[category] = 0;
    for (const kw of groups.high || []) {
      if (raw.toLowerCase().includes(kw.toLowerCase()) || normalized.includes(normalizeText(kw))) {
        scores[category] += 5;
        matchedKeywords.push(kw);
        highSeverityTrigger = true;
      }
    }
    for (const kw of groups.medium || []) {
      if (raw.toLowerCase().includes(kw.toLowerCase()) || normalized.includes(normalizeText(kw))) {
        scores[category] += 2;
        matchedKeywords.push(kw);
      }
    }
  }

  let bestCategory = "civil";
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  let urgencyLevel = "normal";
  let priority = "normal";

  if (highSeverityTrigger) {
    urgencyLevel = "critical";
    priority = "urgent";
  } else {
    for (const kw of URGENCY_KEYWORDS.critical) {
      if (raw.toLowerCase().includes(kw.toLowerCase()) || normalized.includes(normalizeText(kw))) {
        urgencyLevel = "critical";
        priority = "urgent";
        matchedKeywords.push(kw);
        break;
      }
    }
    if (urgencyLevel === "normal") {
      for (const kw of URGENCY_KEYWORDS.high) {
        if (raw.toLowerCase().includes(kw.toLowerCase()) || normalized.includes(normalizeText(kw))) {
          urgencyLevel = "high";
          priority = "medium";
          matchedKeywords.push(kw);
          break;
        }
      }
    }
    if (urgencyLevel === "normal") {
      for (const kw of URGENCY_KEYWORDS.low) {
        if (raw.toLowerCase().includes(kw.toLowerCase()) || normalized.includes(normalizeText(kw))) {
          urgencyLevel = "low";
          priority = "low";
          break;
        }
      }
    }
  }

  let suggestedLocation = context.location || "Plaza";
  for (const loc of LOCATION_PATTERNS) {
    const match = raw.match(loc.pattern);
    if (match) {
      suggestedLocation = loc.map(match);
      break;
    }
  }

  const trade = TRADE_TO_APP_TRADE[bestCategory] || "Civil";
  const sector = TRADE_TO_SECTOR[bestCategory] || "customer-journey";
  const type = TRADE_TO_TYPE[bestCategory] || "maintenance";
  const confidence = Math.min(0.98, bestScore > 0 ? 0.55 + Math.min(bestScore, 10) * 0.043 : 0.4);

  const slaMap = {
    critical: 2,
    high: 8,
    normal: 24,
    low: 48
  };

  const actionTemplates = {
    electrical: "فحص الدائرة الكهربائية والتأكد من العزل الآمن واستبدال القطعة التالفة فوراً",
    hvac: "فحص وحدة التكييف/التهوية وضبط درجات الحرارة والتأكد من كفاءة التبريد",
    plumbing: "إغلاق مصدر التسريب وفحص الوصلات والمحابس وإصلاح العطل",
    civil: "معالجة الكسر أو الشرخ وإعادة الشيء لأصله بمعايير التشطيب المعتمدة",
    painting: "صنفرة ومعجنة وإعادة دهان الجزء المتضرر بنفس كود اللون المعتمد",
    carpentry: "ضبط المفصلات/الكالون أو إصلاح الجزء الخشبي/الألوميتال",
    glass_metal: "تأمين الموقع واستبدال/تثبيت الزجاج أو الهاندريل المعدني",
    fire_safety: "إجراء طارئ لفحص منظومة السلامة والحريق والتأكد من الجاهزية الفورية",
    elevators: "إخطار شركة صيانة المصاعد والسلالم المتحركة للفحص الفوري",
    security_cctv: "مراجعة فريق التيار الخفيف والأمن لإعادة تشغيل النظام/البوابة",
    cleaning: "توجيه فريق الهاوس كيبنج للتنظيف والتعقيم الفوري",
    landscape: "توجيه فريق اللاندسكيب للتقليم/الري وتنظيف الأحواض",
    signage: "مراجعة اللوحة الإرشادية وإصلاح التثبيت أو الإضاءة",
    parking: "تأمين مسار الحركة في الجراج وإصلاح معدات التوجيه/الباركينج"
  };

  return {
    category: bestCategory,
    trade,
    type,
    priority,
    urgencyLevel,
    sector,
    suggestedLocation,
    confidence: Number(confidence.toFixed(2)),
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 8),
    suggestedAction: actionTemplates[bestCategory] || "فحص البند وتنفيذ الإجراء التصحيحي المناسب",
    estimatedSlaHours: slaMap[urgencyLevel] || 24
  };
}

function classifyBatch(items = []) {
  return items.map((item) => {
    const text = [item.title, item.description, item.location, item.notes].filter(Boolean).join(" ");
    return {
      id: item.id,
      ...classifyNCRI(text, item)
    };
  });
}

module.exports = {
  TRADE_KEYWORDS,
  TRADE_TO_APP_TRADE,
  TRADE_TO_SECTOR,
  TRADE_TO_TYPE,
  classifyNCRI,
  classifyBatch
};
