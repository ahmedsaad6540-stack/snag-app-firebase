import React, { useState, useEffect } from "react"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { db } from "../lib/firebase.js"
import ConfirmDialog from "./ConfirmDialog.jsx"

export default function UsersManager({ onClose, currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmConfig, setConfirmConfig] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, "users"))
      const list = []
      snap.forEach(doc => {
        const data = doc.data()
        if (!data.deleted) {
          list.push({ id: doc.id, ...data })
        }
      })
      setUsers(list)
    } catch (err) {
      console.error("Error loading users:", err)
      alert("حدث خطأ أثناء تحميل المستخدمين")
    } finally {
      setLoading(false)
    }
  }

  async function approveUser(targetUser) {
    try {
      await updateDoc(doc(db, "users", targetUser.id), { approved: true })
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, approved: true } : u))
    } catch (err) {
      console.error(err)
      alert("فشل الموافقة على المستخدم: " + err.message)
    }
  }

  async function rejectUser(targetUser) {
    setConfirmConfig({
      title: "رفض المستخدم",
      message: `هل أنت متأكد من رفض وحذف حساب ${targetUser.displayName || targetUser.email}؟`,
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          await updateDoc(doc(db, "users", targetUser.id), { disabled: true, deleted: true, approved: false })
          setUsers(prev => prev.filter(u => u.id !== targetUser.id))
        } catch (err) {
          console.error(err)
          alert("فشل رفض المستخدم: " + err.message)
        }
      }
    })
  }

  async function toggleBan(targetUser) {
    if (targetUser.id === currentUser.uid) {
      alert("لا يمكنك حظر نفسك!")
      return
    }
    const newStatus = !targetUser.disabled
    if (newStatus) {
      setConfirmConfig({
        title: "تأكيد الحظر",
        message: `هل أنت متأكد من حظر المستخدم ${targetUser.displayName}؟`,
        onConfirm: async () => {
          setConfirmConfig(null)
          await applyBan(targetUser, newStatus)
        }
      })
      return
    }
    await applyBan(targetUser, newStatus)
  }

  async function applyBan(targetUser, newStatus) {
    try {
      await updateDoc(doc(db, "users", targetUser.id), { disabled: newStatus })
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, disabled: newStatus } : u))
    } catch (err) {
      console.error(err)
      alert("فشل تحديث حالة المستخدم: " + err.message)
    }
  }

  async function toggleRole(targetUser) {
    if (targetUser.id === currentUser.uid) {
      alert("لا يمكنك تغيير صلاحياتك بنفسك!")
      return
    }
    const newRole = targetUser.role === "admin" ? "user" : "admin"
    setConfirmConfig({
      title: "تغيير الصلاحيات",
      message: `هل أنت متأكد من تغيير صلاحيات ${targetUser.displayName} إلى ${newRole === "admin" ? "مدير نظام" : "مستخدم عادي"}؟`,
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          await updateDoc(doc(db, "users", targetUser.id), { role: newRole })
          setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u))
        } catch (err) {
          console.error(err)
          alert("فشل تغيير الصلاحيات: " + err.message)
        }
      }
    })
  }

  async function removeUser(targetUser) {
    if (targetUser.id === currentUser.uid) {
      alert("لا يمكنك حذف حسابك الخاص!")
      return
    }
    setConfirmConfig({
      title: "إزالة المستخدم",
      message: `هل أنت متأكد من حذف المستخدم ${targetUser.displayName} نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيمنعه من الدخول.`,
      onConfirm: async () => {
        setConfirmConfig(null)
        try {
          await updateDoc(doc(db, "users", targetUser.id), { disabled: true, deleted: true })
          setUsers(prev => prev.filter(u => u.id !== targetUser.id))
        } catch (err) {
          console.error(err)
          alert("فشل إزالة المستخدم: " + err.message)
        }
      }
    })
  }

  const pendingUsers = users.filter(u => u.approved === false)
  const approvedUsers = users.filter(u => u.approved !== false)

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={{ margin: 0, fontSize: 18 }}>👥 إدارة المستخدمين والصلاحيات</h2>
          <button style={s.closeBtn} onClick={onClose}>✖</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>جاري التحميل...</div>
        ) : (
          <div style={s.list}>
            {/* Pending Approval Section */}
            {pendingUsers.length > 0 && (
              <>
                <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b", borderRadius: 10, padding: "10px 14px", marginBottom: 6 }}>
                  <span style={{ fontWeight: "bold", color: "#f59e0b", fontSize: 14 }}>⏳ طلبات انتظار الموافقة ({pendingUsers.length})</span>
                </div>
                {pendingUsers.map(u => (
                  <div key={u.id} style={{ ...s.userCard, borderColor: "#f59e0b", background: "rgba(245,158,11,0.05)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                        {u.displayName || "بدون اسم"}
                        <span style={{ background: "#f59e0b", color: "#000", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>في الانتظار</span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{u.email}</div>
                      {u.createdAt && <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>تاريخ التسجيل: {new Date(u.createdAt).toLocaleDateString("ar-EG")}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        style={{ ...s.btn, background: "#10b981", color: "white" }} 
                        onClick={() => approveUser(u)}
                      >
                        ✅ موافقة
                      </button>
                      <button 
                        style={{ ...s.btn, background: "#dc2626", color: "white" }} 
                        onClick={() => rejectUser(u)}
                      >
                        ❌ رفض
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
                  ✅ المستخدمون المفعّلون ({approvedUsers.length})
                </div>
                {approvedUsers.map(u => (
                  <div key={u.id} style={{ ...s.userCard, opacity: u.disabled ? 0.6 : 1 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                        {u.displayName || "بدون اسم"}
                        {u.role === "admin" && <span style={s.badgeAdmin}>مدير نظام</span>}
                        {u.disabled && <span style={s.badgeBan}>محظور</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{u.email}</div>
                    </div>
                    
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        style={{ ...s.btn, background: u.role === "admin" ? "#334155" : "#1e3a8a", color: "white" }} 
                        onClick={() => toggleRole(u)}
                      >
                        {u.role === "admin" ? "سحب الإدارة" : "ترقية لمدير"}
                      </button>
                      <button 
                        style={{ ...s.btn, background: u.disabled ? "#10b981" : "#dc2626", color: "white" }} 
                        onClick={() => toggleBan(u)}
                      >
                        {u.disabled ? "تفعيل الحساب" : "حظر الحساب"}
                      </button>
                      <button 
                        style={{ ...s.btn, background: "#7f1d1d", color: "#fca5a5" }} 
                        onClick={() => removeUser(u)}
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {users.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>لا يوجد مستخدمون</div>
            )}
          </div>
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
    background: "rgba(2,6,23,0.8)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 9999, padding: 20
  },
  modal: {
    background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 16, width: "100%", maxWidth: 600,
    maxHeight: "85vh", display: "flex", flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
  },
  header: {
    padding: "16px 20px", borderBottom: "1px solid #1e293b",
    display: "flex", justifyContent: "space-between", alignItems: "center"
  },
  closeBtn: {
    background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer"
  },
  list: {
    padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10
  },
  userCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", background: "#1e293b", borderRadius: 12,
    border: "1px solid #334155", flexWrap: "wrap", gap: 10
  },
  btn: {
    padding: "6px 12px", borderRadius: 6, border: "none",
    cursor: "pointer", fontSize: 12, fontWeight: "bold"
  },
  badgeAdmin: {
    background: "#ef4444", color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10
  },
  badgeBan: {
    background: "#7f1d1d", color: "#fca5a5", padding: "2px 6px", borderRadius: 4, fontSize: 10
  }
}
