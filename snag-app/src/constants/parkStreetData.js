// ══════════════════════════════════════════════════════════════════════════════
// 🌟 قطاعات الفحص الشامل — مول بارك ستريت (Park St. Mall)
// 1. الأمن والحراسة والمراقبة (Security)
// 2. رحلة العميل داخل بارك ستريت (Customer Journey)
// 3. الزراعة واللاند سكيب (Landscaping & Agriculture)
// 4. مسار السيارات بالبيزمنت (Basement Car Path B1 & B2)
// ══════════════════════════════════════════════════════════════════════════════

export const PARK_SECTORS = [
  {
    id: "security",
    name: "الأمن والحراسة والمراقبة",
    enName: "SECURITY & SURVEILLANCE",
    icon: "🛡️",
    color: "#8b5cf6",
    bgGrad: "linear-gradient(135deg, #2e1065, #4c1d95)",
    locationId: "security-points",
    tradeId: "security",
    zones: [
      {
        id: "sec-gates",
        title: "بوابات الدخول ونقاط التفتيش الأمني",
        code: "SEC-01",
        items: [
          { id: "guard-presence", name: "تواجد أفراد الأمن في نقاط التمركز المحددة", category: "حراسة" },
          { id: "guard-uniform", name: "التزام أفراد الأمن بالزي الرسمي (اليونيفورم) والمظهر اللائق", category: "انضباط" },
          { id: "walkthrough-gate", name: "كفاءة بوابات الكشف عن المعادن وأجهزة التفتيش اليدوية", category: "أجهزة أمنية" },
          { id: "security-barriers", name: "سلامة وتنظيم الحواجز الأمنية وكردونات التوجيه بالمداخل", category: "تنظيم" },
          { id: "visitor-handling", name: "أسلوب استقبال وتوجيه الزوار والتعامل الاحترافي عند البوابات", category: "خدمة أمنية" },
        ]
      },
      {
        id: "sec-cctv",
        title: "كاميرات المراقبة وغرفة التحكم (CCTV & Control Room)",
        code: "SEC-02",
        items: [
          { id: "cctv-operation", name: "عمل جميع كاميرات المراقبة الداخلية والخارجية بكفاءة", category: "كاميرات CCTV" },
          { id: "cctv-angles", name: "وضوح الرؤية ونظافة عدسات الكاميرات وعدم وجود عوائق أو نقاط عمياء", category: "كاميرات CCTV" },
          { id: "nvr-recording", name: "انتظام التسجيل على أجهزة NVR/DVR وشاشات غرفة التحكم", category: "غرفة التحكم" },
          { id: "radio-intercom", name: "كفاءة أجهزة اللاسلكي والإنتركم والتواصل بين النقاط وغرفة التحكم", category: "اتصالات" },
        ]
      },
      {
        id: "sec-corridors",
        title: "تأمين الممرات الخلفية وأبواب الطوارئ والتصاريح",
        code: "SEC-03",
        items: [
          { id: "emergency-doors", name: "إغلاق وتأمين أبواب الهروب والطوارئ وسلامة الأقفال المغناطيسية", category: "أبواب طوارئ" },
          { id: "work-permits", name: "التحقق من تصاريح العمل ودخول المقاولين والموردين في المواعيد المحددة", category: "تصاريح" },
          { id: "patrol-rounds", name: "انتظام الدوريات الأمنية الراجلة داخل المول وفي الممرات الخلفية", category: "دوريات" },
          { id: "perimeter-light", name: "كفاءة الإضاءة الأمنية المحيطة بالمول والأسوار الخارجية", category: "إضاءة أمنية" },
        ]
      }
    ]
  },
  {
    id: "customer-journey",
    name: "رحلة العميل — بارك ستريت",
    enName: "PARK ST. CUSTOMER JOURNEY",
    icon: "🚶‍♂️",
    color: "#06b6d4",
    bgGrad: "linear-gradient(135deg, #083344, #0e7490)",
    locationId: "customer-journey",
    tradeId: "customer-journey",
    zones: [
      {
        id: "cj-arrival",
        title: "المداخل الرئيسية ومنطقة الاستقبال (Arrival & Welcome)",
        code: "CJ-01",
        items: [
          { id: "entrance-clean", name: "نظافة ولمعان أبواب ومداخل بارك ستريت والزجاج الرئيسي", category: "نظافة ومظهر" },
          { id: "reception-desk", name: "جاهزية مكتب الاستقبال / خدمة العملاء (Concierge) وتواجد الموظف", category: "خدمة العملاء" },
          { id: "wayfinding-main", name: "وضوح وإضاءة اللوحات الإرشادية وخرائط توجيه الزوار (Wayfinding)", category: "لوحات إرشادية" },
          { id: "entrance-mat", name: "نظافة وسلامة مشايات المداخل وأرضيات منطقة الاستقبال", category: "أرضيات" },
        ]
      },
      {
        id: "cj-promenade",
        title: "الممشى الرئيسي والبلازا وتجربة التجول (Main Promenade & Plaza)",
        code: "CJ-02",
        items: [
          { id: "walkway-clear", name: "خلو مسار المشاة من أي عوائق أو تشوينات أو معدات صيانة", category: "مسار العميل" },
          { id: "marble-interlock", name: "سلامة ونظافة رخام وانترلوك الممشى وعدم وجود كسر أو هبوط يسبب تعثر", category: "أرضيات" },
          { id: "seating-benches", name: "نظافة وسلامة مقاعد واستراحات الزوار (Seating Areas) في بارك ستريت", category: "استراحات" },
          { id: "trash-bins", name: "نظافة وتفريغ سلات المهملات الديكورية وتوزيعها في مسار العميل", category: "نظافة" },
          { id: "storefronts", name: "نظافة واجهات المحلات التجارية والزجاج والإعلانات المضيئة", category: "واجهات" },
        ]
      },
      {
        id: "cj-ambiance",
        title: "الحركة الرأسية والأجواء العامة (Escalators, Elevators & Ambiance)",
        code: "CJ-03",
        items: [
          { id: "escalators-lifts", name: "كفاءة ونظافة السلالم المتحركة (Escalators) ومصاعد الزوار", category: "مصاعد وسلالم" },
          { id: "promenade-light", name: "كفاءة الإضاءة الديكورية وكشافات الممشى العام في بارك ستريت", category: "إضاءة" },
          { id: "sound-music", name: "جودة ومستوى صوت الموسيقى الداخلية (Background Music) والسماعات", category: "صوتيات" },
          { id: "scent-air", name: "جودة الهواء والتهوية والرائحة العطرية في الممرات الداخلية", category: "أجواء وتكييف" },
        ]
      }
    ]
  },
  {
    id: "landscape",
    name: "الزراعة واللاند سكيب",
    enName: "LANDSCAPING & AGRICULTURE",
    icon: "🌿",
    color: "#22c55e",
    bgGrad: "linear-gradient(135deg, #052e16, #15803d)",
    locationId: "landscape-gardens",
    tradeId: "landscape",
    zones: [
      {
        id: "land-trees",
        title: "الأشجار والنخيل والمسطحات الخضراء (Trees, Palms & Turf)",
        code: "LND-01",
        items: [
          { id: "trees-vitality", name: "حيوية ونضارة الأشجار والنباتات وعدم وجود جفاف أو ذبول", category: "أشجار ونباتات" },
          { id: "palms-pruning", name: "تقليم وتهذيب الأشجار والنخيل وإزالة الأفرع والسعفيات الجافة", category: "تقليم" },
          { id: "grass-mowing", name: "قص وتهذيب النجيلة والمسطحات الخضراء وخلوها من الحشائش الضارة", category: "مسطحات خضراء" },
          { id: "seasonal-flowers", name: "جودة وتنسيق الزهور الموسمية والشتلات في الواجهات والبلازا", category: "زهور وشتلات" },
        ]
      },
      {
        id: "land-planters",
        title: "أحواض الزرع والمراكن الديكورية (Planters & Indoor/Outdoor Pots)",
        code: "LND-02",
        items: [
          { id: "planters-clean", name: "نظافة أحواض الزرع والمراكن (Planters) من الأوراق الجافة والقمامة وأعقاب السجائر", category: "نظافة أحواض" },
          { id: "planters-body", name: "سلامة جسم الأحواض والمراكن الديكورية ودهاناتها وعدم وجود شروخ", category: "صيانة أحواض" },
          { id: "soil-fertilizer", name: "مستوى التربة والتسميد والاهتمام بالنباتات الداخلية والخارجية", category: "تسميد وعناية" },
          { id: "pest-disease", name: "خلو النباتات والأشجار من الآفات الزراعية والحشرات والفطريات", category: "مكافحة آفات" },
        ]
      },
      {
        id: "land-irrigation",
        title: "شبكات الري والإضاءة الزراعية والنوافير (Irrigation & Features)",
        code: "LND-03",
        items: [
          { id: "irrigation-pipes", name: "سلامة شبكة الري وخراطيم التنقيط والرشاشات وعدم وجود كسر أو تسريب", category: "شبكة الري" },
          { id: "no-water-overflow", name: "عدم خروج أو تجمع مياه الري على ممرات المشاة والأرصفة", category: "تشغيل الري" },
          { id: "landscape-lights", name: "كفاءة وسلامة كشافات الإضاءة الأرضية الموجهة على الأشجار والأحواض", category: "إضاءة زراعية" },
          { id: "water-fountains", name: "نظافة وتشغيل النوافير والمسطحات المائية ببارك ستريت", category: "نوافير" },
        ]
      }
    ]
  },
  {
    id: "traffic-parking",
    name: "مسار السيارات بالبيزمنت",
    enName: "BASEMENT CAR PATH (B1 & B2)",
    icon: "🚗",
    color: "#ec4899",
    bgGrad: "linear-gradient(135deg, #500724, #9d174d)",
    locationId: "basement-car-path",
    tradeId: "traffic-parking",
    zones: [
      {
        id: "car-ramps-gates",
        title: "منحدرات الدخول والخروج والبوابات الإلكترونية (Ramps & Barriers)",
        code: "CAR-01",
        items: [
          { id: "barrier-gates", name: "كفاءة عمل الأذرع الإلكترونية (Barrier Gates) وماكينات التذاكر بالدخول والخروج", category: "بوابات إلكترونية" },
          { id: "ramp-surface", name: "سلامة ونظافة أرضية منحدر الدخول والخروج (Ramp) وخشونة السطح لمنع الانزلاق", category: "منحدرات Ramps" },
          { id: "ramp-trench", name: "نظافة وسلامة أغطية جريليات تصريف المياه أسفل المنحدرات (Trench Drain)", category: "صرف الرامب" },
          { id: "height-bar", name: "سلامة عارضة محدد الارتفاع (Height Limit Bar) واللوحات التحذيرية بمدخل البيزمنت", category: "لوحات تحذيرية" },
        ]
      },
      {
        id: "car-lanes-safety",
        title: "مسار الحركة واللوحات المرورية ووسائل الأمان (Driveway & Traffic Safety)",
        code: "CAR-02",
        items: [
          { id: "floor-arrows", name: "وضوح الأسهم الأرضية وخطوط تقسيم الحارات وأرقام الباكيات بالبيزمنت", category: "تخطيط أرضي" },
          { id: "overhead-signs", name: "إضاءة وثبات اللوحات المرورية المعلقة (الدخول / الخروج / B1 / B2 / المصاعد)", category: "لوحات مرورية" },
          { id: "speed-bumps", name: "سلامة وتثبيت المطبات الصناعية (Speed Bumps) وعيون القطط في مسار السيارات", category: "مطبات" },
          { id: "convex-mirrors", name: "سلامة ونظافة وضبط زاوية المرايا العاكسة المحدبة (Convex Mirrors) عند المنحنيات", category: "مرايا عاكسة" },
          { id: "column-guards", name: "سلامة كاوتش حماية الأعمدة الخرسانية (Column Guards) ومصدات العجلات (Wheel Stoppers)", category: "حماية أعمدة" },
        ]
      },
      {
        id: "car-epoxy-mep",
        title: "أرضيات الإيبوكسي والإنارة والتهوية وانسيابية المسار (Epoxy, Lighting & Jet Fans)",
        code: "CAR-03",
        items: [
          { id: "epoxy-floor", name: "سلامة ونظافة أرضيات الإيبوكسي (Epoxy) وخلو المسار من الزيوت أو التقشر", category: "إيبوكسي ونظافة" },
          { id: "basement-lighting", name: "كفاءة كشافات الإنارة في مسار السيارات والمنحدرات وعدم وجود لمبات محروقة", category: "إنارة البيزمنت" },
          { id: "jet-fans", name: "كفاءة عمل مراوح التهوية وسحب العادم (Jet Fans) بالبيزمنت بدون أصوات غير طبيعية", category: "تهوية Jet Fans" },
          { id: "traffic-flow", name: "انسيابية مسار السيارات وخلوه من الوقوف الخاطئ أو الحواجز العشوائية", category: "تنظيم مروري" },
        ]
      }
    ]
  }
];

export const STATUS_META = {
  ok:      { id: "ok",      label: "سليم ✅",           color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  snag:    { id: "snag",    label: "ملاحظة / عطل 🔴",   color: "#ef4444", bg: "rgba(239,68,68,0.18)" },
  followup:{ id: "followup",label: "يحتاج متابعة 🟡",   color: "#f59e0b", bg: "rgba(245,158,11,0.16)" },
  na:      { id: "na",      label: "لم يُفحص ⚪",       color: "#64748b", bg: "rgba(100,116,139,0.12)" },
};
