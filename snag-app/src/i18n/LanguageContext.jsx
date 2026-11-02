import React, { createContext, useContext, useState, useEffect, useCallback } from "react"

const LanguageContext = createContext(null)

// Comprehensive dictionary for automatic label translation (AR -> EN)
export const AR_TO_EN_MAP = {
  // Locations
  "رحلة العميل — بارك ستريت": "Customer Journey — Park St.",
  "بوابات ومداخل بارك ستريت": "Park St. Gates & Entrances",
  "نقاط الأمن والبوابات والكاميرات": "Security Points, Gates & CCTV",
  "الزراعة والمسطحات الخضراء": "Landscape & Green Areas",
  "مسار السيارات بالبيزمنت (B1/B2)": "Basement Car Path (B1/B2)",
  "منحدرات ومداخل البيزمنت (Ramps)": "Basement Ramps & Entrances",
  "البلازا": "The Plaza",
  "الحمامات": "Restrooms",
  "مصاعد الركاب": "Passenger Elevators",
  "مصاعد الخدمات": "Service Elevators",
  "ممرات المبنى": "Building Corridors",
  "طرق الخدمات": "Service Corridors",
  "جراج بيزمنت 1": "Basement 1 Garage (B1)",
  "جراج بيزمنت 2": "Basement 2 Garage (B2)",
  "سلم الطوارئ": "Emergency Stairs",
  "السطح": "Roof",
  "غرف الكهرباء": "Electrical Rooms",

  // Trades
  "الأمن والمراقبة والحراسة": "Security & CCTV",
  "الزراعة واللاند سكيب": "Landscape & Irrigation",
  "مسار السيارات والبيزمنت": "Traffic & Basement Parking",
  "كهرباء": "Electrical",
  "تكييف وتهوية": "HVAC & Ventilation",
  "سباكة": "Plumbing",
  "نجارة": "Carpentry",
  "دهانات": "Painting",
  "ترميمات": "Civil Restoration",
  "جبس بورد": "Gypsum Board",
  "حوائط وبلاط": "Walls & Tiles",
  "أنظمة إطفاء": "Fire Fighting",
  "أعمال مدنية": "Civil Works",
  "نظافة ومكافحة حشرات": "Housekeeping & Pest Control",
  "أعمال عامة": "General Maintenance",

  // Types
  "تشغيل": "Operations",
  "صيانة": "Maintenance",
  "نظافة": "Housekeeping",

  // Priorities
  "عاجل": "Urgent",
  "متوسط": "Medium",
  "عادي": "Normal",

  // Statuses
  "مفتوح": "Open",
  "قيد التنفيذ": "In Progress",
  "مغلق": "Closed",

  // Park Street Tracks & Quick Items
  "الأمن والحراسة": "Security & Guarding",
  "نقاط التمركز • الكاميرات • البوابات • التصاريح": "Guard Posts • CCTV • Gates • Permits",
  "المداخل • اللوحات الإرشادية • الممشى • المقاعد • الأجواء": "Entrances • Wayfinding • Promenade • Seating • Ambience",
  "الأشجار • النخيل • المسطحات الخضراء • شبكات الري • الأحواض": "Trees • Palms • Lawns • Irrigation • Planters",
  "مسار السيارات بالبيزمنت": "Basement Car Path",
  "المنحدرات Ramps • البوابات • التخطيط الأرضي • المرايا • الإيبوكسي": "Ramps • Barrier Gates • Road Markings • Mirrors • Epoxy",

  "غياب فرد الأمن من النقطة": "Security Guard Absent from Post",
  "عطل كاميرا مراقبة CCTV": "CCTV Camera Malfunction",
  "عطل بوابة أمنية / تفتيش": "Security / Inspection Gate Fault",
  "عدم الالتزام بالزي الرسمي": "Uniform Non-Compliance",
  "باب طوارئ/خدمة غير مؤمن": "Unsecured Emergency / Service Door",
  "دخول عمال بدون تصريح": "Workers Without Work Permit",
  "عطل جهاز لاسلكي / إنتركم": "Walkie-Talkie / Intercom Fault",
  "نقطة عمياء / ضعف إضاءة أمنية": "Blind Spot / Weak Security Lighting",
  "حواجز التوجيه الأمنية تالفة": "Damaged Security Barriers",

  "لوحة إرشادية (Wayfinding) معطلة": "Defective Wayfinding Signage",
  "عوائق في مسار المشاة": "Obstacles in Pedestrian Walkway",
  "مقاعد واستراحات الزوار": "Visitor Seating Needs Maintenance",
  "اتساخ واجهات زجاجية بالممشى": "Dirty Glass Facades on Promenade",
  "توقف سلم متحرك / مصعد زوار": "Escalator / Passenger Elevator Stopped",
  "مشكلة في الصوت / الموسيقى": "Background Music / Audio Issue",
  "كشافات إنارة الممشى محروقة": "Burnt Out Promenade Spotlights",
  "امتلاء سلات المهملات بالممشى": "Overflowing Trash Bins on Promenade",
  "مكتب الاستقبال / خدمة العملاء": "Concierge / Reception Desk Issue",
  "روائح غير مرغوبة في الممر": "Unpleasant Odor in Corridor",
  "كسر أو بقع في رخام الممشى": "Broken / Stained Promenade Marble",

  "جفاف أو ذبول الأشجار والنباتات": "Withering / Dry Trees & Plants",
  "تسريب في شبكة الري / الرشاشات": "Irrigation Network / Sprinkler Leak",
  "النجيلة تحتاج قص وتهذيب": "Lawn Needs Mowing & Trimming",
  "تقليم أشجار ونخيل متدلية": "Overhanging Trees / Palms Need Pruning",
  "مخلفات في أحواض الزرع (Planters)": "Litter in Landscape Planters",
  "تجمع مياه ري على الممشى": "Irrigation Water Pooling on Walkway",
  "آفات زراعية / حشرات بالنباتات": "Plant Pests / Insects Detected",
  "عطل إضاءة اللاند سكيب والأشجار": "Landscape & Tree Lighting Fault",
  "استبدال شتلات وزهور تالفة": "Replace Damaged Seasonal Flowers",

  "عطل بوابة التذاكر / الذراع الإلكتروني": "Barrier Gate / Ticket Dispenser Fault",
  "بهتان الأسهم والتخطيط الأرضي": "Faded Road Arrows & Floor Markings",
  "عطل اللوحات المرورية المعلقة": "Hanging Traffic Signage Fault",
  "كسر في مطب صناعي (Speed Bump)": "Broken Speed Bump in Car Path",
  "مرآة عاكسة (Convex Mirror) مكسورة": "Broken / Misaligned Convex Mirror",
  "خلع مصدات حماية الأعمدة / العجلات": "Damaged Column Guards / Wheel Stoppers",
  "تقشر إيبوكسي أو بقع زيوت بالمسار": "Peeling Epoxy Floor / Oil Stains",
  "ضعف إنارة مسار السيارات / الرامب": "Weak Lighting in Car Path / Ramp",
  "توقف مراوح سحب العادم (Jet Fans)": "Basement Jet Fans Stopped / Noisy",

  // Restrooms & Janitor Rooms
  "مبنى 1": "Building 1",
  "مبنى 2": "Building 2",
  "مبنى 3": "Building 3",
  "بيزمنت 1": "Basement 1",
  "بيزمنت 2": "Basement 2",
  "اتجاه راميدا": "Rameda Direction",
  "Sky القديمة / Art of form": "Old Sky / Art of Form",
  "اتجاه العيادات": "Clinics Wing",
  "اتجاه المكاتب": "Offices Wing",
  "ريتشارد": "Richard Direction",
  "ناحية البنك العربي": "Arab Bank Side",
  "ناحية مستر ايمن": "Mr. Ayman Side",
  "المصلى": "Prayer Room Area",
  "بلازا 1": "Plaza 1",
  "بلازا 3": "Plaza 3",
  "LMD": "LMD",
  "المسجد": "Mosque",
  "الأرضي": "Ground Floor",
  "الأول": "First Floor",
  "الثاني": "Second Floor",
  "الثالث": "Third Floor",
  "الرابع": "Fourth Floor",
  "رجالي": "Men",
  "حريمي": "Women",
  "غرفة نظافة (Janitor Room)": "Janitor Room",
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("smart_mall_lang") || "ar"
    } catch {
      return "ar"
    }
  })

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr"
    try {
      localStorage.setItem("smart_mall_lang", lang)
    } catch {}
    document.documentElement.dir = dir
    document.documentElement.lang = lang
    if (document.body) {
      document.body.dir = dir
      document.body.style.direction = dir
      document.body.style.textAlign = lang === "ar" ? "right" : "left"
    }
  }, [lang])

  const setLang = useCallback((newLang) => {
    setLangState(newLang === "en" ? "en" : "ar")
  }, [])

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "ar" ? "en" : "ar"))
  }, [])

  // Direct inline bilingual helper: tr("النص بالعربية", "English Text")
  const tr = useCallback(
    (arText, enText) => {
      return lang === "en" ? (enText ?? arText) : arText
    },
    [lang]
  )

  // Dictionary lookup for constants/labels
  const trLabel = useCallback(
    (text) => {
      if (!text) return text
      if (lang === "ar") return text
      return AR_TO_EN_MAP[text] || text
    },
    [lang]
  )

  const isRtl = lang === "ar"

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, tr, trLabel, isRtl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      lang: "ar",
      setLang: () => {},
      toggleLang: () => {},
      tr: (ar, en) => ar,
      trLabel: (t) => t,
      isRtl: true,
    }
  }
  return ctx
}
