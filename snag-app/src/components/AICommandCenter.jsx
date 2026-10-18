import React, { useState } from "react"
import { useAI } from "../hooks/useAI.js"
import { TRADES, LOCATIONS, tradeOf } from "../constants/index.js"
import { useLocations } from "../hooks/useLocations.js"

export default function AICommandCenter({ snags }) {
  const ai = useAI(snags)
  const { locations } = useLocations()
  const [activePanel, setActivePanel] = useState("overview")

  const panels = [
    { id: "overview", label: "نظرة عامة", icon: "🎛️" },
    { id: "insights", label: "رؤى ذكية", icon: "💡" },
    { id: "heatmap", label: "خريطة الحرارة", icon: "🔥" },
    { id: "trends", label: "الاتجاهات", icon: "📈" },
    { id: "anomalies", label: "تنبيهات", icon: "⚠️" },
  ]

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>
            <span style={s.aiGlow}>🧠</span> مركز قيادة الذكاء الاصطناعي
          </h2>
          <p style={s.subtitle}>تحليلات متقدمة وتنبؤات ذكية في الوقت الحقيقي</p>
        </div>
        <HealthBadge health={ai.health} />
      </div>

      {/* Navigation */}
      <div style={s.nav} className="ai-nav">
        {panels.map(p => (
          <button key={p.id} onClick={() => setActivePanel(p.id)}
            style={{ ...s.navBtn, ...(activePanel === p.id ? s.navActive : {}) }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {activePanel === "overview" && <OverviewPanel ai={ai} snags={snags} locations={locations} />}
      {activePanel === "insights" && <InsightsPanel insights={ai.insights} />}
      {activePanel === "heatmap" && <HeatmapPanel hotspots={ai.hotspots} recurring={ai.recurring} locations={locations} />}
      {activePanel === "trends" && <TrendsPanel trends={ai.trends} peakTimes={ai.peakTimes} />}
      {activePanel === "anomalies" && <AnomaliesPanel anomalies={ai.anomalies} duplicates={ai.duplicates} />}
    </div>
  )
}

/* ─── Health Badge ─── */
function HealthBadge({ health }) {
  const color = health.score >= 80 ? "#10b981" : health.score >= 60 ? "#f59e0b" : "#ef4444"
  const bg = health.score >= 80 ? "rgba(16,185,129,0.1)" : health.score >= 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)"
  return (
    <div style={{ ...s.healthBadge, background: bg, borderColor: color }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{health.score}</div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>صحة المبنى</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{health.grade}</div>
    </div>
  )
}

/* ─── Overview Panel ─── */
function OverviewPanel({ ai, snags, locations }) {
  const w = ai.workload
  return (
    <div style={s.panelGrid}>
      {/* Stats Cards */}
      <StatCard icon="📊" label="إجمالي المفتوحة" value={w.totalOpen} color="#3b82f6" />
      <StatCard icon="🔴" label="عاجلة مفتوحة" value={w.urgentOpen} color="#ef4444" />
      <StatCard icon="🔥" label="بؤر ساخنة" value={ai.hotspots.length} color="#f97316" />
      <StatCard icon="🔄" label="مشاكل متكررة" value={ai.recurring.length} color="#8b5cf6" />
      <StatCard icon="⚠️" label="تنبيهات نشطة" value={ai.anomalies.length} color="#eab308" />
      <StatCard icon="📋" label="تكرارات محتملة" value={ai.duplicates.length} color="#06b6d4" />

      {/* Quick Insights */}
      {ai.insights.length > 0 && (
        <div style={{ ...s.card, gridColumn: "1 / -1" }}>
          <h4 style={s.cardTitle}>💡 أهم الرؤى</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ai.insights.slice(0, 4).map((ins, i) => (
              <div key={i} style={s.insightRow}>
                <span style={{ fontSize: 18 }}>{ins.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{ins.title}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{ins.message}</div>
                </div>
                <span style={s.actionTag}>{ins.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workload by Trade */}
      {Object.keys(w.openByTrade || {}).length > 0 && (
        <div style={{ ...s.card, gridColumn: "1 / -1" }}>
          <h4 style={s.cardTitle}>📊 توزيع عبء العمل حسب التخصص</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(w.openByTrade).sort((a,b) => b[1] - a[1]).map(([trade, count]) => {
              const t = tradeOf(trade)
              const maxCount = Math.max(...Object.values(w.openByTrade), 1)
              const pct = Math.round((count / maxCount) * 100)
              return (
                <div key={trade} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 90, fontSize: 12, color: "#cbd5e1", whiteSpace: "nowrap" }}>{t.icon} {t.label}</span>
                  <div style={{ flex: 1, height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${t.color}88, ${t.color})`, borderRadius: 4, transition: "width 0.6s" }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.color, minWidth: 28, textAlign: "center" }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Peak Times */}
      {ai.peakTimes && (
        <div style={{ ...s.card, gridColumn: "1 / -1" }}>
          <h4 style={s.cardTitle}>⏰ أوقات الذروة</h4>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>{ai.peakTimes.insight}</p>
          <div style={{ display: "flex", gap: 2, marginTop: 12, alignItems: "flex-end", height: 60 }}>
            {ai.peakTimes.byHour.map((count, h) => {
              const max = Math.max(...ai.peakTimes.byHour, 1)
              const pct = (count / max) * 100
              const isP = h === ai.peakTimes.peakHour
              return (
                <div key={h} title={`${h}:00 — ${count} ملاحظة`}
                  style={{ flex: 1, height: `${Math.max(pct, 4)}%`, background: isP ? "#f59e0b" : "#1e293b", borderRadius: "3px 3px 0 0", transition: "height 0.4s", cursor: "default", position: "relative" }}>
                  {isP && <div style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "#f59e0b", whiteSpace: "nowrap" }}>{h}:00</div>}
                </div>
              )
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 4 }}>
            <span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ ...s.statCard, borderColor: `${color}33` }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
    </div>
  )
}

/* ─── Insights Panel ─── */
function InsightsPanel({ insights }) {
  if (insights.length === 0) return <EmptyState icon="💡" text="لا توجد رؤى ذكية حالياً — النظام يعمل بشكل مثالي" />
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {insights.map((ins, i) => {
        const bg = ins.priority === 1 ? "rgba(239,68,68,0.08)" : ins.priority === 2 ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.08)"
        const border = ins.priority === 1 ? "#7f1d1d" : ins.priority === 2 ? "#92400e" : "#1e3a5f"
        return (
          <div key={i} style={{ ...s.insightCard, background: bg, borderColor: border }}>
            <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
              <span style={{ fontSize: 24 }}>{ins.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#f8fafc", marginBottom: 4 }}>{ins.title}</div>
                <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{ins.message}</div>
                {ins.action && (
                  <div style={{ marginTop: 8 }}>
                    <span style={s.actionTag}>🎯 {ins.action}</span>
                  </div>
                )}
              </div>
              <span style={{ ...s.priorityDot, background: ins.priority === 1 ? "#ef4444" : ins.priority === 2 ? "#f59e0b" : "#3b82f6" }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Heatmap Panel ─── */
function HeatmapPanel({ hotspots, recurring, locations }) {
  const getLocName = (id) => locations.find(l => l.id === id)?.name || id
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={s.card}>
        <h4 style={s.cardTitle}>🔥 البؤر الساخنة</h4>
        {hotspots.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>لا توجد بؤر ساخنة — أداء ممتاز!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hotspots.map((h, i) => {
              const heatColor = h.heatLevel === "critical" ? "#ef4444" : h.heatLevel === "high" ? "#f97316" : "#eab308"
              return (
                <div key={i} style={{ ...s.heatRow, borderRightColor: heatColor }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>📍 {getLocName(h.location)}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                      {h.total} ملاحظة • {h.open} مفتوحة • {h.urgent} عاجلة • أعلى من المتوسط بـ {h.ratio}x
                    </div>
                  </div>
                  <span style={{ ...s.heatBadge, background: `${heatColor}22`, color: heatColor }}>
                    {h.heatLevel === "critical" ? "حرج" : h.heatLevel === "high" ? "مرتفع" : "متوسط"}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={s.card}>
        <h4 style={s.cardTitle}>🔄 المشاكل المتكررة</h4>
        {recurring.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>لا توجد مشاكل متكررة ملحوظة</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recurring.slice(0, 8).map((r, i) => (
              <div key={i} style={s.recurringRow}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                  {tradeOf(r.trade).icon} {tradeOf(r.trade).label} — {getLocName(r.location)}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{r.count} تكرار</span>
                <span style={{ ...s.severityBadge, background: r.severity === "critical" ? "#ef444422" : r.severity === "high" ? "#f9731622" : "#eab30822", color: r.severity === "critical" ? "#ef4444" : r.severity === "high" ? "#f97316" : "#eab308" }}>
                  {r.severity === "critical" ? "حرج" : r.severity === "high" ? "مرتفع" : "متوسط"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Trends Panel ─── */
function TrendsPanel({ trends, peakTimes }) {
  const trendData = trends.trends || []
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={s.card}>
        <h4 style={s.cardTitle}>📈 اتجاهات التخصصات</h4>
        {trendData.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>لا توجد بيانات كافية للتحليل</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {trendData.slice(0, 10).map((t, i) => {
              const tr = tradeOf(t.trade)
              const arrow = t.direction === "up" ? "↑" : t.direction === "down" ? "↓" : "→"
              const arrowColor = t.direction === "up" ? "#ef4444" : t.direction === "down" ? "#10b981" : "#94a3b8"
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0a1628", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <span>{tr.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{tr.label}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>هذا الأسبوع: {t.thisWeek}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: arrowColor }}>{arrow}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: arrowColor }}>{t.changePercent > 0 ? "+" : ""}{t.changePercent}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Predictions */}
      {(trends.predictions || []).length > 0 && (
        <div style={s.card}>
          <h4 style={s.cardTitle}>🔮 تنبؤات الأسبوع القادم</h4>
          {trends.predictions.map((p, i) => (
            <div key={i} style={{ ...s.predictionRow }}>
              <span>{tradeOf(p.trade).icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}>{p.warning}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>ثقة: {p.confidence}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Estimates */}
      {(trends.resolutionEstimates || []).length > 0 && (
        <div style={s.card}>
          <h4 style={s.cardTitle}>⏱️ متوسط وقت الحل حسب التخصص</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {trends.resolutionEstimates.sort((a,b) => b.avgDays - a.avgDays).map((r, i) => (
              <div key={i} style={{ background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{tradeOf(r.trade).icon} {tradeOf(r.trade).label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: r.avgDays > 7 ? "#ef4444" : r.avgDays > 3 ? "#f59e0b" : "#10b981", marginTop: 4 }}>{r.avgDays} يوم</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Anomalies Panel ─── */
function AnomaliesPanel({ anomalies, duplicates }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={s.card}>
        <h4 style={s.cardTitle}>⚠️ التنبيهات الذكية</h4>
        {anomalies.length === 0 ? (
          <EmptyState icon="✅" text="لا توجد تنبيهات — النظام يعمل ضمن الحدود الطبيعية" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {anomalies.map((a, i) => {
              const color = a.level === "critical" ? "#ef4444" : "#f59e0b"
              return (
                <div key={i} style={{ padding: "12px 14px", background: `${color}08`, border: `1px solid ${color}33`, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>{a.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#f8fafc" }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{a.message}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {duplicates.length > 0 && (
        <div style={s.card}>
          <h4 style={s.cardTitle}>📋 ملاحظات مكررة محتملة</h4>
          {duplicates.slice(0, 5).map((g, i) => (
            <div key={i} style={{ padding: "10px 14px", background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                {(g.primary.description || "").substring(0, 60)}...
              </div>
              <div style={{ fontSize: 12, color: "#06b6d4", marginTop: 4 }}>
                {g.count} ملاحظة متشابهة
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  )
}

/* ─── Styles ─── */
const s = {
  container: { background: "rgba(10,22,40,0.8)", borderRadius: 20, padding: 24, border: "1px solid #1e293b", color: "#e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 16 },
  title: { fontSize: 22, fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: 10 },
  aiGlow: { fontSize: 28, filter: "drop-shadow(0 0 8px rgba(99,102,241,0.6))" },
  subtitle: { fontSize: 13, color: "#64748b", margin: "4px 0 0" },
  healthBadge: { textAlign: "center", padding: "12px 20px", borderRadius: 14, border: "1px solid", minWidth: 90 },
  nav: { display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 },
  navBtn: { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10, padding: "8px 14px", color: "#94a3b8", cursor: "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", transition: "0.2s" },
  navActive: { background: "linear-gradient(135deg, #1e1b4b, #312e81)", color: "#c4b5fd", borderColor: "#4c1d95" },
  panelGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 },
  statCard: { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 14, padding: "16px 14px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  card: { background: "#0a1628", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 18px" },
  cardTitle: { fontSize: 15, fontWeight: 800, marginTop: 0, marginBottom: 14, color: "#e2e8f0" },
  insightRow: { display: "flex", gap: 10, alignItems: "start", padding: "10px 12px", background: "rgba(30,41,59,0.4)", borderRadius: 10, border: "1px solid rgba(51,65,85,0.3)" },
  insightCard: { padding: "14px 16px", border: "1px solid", borderRadius: 14 },
  actionTag: { fontSize: 11, background: "rgba(59,130,246,0.15)", color: "#60a5fa", padding: "3px 8px", borderRadius: 6, fontWeight: 600, whiteSpace: "nowrap" },
  priorityDot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  heatRow: { padding: "12px 14px", background: "rgba(15,23,42,0.6)", borderRadius: 10, borderRight: "4px solid", display: "flex", alignItems: "center", gap: 12 },
  heatBadge: { padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 },
  recurringRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(15,23,42,0.5)", borderRadius: 8 },
  severityBadge: { padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 },
  predictionRow: { display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", background: "rgba(251,191,36,0.05)", borderRadius: 10, border: "1px solid rgba(251,191,36,0.15)", marginBottom: 8 },
}
