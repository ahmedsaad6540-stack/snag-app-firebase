import React, { useState } from "react"

export default function AuthScreen({ onLogin, onRegister, error }) {
  const [mode, setMode]           = useState("login") // login | register
  const [email, setEmail]         = useState("")
  const [password, setPassword]   = useState("")
  const [name, setName]           = useState("")
  const [rememberMe, setRemember] = useState(true)
  const [busy, setBusy]           = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      if (mode === "login") {
        await onLogin(email, password, rememberMe)
      } else {
        if (!name.trim()) { alert("اكتب اسمك أولاً"); setBusy(false); return }
        await onRegister(email, password, name.trim())
      }
    } catch (err) {
      // error is handled by useAuth
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>📋</div>
        <h1 style={s.title}>Smart Mall OS</h1>
        <p style={s.sub}>نظام ذكي لتسجيل ومتابعة ملاحظات التشغيل والصيانة</p>

        {/* Tabs */}
        <div style={s.tabs}>
          <button
            style={{ ...s.tab, ...(mode === "login" ? s.tabActive : {}) }}
            onClick={() => setMode("login")}
          >
            تسجيل الدخول
          </button>
          <button
            style={{ ...s.tab, ...(mode === "register" ? s.tabActive : {}) }}
            onClick={() => setMode("register")}
          >
            حساب جديد
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={s.error}>⚠️ {error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <div style={s.field}>
                <label style={s.label}>الاسم الكامل</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="مثال: أحمد محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </>
          )}

          <div style={s.field}>
            <label style={s.label}>البريد الإلكتروني</label>
            <input
              style={s.input}
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>كلمة المرور</label>
            <input
              style={s.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
            />
          </div>

          {mode === "login" && (
            <label style={s.rememberRow}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRemember(e.target.checked)}
                style={s.checkbox}
              />
              <span style={{ color: "#94a3b8", fontSize: 13 }}>تذكرني</span>
            </label>
          )}

          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy
              ? "⏳ جاري المعالجة..."
              : mode === "login"
                ? "🔐 دخول"
                : "✨ إنشاء حساب"
            }
          </button>
        </form>

        <p style={s.footer}>
          {mode === "login"
            ? "ليس لديك حساب؟ "
            : "لديك حساب بالفعل؟ "
          }
          <span
            style={s.link}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "إنشاء حساب جديد" : "تسجيل الدخول"}
          </span>
        </p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #060d1a 0%, #0a1628 50%, #0f1d35 100%)",
    padding: 20,
    fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    background: "rgba(10, 22, 40, 0.9)",
    border: "1px solid #1e293b",
    borderRadius: 24,
    padding: "36px 28px",
    backdropFilter: "blur(20px)",
  },
  logo: {
    fontSize: 48,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: 800,
    color: "#e2e8f0",
    marginBottom: 6,
  },
  sub: {
    textAlign: "center",
    fontSize: 13,
    color: "#64748b",
    marginBottom: 24,
  },
  tabs: {
    display: "flex",
    gap: 0,
    marginBottom: 20,
    background: "#060d1a",
    borderRadius: 12,
    padding: 4,
    border: "1px solid #1e293b",
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    border: 0,
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    background: "transparent",
    color: "#64748b",
    transition: "all .2s",
  },
  tabActive: {
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "white",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #7f1d1d",
    borderRadius: 12,
    padding: "10px 14px",
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: "center",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 700,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #1e293b",
    background: "#060d1a",
    color: "#e2e8f0",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "14px",
    borderRadius: 14,
    border: 0,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    color: "white",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    marginTop: 8,
    transition: "opacity .2s",
  },
  footer: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    marginTop: 20,
  },
  link: {
    color: "#f59e0b",
    fontWeight: 700,
    cursor: "pointer",
  },
  rememberRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#f59e0b",
    cursor: "pointer",
  },
}
