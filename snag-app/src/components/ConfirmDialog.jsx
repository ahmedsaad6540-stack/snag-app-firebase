import React from "react"

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={{ margin: 0, fontSize: 18, color: "#fca5a5" }}>{title}</h2>
        </div>
        <div style={{ padding: "20px", color: "#e2e8f0", fontSize: 15, lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={s.footer}>
          <button style={{ ...s.btn, background: "#334155", color: "#f8fafc" }} onClick={onCancel}>
            إلغاء
          </button>
          <button style={{ ...s.btn, background: "#dc2626", color: "#fee2e2" }} onClick={onConfirm}>
            تأكيد
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(2,6,23,0.8)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 10000, padding: 20
  },
  modal: {
    background: "#0f172a", border: "1px solid #1e293b",
    borderRadius: 16, width: "100%", maxWidth: 400,
    display: "flex", flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
  },
  header: {
    padding: "16px 20px", borderBottom: "1px solid #1e293b",
  },
  footer: {
    padding: "16px 20px", borderTop: "1px solid #1e293b",
    display: "flex", justifyContent: "flex-end", gap: 10
  },
  btn: {
    padding: "8px 16px", borderRadius: 8, border: "none",
    cursor: "pointer", fontSize: 14, fontWeight: "bold"
  }
}
