import React, { useState } from "react"
import { useLanguage } from "../i18n/LanguageContext.jsx"

export default function AuthScreen({ onLogin, onRegister, error }) {
  const { lang, toggleLang, tr } = useLanguage()
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
        if (!name.trim()) {
          alert(tr("اكتب اسمك أولاً", "Please enter your full name first"))
          setBusy(false)
          return
        }
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
        {/* Top Language Switcher */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            onClick={toggleLang}
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              color: "#38bdf8",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            🌐 {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* Logo */}
        <div style={s.logo}>📋</div>
        <h1 style={s.title}>Smart Mall OS</h1>
        <p style={s.sub}>
          {tr(
            "نظام ذكي لتسجيل ومتابعة ملاحظات التشغيل والصيانة",
            "Smart Operations & Maintenance Snag Management System"
          )}
        </p>

        {/* Tabs */}
        <div style={s.tabs}>
          <button
            type="button"
            style={{ ...s.tab, ...(mode === "login" ? s.tabActive : {}) }}
            onClick={() => setMode("login")}
          >
            {tr("تسجيل الدخول", "Sign In")}
          </button>
          <button
            type="button"
            style={{ ...s.tab, ...(mode === "register" ? s.tabActive : {}) }}
            onClick={() => setMode("register")}
          >
            {tr("حساب جديد", "Create Account")}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={s.error}>⚠️ {error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <div style={s.field}>
              <label style={s.label}>{tr("الاسم الكامل", "Full Name")}</label>
              <input
                style={s.input}
                type="text"
                placeholder={tr("مثال: أحمد محمد", "e.g. Ahmed Mohamed")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>{tr("البريد الإلكتروني", "Email Address")}</label>
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
            <label style={s.label}>{tr("كلمة المرور", "Password")}</label>
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
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{tr("تذكرني", "Remember me")}</span>
            </label>
          )}

          <button type="submit" disabled={busy} style={{ ...s.btn, opacity: busy ? 0.6 : 1 }}>
            {busy
              ? tr("⏳ جاري المعالجة...", "⏳ Processing...")
              : mode === "login"
                ? tr("🔐 دخول", "🔐 Sign In")
                : tr("✨ إنشاء حساب", "✨ Create Account")
            }
          </button>
        </form>

        <p style={s.footer}>
          {mode === "login"
            ? tr("ليس لديك حساب؟ ", "Don't have an account? ")
            : tr("لديك حساب بالفعل؟ ", "Already have an account? ")
          }
          <span
            style={s.link}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? tr("إنشاء حساب جديد", "Register now") : tr("تسجيل الدخول", "Sign In")}
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
    padding: "30px 28px",
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
