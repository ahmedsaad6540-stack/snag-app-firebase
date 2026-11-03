// ══════════════════════════════════════════════════════════════════════════════
// 🔐 GRANULAR RBAC & PERMISSIONS MATRIX SYSTEM (AR / EN)
// ══════════════════════════════════════════════════════════════════════════════

export const APP_MODULES = [
  { id: "operations", icon: "🗓️", labelAr: "خطط ومتابعة التشغيل", labelEn: "Operations Plans & Reports", descAr: "خطط متكررة ومتابعة يومية وتقارير أسبوعية وشهرية", descEn: "Recurring plans, daily execution and period reports" },
  {
    id: "snags",
    icon: "📋",
    labelAr: "سجل الملاحظات العام",
    labelEn: "General Snags Log",
    descAr: "تسجيل ومتابعة ملاحظات الصيانة والتشغيل في المول والمباني",
    descEn: "Record and track maintenance & operations snags across the mall",
  },
  {
    id: "park-street",
    icon: "🌟",
    labelAr: "سناج بارك ستريت الشامل",
    labelEn: "Park St. Comprehensive Snag",
    descAr: "الأمن والحراسة • رحلة العميل • الزراعة • مسار السيارات بالبيزمنت",
    descEn: "Security • Customer Journey • Landscape • Basement Car Path",
  },
  {
    id: "restrooms",
    icon: "🚽",
    labelAr: "مركز الحمامات وغرف النظافة",
    labelEn: "Restrooms & Janitor Rooms",
    descAr: "فحص 50 حمام + 36 غرفة خدمات نظافة (Janitor Rooms) ومكوناتها",
    descEn: "Inspect 50 restrooms + 36 janitor service rooms and components",
  },
  {
    id: "units",
    icon: "🏢",
    labelAr: "بيانات الوحدات والملاك",
    labelEn: "Units & Owners Directory",
    descAr: "دليل الوحدات الإدارية والتجارية والعيادات وأرقام التواصل",
    descEn: "Directory of offices, clinics, commercial units & contacts",
  },
  {
    id: "stores",
    icon: "📦",
    labelAr: "بيانات المخازن",
    labelEn: "Stores Directory",
    descAr: "سجل المخازن والشركات التابعة لها والمرفقات",
    descEn: "Warehouse stores registry, assigned companies & photos",
  },
  {
    id: "ai",
    icon: "🧠",
    labelAr: "مركز الذكاء والمؤشرات",
    labelEn: "AI Command Center",
    descAr: "تحليلات الذكاء الاصطناعي وتقييم المخاطر ولوحة القيادة",
    descEn: "AI analytics, risk scoring & executive insights",
  },
  {
    id: "customLists",
    icon: "📁",
    labelAr: "القوائم المخصصة",
    labelEn: "Custom Lists",
    descAr: "قوائم الفحص والبيانات المخصصة الإضافية",
    descEn: "Custom inspection lists and dynamic registries",
  },
]

export const PERMISSION_ACTIONS = [
  {
    id: "view",
    icon: "👁️",
    labelAr: "الرؤية والدخول",
    labelEn: "View & Access",
    color: "#38bdf8",
  },
  {
    id: "add",
    icon: "➕",
    labelAr: "الإدخال والإضافة",
    labelEn: "Add & Insert",
    color: "#10b981",
  },
  {
    id: "edit",
    icon: "✏️",
    labelAr: "التعديل والتحديث",
    labelEn: "Edit & Update",
    color: "#f59e0b",
  },
  {
    id: "status",
    icon: "🔄",
    labelAr: "تغيير الحالة / الاعتماد",
    labelEn: "Status & Confirm",
    color: "#a855f7",
  },
  {
    id: "delete",
    icon: "🗑️",
    labelAr: "الحذف",
    labelEn: "Delete",
    color: "#ef4444",
  },
  {
    id: "export",
    icon: "📊",
    labelAr: "التصدير والاستيراد",
    labelEn: "Export & Import",
    color: "#06b6d4",
  },
]

export const SYSTEM_PRIVILEGES = [
  {
    id: "canEditAll",
    icon: "🔓",
    labelAr: "تعديل ملاحظات كافة المستخدمين (وليس ملاحظاته فقط)",
    labelEn: "Edit records created by any user (not only own records)",
  },
  {
    id: "canManageLocations",
    icon: "📍",
    labelAr: "إضافة وحذف المواقع والقوائم المخصصة",
    labelEn: "Create & delete locations and custom lists",
  },
  {
    id: "canImport",
    icon: "📥",
    labelAr: "استيراد ملفات إكسيل (Import Excel)",
    labelEn: "Import data from Excel sheets",
  },
  {
    id: "canWipeAll",
    icon: "⚠️",
    labelAr: "المسح الشامل للبيانات (حذف الكل)",
    labelEn: "Wipe all records (bulk reset)",
  },
  {
    id: "canManageUsers",
    icon: "👥",
    labelAr: "إدارة المستخدمين وتعديل الصلاحيات",
    labelEn: "Manage users, roles & permissions matrix",
  },
]

function buildMatrix(defaultActionsByModule) {
  const matrix = {}
  for (const mod of APP_MODULES) {
    const cfg = defaultActionsByModule[mod.id] || defaultActionsByModule.default || {}
    matrix[mod.id] = {
      view:   Boolean(cfg.view),
      add:    Boolean(cfg.add),
      edit:   Boolean(cfg.edit),
      status: Boolean(cfg.status),
      delete: Boolean(cfg.delete),
      export: Boolean(cfg.export),
    }
  }
  return matrix
}

export const ROLE_PRESETS = {
  admin: {
    id: "admin",
    badgeColor: "#ef4444",
    icon: "👑",
    labelAr: "مدير نظام (صلاحيات كاملة)",
    labelEn: "System Admin (Full Access)",
    descAr: "تحكم كامل في جميع الأقسام، الإدخال، التعديل، الحذف، التصدير، وإدارة المستخدمين والصلاحيات",
    descEn: "Full control over all modules, data entry, editing, deletion, exports & user permissions",
    privileges: {
      canEditAll: true,
      canManageLocations: true,
      canImport: true,
      canWipeAll: true,
      canManageUsers: true,
    },
    matrix: buildMatrix({
      default: { view: true, add: true, edit: true, status: true, delete: true, export: true },
    }),
  },

  operations_manager: {
    id: "operations_manager",
    badgeColor: "#8b5cf6",
    icon: "🎯",
    labelAr: "مدير تشغيل (Operations Manager)",
    labelEn: "Operations Manager",
    descAr: "دخول كافة الأقسام، إضافة وتعديل وحذف واعتماد الملاحظات وتصدير التقارير بدون مسح شامل للنظام",
    descEn: "Access all modules, add, edit, delete, confirm inspections & export reports (no system wipe)",
    privileges: {
      canEditAll: true,
      canManageLocations: true,
      canImport: true,
      canWipeAll: false,
      canManageUsers: false,
    },
    matrix: buildMatrix({
      default: { view: true, add: true, edit: true, status: true, delete: true, export: true },
    }),
  },

  supervisor: {
    id: "supervisor",
    badgeColor: "#0ea5e9",
    icon: "🕵️‍♂️",
    labelAr: "مشرف فحص ميداني (Field Supervisor)",
    labelEn: "Field Inspector / Supervisor",
    descAr: "رؤية الأقسام الميدانية، إدخال الملاحظات والصور، تعديل ملاحظاته، تغيير الحالة، وتصدير التقارير (بدون حذف)",
    descEn: "View field modules, add snags & photos, edit own records, update statuses & export reports (no delete)",
    privileges: {
      canEditAll: false,
      canManageLocations: false,
      canImport: false,
      canWipeAll: false,
      canManageUsers: false,
    },
    matrix: buildMatrix({
      "operations":  { view: true, add: true, edit: true, status: true, delete: false, export: true },
      "snags":       { view: true, add: true, edit: true, status: true, delete: false, export: true },
      "park-street": { view: true, add: true, edit: true, status: true, delete: false, export: true },
      "restrooms":   { view: true, add: true, edit: true, status: true, delete: false, export: true },
      "units":       { view: true, add: false, edit: false, status: false, delete: false, export: true },
      "stores":      { view: true, add: false, edit: false, status: false, delete: false, export: true },
      "ai":          { view: true, add: false, edit: false, status: false, delete: false, export: false },
      "customLists": { view: true, add: true, edit: true, status: true, delete: false, export: true },
    }),
  },

  maintenance_tech: {
    id: "maintenance_tech",
    badgeColor: "#f59e0b",
    icon: "🔧",
    labelAr: "فني / مهندس صيانة (Maintenance Tech)",
    labelEn: "Maintenance Engineer / Tech",
    descAr: "رؤية الملاحظات والحمامات وبارك ستريت، تحديث حالة الإصلاح وإضافة ملاحظات فنية (بدون حذف أو بيانات الوحدات)",
    descEn: "View snags, Park St. & restrooms, update repair statuses and add technical notes (no delete or units access)",
    privileges: {
      canEditAll: false,
      canManageLocations: false,
      canImport: false,
      canWipeAll: false,
      canManageUsers: false,
    },
    matrix: buildMatrix({
      "snags":       { view: true, add: true, edit: false, status: true, delete: false, export: false },
      "park-street": { view: true, add: false, edit: true, status: true, delete: false, export: false },
      "restrooms":   { view: true, add: false, edit: true, status: true, delete: false, export: false },
      "units":       { view: false, add: false, edit: false, status: false, delete: false, export: false },
      "stores":      { view: false, add: false, edit: false, status: false, delete: false, export: false },
      "ai":          { view: false, add: false, edit: false, status: false, delete: false, export: false },
      "customLists": { view: true, add: false, edit: false, status: true, delete: false, export: false },
    }),
  },

  viewer: {
    id: "viewer",
    badgeColor: "#64748b",
    icon: "👁️",
    labelAr: "مشاهد / قراءة فقط (Read-Only Viewer)",
    labelEn: "Read-Only Viewer",
    descAr: "الاطلاع على كافة البيانات والمؤشرات وتصدير التقارير فقط دون صلاحية الإدخال أو التعديل أو الحذف",
    descEn: "Browse modules, dashboards and export reports only — no adding, editing, or deleting allowed",
    privileges: {
      canEditAll: false,
      canManageLocations: false,
      canImport: false,
      canWipeAll: false,
      canManageUsers: false,
    },
    matrix: buildMatrix({
      default: { view: true, add: false, edit: false, status: false, delete: false, export: true },
    }),
  },
}

// Legacy "user" role maps to supervisor by default
export function getRolePreset(roleId) {
  if (!roleId) return ROLE_PRESETS.supervisor
  if (roleId === "user") return ROLE_PRESETS.supervisor
  return ROLE_PRESETS[roleId] || ROLE_PRESETS.supervisor
}

/**
 * Resolves full effective permissions object for a user.
 * Combines role preset defaults with any custom per-user overrides stored in Firestore (`user.permissions`).
 */
export function resolveUserPermissions(user) {
  if (!user) {
    return {
      roleId: "viewer",
      preset: ROLE_PRESETS.viewer,
      privileges: { ...ROLE_PRESETS.viewer.privileges },
      matrix: JSON.parse(JSON.stringify(ROLE_PRESETS.viewer.matrix)),
      allowedTrades: "all",
    }
  }

  // Admin always has full power unless explicitly downgraded in role
  const effectiveRoleId = user.role === "admin"
    ? "admin"
    : (user.rolePreset || (user.role === "user" ? "supervisor" : user.role) || "supervisor")

  const preset = getRolePreset(effectiveRoleId)
  const custom = user.permissions || {}

  // If user is system admin, ensure they never lock themselves out of admin privileges
  if (user.role === "admin" && !custom.isCustomAdminOverride) {
    return {
      roleId: "admin",
      preset: ROLE_PRESETS.admin,
      privileges: { ...ROLE_PRESETS.admin.privileges },
      matrix: JSON.parse(JSON.stringify(ROLE_PRESETS.admin.matrix)),
      allowedTrades: "all",
    }
  }

  const privileges = {
    ...preset.privileges,
    ...(custom.privileges || {}),
  }

  const matrix = {}
  for (const mod of APP_MODULES) {
    const baseMod = preset.matrix[mod.id] || { view: true, add: false, edit: false, status: false, delete: false, export: false }
    const custMod = custom.matrix?.[mod.id] || {}
    matrix[mod.id] = {
      view:   custMod.view   !== undefined ? Boolean(custMod.view)   : baseMod.view,
      add:    custMod.add    !== undefined ? Boolean(custMod.add)    : baseMod.add,
      edit:   custMod.edit   !== undefined ? Boolean(custMod.edit)   : baseMod.edit,
      status: custMod.status !== undefined ? Boolean(custMod.status) : baseMod.status,
      delete: custMod.delete !== undefined ? Boolean(custMod.delete) : baseMod.delete,
      export: custMod.export !== undefined ? Boolean(custMod.export) : baseMod.export,
    }
    // If view is false, disable actions inside that module
    if (!matrix[mod.id].view) {
      matrix[mod.id].add = false
      matrix[mod.id].edit = false
      matrix[mod.id].status = false
      matrix[mod.id].delete = false
      matrix[mod.id].export = false
    }
  }

  return {
    roleId: effectiveRoleId,
    preset,
    privileges,
    matrix,
    allowedTrades: custom.allowedTrades || "all",
  }
}

/**
 * Check if a user can perform a specific action in a module.
 * @param {object} user - Current authenticated user object
 * @param {string} moduleId - One of APP_MODULES ids ("snags", "park-street", "restrooms", "units", "stores", "ai", "customLists")
 * @param {string} action - One of ("view", "add", "edit", "status", "delete", "export")
 */
export function canUser(user, moduleId, action = "view") {
  if (!user) return false
  if (user.role === "admin") return true
  const resolved = resolveUserPermissions(user)
  const modKey = APP_MODULES.some(m => m.id === moduleId) ? moduleId : "customLists"
  return Boolean(resolved.matrix?.[modKey]?.[action])
}

/**
 * Check if a user has a system-level privilege.
 */
export function hasPrivilege(user, privilegeKey) {
  if (!user) return false
  if (user.role === "admin") return true
  const resolved = resolveUserPermissions(user)
  return Boolean(resolved.privileges?.[privilegeKey])
}
