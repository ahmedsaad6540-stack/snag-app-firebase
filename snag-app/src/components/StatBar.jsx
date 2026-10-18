import React from "react"

const CARDS = [
  {
    key:    "total",
    label:  "إجمالي الملاحظات",
    filter: "all",
    icon:   "📋",
    color:  "#f1f5f9",
    accent: "#334155",
    glow:   "rgba(100,116,139,0.3)",
  },
  {
    key:    "open",
    label:  "مفتوح",
    filter: "open",
    icon:   "🔴",
    color:  "#f87171",
    accent: "#ef4444",
    glow:   "rgba(239,68,68,0.3)",
  },
  {
    key:    "inProgress",
    label:  "قيد التنفيذ",
    filter: "in-progress",
    icon:   "🟡",
    color:  "#fbbf24",
    accent: "#f59e0b",
    glow:   "rgba(245,158,11,0.3)",
  },
  {
    key:    "urgent",
    label:  "عاجل",
    filter: "urgent",
    icon:   "⚡",
    color:  "#38bdf8",
    accent: "#0ea5e9",
    glow:   "rgba(14,165,233,0.3)",
  },
  {
    key:    "closed",
    label:  "مغلق",
    filter: "closed",
    icon:   "✅",
    color:  "#34d399",
    accent: "#10b981",
    glow:   "rgba(16,185,129,0.3)",
  },
]

export default function StatBar({ stats, activeFilter = "all", onFilter }) {
  return (
    <div style={s.grid} className="stat-grid">
      {CARDS.map((c) => {
        const isActive = activeFilter === c.filter
        const value = stats[c.key] ?? 0
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter && onFilter(isActive ? "all" : c.filter)}
            style={{
              ...s.card,
              borderTop: `3px solid ${c.accent}`,
              cursor: onFilter ? "pointer" : "default",
              background: isActive
                ? `linear-gradient(135deg, ${c.accent}22, #0f172a)`
                : "#0f172a",
              boxShadow: isActive
                ? `0 0 0 2px ${c.accent}, 0 8px 32px ${c.glow}`
                : "none",
              transform: isActive ? "translateY(-3px)" : "translateY(0)",
              transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
            title={isActive ? `إلغاء فلتر: ${c.label}` : `عرض: ${c.label}`}
          >
            {/* Value with animated number */}
            <div style={{
              fontSize: 32, fontWeight: 900, color: c.color,
              lineHeight: 1, marginBottom: 6,
              textShadow: isActive ? `0 0 20px ${c.accent}` : "none",
              transition: "text-shadow 0.3s",
            }}>
              {value}
            </div>

            {/* Label row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 4, flexWrap: "nowrap",
            }}>
              <span style={{ fontSize: 13 }}>{c.icon}</span>
              <span style={{
                fontSize: 12, color: isActive ? c.color : "#64748b",
                fontWeight: isActive ? 700 : 400,
                transition: "color 0.2s",
              }}>
                {c.label}
              </span>
            </div>

            {/* Active indicator bar */}
            {isActive && (
              <div style={{
                position: "absolute", bottom: 0, left: "10%", right: "10%",
                height: 3, borderRadius: 99,
                background: `linear-gradient(90deg, transparent, ${c.accent}, transparent)`,
                animation: "pulseBar 1.5s ease-in-out infinite",
              }} />
            )}
          </button>
        )
      })}

      <style>{`
        @keyframes pulseBar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

const s = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 10,
    marginBottom: 20,
  },
  card: {
    position: "relative",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "16px 12px",
    textAlign: "center",
    fontFamily: "inherit",
    outline: "none",
    overflow: "hidden",
  },
}
