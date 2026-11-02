import React, { useState, useEffect, useMemo } from "react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import {
  APP_MODULES,
  PERMISSION_ACTIONS,
  SYSTEM_PRIVILEGES,
  ROLE_PRESETS,
  resolveUserPermissions,
} from "../constants/permissions.js"
import { useLanguage } from "../i18n/LanguageContext.jsx"
import toast from "react-hot-toast"

export default function UsersManager({ onClose, currentUser }) {
  const { lang, tr } = useLanguage()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmConfig, setConfirmConfig] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState("all")
  const [pendingRoleChoice, setPendingRoleChoice] = useState({})

  // Selected user for granular permissions matrix editing
  const [editingUser, setEditingUser] = useState(null)
  const [draftRolePreset, setDraftRolePreset] = useState("supervisor")
  const [draftJobTitle, setDraftJobTitle] = useState("")
  const [draftMatrix, setDraftMatrix] = useState({})
  const [draftPrivileges, setDraftPrivileges] = useState({})
  const [savingPerms, setSavingPerms] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "users"))
      const list = []
      snap.forEach((d) => {
        const data = d.data()
        if (!data.deleted) {
          list.push({ id: d.id, ...data })
        }
      })
      setUsers(list)
    } catch (err) {
      console.error("Error loading users:", err)
      toast.error(tr("حدث خطأ أثناء تحميل المستخدمين", "Failed to load users"))
    } finally {
      setLoading(false)
    }
  }

  function openPermissionsEditor(u) {
    const resolved = resolveUserPermissions(u)
    setEditingUser(u)
    setDraftRolePreset(resolved.roleId)
    setDraftJobTitle(u.jobTitle || "")
    setDraftMatrix(JSON.parse(JSON.stringify(resolved.matrix)))
    setDraftPrivileges({ ...resolved.privileges })
  }

  function applyRolePresetToDraft(presetId) {
    const preset = ROLE_PRESETS[presetId] || ROLE_PRESETS.supervisor
    setDraftRolePreset(presetId)
    setDraftMatrix(JSON.parse(JSON.stringify(preset.matrix)))
    setDraftPrivileges({ ...preset.privileges })
  }

  function toggleMatrixCell(moduleId, actionId) {
    setDraftMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[moduleId]) {
        next[moduleId] = { view: false, add: false, edit: false, status: false, delete: false, export: false }
      }
      const newVal = !next[moduleId][actionId]
      next[moduleId][actionId] = newVal

      // If turning off 'view', turn off all actions in that module
      if (actionId === "view" && !newVal) {
        next[moduleId].add = false
        next[moduleId].edit = false
        next[moduleId].status = false
        next[moduleId].delete = false
        next[moduleId].export = false
      }
      // If turning on any action, ensure 'view' is turned on
      if (actionId !== "view" && newVal) {
        next[moduleId].view = true
      }
      return next
    })
  }

  function toggleEntireRow(moduleId) {
    setDraftMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      const row = next[moduleId] || {}
      const allOn = PERMISSION_ACTIONS.every((a) => row[a.id])
      const target = !allOn
      next[moduleId] = {
        view: target,
        add: target,
        edit: target,
        status: target,
        delete: target,
        export: target,
      }
      return next
    })
  }

  function toggleEntireColumn(actionId) {
    setDraftMatrix((prev) => {
      const next = JSON.parse(JSON.stringify(prev))
      const allOn = APP_MODULES.every((m) => next[m.id]?.[actionId])
      const target = !allOn
      for (const mod of APP_MODULES) {
        if (!next[mod.id]) next[mod.id] = {}
        next[mod.id][actionId] = target
        if (actionId === "view" && !target) {
          next[mod.id].add = false
          next[mod.id].edit = false
          next[mod.id].status = false
          next[mod.id].delete = false
          next[mod.id].export = false
        }
        if (actionId !== "view" && target) {
          next[mod.id].view = true
        }
      }
      return next
    })
  }

  function togglePrivilege(privId) {
    setDraftPrivileges((prev) => ({
      ...prev,
      [privId]: !prev[privId],
    }))
  }

  async function saveUserPermissions() {
    if (!editingUser) return
    if (editingUser.id === currentUser.uid && draftRolePreset !== "admin" && !draftPrivileges.canManageUsers) {
      alert(
        tr(
          "تنبيه: لا يمكنك سحب صلاحية إدارة المستخدمين من حسابك الشخصي حتى لا تفقد التحكم في النظام!",
          "Warning: You cannot revoke User Management privilege from your own account!"
        )
      )
      return
    }

    setSavingPerms(true)
    try {
      const newLegacyRole = draftRolePreset === "admin" ? "admin" : "user"
      const payload = {
        role: newLegacyRole,
        rolePreset: draftRolePreset,
        jobTitle: draftJobTitle.trim(),
        permissions: {
          isCustomAdminOverride: true,
          privileges: draftPrivileges,
          matrix: draftMatrix,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser?.email || "admin",
        },
      }
      await updateDoc(doc(db, "users", editingUser.id), payload)
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...payload } : u))
      )
      toast.success(
        tr(
          `تم حفظ وتحديث صلاحيات "${editingUser.displayName || editingUser.email}" بنجاح!`,
          `Permissions updated for "${editingUser.displayName || editingUser.email}"!`
        )
      )
      setEditingUser(null)
    } catch (err) {
      console.error(err)
      toast.error(tr("فشل حفظ الصلاحيات: ", "Failed to save permissions: ") + err.message)
    } finally {
      setSavingPerms(false)
    }
  }

  async function approveUser(targetUser) {
    const chosenPresetId = pendingRoleChoice[targetUser.id] || "supervisor"
    const preset = ROLE_PRESETS[chosenPresetId] || ROLE_PRESETS.supervisor
    try {
      const payload = {
        approved: true,
        role: chosenPresetId === "admin" ? "admin" : "user",
        rolePreset: chosenPresetId,
        permissions: {
          privileges: { ...preset.privileges },
          matrix: JSON.parse(JSON.stringify(preset.matrix)),
        },
      }
      await updateDoc(doc(db, "users", targetUser.id), payload)
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, ...payload } : u))
      )
      toast.success(tr("تمت الموافقة وتفعيل صلاحيات المستخدم", "User approved and permissions activated"))
    } catch (err) {
      console.error(err)
      alert(tr("فشل الموافقة على المستخدم: ", "Failed to approve user: ") + err.message)
    }
  }

  async function rejectUser(targetUser) {
    setConfirmConfig({
      title: tr("رفض المستخدم", "Reject User"),
      message: tr(
        `هل أنت متأكد من رفض وحذف حساب ${targetUser.displayName || targetUser.email}؟`,
        `Are you sure you want to reject and remove ${targetUser.displayName || targetUser.email}?`
      ),
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          await updateDoc(doc(db, "users", targetUser.id), {
            disabled: true,
            deleted: true,
            approved: false,
          })
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
        } catch (err) {
          console.error(err)
          alert(tr("فشل رفض المستخدم: ", "Failed to reject user: ") + err.message)
        }
      },
    })
  }

  async function toggleBan(targetUser) {
    if (targetUser.id === currentUser.uid) {
      alert(tr("لا يمكنك حظر نفسك!", "You cannot suspend your own account!"))
      return
    }
    const newStatus = !targetUser.disabled
    if (newStatus) {
      setConfirmConfig({
        title: tr("تأكيد إيقاف الحساب", "Confirm Account Suspension"),
        message: tr(
          `هل أنت متأكد من إيقاف/حظر المستخدم ${targetUser.displayName || targetUser.email}؟`,
          `Are you sure you want to suspend ${targetUser.displayName || targetUser.email}?`
        ),
        onConfirm: async () => {
          setConfirmConfig(null)
          await applyBan(targetUser, newStatus)
        },
      })
      return
    }
    await applyBan(targetUser, newStatus)
  }

  async function applyBan(targetUser, newStatus) {
    try {
      await updateDoc(doc(db, "users", targetUser.id), { disabled: newStatus })
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, disabled: newStatus } : u))
      )
      toast.success(
        newStatus
          ? tr("تم إيقاف الحساب مؤقتاً", "Account suspended")
          : tr("تم إعادة تفعيل الحساب", "Account reactivated")
      )
    } catch (err) {
      console.error(err)
      alert(tr("فشل تحديث حالة المستخدم: ", "Failed to update user status: ") + err.message)
    }
  }

  async function removeUser(targetUser) {
    if (targetUser.id === currentUser.uid) {
      alert(tr("لا يمكنك حذف حسابك الخاص!", "You cannot delete your own account!"))
      return
    }
    setConfirmConfig({
      title: tr("إزالة المستخدم نهائياً", "Remove User Permanently"),
      message: tr(
        `هل أنت متأكد من حذف المستخدم ${targetUser.displayName || targetUser.email} نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيمنعه من الدخول.`,
        `Are you sure you want to permanently remove ${targetUser.displayName || targetUser.email}? This action cannot be undone.`
      ),
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          await updateDoc(doc(db, "users", targetUser.id), { disabled: true, deleted: true })
          setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
          toast.success(tr("تم حذف المستخدم نهائياً", "User removed permanently"))
        } catch (err) {
          console.error(err)
          alert(tr("فشل إزالة المستخدم: ", "Failed to remove user: ") + err.message)
        }
      },
    })
  }

  const pendingUsers = users.filter((u) => u.approved === false)
  const approvedUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return users
      .filter((u) => u.approved !== false)
      .filter((u) => {
        const resolved = resolveUserPermissions(u)
        if (filterRole !== "all" && resolved.roleId !== filterRole) return false
        if (!q) return true
        return (
          (u.displayName || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.jobTitle || "").toLowerCase().includes(q)
        )
      })
  }, [users, searchQuery, filterRole])

  return (
    <div style={s.overlay} className="users-modal-overlay">
      <div style={{ ...s.modal, maxWidth: editingUser ? 1050 : 880 }} className="users-modal-card">
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
              <span>🛡️</span>
              <span>
                {editingUser
                  ? tr(
                      `مصفوفة الصلاحيات الذكية — ${editingUser.displayName || editingUser.email}`,
                      `Smart Permissions Matrix — ${editingUser.displayName || editingUser.email}`
                    )
                  : tr("مركز إدارة المستخدمين ومصفوفة الصلاحيات (RBAC)", "Users & Granular Permissions Center (RBAC)")}
              </span>
            </h2>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              {editingUser
                ? tr(
                    "حدد بدقة الأقسام المسموح للمستخدم برؤيتها، وصلاحيات الإدخال والتعديل والاعتماد والحذف والتصدير لكل قسم",
                    "Configure exact module visibility and Add, Edit, Status, Delete & Export permissions per module"
                  )
                : tr(
                    "تحكم كامل في حسابات فريق العمل، تحديد الأدوار الوظيفية، وتخصيص صلاحيات الرؤية والإدخال والتعديل والحذف لكل مستخدم",
                    "Full control over team accounts, job roles, and per-module View, Add, Edit, Delete & Export permissions"
                  )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {editingUser && (
              <button
                style={{ ...s.btn, background: "#1e293b", color: "#cbd5e1", border: "1px solid #334155" }}
                onClick={() => setEditingUser(null)}
              >
                {tr("→ رجوع لقائمة المستخدمين", "← Back to Users List")}
              </button>
            )}
            <button style={s.closeBtn} onClick={onClose}>✖</button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: GRANULAR PERMISSIONS MATRIX EDITOR FOR SELECTED USER         */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {editingUser ? (
          <div style={s.list}>
            {/* User Info & Job Title Bar */}
            <div style={{
              background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 999,
                  background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                  display: "grid", placeItems: "center",
                  color: "#fff", fontWeight: 900, fontSize: 18,
                }}>
                  {(editingUser.displayName || editingUser.email || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#f8fafc" }}>
                    {editingUser.displayName || tr("بدون اسم", "Unnamed User")}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{editingUser.email}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                    {tr("المسمى الوظيفي / التخصص (اختياري):", "Job Title / Specialty (Optional):")}
                  </label>
                  <input
                    style={{
                      background: "#060d1a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                      padding: "7px 12px",
                      color: "#f8fafc",
                      fontSize: 13,
                      minWidth: 220,
                    }}
                    placeholder={tr("مثال: مشرف أمن / مهندس كهرباء...", "e.g. Security Supervisor / MEP Engineer...")}
                    value={draftJobTitle}
                    onChange={(e) => setDraftJobTitle(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 1: Role Presets Selector */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#38bdf8", marginBottom: 8 }}>
                {tr("1️⃣ اختر القالب الوظيفي السريع (أو خصص الجدول بالأسفل يدوياً):", "1️⃣ Choose a Role Preset (or customize the matrix below):")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 8 }}>
                {Object.values(ROLE_PRESETS).map((preset) => {
                  const active = draftRolePreset === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyRolePresetToDraft(preset.id)}
                      style={{
                        background: active ? `${preset.badgeColor}22` : "#060d1a",
                        border: `1.5px solid ${active ? preset.badgeColor : "#1e293b"}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        textAlign: lang === "ar" ? "right" : "left",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: active ? preset.badgeColor : "#f1f5f9" }}>
                        <span>{preset.icon}</span>
                        <span>{lang === "ar" ? preset.labelAr : preset.labelEn}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                        {lang === "ar" ? preset.descAr : preset.descEn}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Module x Action Matrix Table */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>
                {tr(
                  "2️⃣ مصفوفة صلاحيات الأقسام والعمليات التفصيلية (اضغط على أي خانة للتفعيل أو الإلغاء):",
                  "2️⃣ Per-Module & Per-Action Permissions Matrix (Click any cell to grant or revoke):"
                )}
              </div>
              <div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 12, background: "#060d1a" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
                      <th style={{ padding: "12px 14px", textAlign: lang === "ar" ? "right" : "left", color: "#cbd5e1", minWidth: 210 }}>
                        {tr("القسم / الوحدة (Module)", "Module / Section")}
                      </th>
                      {PERMISSION_ACTIONS.map((act) => (
                        <th key={act.id} style={{ padding: "10px 8px", textAlign: "center", minWidth: 92 }}>
                          <button
                            type="button"
                            onClick={() => toggleEntireColumn(act.id)}
                            title={tr("تحديد / إلغاء العمود بالكامل", "Toggle entire column")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: act.color,
                              fontWeight: 800,
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                              margin: "0 auto",
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{act.icon}</span>
                            <span>{lang === "ar" ? act.labelAr : act.labelEn}</span>
                          </button>
                        </th>
                      ))}
                      <th style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8", fontSize: 11 }}>
                        {tr("تحكم الصف", "Row Toggle")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {APP_MODULES.map((mod) => {
                      const row = draftMatrix[mod.id] || {}
                      const allRowEnabled = PERMISSION_ACTIONS.every((a) => row[a.id])
                      return (
                        <tr key={mod.id} style={{ borderBottom: "1px solid #1e293b", background: row.view ? "transparent" : "rgba(15,23,42,0.5)" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ fontWeight: 800, color: row.view ? "#f8fafc" : "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18 }}>{mod.icon}</span>
                              <span>{lang === "ar" ? mod.labelAr : mod.labelEn}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                              {lang === "ar" ? mod.descAr : mod.descEn}
                            </div>
                          </td>
                          {PERMISSION_ACTIONS.map((act) => {
                            const checked = Boolean(row[act.id])
                            return (
                              <td key={act.id} style={{ padding: "8px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleMatrixCell(mod.id, act.id)}
                                  style={{
                                    width: 38,
                                    height: 34,
                                    borderRadius: 8,
                                    border: `1.5px solid ${checked ? act.color : "#334155"}`,
                                    background: checked ? `${act.color}25` : "#0f172a",
                                    color: checked ? act.color : "#475569",
                                    fontWeight: 900,
                                    fontSize: 15,
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                  }}
                                >
                                  {checked ? "✓" : "✕"}
                                </button>
                              </td>
                            )
                          })}
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => toggleEntireRow(mod.id)}
                              style={{
                                background: allRowEnabled ? "#1e293b" : "#0f766e",
                                color: allRowEnabled ? "#94a3b8" : "#ccfbf1",
                                border: "1px solid #334155",
                                borderRadius: 6,
                                padding: "5px 10px",
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {allRowEnabled ? tr("إلغاء الكل", "Clear All") : tr("تفعيل الكل", "Grant All")}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3: Advanced System Privileges */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", marginBottom: 8 }}>
                {tr("3️⃣ صلاحيات النظام المتقدمة (System-Wide Privileges):", "3️⃣ Advanced System-Wide Privileges:")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
                {SYSTEM_PRIVILEGES.map((priv) => {
                  const active = Boolean(draftPrivileges[priv.id])
                  return (
                    <div
                      key={priv.id}
                      onClick={() => togglePrivilege(priv.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${active ? "#f59e0b" : "#1e293b"}`,
                        background: active ? "rgba(245,158,11,0.12)" : "#060d1a",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {}}
                        style={{ width: 17, height: 17, accentColor: "#f59e0b", cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 16 }}>{priv.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#fde68a" : "#94a3b8" }}>
                        {lang === "ar" ? priv.labelAr : priv.labelEn}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Save / Cancel Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 10,
              paddingTop: 14,
              borderTop: "1px solid #1e293b",
            }}>
              <button
                type="button"
                style={{ ...s.btn, background: "#1e293b", color: "#cbd5e1", padding: "10px 20px", fontSize: 13 }}
                onClick={() => setEditingUser(null)}
              >
                {tr("إلغاء", "Cancel")}
              </button>
              <button
                type="button"
                disabled={savingPerms}
                style={{
                  ...s.btn,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  padding: "10px 26px",
                  fontSize: 14,
                  boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                }}
                onClick={saveUserPermissions}
              >
                {savingPerms
                  ? tr("⏳ جاري الحفظ...", "⏳ Saving...")
                  : tr("💾 حفظ واعتماد الصلاحيات فوراً", "💾 Save & Apply Permissions")}
              </button>
            </div>
          </div>
        ) : (
          /* ════════════════════════════════════════════════════════════════════ */
          /* VIEW 2: USERS DIRECTORY & APPROVAL QUEUE                            */
          /* ════════════════════════════════════════════════════════════════════ */
          <>
            {/* Search & Role Filter Bar */}
            <div style={{
              padding: "12px 20px",
              background: "#060d1a",
              borderBottom: "1px solid #1e293b",
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}>
              <input
                style={{
                  flex: 1,
                  minWidth: 220,
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  padding: "9px 14px",
                  color: "#f8fafc",
                  fontSize: 13,
                }}
                placeholder={tr("🔍 ابحث بالاسم أو البريد الإلكتروني أو المسمى الوظيفي...", "🔍 Search by name, email, or job title...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: 10,
                  padding: "9px 14px",
                  color: "#f8fafc",
                  fontSize: 13,
                }}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">{tr("كل الأدوار الوظيفية", "All Roles")}</option>
                {Object.values(ROLE_PRESETS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {lang === "ar" ? p.labelAr : p.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
                {tr("جاري تحميل قائمة المستخدمين...", "Loading users...")}
              </div>
            ) : (
              <div style={s.list}>
                {/* Pending Approval Section */}
                {pendingUsers.length > 0 && (
                  <>
                    <div style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid #f59e0b",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 6,
                    }}>
                      <span style={{ fontWeight: "bold", color: "#f59e0b", fontSize: 14 }}>
                        ⏳ {tr(`طلبات انتظار الموافقة (${pendingUsers.length})`, `Pending Approval Requests (${pendingUsers.length})`)}
                      </span>
                    </div>
                    {pendingUsers.map((u) => (
                      <div key={u.id} style={{ ...s.userCard, borderColor: "#f59e0b", background: "rgba(245,158,11,0.05)" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontWeight: "bold", fontSize: 15, display: "flex", alignItems: "center", gap: 6, color: "#f8fafc" }}>
                            {u.displayName || tr("بدون اسم", "Unnamed")}
                            <span style={{ background: "#f59e0b", color: "#000", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>
                              {tr("في الانتظار", "Pending")}
                            </span>
                          </div>
                          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{u.email}</div>
                          {u.createdAt && (
                            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                              {tr("تاريخ التسجيل: ", "Registered: ")}
                              {new Date(u.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <select
                            style={{
                              background: "#0f172a",
                              border: "1px solid #475569",
                              borderRadius: 8,
                              padding: "6px 10px",
                              color: "#f8fafc",
                              fontSize: 12,
                            }}
                            value={pendingRoleChoice[u.id] || "supervisor"}
                            onChange={(e) => setPendingRoleChoice((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          >
                            {Object.values(ROLE_PRESETS).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.icon} {lang === "ar" ? p.labelAr : p.labelEn}
                              </option>
                            ))}
                          </select>
                          <button
                            style={{ ...s.btn, background: "#10b981", color: "white" }}
                            onClick={() => approveUser(u)}
                          >
                            ✅ {tr("موافقة وتفعيل", "Approve")}
                          </button>
                          <button
                            style={{ ...s.btn, background: "#dc2626", color: "white" }}
                            onClick={() => rejectUser(u)}
                          >
                            ❌ {tr("رفض", "Reject")}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ borderBottom: "1px solid #334155", margin: "8px 0" }} />
                  </>
                )}

                {/* Approved Users Section */}
                {approvedUsers.length > 0 && (
                  <>
                    <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: "bold", marginBottom: 4 }}>
                      ✅ {tr(`المستخدمون المفعّلون (${approvedUsers.length})`, `Active Users (${approvedUsers.length})`)}
                    </div>
                    {approvedUsers.map((u) => {
                      const resolved = resolveUserPermissions(u)
                      const preset = resolved.preset
                      const visibleMods = APP_MODULES.filter((m) => resolved.matrix[m.id]?.view)
                      const canAddAny = APP_MODULES.some((m) => resolved.matrix[m.id]?.add)
                      const canEditAny = APP_MODULES.some((m) => resolved.matrix[m.id]?.edit)
                      const canDeleteAny = APP_MODULES.some((m) => resolved.matrix[m.id]?.delete)
                      const canExportAny = APP_MODULES.some((m) => resolved.matrix[m.id]?.export)

                      return (
                        <div key={u.id} style={{ ...s.userCard, opacity: u.disabled ? 0.6 : 1 }} className="users-card-row">
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: "bold", fontSize: 15, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "#f8fafc" }}>
                              <span>{u.displayName || tr("بدون اسم", "Unnamed")}</span>
                              <span style={{
                                background: `${preset.badgeColor}25`,
                                border: `1px solid ${preset.badgeColor}`,
                                color: preset.badgeColor,
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 800,
                              }}>
                                {preset.icon} {lang === "ar" ? preset.labelAr : preset.labelEn}
                              </span>
                              {u.jobTitle && (
                                <span style={{ background: "#0f172a", color: "#38bdf8", padding: "2px 8px", borderRadius: 6, fontSize: 11, border: "1px solid #1e293b" }}>
                                  💼 {u.jobTitle}
                                </span>
                              )}
                              {u.disabled && (
                                <span style={s.badgeBan}>{tr("موقوف", "Suspended")}</span>
                              )}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{u.email}</div>

                            {/* Quick Permission Summary Pills */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                              <span style={s.permPill("#38bdf8")}>
                                👁️ {visibleMods.length}/{APP_MODULES.length} {tr("أقسام متاحة", "Modules")}
                              </span>
                              <span style={s.permPill(canAddAny ? "#10b981" : "#475569")}>
                                {canAddAny ? "➕ " + tr("إدخال", "Add") : "🚫 " + tr("بدون إدخال", "No Add")}
                              </span>
                              <span style={s.permPill(canEditAny ? "#f59e0b" : "#475569")}>
                                {canEditAny ? "✏️ " + tr("تعديل", "Edit") : "🚫 " + tr("بدون تعديل", "No Edit")}
                              </span>
                              <span style={s.permPill(canDeleteAny ? "#ef4444" : "#475569")}>
                                {canDeleteAny ? "🗑️ " + tr("حذف", "Delete") : "🔒 " + tr("الحذف مغلق", "No Delete")}
                              </span>
                              <span style={s.permPill(canExportAny ? "#06b6d4" : "#475569")}>
                                {canExportAny ? "📊 " + tr("تصدير", "Export") : "🚫 " + tr("بدون تصدير", "No Export")}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="users-card-actions">
                            <button
                              style={{
                                ...s.btn,
                                background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                                color: "white",
                                padding: "8px 14px",
                              }}
                              onClick={() => openPermissionsEditor(u)}
                            >
                              ⚙️ {tr("تخصيص الصلاحيات", "Permissions Matrix")}
                            </button>
                            <button
                              style={{
                                ...s.btn,
                                background: u.disabled ? "#10b981" : "#334155",
                                color: "white",
                              }}
                              onClick={() => toggleBan(u)}
                            >
                              {u.disabled ? tr("تفعيل", "Activate") : tr("إيقاف مؤقت", "Suspend")}
                            </button>
                            <button
                              style={{ ...s.btn, background: "#7f1d1d", color: "#fca5a5" }}
                              onClick={() => removeUser(u)}
                            >
                              🗑️ {tr("حذف", "Remove")}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}

                {users.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
                    {tr("لا يوجد مستخدمون", "No users found")}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {confirmConfig && (
        <ConfirmDialog
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
  )
}

const s = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(2,6,23,0.85)", backdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 9999, padding: 16,
  },
  modal: {
    background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 18, width: "100%",
    maxHeight: "90vh", display: "flex", flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.65)",
  },
  header: {
    padding: "16px 20px", borderBottom: "1px solid #1e293b",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 12, flexWrap: "wrap",
  },
  closeBtn: {
    background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer",
  },
  list: {
    padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
  },
  userCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 16px", background: "#1e293b", borderRadius: 12,
    border: "1px solid #334155", flexWrap: "wrap", gap: 12,
  },
  btn: {
    padding: "7px 12px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 12, fontWeight: "bold",
  },
  badgeBan: {
    background: "#7f1d1d", color: "#fca5a5", padding: "2px 6px", borderRadius: 4, fontSize: 10,
  },
  permPill: (color) => ({
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 6,
    background: `${color}18`,
    color,
    border: `1px solid ${color}40`,
  }),
}
