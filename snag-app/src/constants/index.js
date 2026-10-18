export const LOCATIONS = [
  { id: "service-elevators",   name: "مصاعد الخدمات",   icon: "🛗" },
  { id: "plaza",               name: "البلازا",          icon: "🏛️" },
  { id: "bathrooms",           name: "الحمامات",         icon: "🚻" },
  { id: "passenger-elevators", name: "مصاعد الركاب",    icon: "🛗" },
  { id: "service-corridors",   name: "طرق الخدمات",     icon: "🚧" },
  { id: "building-corridors",  name: "ممرات المبنى",    icon: "🏢" },
  { id: "roof",                name: "السطح",            icon: "🏗️" },
  { id: "emergency-stairs",    name: "سلم الطوارئ",     icon: "🚪" },
  { id: "garage-b1",           name: "جراج بيزمنت 1",   icon: "🅿️" },
  { id: "garage-b2",           name: "جراج بيزمنت 2",   icon: "🅿️" },
  { id: "electrical-rooms",    name: "غرف الكهرباء",    icon: "🔌" },
]

export const TRADES = [
  { id: "electrical",  label: "كهرباء",          icon: "⚡", color: "#fbbf24" },
  { id: "ac",          label: "تكييف وتهوية",    icon: "❄️", color: "#38bdf8" },
  { id: "plumbing",    label: "سباكة",            icon: "🔧", color: "#34d399" },
  { id: "carpentry",   label: "نجارة",            icon: "🪵", color: "#a78bfa" },
  { id: "painting",    label: "دهانات",           icon: "🎨", color: "#f472b6" },
  { id: "restoration", label: "ترميمات",          icon: "🏗️", color: "#fb923c" },
  { id: "gypsum",      label: "جبس بورد",         icon: "📦", color: "#94a3b8" },
  { id: "walls",       label: "حوائط وبلاط",     icon: "🧱", color: "#d97706" },
  { id: "fire",        label: "أنظمة إطفاء",     icon: "🔥", color: "#ef4444" },
  { id: "security",    label: "أمن ومراقبة",     icon: "📹", color: "#8b5cf6" },
  { id: "civil",       label: "أعمال مدنية",     icon: "🏛️", color: "#64748b" },
  { id: "cleanliness", label: "نظافة ومكافحة حشرات", icon: "🧹", color: "#10b981" },
  { id: "landscape",   label: "لاند سكيب",        icon: "🌿", color: "#22c55e" },
  { id: "general",     label: "أعمال عامة",      icon: "🔩", color: "#6b7280" },
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
