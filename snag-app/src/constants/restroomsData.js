/**
 * بيانات وهيكل مركز متابعة الحمامات (RESTROOM SNAG)
 * مطابق تماماً لشيت الفحص الفني وحصر الأصول (50 حمام × 29 مكون)
 */

export const RESTROOM_ZONES = [
  "مبنى 1",
  "مبنى 2",
  "مبنى 3",
  "البلازا",
  "LMD",
  "المسجد",
]

export const RESTROOM_GENDERS = [
  { id: "حريمي", label: "حريمي", icon: "🚺", color: "#ec4899" },
  { id: "رجالي", label: "رجالي", icon: "🚹", color: "#3b82f6" },
  { id: "ذوي الهمم", label: "ذوي الهمم", icon: "♿", color: "#10b981" },
  { id: "غرفة خدمات النظافة", label: "غرفة عمال النظافة (Janitor)", icon: "🧹", color: "#8b5cf6" },
]

export const RESTROOM_TRADES = [
  { id: "الكهرباء", label: "الكهرباء", icon: "⚡", color: "#fbbf24", snagTrade: "electrical" },
  { id: "التهوية", label: "التهوية", icon: "❄️", color: "#38bdf8", snagTrade: "ac" },
  { id: "السباكة", label: "السباكة", icon: "🔧", color: "#34d399", snagTrade: "plumbing" },
  { id: "التجهيزات", label: "التجهيزات", icon: "🪞", color: "#a78bfa", snagTrade: "carpentry" },
  { id: "الأعمال المدنية", label: "الأعمال المدنية", icon: "🧱", color: "#fb923c", snagTrade: "civil" },
  { id: "السلامة والإتاحة", label: "السلامة والإتاحة", icon: "♿", color: "#10b981", snagTrade: "general" },
]

/**
 * الـ 29 مكون القياسي لكل حمام بالترتيب المعتمد في الشيت
 */
export const STANDARD_COMPONENTS = [
  { code: "elec_spots",      trade: "الكهرباء",         component: "سبوتات السقف",            inspectType: "عدد" },
  { code: "elec_switches",   trade: "الكهرباء",         component: "مفاتيح الكهرباء",         inspectType: "عدد" },
  { code: "elec_sockets",    trade: "الكهرباء",         component: "المقابس الكهربائية",      inspectType: "عدد" },
  { code: "elec_emergency",  trade: "الكهرباء",         component: "كشافات الطوارئ",          inspectType: "عدد" },
  { code: "vent_fans",       trade: "التهوية",          component: "شفاطات التهوية",          inspectType: "عدد" },
  { code: "civil_riser",     trade: "الأعمال المدنية",  component: "أبواب الرايزر",           inspectType: "عدد" },
  { code: "plumb_toilets",   trade: "السباكة",          component: "قواعد الحمام",            inspectType: "عدد" },
  { code: "plumb_flushes",   trade: "السباكة",          component: "سيفونات / صناديق الطرد",  inspectType: "عدد" },
  { code: "plumb_shattaf",   trade: "السباكة",          component: "شطافات الحمام",           inspectType: "عدد" },
  { code: "plumb_sinks",     trade: "السباكة",          component: "أحواض غسيل الأيدي",       inspectType: "عدد" },
  { code: "plumb_mixers",    trade: "السباكة",          component: "خلاطات / حنفيات الأحواض", inspectType: "عدد" },
  { code: "plumb_drains",    trade: "السباكة",          component: "مصارف الأرضية",           inspectType: "عدد" },
  { code: "plumb_leaks",     trade: "السباكة",          component: "تسريب مياه / مواسير",     inspectType: "حالة" },
  { code: "fix_mirrors",     trade: "التجهيزات",        component: "المرايا",                 inspectType: "عدد" },
  { code: "fix_roll_holder", trade: "التجهيزات",        component: "حوامل بكر المناديل",      inspectType: "عدد" },
  { code: "fix_pull_tissue", trade: "التجهيزات",        component: "موزعات مناديل السحب",     inspectType: "عدد" },
  { code: "fix_soap",        trade: "التجهيزات",        component: "موزعات الصابون",          inspectType: "عدد" },
  { code: "fix_dryers",      trade: "التجهيزات",        component: "مجففات الأيدي",           inspectType: "عدد" },
  { code: "fix_small_bins",  trade: "التجهيزات",        component: "سلال المهملات الصغيرة",   inspectType: "عدد" },
  { code: "fix_large_bins",  trade: "التجهيزات",        component: "سلال المهملات الكبيرة",   inspectType: "عدد" },
  { code: "civil_main_door", trade: "الأعمال المدنية",  component: "أبواب الحمام",            inspectType: "عدد" },
  { code: "civil_cab_doors", trade: "الأعمال المدنية",  component: "أبواب الكبائن",           inspectType: "عدد" },
  { code: "civil_locks",     trade: "الأعمال المدنية",  component: "أقفال ومفصلات الكبائن",   inspectType: "عدد" },
  { code: "civil_partitions",trade: "الأعمال المدنية",  component: "فواصل الكبائن",           inspectType: "حالة" },
  { code: "civil_ceiling",   trade: "الأعمال المدنية",  component: "السقف",                   inspectType: "حالة" },
  { code: "civil_floors",    trade: "الأعمال المدنية",  component: "الأرضيات والسيراميك",     inspectType: "حالة" },
  { code: "civil_walls",     trade: "الأعمال المدنية",  component: "الحوائط والدهانات",       inspectType: "حالة" },
  { code: "safe_accessible", trade: "السلامة والإتاحة", component: "تجهيزات ذوي الهمم",       inspectType: "حالة" },
  { code: "safe_signs",      trade: "السلامة والإتاحة", component: "لوحات الإرشاد",           inspectType: "عدد" },
]

/**
 * بنود فحص وتجهيزات غرفة خدمات عمال النظافة (Janitor Room)
 * تشمل كافة عناصر الغرفة الفنية: كهرباء، تهوية، سباكة، تشطيبات، تجهيزات وتخزين
 */
export const JANITOR_COMPONENTS = [
  { code: "jan_elec_spots",     trade: "الكهرباء",         component: "سبوتات وكشافات الإنارة وكشاف الطوارئ", inspectType: "عدد" },
  { code: "jan_elec_switches",  trade: "الكهرباء",         component: "مفاتيح تشغيل الإنارة",                 inspectType: "عدد" },
  { code: "jan_elec_sockets",   trade: "الكهرباء",         component: "مكابس وأفياش الكهرباء (لماكينات النظافة)", inspectType: "عدد" },
  { code: "jan_vent_fan",       trade: "التهوية",          component: "التهوية / شفاط سحب الهواء الميكانيكي", inspectType: "عدد" },
  { code: "jan_ceiling_status", trade: "الأعمال المدنية",  component: "السقف (معلق / خرسانة بدون سقف)",         inspectType: "حالة" },
  { code: "jan_floor_tiles",    trade: "الأعمال المدنية",  component: "الأرضيات والسيراميك وصفاية الصرف (Drain)",inspectType: "حالة" },
  { code: "jan_walls_paint",    trade: "الأعمال المدنية",  component: "الحوائط والدهانات ومقاومة الرطوبة والعفن", inspectType: "حالة" },
  { code: "jan_door_lock",      trade: "الأعمال المدنية",  component: "باب الغرفة والمفصلات والكالون والمقبض",     inspectType: "عدد" },
  { code: "jan_plumb_mopsink",  trade: "السباكة",          component: "حوض خدمة النظافة الأرضي (Mop Sink)",     inspectType: "عدد" },
  { code: "jan_plumb_mixer",    trade: "السباكة",          component: "خلاط / حنفية وشطاف حوض الخدمة",          inspectType: "عدد" },
  { code: "jan_plumb_leaks",    trade: "السباكة",          component: "مواسير التغذية والصرف وخلو التسريب",      inspectType: "حالة" },
  { code: "jan_storage_shelves",trade: "التجهيزات",        component: "أرفف التخزين وتنظيم أدوات والبراميل",     inspectType: "حالة" },
  { code: "jan_clean_hygiene",  trade: "التجهيزات",        component: "النظافة العامة وخلو الروائح والحشرات",   inspectType: "حالة" },
  { code: "jan_fire_safety",    trade: "السلامة والإتاحة", component: "كاشف الحريق وطفاية الحريق بالغرفة",      inspectType: "عدد" },
]

/**
 * دليل مواقع الحمامات الـ 50 من واقع الشيت
 */
export const RESTROOM_LOCATIONS = [
  // مبنى 1 — اتجاه راميدا
  { restroomKey: "b1_rameda_f2_f", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 2", gender: "حريمي" },
  { restroomKey: "b1_rameda_f2_m", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 2", gender: "رجالي" },
  { restroomKey: "b1_rameda_f3_f", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 3", gender: "حريمي" },
  { restroomKey: "b1_rameda_f3_m", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 3", gender: "رجالي" },
  { restroomKey: "b1_rameda_f4_f", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 4", gender: "حريمي" },
  { restroomKey: "b1_rameda_f4_m", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 4", gender: "رجالي" },

  // مبنى 1 — Sky القديمة / Art of form
  { restroomKey: "b1_sky_f1_f", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 1", gender: "حريمي" },
  { restroomKey: "b1_sky_f1_m", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 1", gender: "رجالي" },
  { restroomKey: "b1_sky_f2_f", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 2", gender: "حريمي" },
  { restroomKey: "b1_sky_f2_m", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 2", gender: "رجالي" },
  { restroomKey: "b1_sky_f3_f", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 3", gender: "حريمي" },
  { restroomKey: "b1_sky_f3_m", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 3", gender: "رجالي" },
  { restroomKey: "b1_sky_f4_f", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 4", gender: "حريمي" },
  { restroomKey: "b1_sky_f4_m", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 4", gender: "رجالي" },
  { restroomKey: "b1_sky_f6_f", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 6", gender: "حريمي" },
  { restroomKey: "b1_sky_f6_m", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 6", gender: "رجالي" },

  // مبنى 2 — اتجاه العيادات
  { restroomKey: "b2_clinics_f2_f", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 2", gender: "حريمي" },
  { restroomKey: "b2_clinics_f2_m", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 2", gender: "رجالي" },
  { restroomKey: "b2_clinics_f3_f", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 3", gender: "حريمي" },
  { restroomKey: "b2_clinics_f3_m", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 3", gender: "رجالي" },
  { restroomKey: "b2_clinics_f4_f", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 4", gender: "حريمي" },
  { restroomKey: "b2_clinics_f4_m", building: "مبنى 2", direction: "اتجاه العيادات", floor: "الدور 4", gender: "رجالي" },

  // مبنى 2 — اتجاه المكاتب
  { restroomKey: "b2_offices_f2_f", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 2", gender: "حريمي" },
  { restroomKey: "b2_offices_f2_m", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 2", gender: "رجالي" },
  { restroomKey: "b2_offices_f3_f", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 3", gender: "حريمي" },
  { restroomKey: "b2_offices_f3_m", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 3", gender: "رجالي" },
  { restroomKey: "b2_offices_f4_f", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 4", gender: "حريمي" },
  { restroomKey: "b2_offices_f4_m", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 4", gender: "رجالي" },
  { restroomKey: "b2_offices_f5_f", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 5", gender: "حريمي" },
  { restroomKey: "b2_offices_f5_m", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 5", gender: "رجالي" },
  { restroomKey: "b2_offices_f6_f", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 6", gender: "حريمي" },
  { restroomKey: "b2_offices_f6_m", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 6", gender: "رجالي" },

  // مبنى 3
  { restroomKey: "b3_prayer_f",  building: "مبنى 3", direction: "المصلى",            floor: "المصلى",  gender: "حريمي" },
  { restroomKey: "b3_prayer_m",  building: "مبنى 3", direction: "المصلى",            floor: "المصلى",  gender: "رجالي" },
  { restroomKey: "b3_richard_f1_f", building: "مبنى 3", direction: "ريتشارد",        floor: "الدور 1", gender: "حريمي" },
  { restroomKey: "b3_richard_f1_m", building: "مبنى 3", direction: "ريتشارد",        floor: "الدور 1", gender: "رجالي" },
  { restroomKey: "b3_arabbank_f1_f", building: "مبنى 3", direction: "ناحية البنك العربي", floor: "الدور 1", gender: "حريمي" },
  { restroomKey: "b3_arabbank_f1_m", building: "مبنى 3", direction: "ناحية البنك العربي", floor: "الدور 1", gender: "رجالي" },
  { restroomKey: "b3_ayman_f3_f", building: "مبنى 3", direction: "ناحية مستر ايمن",  floor: "الدور 3", gender: "حريمي" },
  { restroomKey: "b3_ayman_f3_m", building: "مبنى 3", direction: "ناحية مستر ايمن",  floor: "الدور 3", gender: "رجالي" },

  // البلازا
  { restroomKey: "plaza_p1_m", building: "البلازا", direction: "بلازا 1", floor: "غير محدد", gender: "رجالي" },
  { restroomKey: "plaza_p1_f", building: "البلازا", direction: "بلازا 1", floor: "غير محدد", gender: "حريمي" },
  { restroomKey: "plaza_p1_a", building: "البلازا", direction: "بلازا 1", floor: "غير محدد", gender: "ذوي الهمم" },
  { restroomKey: "plaza_p3_m", building: "البلازا", direction: "بلازا 3", floor: "غير محدد", gender: "رجالي" },
  { restroomKey: "plaza_p3_f", building: "البلازا", direction: "بلازا 3", floor: "غير محدد", gender: "حريمي" },
  { restroomKey: "plaza_p3_a", building: "البلازا", direction: "بلازا 3", floor: "غير محدد", gender: "ذوي الهمم" },

  // LMD
  { restroomKey: "lmd_main_m", building: "LMD", direction: "حمامات LMD", floor: "غير محدد", gender: "رجالي" },
  { restroomKey: "lmd_main_f", building: "LMD", direction: "حمامات LMD", floor: "غير محدد", gender: "حريمي" },

  // المسجد
  { restroomKey: "mosque_main_m", building: "المسجد", direction: "حمامات المسجد", floor: "غير محدد", gender: "رجالي" },
  { restroomKey: "mosque_main_f", building: "المسجد", direction: "حمامات المسجد", floor: "غير محدد", gender: "حريمي" },

  // ══════════════════════════════════════════════════════════════════════════
  // غرف خدمات عمال النظافة (Janitor Rooms) — تابعة للمنظومة خارج الحمامات
  // في كل مبنى غرفتان على كل جانب، عدا مبنى 2 ناحية المكاتب فقط
  // ══════════════════════════════════════════════════════════════════════════
  // مبنى 1 — اتجاه راميدا (2 غرفة)
  { restroomKey: "b1_rameda_janitor_1", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 2", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 1" },
  { restroomKey: "b1_rameda_janitor_2", building: "مبنى 1", direction: "اتجاه راميدا", floor: "الدور 4", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 2" },

  // مبنى 1 — Sky القديمة / Art of form (2 غرفة)
  { restroomKey: "b1_sky_janitor_1", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 2", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 1" },
  { restroomKey: "b1_sky_janitor_2", building: "مبنى 1", direction: "Sky القديمة / Art of form", floor: "الدور 4", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 2" },

  // مبنى 2 — اتجاه المكاتب فقط (2 غرفة) [مبنى 2 مستثنى اتجاه العيادات]
  { restroomKey: "b2_offices_janitor_1", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 2", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 1" },
  { restroomKey: "b2_offices_janitor_2", building: "مبنى 2", direction: "اتجاه المكاتب", floor: "الدور 4", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 2" },

  // مبنى 3 — ريتشارد و البنك العربي (2 غرفة)
  { restroomKey: "b3_richard_janitor_1", building: "مبنى 3", direction: "ريتشارد", floor: "الدور 1", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 1" },
  { restroomKey: "b3_arabbank_janitor_2", building: "مبنى 3", direction: "ناحية البنك العربي", floor: "الدور 1", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 2" },

  // مبنى 3 — ناحية مستر ايمن و المصلى (2 غرفة)
  { restroomKey: "b3_ayman_janitor_1", building: "مبنى 3", direction: "ناحية مستر ايمن", floor: "الدور 3", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 1" },
  { restroomKey: "b3_prayer_janitor_2", building: "مبنى 3", direction: "المصلى", floor: "المصلى", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة 2" },

  // البلازا والمسجد
  { restroomKey: "plaza_p1_janitor", building: "البلازا", direction: "بلازا 1", floor: "غير محدد", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة" },
  { restroomKey: "plaza_p3_janitor", building: "البلازا", direction: "بلازا 3", floor: "غير محدد", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة" },
  { restroomKey: "mosque_janitor", building: "المسجد", direction: "حمامات المسجد", floor: "غير محدد", gender: "غرفة خدمات النظافة", label: "غرفة عمال النظافة" },
]

/**
 * توليد الصفوف القياسية الكاملة مع دمج أي بيانات محفوظة في Firestore
 */
export function buildRestroomRows(savedMap = {}, customRows = []) {
  const rows = []
  for (const loc of RESTROOM_LOCATIONS) {
    const compList = loc.gender === "غرفة خدمات النظافة" ? JANITOR_COMPONENTS : STANDARD_COMPONENTS
    for (const comp of compList) {
      const rowId = `${loc.restroomKey}__${comp.code}`
      const saved = savedMap[rowId] || {}
      rows.push({
        id: rowId,
        restroomKey: loc.restroomKey,
        building: loc.building,
        direction: loc.direction,
        floor: loc.floor,
        gender: loc.gender,
        isJanitor: loc.gender === "غرفة خدمات النظافة",
        trade: comp.trade,
        component: comp.component,
        inspectType: comp.inspectType,
        totalCount: saved.totalCount ?? "",
        workingCount: saved.workingCount ?? "",
        defectiveCount: saved.defectiveCount ?? "",
        missingCount: saved.missingCount ?? "",
        conditionStatus: saved.conditionStatus ?? "", // للمكونات من نوع "حالة": "سليم" | "عطل" | "متوسط" | ""
        notes: saved.notes ?? "",
        inspectDate: saved.inspectDate ?? "",
        inspector: saved.inspector ?? "",
        actionRequired: saved.actionRequired ?? "",
        photos: saved.photos || [],
        confirmed: saved.confirmed ?? false,
        linkedSnagId: saved.linkedSnagId || null,
        updatedAt: saved.updatedAt || null,
      })
    }
  }
  return [...rows, ...customRows]
}

/**
 * تحديد حالة الصف اللونية:
 * - "defect"  (أحمر): يوجد معطل > 0 أو ناقص > 0 أو حالة = "عطل"
 * - "ok"      (أخضر): تم الفحص ولا يوجد أعطال أو نواقص (أو حالة = "سليم")
 * - "pending" (أصفر): إدخال مطلوب (لم يتم الفحص بعد)
 */
export function getRowHealth(row) {
  const def = Number(row.defectiveCount) || 0
  const mis = Number(row.missingCount) || 0
  const tot = row.totalCount !== "" && row.totalCount !== null && row.totalCount !== undefined ? Number(row.totalCount) : null
  const wrk = row.workingCount !== "" && row.workingCount !== null && row.workingCount !== undefined ? Number(row.workingCount) : null

  if (row.inspectType === "حالة") {
    if (row.conditionStatus === "عطل" || def > 0 || mis > 0) return "defect"
    if (row.conditionStatus === "سليم" || (wrk !== null && wrk > 0 && def === 0 && mis === 0)) return "ok"
    if (row.notes && row.notes.trim()) return "defect"
    return "pending"
  }

  if (def > 0 || mis > 0 || row.conditionStatus === "عطل") return "defect"
  if ((tot !== null && tot >= 0 && wrk !== null) || (wrk !== null && wrk > 0) || row.conditionStatus === "سليم") {
    return "ok"
  }
  return "pending"
}
