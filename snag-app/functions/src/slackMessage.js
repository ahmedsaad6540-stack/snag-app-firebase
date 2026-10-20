const APP_URL = "https://snag-app-firebase.web.app"

const STATUS_LABELS = {
  open: "مفتوح",
  "in-progress": "قيد التنفيذ",
  closed: "مغلق",
}

const PRIORITY_LABELS = {
  urgent: "عاجل",
  medium: "متوسط",
  normal: "عادي",
}

const LOCATION_LABELS = {
  "customer-journey": "رحلة العميل - بارك ستريت",
  "mall-entrances": "بوابات ومداخل بارك ستريت",
  "security-points": "نقاط الأمن والبوابات والكاميرات",
  "landscape-gardens": "الزراعة والمسطحات الخضراء",
  "basement-car-path": "مسار السيارات بالبيزمنت",
  "basement-ramps": "منحدرات ومداخل البيزمنت",
  plaza: "البلازا",
  bathrooms: "الحمامات",
  "passenger-elevators": "مصاعد الركاب",
  "service-elevators": "مصاعد الخدمات",
  "building-corridors": "ممرات المبنى",
  "service-corridors": "طرق الخدمات",
  "garage-b1": "جراج بيزمنت 1",
  "garage-b2": "جراج بيزمنت 2",
  "emergency-stairs": "سلم الطوارئ",
  roof: "السطح",
  "electrical-rooms": "غرف الكهرباء",
}

const TRADE_LABELS = {
  security: "الأمن والمراقبة والحراسة",
  "customer-journey": "رحلة العميل - بارك ستريت",
  landscape: "الزراعة واللاند سكيب",
  "traffic-parking": "مسار السيارات والبيزمنت",
  electrical: "كهرباء",
  ac: "تكييف وتهوية",
  plumbing: "سباكة",
  carpentry: "نجارة",
  painting: "دهانات",
  restoration: "ترميمات",
  gypsum: "جبس بورد",
  walls: "حوائط وبلاط",
  fire: "أنظمة إطفاء",
  civil: "أعمال مدنية",
  cleanliness: "نظافة ومكافحة حشرات",
  general: "أعمال عامة",
}

function labelFor(labels, value) {
  return labels[value] || value || "غير محدد"
}

function plainText(text, maxLength = 2000) {
  return { type: "plain_text", text: String(text).slice(0, maxLength) }
}

function formatSlackMessage({ event, snagId, snag }) {
  const isNew = event === "created"
  const description = String(snag.description || "بدون وصف").slice(0, 2500)
  const details = [
    ["الحالة", labelFor(STATUS_LABELS, snag.status)],
    ["الأولوية", labelFor(PRIORITY_LABELS, snag.priority)],
    ["الموقع", labelFor(LOCATION_LABELS, snag.location)],
    ["التخصص", labelFor(TRADE_LABELS, snag.trade)],
    ["المفتش", snag.inspector || "غير محدد"],
  ]

  return {
    text: `${isNew ? "ملاحظة جديدة" : "تحديث ملاحظة"}: ${description}`,
    blocks: [
      {
        type: "header",
        text: plainText(isNew ? "📋 ملاحظة جديدة" : "🔄 تحديث ملاحظة"),
      },
      {
        type: "section",
        text: plainText(description, 3000),
      },
      {
        type: "section",
        fields: details.map(([label, value]) =>
          plainText(`${label}\n${value}`)
        ),
      },
      {
        type: "section",
        fields: [
          plainText(`رقم الملاحظة\n${snagId}`),
        ],
        accessory: {
          type: "button",
          text: plainText("فتح التطبيق"),
          url: APP_URL,
        },
      },
    ],
  }
}

module.exports = { formatSlackMessage }
