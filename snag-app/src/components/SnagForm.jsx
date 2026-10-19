import React, { useEffect, useRef, useState } from "react"
import { LOCATIONS, TRADES, TYPES, PRIORITIES, DEFAULT_FORM, PARK_ST_TRACKS, tradeOf, typeOf, priOf } from "../constants/index.js"
import { classifyAll } from "../utils/classify.js"
import { classifyNCRI } from "../ai/ncri.js"
import { useAttachments } from "../hooks/useAttachments.js"
import { useLocations } from "../hooks/useLocations.js"
import CameraModal from "./CameraModal.jsx"

export default function SnagForm({ onAdd, userName, userEmail, notify }) {
  const { locations, addLocation, removeLocation } = useLocations()
  const [form, setForm]   = useState({ ...DEFAULT_FORM, inspector: userName || DEFAULT_FORM.inspector })
  const [dragOn, setDragOn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [activeTrackId, setActiveTrackId] = useState(null)
  const fileRef = useRef(null)
  const { attachments, addFiles, removeFile, clear } = useAttachments()

  const activeTrack = PARK_ST_TRACKS.find(t => t.id === activeTrackId) || null

  function selectTrack(track) {
    if (activeTrackId === track.id) {
      setActiveTrackId(null)
      return
    }
    setActiveTrackId(track.id)
    setForm(prev => ({
      ...prev,
      location: track.defaultLocation,
      trade: track.defaultTrade,
    }))
  }

  function applyQuickItem(track, item) {
    setForm(prev => ({
      ...prev,
      description: item.desc,
      location: item.location || track.defaultLocation,
      trade: track.defaultTrade,
      type: item.type || "maintenance",
      priority: item.priority || "medium",
    }))
    if (notify) notify("info", `تم اختيار: ${item.label}`)
  }

  // 🤖 Auto-classify trade + type + priority + validate location (NCRI v2)
  useEffect(() => {
    const desc = form.description.trim()
    if (!desc) {
      setAiResult(null)
      return
    }
    const legacy = classifyAll(desc, form.location, locations)
    const ncri = classifyNCRI(desc)
    const merged = {
      ...legacy,
      trade: ncri.primaryTrade,
      type: ncri.type,
      priority: ncri.priority,
      confidence: ncri.primaryConfidence,
      riskScore: ncri.riskScore,
      dangerAlerts: ncri.dangerAlerts,
      priorityEscalated: ncri.priorityEscalated,
      secondaryTrades: ncri.secondaryTrades,
    }
    setAiResult(merged)
    setForm((prev) => ({
      ...prev,
      trade:    merged.trade,
      type:     merged.type,
      priority: merged.priority,
      ...(legacy.location ? { location: legacy.location } : {}),
    }))
  }, [form.description])

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleAddLocation() {
    const name = window.prompt("أدخل اسم الموقع الجديد:")
    if (!name || !name.trim()) return
    const emoji = window.prompt("أدخل رمز تعبيري (Emoji) للموقع (اختياري، مثلاً: 📍):", "📍") || "📍"
    
    try {
      const docRef = await addLocation(name.trim(), emoji)
      if (docRef?.id) {
        set("location", docRef.id)
        if (notify) notify("add", `تمت إضافة موقع جديد: ${name.trim()}`)
      }
    } catch (err) {
      alert("حدث خطأ أثناء إضافة الموقع")
    }
  }

  async function handleRemoveLocation() {
    if (!form.location) return
    if (LOCATIONS.some(l => l.id === form.location)) {
      alert("لا يمكن حذف المواقع الأساسية للنظام")
      return
    }
    const locName = locations.find(l => l.id === form.location)?.name
    if (!window.confirm(`هل أنت متأكد من حذف موقع "${locName}"؟`)) return

    try {
      await removeLocation(form.location)
      set("location", LOCATIONS[0].id)
      if (notify) notify("delete", `تم حذف الموقع: ${locName}`)
    } catch (err) {
      alert("حدث خطأ أثناء حذف الموقع")
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim()) { alert("اكتب وصف الملاحظة أولاً"); return }
    if (saving) return
    setSaving(true)
    try {
      await onAdd({ ...form, userEmail }, attachments)
      setForm((prev) => ({ ...DEFAULT_FORM, inspector: prev.inspector }))
      clear()
      setAiResult(null)
    } catch (err) {
      console.error("Submit error:", err)
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setForm((prev) => ({ ...DEFAULT_FORM, inspector: prev.inspector }))
    clear()
    setAiResult(null)
  }

  async function onPickFiles(e) {
    await addFiles(e.target.files)
    e.target.value = ""
  }

  async function onDrop(e) {
    e.preventDefault()
    setDragOn(false)
    await addFiles(e.dataTransfer.files)
  }

  const detectedTrade = tradeOf(form.trade)
  const detectedType  = typeOf(form.type)
  const detectedPri   = priOf(form.priority)

  return (
    <form style={s.card} onSubmit={handleSubmit}>
      <h3 style={s.heading}>➕ إضافة ملاحظة جديدة</h3>

      {/* ⚡ Park St. Quick Inspection Tracks */}
      <div style={{
        background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.75))",
        border: "1px solid #1e293b",
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>
            ⚡ الفحص السريع — بارك ستريت (Park St.)
          </div>
          <span style={{ fontSize: 10, color: "#64748b" }}>اختر القطاع لتعبئة الملاحظة بضغطة واحدة</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PARK_ST_TRACKS.map(track => {
            const isSelected = activeTrackId === track.id
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => selectTrack(track)}
                style={{
                  background: isSelected ? `${track.color}22` : "#060d1a",
                  border: `1.5px solid ${isSelected ? track.color : "#1e293b"}`,
                  borderRadius: 10,
                  padding: "9px 10px",
                  cursor: "pointer",
                  textAlign: "right",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 20 }}>{track.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isSelected ? track.color : "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.items.length} بنود جاهزة
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {activeTrack && (
          <div style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid #1e293b",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: activeTrack.color }}>
                {activeTrack.icon} بنود فحص {activeTrack.title}:
              </span>
              <button
                type="button"
                onClick={() => setActiveTrackId(null)}
                style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 11, cursor: "pointer" }}
              >
                إخفاء ▲
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 195, overflowY: "auto", paddingLeft: 2 }}>
              {activeTrack.items.map((item, idx) => {
                const isCurrent = form.description === item.desc
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyQuickItem(activeTrack, item)}
                    style={{
                      background: isCurrent ? activeTrack.color : "#0f172a",
                      color: isCurrent ? "#fff" : "#cbd5e1",
                      border: `1px solid ${isCurrent ? activeTrack.color : "#334155"}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "right",
                    }}
                  >
                    {item.priority === "urgent" ? "🔴 " : "🟡 "}{item.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Inspector */}
      <Field label="اسم المشرف">
        <input style={s.input} value={form.inspector} onChange={(e) => set("inspector", e.target.value)} />
      </Field>

      {/* Location */}
      <Field label="الموقع">
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...s.input, flex: 1 }} value={form.location} onChange={(e) => set("location", e.target.value)}>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
          </select>
          <button 
            type="button" 
            style={{ ...s.btn, background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", padding: "0 12px", width: "auto" }}
            onClick={handleAddLocation}
            title="إضافة موقع جديد"
          >
            ➕
          </button>
          <button 
            type="button" 
            style={{ ...s.btn, background: "#450a0a", color: "#f87171", border: "1px solid #7f1d1d", padding: "0 12px", width: "auto" }}
            onClick={handleRemoveLocation}
            title="حذف الموقع المحدد"
          >
            🗑️
          </button>
        </div>
      </Field>

      {/* Description */}
      <Field label="وصف المشكلة">
        <textarea
          style={{ ...s.input, minHeight:90, resize:"vertical" }}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="مثال: عطل في ذراع البوابة بمسار السيارات بالبيزمنت، أو جفاف أشجار اللاندسكيب، أو غياب فرد الأمن..."
        />
      </Field>

      {/* 🤖 AI Classification Result (NCRI v2) */}
      {aiResult && (
        <div style={s.aiBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={s.aiTitle}>🧠 NCRI v2 — التصنيف الذكي</div>
            {aiResult.confidence > 0 && (
              <span style={{ fontSize: 11, fontWeight: 800, color: aiResult.confidence > 70 ? "#10b981" : aiResult.confidence > 40 ? "#f59e0b" : "#94a3b8" }}>
                ثقة {aiResult.confidence}%
              </span>
            )}
          </div>
          <div style={s.aiChips}>
            <span style={{ ...s.aiChip, background: `${detectedTrade.color}22`, color: detectedTrade.color }}>
              {detectedTrade.icon} {detectedTrade.label}
            </span>
            <span style={{ ...s.aiChip, background: `${detectedType.color}22`, color: detectedType.color }}>
              {detectedType.label}
            </span>
            <span style={{ ...s.aiChip, background: `${detectedPri.color}22`, color: detectedPri.color }}>
              {detectedPri.dot} {detectedPri.label}
            </span>
            {aiResult.riskScore > 0 && (
              <span style={{ ...s.aiChip, background: aiResult.riskScore > 60 ? "#ef444422" : aiResult.riskScore > 30 ? "#f59e0b22" : "#10b98122", color: aiResult.riskScore > 60 ? "#ef4444" : aiResult.riskScore > 30 ? "#f59e0b" : "#10b981" }}>
                خطورة {aiResult.riskScore}%
              </span>
            )}
          </div>
          {/* Secondary trades */}
          {aiResult.secondaryTrades?.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>تخصصات ثانوية:</span>
              {aiResult.secondaryTrades.map((st, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#1e293b", color: "#94a3b8" }}>
                  {st.icon} {st.label} ({st.confidence}%)
                </span>
              ))}
            </div>
          )}
          {/* 🚨 Danger Alerts */}
          {aiResult.dangerAlerts?.length > 0 && (
            <div style={{ ...s.warningBox, background: "rgba(239,68,68,0.1)", borderColor: "#7f1d1d" }}>
              {aiResult.dangerAlerts.map((d, i) => (
                <div key={i} style={{ ...s.warningItem, color: "#fca5a5" }}>🚨 {d.reason}</div>
              ))}
              {aiResult.priorityEscalated && (
                <div style={{ ...s.warningItem, color: "#ef4444", marginTop: 4 }}>⬆️ تم تصعيد الأولوية تلقائياً إلى عاجل</div>
              )}
            </div>
          )}
          {/* ⚠️ Smart Warnings */}
          {aiResult.warnings?.length > 0 && (
            <div style={s.warningBox}>
              {aiResult.warnings.map((w, i) => (
                <div key={i} style={s.warningItem}>⚠️ {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trade + Type + Priority */}
      <div className="form-row">
        <Field label="التخصص">
          <select style={s.input} value={form.trade} onChange={(e) => set("trade", e.target.value)}>
            {TRADES.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
          </select>
        </Field>
        <Field label="النوع">
          <select style={s.input} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="الأولوية">
        <select style={s.input} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.dot} {p.label}</option>)}
        </select>
      </Field>

      {/* Drop zone + Camera Capture */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          style={{
            flex: 1,
            minWidth: 150,
            background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "14px 16px",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
          }}
        >
          <span>📷 التقاط بالكاميرا</span>
          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>تصوير مباشر فوري</span>
        </button>

        <div
          style={{ ...s.drop, flex: 1, minWidth: 160, marginBottom: 0, borderColor: dragOn ? "#f59e0b" : "#1e293b" }}
          onDragOver={(e) => { e.preventDefault(); setDragOn(true) }}
          onDragLeave={() => setDragOn(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" multiple hidden
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls" onChange={onPickFiles} 
            onClick={(e) => e.stopPropagation()} />
          <div style={{ fontWeight:800 }}>📎 أرفق صور أو ملفات</div>
          <div style={{ color:"#475569", fontSize:11, marginTop:4 }}>من الاستوديو أو الجهاز (حد 4)</div>
        </div>
      </div>

      {showCamera && (
        <CameraModal
          onCapture={file => addFiles([file])}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div style={s.thumbs}>
          {attachments.map((f) => (
            <div key={f.id} style={{ position:"relative" }}>
              {f.type.startsWith("image/")
                ? <img src={f.dataUrl} alt={f.name} style={s.thumb} />
                : <div style={s.fileBadge}>📄 {f.name}</div>
              }
              <button type="button" onClick={() => removeFile(f.id)} style={s.removeBtn}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:10, marginTop:16 }}>
        <button type="submit" disabled={saving} style={{ ...s.btn, ...s.primary, flex:1, opacity: saving ? 0.6 : 1 }}>
          {saving ? "⏳ جاري الحفظ..." : "إضافة الملاحظة"}
        </button>
        <button type="button" style={{ ...s.btn, ...s.ghost }} onClick={reset}>تفريغ</button>
      </div>
    </form>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display:"block", marginBottom:12 }}>
      <div style={{ fontSize:12, color:"#64748b", fontWeight:700, marginBottom:5 }}>{label}</div>
      {children}
    </label>
  )
}

const s = {
  card:      { background:"#0a1628", border:"1px solid #1e293b", borderRadius:18, padding:18 },
  heading:   { marginBottom:16, fontWeight:800, fontSize:17 },
  input:     { width:"100%", padding:"11px 13px", borderRadius:10, border:"1px solid #1e293b", background:"#060d1a", color:"#e2e8f0", fontSize:14 },
  aiBox:     { background:"linear-gradient(135deg, #0f172a, #1a1040)", border:"1px solid #3b82f6", borderRadius:14, padding:"12px 14px", marginBottom:14 },
  aiTitle:   { fontSize:12, color:"#60a5fa", fontWeight:800, marginBottom:8 },
  aiChips:   { display:"flex", flexWrap:"wrap", gap:8 },
  aiChip:    { fontSize:12, padding:"4px 10px", borderRadius:999, fontWeight:700, whiteSpace:"nowrap" },
  warningBox:{ marginTop:10, background:"rgba(234, 179, 8, 0.08)", border:"1px solid #92400e", borderRadius:10, padding:"10px 12px" },
  warningItem:{ fontSize:12, color:"#fbbf24", fontWeight:700, lineHeight:2 },
  drop:      { border:"2px dashed", borderRadius:14, padding:16, textAlign:"center", cursor:"pointer", background:"#060d1a", marginBottom:12, transition:"border-color .2s" },
  thumbs:    { display:"flex", flexWrap:"wrap", gap:8, marginTop:8 },
  thumb:     { width:72, height:56, borderRadius:10, objectFit:"cover", border:"1px solid #1e293b" },
  fileBadge: { width:90, minHeight:56, border:"1px solid #1e293b", borderRadius:10, padding:8, fontSize:11, background:"#060d1a", color:"#94a3b8" },
  removeBtn: { position:"absolute", top:-8, left:-8, background:"#ef4444", color:"white", border:0, width:22, height:22, borderRadius:999, cursor:"pointer", fontSize:14, lineHeight:"22px", textAlign:"center" },
  btn:       { border:0, borderRadius:10, padding:"12px 16px", cursor:"pointer", fontWeight:800, fontSize:14 },
  primary:   { background:"linear-gradient(135deg,#f59e0b,#ef4444)", color:"white" },
  ghost:     { background:"#0f172a", color:"#94a3b8", border:"1px solid #1e293b" },
}
