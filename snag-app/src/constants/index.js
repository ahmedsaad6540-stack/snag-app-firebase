export const LOCATIONS = [
  { id: "customer-journey",    name: "رحلة العميل — بارك ستريت",        icon: "🚶‍♂️" },
  { id: "mall-entrances",      name: "بوابات ومداخل بارك ستريت",        icon: "🚪" },
  { id: "security-points",     name: "نقاط الأمن والبوابات والكاميرات", icon: "🛡️" },
  { id: "landscape-gardens",   name: "الزراعة والمسطحات الخضراء",       icon: "🌿" },
  { id: "basement-car-path",   name: "مسار السيارات بالبيزمنت (B1/B2)", icon: "🚗" },
  { id: "basement-ramps",      name: "منحدرات ومداخل البيزمنت (Ramps)", icon: "🛣️" },
  { id: "plaza",               name: "البلازا",                         icon: "🏛️" },
  { id: "bathrooms",           name: "الحمامات",                        icon: "🚻" },
  { id: "passenger-elevators", name: "مصاعد الركاب",                   icon: "🛗" },
  { id: "service-elevators",   name: "مصاعد الخدمات",                  icon: "🛗" },
  { id: "building-corridors",  name: "ممرات المبنى",                   icon: "🏢" },
  { id: "service-corridors",   name: "طرق الخدمات",                    icon: "🚧" },
  { id: "garage-b1",           name: "جراج بيزمنت 1",                  icon: "🅿️" },
  { id: "garage-b2",           name: "جراج بيزمنت 2",                  icon: "🅿️" },
  { id: "emergency-stairs",    name: "سلم الطوارئ",                    icon: "🚪" },
  { id: "roof",                name: "السطح",                           icon: "🏗️" },
  { id: "electrical-rooms",    name: "غرف الكهرباء",                   icon: "🔌" },
]

export const TRADES = [
  { id: "security",         label: "الأمن والمراقبة والحراسة", icon: "🛡️", color: "#8b5cf6" },
  { id: "customer-journey", label: "رحلة العميل — بارك ستريت", icon: "🚶‍♂️", color: "#06b6d4" },
  { id: "landscape",        label: "الزراعة واللاند سكيب",    icon: "🌿", color: "#22c55e" },
  { id: "traffic-parking",  label: "مسار السيارات والبيزمنت",  icon: "🚗", color: "#ec4899" },
  { id: "electrical",       label: "كهرباء",                   icon: "⚡", color: "#fbbf24" },
  { id: "ac",               label: "تكييف وتهوية",             icon: "❄️", color: "#38bdf8" },
  { id: "plumbing",         label: "سباكة",                    icon: "🔧", color: "#34d399" },
  { id: "carpentry",        label: "نجارة",                    icon: "🪵", color: "#a78bfa" },
  { id: "painting",         label: "دهانات",                   icon: "🎨", color: "#f472b6" },
  { id: "restoration",      label: "ترميمات",                  icon: "🏗️", color: "#fb923c" },
  { id: "gypsum",           label: "جبس بورد",                 icon: "📦", color: "#94a3b8" },
  { id: "walls",            label: "حوائط وبلاط",              icon: "🧱", color: "#d97706" },
  { id: "fire",             label: "أنظمة إطفاء",              icon: "🔥", color: "#ef4444" },
  { id: "civil",            label: "أعمال مدنية",              icon: "🏛️", color: "#64748b" },
  { id: "cleanliness",      label: "نظافة ومكافحة حشرات",     icon: "🧹", color: "#10b981" },
  { id: "general",          label: "أعمال عامة",               icon: "🔩", color: "#6b7280" },
]

export const PARK_ST_TRACKS = [
  {
    id: "security",
    title: "الأمن والحراسة",
    subtitle: "نقاط التمركز • الكاميرات • البوابات • التصاريح",
    icon: "🛡️",
    color: "#8b5cf6",
    defaultLocation: "security-points",
    defaultTrade: "security",
    items: [
      { label: "غياب فرد الأمن من النقطة", desc: "عدم تواجد فرد الأمن في نقطة التمركز المحددة ببارك ستريت", type: "operations", priority: "urgent", location: "security-points" },
      { label: "عطل كاميرا مراقبة CCTV", desc: "كاميرا مراقبة لا تعمل أو زاوية الرؤية غير واضحة وتحتاج ضبط وصيانة", type: "maintenance", priority: "urgent", location: "security-points" },
      { label: "عطل بوابة أمنية / تفتيش", desc: "عطل في البوابة الأمنية الإلكترونية أو جهاز فحص الحقائب عند المدخل", type: "maintenance", priority: "urgent", location: "mall-entrances" },
      { label: "عدم الالتزام بالزي الرسمي", desc: "عدم التزام أفراد الأمن بالزي الرسمي (اليونيفورم) أو المظهر العام", type: "operations", priority: "medium", location: "security-points" },
      { label: "باب طوارئ/خدمة غير مؤمن", desc: "باب طوارئ أو ممر خدمة مفتوح بدون تأمين أو القفل المغناطيسي معطل", type: "operations", priority: "urgent", location: "emergency-stairs" },
      { label: "دخول عمال بدون تصريح", desc: "تواجد عمال أو موردين داخل المول بدون تصاريح عمل أو سترات مميزة", type: "operations", priority: "medium", location: "service-corridors" },
      { label: "عطل جهاز لاسلكي / إنتركم", desc: "عطل في جهاز اللاسلكي أو الإنتركم بنقطة الأمن وضعف التواصل مع غرفة التحكم", type: "maintenance", priority: "medium", location: "security-points" },
      { label: "نقطة عمياء / ضعف إضاءة أمنية", desc: "ضعف الإضاءة الأمنية المحيطة ووجود منطقة غير مغطاة بكاميرات المراقبة", type: "maintenance", priority: "medium", location: "security-points" },
      { label: "حواجز التوجيه الأمنية تالفة", desc: "حواجز تنظيم الدخول والكردون الأمني عند البوابة غير منظمة أو تالفة", type: "maintenance", priority: "normal", location: "mall-entrances" },
    ]
  },
  {
    id: "customer-journey",
    title: "رحلة العميل — بارك ستريت",
    subtitle: "المداخل • اللوحات الإرشادية • الممشى • المقاعد • الأجواء",
    icon: "🚶‍♂️",
    color: "#06b6d4",
    defaultLocation: "customer-journey",
    defaultTrade: "customer-journey",
    items: [
      { label: "لوحة إرشادية (Wayfinding) معطلة", desc: "اللوحة الإرشادية لتوجيه الزوار في بارك ستريت غير مضاءة أو تحتاج تحديث", type: "maintenance", priority: "medium", location: "customer-journey" },
      { label: "عوائق في مسار المشاة", desc: "وجود عوائق أو تشوينات في مسار رحلة العميل بالممشى الرئيسي في بارك ستريت", type: "operations", priority: "urgent", location: "customer-journey" },
      { label: "مقاعد واستراحات الزوار", desc: "مقاعد جلوس الزوار في بارك ستريت متسخة أو تحتاج صيانة وتثبيت", type: "cleanliness", priority: "medium", location: "customer-journey" },
      { label: "اتساخ واجهات زجاجية بالممشى", desc: "اتساخ الزجاج أو واجهات الممر الرئيسي بما يؤثر على تجربة العميل البصرية", type: "cleanliness", priority: "medium", location: "customer-journey" },
      { label: "توقف سلم متحرك / مصعد زوار", desc: "توقف السلم المتحرك (Escalator) أو مصعد الزوار في مسار حركة العملاء", type: "maintenance", priority: "urgent", location: "customer-journey" },
      { label: "مشكلة في الصوت / الموسيقى", desc: "انقطاع الموسيقى الداخلية (Background Music) أو تشويش في سماعات الممشى ببارك ستريت", type: "operations", priority: "normal", location: "customer-journey" },
      { label: "كشافات إنارة الممشى محروقة", desc: "احتراق كشافات إضاءة ديكورية في مسار العميل ببارك ستريت وتأثر الإضاءة العامة", type: "maintenance", priority: "medium", location: "customer-journey" },
      { label: "امتلاء سلات المهملات بالممشى", desc: "سلات المهملات في مسار الزوار ببارك ستريت ممتلئة وتحتاج تفريغ وتنظيف فوري", type: "cleanliness", priority: "urgent", location: "customer-journey" },
      { label: "مكتب الاستقبال / خدمة العملاء", desc: "عدم تواجد موظف في مكتب الاستقبال (Concierge) أو نقص مطبوعات إرشاد الزوار", type: "operations", priority: "medium", location: "mall-entrances" },
      { label: "روائح غير مرغوبة في الممر", desc: "وجود رائحة غير مرغوبة في مسار العملاء وتحتاج تشغيل المعطرات والتهوية الفورية", type: "cleanliness", priority: "urgent", location: "customer-journey" },
      { label: "كسر أو بقع في رخام الممشى", desc: "كسر أو هبوط في بلاط/رخام الممشى الرئيسي يسبب خطر تعثر للزوار في بارك ستريت", type: "maintenance", priority: "urgent", location: "customer-journey" },
    ]
  },
  {
    id: "landscape",
    title: "الزراعة واللاند سكيب",
    subtitle: "الأشجار • النخيل • المسطحات الخضراء • شبكات الري • الأحواض",
    icon: "🌿",
    color: "#22c55e",
    defaultLocation: "landscape-gardens",
    defaultTrade: "landscape",
    items: [
      { label: "جفاف أو ذبول الأشجار والنباتات", desc: "ذبول وجفاف في الأشجار أو النباتات بأحواض بارك ستريت بسبب نقص مياه الري", type: "maintenance", priority: "urgent", location: "landscape-gardens" },
      { label: "تسريب في شبكة الري / الرشاشات", desc: "كسر أو تسريب مياه في خراطيم الري بالتنقيط أو رشاشات اللاند سكيب", type: "maintenance", priority: "urgent", location: "landscape-gardens" },
      { label: "النجيلة تحتاج قص وتهذيب", desc: "ارتفاع النجيلة والمسطحات الخضراء وحاجتها للقص والتهذيب وإزالة الحشائش", type: "maintenance", priority: "medium", location: "landscape-gardens" },
      { label: "تقليم أشجار ونخيل متدلية", desc: "أفرع أشجار أو سعفيات نخيل جافة ومتدلية على مسار المشاة وتحتاج تقليم فوري", type: "maintenance", priority: "medium", location: "landscape-gardens" },
      { label: "مخلفات في أحواض الزرع (Planters)", desc: "وجود أوراق جافة ومخلفات أو أعقاب سجائر داخل أحواض الزرع والمراكن الديكورية", type: "cleanliness", priority: "medium", location: "landscape-gardens" },
      { label: "تجمع مياه ري على الممشى", desc: "خروج مياه الري الزائدة من الأحواض الزراعية وتجمعها على أرصفة وممرات المشاة", type: "operations", priority: "medium", location: "landscape-gardens" },
      { label: "آفات زراعية / حشرات بالنباتات", desc: "ظهور إصابات حشرية أو آفات زراعية على أوراق النباتات وتحتاج رش ومعالجة", type: "maintenance", priority: "medium", location: "landscape-gardens" },
      { label: "عطل إضاءة اللاند سكيب والأشجار", desc: "عطل أو كسر في كشافات الإضاءة الأرضية الموجهة على الأشجار وأحواض الزراعة", type: "maintenance", priority: "normal", location: "landscape-gardens" },
      { label: "استبدال شتلات وزهور تالفة", desc: "تلف بعض الشتلات والزهور الموسمية في أحواض الواجهة وحاجتها للاستبدال والتسميد", type: "maintenance", priority: "normal", location: "landscape-gardens" },
    ]
  },
  {
    id: "traffic-parking",
    title: "مسار السيارات بالبيزمنت",
    subtitle: "المنحدرات Ramps • البوابات • التخطيط الأرضي • المرايا • الإيبوكسي",
    icon: "🚗",
    color: "#ec4899",
    defaultLocation: "basement-car-path",
    defaultTrade: "traffic-parking",
    items: [
      { label: "عطل بوابة التذاكر / الذراع الإلكتروني", desc: "عطل في ذراع البوابة الإلكترونية (Barrier Gate) أو ماكينة التذاكر بمدخل/مخرج البيزمنت", type: "maintenance", priority: "urgent", location: "basement-car-path" },
      { label: "بهتان الأسهم والتخطيط الأرضي", desc: "بهتان الأسهم الأرضية وخطوط توجيه مسار السيارات بالبيزمنت وحاجتها لإعادة دهان", type: "maintenance", priority: "medium", location: "basement-car-path" },
      { label: "عطل اللوحات المرورية المعلقة", desc: "اللوحات الإرشادية المرورية المعلقة (الدخول / الخروج / B1 / B2) غير مضاءة أو مائلة", type: "maintenance", priority: "medium", location: "basement-car-path" },
      { label: "كسر في مطب صناعي (Speed Bump)", desc: "خلع أو كسر في أجزاء من المطب الصناعي بمسار حركة السيارات أو منحدر البيزمنت", type: "maintenance", priority: "urgent", location: "basement-car-path" },
      { label: "مرآة عاكسة (Convex Mirror) مكسورة", desc: "المرآة العاكسة المحدبة عند منحنى مسار السيارات بالبيزمنت مكسورة أو غير مضبوطة", type: "maintenance", priority: "urgent", location: "basement-car-path" },
      { label: "خلع مصدات حماية الأعمدة / العجلات", desc: "خلع أو تلف كاوتش حماية الأعمدة الخرسانية (Column Guard) أو مصدات الوقوف بالبيزمنت", type: "maintenance", priority: "medium", location: "basement-car-path" },
      { label: "تقشر إيبوكسي أو بقع زيوت بالمسار", desc: "تقشر في أرضية الإيبوكسي أو وجود بقع زيوت وإطارات في مسار السيارات بالبيزمنت", type: "cleanliness", priority: "medium", location: "basement-car-path" },
      { label: "ضعف إنارة مسار السيارات / الرامب", desc: "احتراق كشافات ليد وضعف الإضاءة في منحدر الدخول/الخروج (Ramp) أو مسار البيزمنت", type: "maintenance", priority: "urgent", location: "basement-ramps" },
      { label: "توقف مراوح سحب العادم (Jet Fans)", desc: "توقف مراوح التهوية وسحب العادم (Jet Fans) بالبيزمنت أو صدور صوت عالي منها", type: "maintenance", priority: "urgent", location: "basement-car-path" },
      { label: "إعاقة مرورية في مسار السيارات", desc: "وقوف خاطئ لسيارات أو وجود عوائق وحواجز تعيق انسيابية مسار السيارات بالبيزمنت", type: "operations", priority: "urgent", location: "basement-car-path" },
      { label: "انسداد جريليا صرف الرامب (Trench Drain)", desc: "انسداد أو كسر في غطاء جريليا تصريف المياه أسفل منحدر السيارات (Ramp) بالبيزمنت", type: "maintenance", priority: "urgent", location: "basement-ramps" },
    ]
  },
]

export const TYPES = [
  { id: "maintenance", label: "صيانة",  color: "#f59e0b" },
  { id: "operations",  label: "تشغيل", color: "#3b82f6" },
  { id: "cleanliness", label: "نظافة", color: "#10b981" },
]

export const PRIORITIES = [
  { id: "urgent", label: "عاجل",  color: "#ef4444", dot: "🔴" },
  { id: "medium", label: "متوسط", color: "#f59e0b", dot: "🟡" },
  { id: "normal", label: "عادي",  color: "#6b7280", dot: "⚪" },
]

export const STATUSES = [
  { id: "open",        label: "مفتوح",       color: "#ef4444" },
  { id: "in-progress", label: "قيد التنفيذ", color: "#f59e0b" },
  { id: "closed",      label: "مغلق",        color: "#10b981" },
]

// Lookup helpers
export const tradeOf = (id) => TRADES.find((t) => t.id === id) || TRADES.at(-1)
export const locOf   = (id) => LOCATIONS.find((l) => l.id === id) || LOCATIONS[0]
export const priOf   = (id) => PRIORITIES.find((p) => p.id === id) || PRIORITIES[2]
export const staOf   = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0]
export const typeOf  = (id) => TYPES.find((t) => t.id === id) || TYPES[0]

// Avatar
const AVATAR_COLORS = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#06b6d4"]
export const avatarColor = (n = "م") =>
  AVATAR_COLORS[(n.charCodeAt(0) || 0) % AVATAR_COLORS.length]

export const genId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function formatDate(ts) {
  if (!ts) return "—";
  try {
    if (typeof ts.toDate === "function") return ts.toDate().toLocaleString("ar-EG");
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString("ar-EG");
    const d = new Date(ts);
    return isNaN(d) ? "—" : d.toLocaleString("ar-EG");
  } catch(e) {
    return "—";
  }
}

export const STORAGE_KEY = "snag-list-v2"

export const DEFAULT_FORM = {
  inspector: "مشرف التشغيل",
  location:  LOCATIONS[0].id,
  description: "",
  trade:    "general",
  priority: "medium",
  type:     "maintenance",
  status:   "open",
}
