import React, { useMemo, useState } from "react"
import ConfirmDialog from "./ConfirmDialog.jsx"
import { TRADES, TYPES, PRIORITIES, PARK_ST_TRACKS, tradeOf, priOf, staOf, typeOf, avatarColor, formatDate } from "../constants/index.js"
import { useLocations } from "../hooks/useLocations.js"

const FILTER_TABS = [
  { id:"all",         label:"الكل" },
  { id:"open",        label:"🔴 مفتوح" },
  { id:"in-progress", label:"🟡 قيد التنفيذ" },
  { id:"closed",      label:"✅ مغلق" },
]

const STATUS_OPTIONS = [
  { id: "open",        label: "🔴 مفتوح" },
  { id: "in-progress", label: "🟡 قيد التنفيذ" },
  { id: "closed",      label: "✅ مغلق" },
]

const SECTOR_MATCH_MAP = {
  "security": {
    trades: ["security"],
    locations: ["security-points", "mall-entrances"],
  },
  "customer-journey": {
    trades: ["customer-journey"],
    locations: ["customer-journey", "mall-entrances", "plaza"],
  },
  "landscape": {
    trades: ["landscape"],
    locations: ["landscape-gardens"],
  },
  "traffic-parking": {
    trades: ["traffic-parking"],
    locations: ["basement-car-path", "basement-ramps", "garage-b1", "garage-b2"],
  },
}

function matchesSector(snag, sectorId) {
  if (!sectorId || sectorId === "all") return true
  const rule = SECTOR_MATCH_MAP[sectorId]
  if (!rule) return true
  return rule.trades.includes(snag.trade) || rule.locations.includes(snag.location)
}

export default function SnagList({ snags, onCycleStatus, onRemove, onUpdate, onFilteredChange, currentUser, externalStatusFilter, onExternalStatusChange }) {
  const { locations } = useLocations()
  const [query,          setQuery]          = useState("")
  const [filterSector,   setFilterSector]   = useState("all")
  const [filterTrade,    setFilterTrade]    = useState("all")
  const [filterLocation, setFilterLocation] = useState("all")
  const [filterType,     setFilterType]     = useState("all")

  // Use external status filter if provided (controlled by StatBar), else internal
  const filterStatus = externalStatusFilter ?? "all"
  const setFilterStatus = (val) => { if (onExternalStatusChange) onExternalStatusChange(val) }

  const sectorCounts = useMemo(() => {
    const counts = { all: snags.length }
    for (const track of PARK_ST_TRACKS) {
      counts[track.id] = snags.filter(sn => matchesSector(sn, track.id)).length
    }
    return counts
  }, [snags])

  const filtered = useMemo(() => {
    return snags.filter((s) => {
      const matchSector = matchesSector(s, filterSector)
      const matchStatus = filterStatus === "all" || 
                          (filterStatus === "urgent" ? s.priority === "urgent" : s.status === filterStatus)
      const matchTrade  = filterTrade    === "all" || s.trade    === filterTrade
      const matchLoc    = filterLocation === "all" || s.location === filterLocation
      const matchType   = filterType     === "all" || s.type     === filterType
      
      const q = query.trim().toLowerCase()
      // Look up location name from dynamic locations first, then fallback to static
      const locName = (locations.find(l => l.id === s.location)?.name ||
                       tradeOf(s.location)?.label || "").toLowerCase()
      const matchQuery  =
        !q ||
        (s.description || "").toLowerCase().includes(q) ||
        (s.inspector || "").toLowerCase().includes(q)   ||
        tradeOf(s.trade).label.toLowerCase().includes(q) ||
        locName.includes(q)

      return matchSector && matchStatus && matchTrade && matchLoc && matchType && matchQuery
    })
  }, [snags, filterSector, filterStatus, filterTrade, filterLocation, filterType, query, locations])

  // Inform parent when filtered list changes — use stable IDs to prevent infinite loop
  const filteredIds = useMemo(() => filtered.map(s => s.id).join(","), [filtered])
  React.useEffect(() => {
    if (onFilteredChange) {
      onFilteredChange(filtered)
    }
  }, [filteredIds]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={s.card}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <h3 style={{ fontWeight:800, fontSize:17 }}>قائمة الملاحظات</h3>
        <span style={{ color:"#475569", fontSize:13 }}>{filtered.length} / {snags.length}</span>
      </div>

      {/* ── Park St. Main Sectors Filter Bar ── */}
      <div style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        marginBottom: 12,
        padding: "8px 10px",
        background: "#060d1a",
        borderRadius: 12,
        border: "1px solid #1e293b",
      }}>
        <button
          type="button"
          onClick={() => setFilterSector("all")}
          style={{
            border: `1px solid ${filterSector === "all" ? "#38bdf8" : "#1e293b"}`,
            background: filterSector === "all" ? "rgba(56,189,248,0.18)" : "#0f172a",
            color: filterSector === "all" ? "#38bdf8" : "#94a3b8",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          📋 كل القطاعات ({sectorCounts.all || 0})
        </button>
        {PARK_ST_TRACKS.map(track => {
          const active = filterSector === track.id
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => setFilterSector(active ? "all" : track.id)}
              style={{
                border: `1px solid ${active ? track.color : "#1e293b"}`,
                background: active ? `${track.color}25` : "#0f172a",
                color: active ? track.color : "#cbd5e1",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{track.icon}</span>
              <span>{track.title}</span>
              <span style={{
                background: active ? track.color : "#1e293b",
                color: active ? "#fff" : "#94a3b8",
                borderRadius: 999,
                padding: "1px 6px",
                fontSize: 10,
              }}>
                {sectorCounts[track.id] || 0}
              </span>
            </button>
          )
        })}
      </div>

      <input style={s.input} placeholder="🔍 بحث في الوصف أو الموقع أو المشرف..." value={query} onChange={(e) => setQuery(e.target.value)} />
      
      {/* ── Custom Filters ── */}
      <div style={{ display:"flex", gap:8, marginTop: 10, flexWrap: "wrap" }}>
        <select style={{...s.input, flex:1, minWidth:110}} value={filterTrade} onChange={e => setFilterTrade(e.target.value)}>
          <option value="all">كل التخصصات</option>
          {TRADES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>
        <select style={{...s.input, flex:1, minWidth:110}} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
          <option value="all">كل المواقع</option>
          {locations.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select>
        <select style={{...s.input, flex:1, minWidth:110}} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">كل الأنواع</option>
          {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", margin:"12px 0 10px" }}>
        {FILTER_TABS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilterStatus(f.id)}
            style={{ ...s.tab, ...(filterStatus === f.id ? s.tabActive : {}) }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:"#334155" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🗂️</div>
          لا توجد ملاحظات مطابقة
        </div>
      ) : (
        <div style={s.list}>
          {filtered.map((snag) => (
            <SnagCard key={snag.id} snag={snag} locations={locations} currentUser={currentUser} onCycleStatus={onCycleStatus} onRemove={onRemove} onEdit={onUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}

function SnagCard({ snag: s, currentUser, locations = [], onCycleStatus, onRemove, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [viewingDetails, setViewingDetails] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [editForm, setEditForm] = useState({
    description: s.description,
    location:    s.location,
    trade:       s.trade,
    type:        s.type,
    priority:    s.priority,
    status:      s.status,
  })

  const tr = tradeOf(s.trade)
  const lo = locations.find(l => l.id === s.location) || { name: s.location || "-", icon: "📍" }
  const pr = priOf(s.priority)
  const st = staOf(s.status)
  const ty = typeOf(s.type)

  function confirmRemove() {
    setShowConfirm(true)
  }

  function handleSaveEdit() {
    const updates = {}
    if (editForm.description.trim() !== s.description) updates.description = editForm.description.trim()
    if (editForm.location !== s.location) updates.location = editForm.location
    if (editForm.trade !== s.trade) updates.trade = editForm.trade
    if (editForm.type !== s.type) updates.type = editForm.type
    if (editForm.priority !== s.priority) updates.priority = editForm.priority
    if (editForm.status !== s.status) updates.status = editForm.status
    if (Object.keys(updates).length > 0) {
      onEdit(s.id, updates)
    }
    setEditing(false)
  }

  function startEdit() {
    setEditForm({
      description: s.description,
      location: s.location,
      trade: s.trade,
      type: s.type,
      priority: s.priority,
      status: s.status,
    })
    setEditing(true)
  }

  function setField(key, val) {
    setEditForm(prev => ({ ...prev, [key]: val }))
  }

  // ── Edit mode ──
  if (editing) {
    return (
      <div style={{ ...cs.item, borderRight: `4px solid #3b82f6`, background: "#0a1628" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#60a5fa", marginBottom: 12 }}>✏️ تعديل الملاحظة</div>

        <div style={cs.editField}>
          <label style={cs.editLabel}>الوصف</label>
          <textarea style={{ ...cs.editInput, minHeight: 60 }} value={editForm.description} onChange={(e) => setField("description", e.target.value)} />
        </div>

        <div style={cs.editRow}>
          <div style={cs.editField}>
            <label style={cs.editLabel}>الموقع</label>
            <select style={cs.editInput} value={editForm.location} onChange={(e) => setField("location", e.target.value)}>
              {locations.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
            </select>
          </div>
          <div style={cs.editField}>
            <label style={cs.editLabel}>التخصص</label>
            <select style={cs.editInput} value={editForm.trade} onChange={(e) => setField("trade", e.target.value)}>
              {TRADES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
            </select>
          </div>
        </div>

        <div style={cs.editRow}>
          <div style={cs.editField}>
            <label style={cs.editLabel}>النوع</label>
            <select style={cs.editInput} value={editForm.type} onChange={(e) => setField("type", e.target.value)}>
              {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div style={cs.editField}>
            <label style={cs.editLabel}>الأولوية</label>
            <select style={cs.editInput} value={editForm.priority} onChange={(e) => setField("priority", e.target.value)}>
              {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.dot} {p.label}</option>)}
            </select>
          </div>
          <div style={cs.editField}>
            <label style={cs.editLabel}>الحالة</label>
            <select style={cs.editInput} value={editForm.status} onChange={(e) => setField("status", e.target.value)}>
              {STATUS_OPTIONS.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={{ ...cs.btn, background: "#10b981", color: "white", flex: 1 }} onClick={handleSaveEdit}>💾 حفظ التعديل</button>
          <button style={{ ...cs.btn, ...cs.ghost }} onClick={() => setEditing(false)}>❌ إلغاء</button>
        </div>
      </div>
    )
  }

  const isCreator = currentUser && (s.userEmail === currentUser.email || s.inspector === currentUser.displayName || s.inspector === currentUser.email)
  const isAdmin   = currentUser && currentUser.role === "admin"
  const canEditDelete = isCreator || isAdmin

  // ── View mode ──
  return (
    <div id={`snag-${s.id}`} style={{ ...cs.item, borderRight:`4px solid ${pr.color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"start", flexWrap:"wrap" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15 }}>{lo.icon} {lo.name}</div>
          <div style={{ color:"#94a3b8", marginTop:6, lineHeight:1.7, fontSize:14 }}>{s.description}</div>
        </div>
        <div style={cs.badges}>
          <Badge color={tr.color}>{tr.icon} {tr.label}</Badge>
          <Badge color={ty.color}>{ty.label}</Badge>
          <Badge color={st.color}>{st.label}</Badge>
          <Badge color={pr.color}>{pr.dot} {pr.label}</Badge>
        </div>
      </div>

      {s.attachments?.length > 0 && (
        <div style={cs.thumbs}>
          {s.attachments.map((f) => {
            const url = f.storageUrl || f.dataUrl
            if (!url) return <span key={f.id} style={cs.fileLink}>📎 {f.name}</span>
            return f.type?.startsWith("image/") ? (
              <a key={f.id} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={f.name} style={cs.thumb} />
              </a>
            ) : (
              <a key={f.id} href={url} download={f.name} style={cs.fileLink}>
                📎 {f.name}
              </a>
            )
          })}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, marginTop:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, color:"#475569", fontSize:13 }}>
          <div style={{ ...cs.avatar, background: avatarColor(s.inspector) }}>
            {s.inspector?.[0] || "م"}
          </div>
          <span style={{ color:"#94a3b8" }}>{s.inspector}</span>
          <span>•</span>
          <span style={{ color:"#475569", fontSize:12 }}>{formatDate(s.timestamp)}</span>
        </div>
        <div style={{ display:"flex", gap:8 }} className="snag-actions">
          <button type="button" style={{ ...cs.btn, background:"#059669", color:"#d1fae5", border:"1px solid #047857" }} onClick={() => setViewingDetails(true)}>
            📋 تفاصيل
          </button>
          {/* Only show edit/delete if current user is the creator or admin */}
          {canEditDelete && (
            <>
              <button type="button" style={{ ...cs.btn, background:"#0c1e3a", color:"#60a5fa", border:"1px solid #1e3a5f" }} onClick={startEdit}>
                ✏️ تعديل
              </button>
              <button type="button" style={{ ...cs.btn, background:"#1c0a0a", color:"#fca5a5", border:"1px solid #7f1d1d" }} onClick={confirmRemove}>
                حذف
              </button>
            </>
          )}
          {/* Anyone can change status */}
          <button type="button" style={{ ...cs.btn, ...cs.ghost }} onClick={() => onCycleStatus(s.id)}>
            تغيير الحالة
          </button>
        </div>
      </div>
      
      {showConfirm && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد أنك تريد حذف هذه الملاحظة نهائياً؟"
          onConfirm={() => { setShowConfirm(false); onRemove(s.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* ── View Details Modal ── */}
      {viewingDetails && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 }} onClick={() => setViewingDetails(false)}>
          <div style={{ background: "#0f172a", padding: 24, borderRadius: 16, border: "1px solid #1e293b", width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📋 تفاصيل الملاحظة</h3>
              <button style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }} onClick={() => setViewingDetails(false)}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "rgba(30,41,59,0.5)", padding: "14px", borderRadius: 8, border: "1px solid rgba(51,65,85,0.5)" }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>الوصف</div>
                <div style={{ fontSize: 15, color: "#f8fafc", lineHeight: 1.6 }}>{s.description}</div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px" }} className="details-grid">
                <DetailRow label="الموقع" value={`${lo.icon} ${lo.name}`} />
                <DetailRow label="التخصص" value={`${tr.icon} ${tr.label}`} />
                <DetailRow label="النوع" value={ty.label} />
                <DetailRow label="الأولوية" value={`${pr.dot} ${pr.label}`} />
                <DetailRow label="الحالة" value={st.label} />
                <DetailRow label="المشرف" value={s.inspector} />
                <DetailRow label="تاريخ الإنشاء" value={formatDate(s.timestamp)} />
              </div>
              
              {s.attachments?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>المرفقات</div>
                  <div style={cs.thumbs}>
                    {s.attachments.map((f) => {
                      const url = f.storageUrl || f.dataUrl
                      if (!url) return <span key={f.id} style={cs.fileLink}>📎 {f.name}</span>
                      return f.type?.startsWith("image/") ? (
                        <a key={f.id} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={f.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #334155" }} />
                        </a>
                      ) : (
                        <a key={f.id} href={url} download={f.name} style={cs.fileLink}>
                          📎 {f.name}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button style={{ ...cs.btn, background: "#334155" }} onClick={() => setViewingDetails(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: 14, color: "#f8fafc", background: "rgba(30,41,59,0.5)", padding: "10px 14px", borderRadius: 8, minHeight: 40, border: "1px solid rgba(51,65,85,0.5)" }}>
        {value || "-"}
      </span>
    </div>
  )
}

function Badge({ color, children }) {
  return (
    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:999, fontWeight:700,
      background:`${color}22`, color, whiteSpace:"nowrap" }}>
      {children}
    </span>
  )
}

const s = {
  card:    { background:"#0a1628", border:"1px solid #1e293b", borderRadius:18, padding:18 },
  input:   { width:"100%", padding:"11px 13px", borderRadius:10, border:"1px solid #1e293b", background:"#060d1a", color:"#e2e8f0", fontSize:14 },
  tab:     { border:"1px solid #1e293b", borderRadius:8, padding:"7px 12px", cursor:"pointer", background:"#060d1a", color:"#64748b", fontWeight:700, fontSize:12 },
  tabActive:{ background:"#f59e0b", color:"white", borderColor:"#f59e0b" },
  list:    { display:"flex", flexDirection:"column", gap:10, marginTop:10 },
}

const cs = {
  item:      { background:"#060d1a", border:"1px solid #1e293b", borderRadius:14, padding:14 },
  badges:    { display:"flex", flexWrap:"wrap", gap:5, justifyContent:"flex-end" },
  thumbs:    { display:"flex", flexWrap:"wrap", gap:8, marginTop:10 },
  thumb:     { width:68, height:52, borderRadius:8, objectFit:"cover", border:"1px solid #1e293b" },
  fileLink:  { textDecoration:"none", color:"#93c5fd", border:"1px solid #1e293b", borderRadius:8, padding:"6px 10px", background:"#060d1a", fontSize:12 },
  avatar:    { width:28, height:28, borderRadius:999, display:"grid", placeItems:"center", color:"white", fontWeight:800, fontSize:13 },
  btn:       { border:0, borderRadius:8, padding:"7px 12px", cursor:"pointer", fontWeight:700, fontSize:13 },
  ghost:     { background:"#0f172a", color:"#94a3b8", border:"1px solid #1e293b" },
  editRow:   { display:"flex", gap:10, flexWrap:"wrap", marginBottom:10 },
  editField: { flex:1, minWidth:120, display:"flex", flexDirection:"column" },
  editLabel: { fontSize:11, color:"#94a3b8", fontWeight:700, marginBottom:4 },
  editInput: { width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #1e293b", background:"#0f172a", color:"#e2e8f0", fontSize:13, boxSizing:"border-box" },
}
