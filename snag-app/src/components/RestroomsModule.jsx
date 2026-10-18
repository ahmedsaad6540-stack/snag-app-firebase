import React, { useState, useMemo, useRef } from "react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"
import {
  RESTROOM_ZONES,
  RESTROOM_GENDERS,
  RESTROOM_TRADES,
  RESTROOM_LOCATIONS,
  STANDARD_COMPONENTS,
  getRowHealth,
} from "../constants/restroomsData.js"
import { useRestrooms } from "../hooks/useRestrooms.js"
import { processFile } from "../utils/compress.js"
import { exportRestroomsExcel, exportRestroomsReport } from "../utils/export.js"
import ConfirmDialog from "./ConfirmDialog.jsx"

export default function RestroomsModule({ currentUser, notify, onAddSnag }) {
  const userName = currentUser?.displayName || currentUser?.email || "مشرف الفحص"
  const isAdmin = currentUser?.role === "admin"

  const {
    rows,
    dashboard,
    loading,
    saveComponentRow,
    toggleRestroomConfirmed,
    markAllRestroomOk,
    importRestroomRowsBatch,
    resetAllRestroomInspections,
  } = useRestrooms(notify)

  // Sub-views: "directory" | "inspector" | "sheet"
  const [subView, setSubView] = useState("directory")
  const [selectedRestroomKey, setSelectedRestroomKey] = useState(RESTROOM_LOCATIONS[0].restroomKey)

  // Filters for Directory & Sheet views
  const [filterZone, setFilterZone] = useState("all")
  const [filterDirection, setFilterDirection] = useState("all")
  const [filterFloor, setFilterFloor] = useState("all")
  const [filterGender, setFilterGender] = useState("all")
  const [filterTrade, setFilterTrade] = useState("all")
  const [filterHealth, setFilterHealth] = useState("all") // "all" | "defect" | "ok" | "pending"
  const [searchQuery, setSearchQuery] = useState("")

  // Modals & states
  const [editingRow, setEditingRow] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [importingExcel, setImportingExcel] = useState(false)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const importInputRef = useRef(null)

  // Dynamic filter options
  const availableDirections = useMemo(() => {
    const base = filterZone === "all" ? RESTROOM_LOCATIONS : RESTROOM_LOCATIONS.filter(l => l.building === filterZone)
    return [...new Set(base.map(l => l.direction))]
  }, [filterZone])

  const availableFloors = useMemo(() => {
    let base = RESTROOM_LOCATIONS
    if (filterZone !== "all") base = base.filter(l => l.building === filterZone)
    if (filterDirection !== "all") base = base.filter(l => l.direction === filterDirection)
    return [...new Set(base.map(l => l.floor))]
  }, [filterZone, filterDirection])

  // Filtered rows for Sheet View & Export
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows.filter(r => {
      if (filterZone !== "all" && r.building !== filterZone) return false
      if (filterDirection !== "all" && r.direction !== filterDirection) return false
      if (filterFloor !== "all" && r.floor !== filterFloor) return false
      if (filterGender !== "all" && r.gender !== filterGender) return false
      if (filterTrade !== "all" && r.trade !== filterTrade) return false
      if (filterHealth !== "all" && getRowHealth(r) !== filterHealth) return false
      if (q) {
        const hay = `${r.building} ${r.direction} ${r.floor} ${r.gender} ${r.trade} ${r.component} ${r.notes} ${r.actionRequired} ${r.inspector}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, filterZone, filterDirection, filterFloor, filterGender, filterTrade, filterHealth, searchQuery])

  // Filtered restrooms for Directory View
  const filteredRestrooms = useMemo(() => {
    return dashboard.restroomList.filter(rr => {
      if (filterZone !== "all" && rr.building !== filterZone) return false
      if (filterDirection !== "all" && rr.direction !== filterDirection) return false
      if (filterFloor !== "all" && rr.floor !== filterFloor) return false
      if (filterGender !== "all" && rr.gender !== filterGender) return false
      if (filterHealth === "defect" && rr.defectComponents === 0) return false
      if (filterHealth === "ok" && (rr.defectComponents > 0 || rr.inspectedComponents === 0)) return false
      if (filterHealth === "pending" && rr.pendingComponents === 0) return false
      return true
    })
  }, [dashboard.restroomList, filterZone, filterDirection, filterFloor, filterGender, filterHealth])

  // Currently selected restroom in Inspector View
  const currentRestroom = useMemo(() => {
    return dashboard.restroomList.find(r => r.restroomKey === selectedRestroomKey) || dashboard.restroomList[0]
  }, [dashboard.restroomList, selectedRestroomKey])

  const currentRestroomRows = useMemo(() => {
    return rows.filter(r => r.restroomKey === selectedRestroomKey && (filterTrade === "all" || r.trade === filterTrade))
  }, [rows, selectedRestroomKey, filterTrade])

  // Open a specific restroom in the Inspector View
  function openRestroomInspector(restroomKey) {
    setSelectedRestroomKey(restroomKey)
    setSubView("inspector")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Send a defective component row directly to the main Snag List
  async function handlePromoteToSnag(row) {
    if (!onAddSnag) return
    const tradeObj = RESTROOM_TRADES.find(t => t.id === row.trade)
    const snagTrade = tradeObj?.snagTrade || "plumbing"
    const defCount = Number(row.defectiveCount) || 0
    const misCount = Number(row.missingCount) || 0
    const detailsParts = []
    if (defCount > 0) detailsParts.push(`معطل: ${defCount}`)
    if (misCount > 0) detailsParts.push(`ناقص: ${misCount}`)
    if (row.conditionStatus === "عطل") detailsParts.push("الحالة: عطل")
    if (row.notes) detailsParts.push(row.notes)
    if (row.actionRequired) detailsParts.push(`الإجراء المطلوب: ${row.actionRequired}`)

    const description = `[حمام ${row.gender} — ${row.building} / ${row.direction} / ${row.floor}] ${row.component}: ${detailsParts.join(" | ") || "يوجد عطل يحتاج صيانة"}`

    try {
      await onAddSnag(
        {
          inspector: row.inspector || userName,
          location: "bathrooms",
          description,
          trade: snagTrade,
          priority: defCount >= 2 || row.component.includes("تسريب") || row.component.includes("طوارئ") ? "urgent" : "medium",
          type: "maintenance",
          status: "open",
          userEmail: currentUser?.email || "",
        },
        (row.photos || []).map(p => ({
          id: p.id || String(Date.now()),
          name: p.name || "restroom-photo.jpg",
          size: p.size || 0,
          type: p.type || "image/jpeg",
          dataUrl: p.dataUrl,
        }))
      )
      await saveComponentRow(row.id, { linkedSnagId: "linked" }, userName)
      toast.success("تم تسجيل العطل في سجل الملاحظات العام بنجاح!")
    } catch (err) {
      console.error(err)
      toast.error("تعذر إرسال العطل لسجل الملاحظات")
    }
  }

  // Bulk promote all unlinked defects in current view to main Snag List
  async function handleSyncAllDefectsToSnags() {
    const defectRows = filteredRows.filter(r => getRowHealth(r) === "defect" && !r.linkedSnagId)
    if (defectRows.length === 0) {
      toast("لا توجد أعطال جديدة غير مرحلة لسجل السناج", { icon: "ℹ️" })
      return
    }
    if (!window.confirm(`هل تريد ترحيل ${defectRows.length} عطل من الحمامات إلى سجل الملاحظات العام (Snag List)؟`)) return
    let count = 0
    for (const r of defectRows) {
      await handlePromoteToSnag(r)
      count++
    }
    toast.success(`تم ترحيل ${count} عطل إلى سجل الملاحظات العام!`)
  }

  // Export Excel with embedded images
  async function handleExportExcel() {
    if (exportingExcel) return
    setExportingExcel(true)
    const toastId = toast.loading("جاري تجهيز ملف الإكسيل ودمج الصور داخل الخلايا...")
    try {
      await exportRestroomsExcel(filteredRows, dashboard)
      toast.success("تم تصدير ملف الإكسيل بالصور بنجاح!", { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error("حدث خطأ أثناء تصدير الإكسيل: " + err.message, { id: toastId })
    } finally {
      setExportingExcel(false)
    }
  }

  // Import from Excel / CSV matching the user's sheet structure
  async function handleImportSheet(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportingExcel(true)
    const toastId = toast.loading("جاري قراءة الشيت ومطابقة بنود الحمامات...")
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" })

      // Find header row containing "المبنى / المنطقة"
      let headerIdx = rawRows.findIndex(r => r.some(cell => String(cell).includes("المبنى / المنطقة") || String(cell).includes("المكون")))
      if (headerIdx === -1) headerIdx = 0

      const dataRows = rawRows.slice(headerIdx + 1)
      const toSave = []

      for (const arr of dataRows) {
        const building = String(arr[0] || "").trim()
        const direction = String(arr[1] || "").trim()
        const floor = String(arr[2] || "").trim()
        const gender = String(arr[3] || "").trim()
        const component = String(arr[5] || "").trim()
        if (!building || !component) continue

        const loc = RESTROOM_LOCATIONS.find(
          l =>
            l.building === building &&
            l.direction.trim() === direction &&
            l.floor.trim() === floor &&
            l.gender === gender
        )
        const comp = STANDARD_COMPONENTS.find(c => c.component === component)
        if (!loc || !comp) continue

        const totalCount = arr[7] !== "" && arr[7] !== undefined ? arr[7] : ""
        const workingCount = arr[8] !== "" && arr[8] !== undefined ? arr[8] : ""
        const defectiveCount = arr[9] !== "" && arr[9] !== undefined ? arr[9] : ""
        const missingCount = arr[10] !== "" && arr[10] !== undefined ? arr[10] : ""
        const notes = String(arr[11] || "").trim()
        const inspectDate = String(arr[12] || "").trim()
        const inspector = String(arr[13] || "").trim()
        const actionRequired = String(arr[14] || "").trim()

        // Only save if row has actual inspection values
        if (
          totalCount !== "" ||
          workingCount !== "" ||
          defectiveCount !== "" ||
          missingCount !== "" ||
          notes ||
          actionRequired
        ) {
          toSave.push({
            id: `${loc.restroomKey}__${comp.code}`,
            totalCount,
            workingCount,
            defectiveCount,
            missingCount,
            notes,
            inspectDate: inspectDate || new Date().toLocaleDateString("ar-EG"),
            inspector: inspector || userName,
            actionRequired,
          })
        }
      }

      if (toSave.length > 0) {
        await importRestroomRowsBatch(toSave, userName)
        toast.success(`تم استيراد وتحديث ${toSave.length} بند فحص بنجاح!`, { id: toastId })
      } else {
        toast.success("تم قراءة الشيت بنجاح (جميع المواقع الـ 50 والـ 1,450 مكون مدمجة وجاهزة للفحص)", { id: toastId })
      }
    } catch (err) {
      console.error(err)
      toast.error("تعذر قراءة الملف: " + err.message, { id: toastId })
    } finally {
      setImportingExcel(false)
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: "center", color: "#94a3b8" }}>
        ⏳ جاري تحميل مركز متابعة الحمامات...
      </div>
    )
  }

  const healthPct = dashboard.inspectedComponents > 0
    ? Math.round((dashboard.okComponents / dashboard.inspectedComponents) * 100)
    : 100

  return (
    <div style={s.wrapper}>
      {/* ── Top Banner (Matching Sheet Header) ── */}
      <div style={s.heroBanner}>
        <div style={{ flex: 1 }}>
          <div style={s.heroBadge}>RESTROOM SNAG SYSTEM</div>
          <h2 style={s.heroTitle}>🚽 مركز متابعة وفحص الحمامات</h2>
          <p style={s.heroSub}>
            تشغيل وصيانة • فحص الأصول • حصر فني • بلاغات • إغلاق ومتابعة
          </p>
          <div style={s.guideBox}>
            <span>💡 <strong>دليل العمل:</strong> ابدأ من «دليل المواقع»، ثم «جولة الفحص» أو «الجدول الشامل»، وسجل الأعطال لترحيلها لسجل السناج.</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <span style={{ ...s.legendPill, background: "rgba(234,179,8,0.18)", color: "#fde047", borderColor: "#ca8a04" }}>🟡 الأصفر: إدخال مطلوب</span>
              <span style={{ ...s.legendPill, background: "rgba(16,185,129,0.18)", color: "#6ee7b7", borderColor: "#059669" }}>🟢 الأخضر: سليم</span>
              <span style={{ ...s.legendPill, background: "rgba(239,68,68,0.18)", color: "#fca5a5", borderColor: "#dc2626" }}>🔴 الأحمر: عطل / نقص</span>
            </div>
          </div>
        </div>

        {/* Export / Import Actions */}
        <div style={s.heroActions}>
          <button
            style={{ ...s.actionBtn, background: "linear-gradient(135deg, #059669, #10b981)" }}
            onClick={handleExportExcel}
            disabled={exportingExcel}
          >
            {exportingExcel ? "⏳ جاري دمج الصور..." : "📊 تصدير إكسيل (بالصور المدمجة)"}
          </button>
          <button
            style={{ ...s.actionBtn, background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
            onClick={() => exportRestroomsReport(filteredRows, dashboard)}
          >
            🖨️ تقرير PDF / طباعة
          </button>
          <button
            style={{ ...s.actionBtn, background: "#1e293b", border: "1px solid #334155" }}
            onClick={() => importInputRef.current?.click()}
            disabled={importingExcel}
          >
            {importingExcel ? "⏳ جاري الاستيراد..." : "📥 استيراد شيت إكسيل / CSV"}
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleImportSheet}
          />
          <button
            style={{ ...s.actionBtn, background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            onClick={handleSyncAllDefectsToSnags}
          >
            🚨 ترحيل الأعطال لسجل السناج ({dashboard.defectComponents})
          </button>
          {isAdmin && (
            <button
              style={{ ...s.actionBtn, background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }}
              onClick={() => setShowConfirmReset(true)}
            >
              🗑️ تصفير الفحوصات
            </button>
          )}
        </div>
      </div>

      {/* ── Top 6 KPI Cards (Matching Sheet Summary) ── */}
      <div style={s.kpiGrid}>
        <KpiCard label="الحمامات المؤكدة" value={dashboard.confirmedRestrooms} sub={`من إجمالي ${dashboard.totalRestrooms} حمام`} color="#10b981" icon="✅" />
        <KpiCard label="الحمامات قيد التأكيد" value={dashboard.pendingRestrooms} sub="بانتظار استكمال الفحص" color="#f59e0b" icon="⏳" />
        <KpiCard label="الجولات المسجلة" value={dashboard.totalRounds} sub="جولة فحص ميدانية" color="#3b82f6" icon="📋" />
        <KpiCard label="مكونات تم فحصها" value={dashboard.inspectedComponents} sub={`من أصل ${dashboard.totalComponents} مكون`} color="#06b6d4" icon="🔍" />
        <KpiCard label="سناج مفتوح / أعطال" value={dashboard.defectComponents} sub="مكونات بها عطل أو نقص" color="#ef4444" icon="🚨" />
        <KpiCard label="مؤشر السلامة الفنية" value={`${healthPct}%`} sub={`${dashboard.okComponents} مكون سليم`} color="#8b5cf6" icon="🛡️" />
      </div>

      {/* ── Sub-navigation Tabs ── */}
      <div style={s.subNav}>
        <button
          style={{ ...s.subTab, ...(subView === "directory" ? s.subTabActive : {}) }}
          onClick={() => setSubView("directory")}
        >
          🗺️ دليل المواقع وتغطية المناطق ({dashboard.totalRestrooms} حمام)
        </button>
        <button
          style={{ ...s.subTab, ...(subView === "inspector" ? s.subTabActive : {}) }}
          onClick={() => setSubView("inspector")}
        >
          ✍️ جولة الفحص السريع (حمام بحمام)
        </button>
        <button
          style={{ ...s.subTab, ...(subView === "sheet" ? s.subTabActive : {}) }}
          onClick={() => setSubView("sheet")}
        >
          📑 الجدول الشامل ({filteredRows.length} بند)
        </button>
      </div>

      {/* ── Global Filter Bar ── */}
      <div style={s.filterBar}>
        <select
          style={s.select}
          value={filterZone}
          onChange={e => { setFilterZone(e.target.value); setFilterDirection("all"); setFilterFloor("all") }}
        >
          <option value="all">🏢 كل المناطق والمباني</option>
          {RESTROOM_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
        </select>

        <select
          style={s.select}
          value={filterDirection}
          onChange={e => { setFilterDirection(e.target.value); setFilterFloor("all") }}
        >
          <option value="all">🧭 كل الاتجاهات</option>
          {availableDirections.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          style={s.select}
          value={filterFloor}
          onChange={e => setFilterFloor(e.target.value)}
        >
          <option value="all">🪜 كل الأدوار</option>
          {availableFloors.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <select
          style={s.select}
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
        >
          <option value="all">🚻 كل الحمامات (رجالي/حريمي/ذوي الهمم)</option>
          {RESTROOM_GENDERS.map(g => <option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
        </select>

        <select
          style={s.select}
          value={filterTrade}
          onChange={e => setFilterTrade(e.target.value)}
        >
          <option value="all">🛠️ كل التخصصات</option>
          {RESTROOM_TRADES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
        </select>

        <select
          style={s.select}
          value={filterHealth}
          onChange={e => setFilterHealth(e.target.value)}
        >
          <option value="all">📊 كل الحالات</option>
          <option value="defect">🔴 أعطال ونواقص فقط</option>
          <option value="ok">🟢 سليم فقط</option>
          <option value="pending">🟡 إدخال مطلوب (لم يُفحص)</option>
        </select>

        <input
          type="text"
          placeholder="🔍 ابحث بالمكون، الوصف، المفتش..."
          style={{ ...s.select, flex: "1 1 200px" }}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW 1: DIRECTORY & ZONE COVERAGE TABLE
         ════════════════════════════════════════════════════════════════════ */}
      {subView === "directory" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Zone Coverage Table */}
          <div style={s.card}>
            <h3 style={s.sectionTitle}>📊 تغطية المواقع حسب المنطقة</h3>
            <div className="table-scroll">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>المنطقة</th>
                    <th style={s.th}>إجمالي الحمامات</th>
                    <th style={s.th}>مؤكد</th>
                    <th style={s.th}>جولات مسجلة</th>
                    <th style={s.th}>مكونات مفحوصة</th>
                    <th style={s.th}>أعطال مسجلة</th>
                    <th style={s.th}>مرايا سيئة / معطلة</th>
                    <th style={s.th}>عرض سريع</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.zoneCoverage.map((z, idx) => (
                    <tr key={z.zone} style={{ background: idx % 2 === 0 ? "rgba(15,23,42,0.4)" : "rgba(30,41,59,0.25)" }}>
                      <td style={{ ...s.td, fontWeight: 800, color: "#f8fafc" }}>🏢 {z.zone}</td>
                      <td style={s.td}>{z.totalRestrooms}</td>
                      <td style={{ ...s.td, color: z.confirmed > 0 ? "#10b981" : "#94a3b8", fontWeight: 700 }}>{z.confirmed}</td>
                      <td style={{ ...s.td, color: "#38bdf8", fontWeight: 700 }}>{z.rounds}</td>
                      <td style={s.td}>{z.inspected} / {z.totalComp}</td>
                      <td style={{ ...s.td, color: z.defects > 0 ? "#ef4444" : "#10b981", fontWeight: 800 }}>
                        {z.defects > 0 ? `🔴 ${z.defects}` : "🟢 0"}
                      </td>
                      <td style={{ ...s.td, color: z.badMirrors > 0 ? "#f59e0b" : "#94a3b8", fontWeight: 700 }}>
                        {z.badMirrors}
                      </td>
                      <td style={s.td}>
                        <button
                          style={s.miniBtn}
                          onClick={() => setFilterZone(filterZone === z.zone ? "all" : z.zone)}
                        >
                          {filterZone === z.zone ? "إلغاء الفلتر" : "فلترة المنطقة"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr style={{ background: "rgba(59,130,246,0.12)", fontWeight: 900 }}>
                    <td style={{ ...s.td, color: "#60a5fa", fontWeight: 900 }}>الإجمالي</td>
                    <td style={s.td}>{dashboard.totalRestrooms}</td>
                    <td style={{ ...s.td, color: "#10b981" }}>{dashboard.confirmedRestrooms}</td>
                    <td style={{ ...s.td, color: "#38bdf8" }}>{dashboard.totalRounds}</td>
                    <td style={s.td}>{dashboard.inspectedComponents} / {dashboard.totalComponents}</td>
                    <td style={{ ...s.td, color: dashboard.defectComponents > 0 ? "#ef4444" : "#10b981" }}>
                      {dashboard.defectComponents}
                    </td>
                    <td style={{ ...s.td, color: "#f59e0b" }}>
                      {dashboard.zoneCoverage.reduce((s, z) => s + z.badMirrors, 0)}
                    </td>
                    <td style={s.td}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Restrooms Cards Grid */}
          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <h3 style={{ ...s.sectionTitle, margin: 0 }}>🚪 دليل الحمامات ({filteredRestrooms.length}) — اضغط على أي حمام لبدء الفحص</h3>
            </div>
            <div style={s.restroomGrid}>
              {filteredRestrooms.map(rr => {
                const gObj = RESTROOM_GENDERS.find(g => g.id === rr.gender) || RESTROOM_GENDERS[0]
                const progressPct = Math.round((rr.inspectedComponents / rr.totalComponents) * 100)
                const borderColor = rr.defectComponents > 0 ? "#ef4444" : rr.isConfirmed ? "#10b981" : "#334155"
                return (
                  <div
                    key={rr.restroomKey}
                    style={{ ...s.restroomCard, borderColor }}
                    onClick={() => openRestroomInspector(rr.restroomKey)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>{rr.building} • {rr.floor}</span>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#f8fafc", marginTop: 2 }}>{rr.direction}</div>
                      </div>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background: `${gObj.color}22`,
                        color: gObj.color,
                        border: `1px solid ${gObj.color}44`
                      }}>
                        {gObj.icon} {rr.gender}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        <span>تم فحص {rr.inspectedComponents} / {rr.totalComponents} مكون</span>
                        <span style={{ fontWeight: 800, color: "#e2e8f0" }}>{progressPct}%</span>
                      </div>
                      <div style={{ height: 6, background: "#060d1a", borderRadius: 999, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            background: rr.defectComponents > 0 ? "#ef4444" : "#10b981",
                            transition: "width 0.3s"
                          }}
                        />
                      </div>
                    </div>

                    {/* Status badges */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 11 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <span style={{ color: "#10b981", fontWeight: 700 }}>🟢 {rr.okComponents} سليم</span>
                        <span style={{ color: rr.defectComponents > 0 ? "#ef4444" : "#64748b", fontWeight: 700 }}>
                          🔴 {rr.defectComponents} عطل
                        </span>
                        <span style={{ color: "#eab308", fontWeight: 700 }}>🟡 {rr.pendingComponents} متبقي</span>
                      </div>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontWeight: 800,
                        background: rr.isConfirmed ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                        color: rr.isConfirmed ? "#10b981" : "#f59e0b"
                      }}>
                        {rr.isConfirmed ? "✅ مؤكد" : "⏳ قيد الفحص"}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW 2: SINGLE RESTROOM QUICK INSPECTOR (حمام بحمام)
         ════════════════════════════════════════════════════════════════════ */}
      {subView === "inspector" && currentRestroom && (
        <div style={s.card}>
          {/* Restroom Selector Header */}
          <div style={s.inspectorHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <span style={{ fontWeight: 800, color: "#94a3b8", fontSize: 13 }}>اختر الحمام:</span>
              <select
                style={{ ...s.select, minWidth: 280, fontWeight: 800, fontSize: 14, borderColor: "#3b82f6" }}
                value={selectedRestroomKey}
                onChange={e => setSelectedRestroomKey(e.target.value)}
              >
                {RESTROOM_LOCATIONS.map(loc => (
                  <option key={loc.restroomKey} value={loc.restroomKey}>
                    {loc.building} — {loc.direction} — {loc.floor} ({loc.gender})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                style={{ ...s.actionBtn, background: "#065f46", color: "#a7f3d0", fontSize: 12, padding: "8px 14px" }}
                onClick={async () => {
                  await markAllRestroomOk(currentRestroom.restroomKey, userName)
                  toast.success("تم تحديد جميع المكونات المتبقية في هذا الحمام كسليمة!")
                }}
              >
                ✨ تحديد المتبقي كسليم
              </button>
              <button
                style={{
                  ...s.actionBtn,
                  background: currentRestroom.isConfirmed ? "#334155" : "#10b981",
                  color: "#fff",
                  fontSize: 12,
                  padding: "8px 14px"
                }}
                onClick={() => toggleRestroomConfirmed(currentRestroom.restroomKey, !currentRestroom.isConfirmed, userName)}
              >
                {currentRestroom.isConfirmed ? "🔄 إلغاء التأكيد" : "✅ اعتماد وتأكيد الحمام"}
              </button>
            </div>
          </div>

          {/* Checklist Table for the 29 Components */}
          <div className="table-scroll" style={{ marginTop: 14 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>التخصص</th>
                  <th style={s.th}>المكون</th>
                  <th style={s.th}>نوع الحصر</th>
                  <th style={s.th}>الحالة / الأعداد (فعلي | سليم | معطل | ناقص)</th>
                  <th style={s.th}>وصف العطل / الإجراء المطلوب</th>
                  <th style={s.th}>الصور</th>
                  <th style={s.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {currentRestroomRows.map(row => (
                  <InspectorComponentRow
                    key={row.id}
                    row={row}
                    userName={userName}
                    onSave={saveComponentRow}
                    onOpenModal={() => setEditingRow(row)}
                    onPromoteToSnag={() => handlePromoteToSnag(row)}
                    onPreviewPhotos={(photos, index) => setLightbox({ images: photos, index })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW 3: MASTER SPREADSHEET (الجدول الشامل 1450 بند)
         ════════════════════════════════════════════════════════════════════ */}
      {subView === "sheet" && (
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <h3 style={{ ...s.sectionTitle, margin: 0 }}>
              📑 سجل حصر وفحص مكونات الحمامات الشامل ({filteredRows.length} بند)
            </h3>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              اضغط على زر ✏️ أو 📷 في أي صف لإدخال الأعداد أو إرفاق الصور أو ترحيل العطل
            </span>
          </div>

          <div className="table-scroll" style={{ maxHeight: "72vh", overflowY: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>المبنى / المنطقة</th>
                  <th style={s.th}>الاتجاه</th>
                  <th style={s.th}>الدور</th>
                  <th style={s.th}>الحمام</th>
                  <th style={s.th}>التخصص</th>
                  <th style={s.th}>المكون</th>
                  <th style={s.th}>النوع</th>
                  <th style={s.th}>الفعلي</th>
                  <th style={s.th}>السليم</th>
                  <th style={s.th}>المعطل</th>
                  <th style={s.th}>الناقص</th>
                  <th style={s.th}>وصف الملاحظة / العطل</th>
                  <th style={s.th}>تاريخ الفحص</th>
                  <th style={s.th}>المفتش</th>
                  <th style={s.th}>الإجراء المطلوب</th>
                  <th style={s.th}>الصور</th>
                  <th style={s.th}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 350).map((row, idx) => {
                  const health = getRowHealth(row)
                  const rowBg =
                    health === "defect"
                      ? "rgba(239, 68, 68, 0.14)"
                      : health === "ok"
                        ? "rgba(16, 185, 129, 0.10)"
                        : "rgba(234, 179, 8, 0.06)"
                  const statusDot = health === "defect" ? "🔴" : health === "ok" ? "🟢" : "🟡"
                  return (
                    <tr key={row.id} style={{ background: rowBg }}>
                      <td style={s.td}>{statusDot} {idx + 1}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{row.building}</td>
                      <td style={s.td}>{row.direction}</td>
                      <td style={s.td}>{row.floor}</td>
                      <td style={s.td}>{row.gender}</td>
                      <td style={s.td}>{row.trade}</td>
                      <td style={{ ...s.td, fontWeight: 800, color: "#f8fafc" }}>{row.component}</td>
                      <td style={s.td}>{row.inspectType}</td>
                      <td style={s.td}>{row.inspectType === "حالة" ? (row.conditionStatus || "—") : (row.totalCount !== "" ? row.totalCount : "—")}</td>
                      <td style={{ ...s.td, color: "#10b981", fontWeight: 700 }}>{row.workingCount !== "" ? row.workingCount : "—"}</td>
                      <td style={{ ...s.td, color: Number(row.defectiveCount) > 0 ? "#ef4444" : "#94a3b8", fontWeight: 800 }}>
                        {row.defectiveCount !== "" ? row.defectiveCount : "—"}
                      </td>
                      <td style={{ ...s.td, color: Number(row.missingCount) > 0 ? "#f59e0b" : "#94a3b8", fontWeight: 800 }}>
                        {row.missingCount !== "" ? row.missingCount : "—"}
                      </td>
                      <td style={s.td}>{row.notes || "—"}</td>
                      <td style={s.td}>{row.inspectDate || "—"}</td>
                      <td style={s.td}>{row.inspector || "—"}</td>
                      <td style={s.td}>{row.actionRequired || "—"}</td>
                      <td style={s.td}>
                        {row.photos?.length > 0 ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            {row.photos.map((p, i) => (
                              <img
                                key={p.id || i}
                                src={p.dataUrl}
                                alt={row.component}
                                style={s.miniThumb}
                                onClick={() => setLightbox({ images: row.photos, index: i })}
                              />
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={s.iconBtn} onClick={() => setEditingRow(row)} title="تعديل / إضافة صور">✏️</button>
                          {health === "defect" && (
                            <button
                              style={{ ...s.iconBtn, background: row.linkedSnagId ? "#065f46" : "#7f1d1d" }}
                              onClick={() => handlePromoteToSnag(row)}
                              title="إرسال لسجل السناج"
                            >
                              {row.linkedSnagId ? "✅" : "🚨"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredRows.length > 350 && (
              <div style={{ padding: 12, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                يتم عرض أول 350 صف لسرعة التصفح — استخدم الفلاتر أعلاه لتخصيص العرض (التصدير للإكسيل يشمل جميع الـ {filteredRows.length} صف بالكامل).
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Component Modal (with Photo Upload & Camera) ── */}
      {editingRow && (
        <EditComponentModal
          row={rows.find(r => r.id === editingRow.id) || editingRow}
          userName={userName}
          onClose={() => setEditingRow(null)}
          onSave={async (updates) => {
            await saveComponentRow(editingRow.id, updates, userName)
            toast.success("تم حفظ بيانات المكون بنجاح")
            setEditingRow(null)
          }}
          onPromoteToSnag={handlePromoteToSnag}
        />
      )}

      {/* ── Photo Lightbox ── */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.images[lightbox.index]?.dataUrl}
              alt="معاينة"
              style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 12, border: "2px solid #334155" }}
            />
            <button
              style={{ position: "absolute", top: -14, right: -14, background: "#ef4444", color: "#fff", border: 0, borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontWeight: 800 }}
              onClick={() => setLightbox(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {showConfirmReset && (
        <ConfirmDialog
          title="تصفير بيانات فحص الحمامات ⚠️"
          message="هل أنت متأكد من مسح جميع القيم والصور المدخلة وإعادة الشيت لحالته الفارغة؟"
          onConfirm={async () => {
            setShowConfirmReset(false)
            await resetAllRestroomInspections()
          }}
          onCancel={() => setShowConfirmReset(false)}
        />
      )}
    </div>
  )
}

/* ─── Single Row in Quick Inspector View ─── */
function InspectorComponentRow({ row, userName, onSave, onOpenModal, onPromoteToSnag, onPreviewPhotos }) {
  const health = getRowHealth(row)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const rowBg =
    health === "defect"
      ? "rgba(239, 68, 68, 0.12)"
      : health === "ok"
        ? "rgba(16, 185, 129, 0.08)"
        : "rgba(234, 179, 8, 0.05)"

  async function handleQuickNumberChange(field, value) {
    const numVal = value === "" ? "" : Math.max(0, Number(value))
    const updates = { [field]: numVal }

    const tot = field === "totalCount" ? numVal : row.totalCount
    const def = field === "defectiveCount" ? numVal : row.defectiveCount
    const mis = field === "missingCount" ? numVal : row.missingCount

    if (tot !== "" && (field === "totalCount" || field === "defectiveCount" || field === "missingCount")) {
      const calcWorking = Math.max(0, Number(tot) - Number(def || 0) - Number(mis || 0))
      updates.workingCount = calcWorking
    }
    await onSave(row.id, updates, userName)
  }

  async function handleQuickPhoto(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const existing = row.photos || []
      const added = []
      for (const file of files.slice(0, 3 - existing.length)) {
        const dataUrl = await processFile(file)
        added.push({
          id: Math.random().toString(36).slice(2, 9),
          name: file.name,
          type: "image/jpeg",
          dataUrl,
        })
      }
      await onSave(row.id, { photos: [...existing, ...added].slice(0, 3) }, userName)
      toast.success("تم إرفاق الصورة وحفظها")
    } catch (err) {
      console.error(err)
      toast.error("تعذر إرفاق الصورة")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <tr style={{ background: rowBg }}>
      <td style={{ ...s.td, fontWeight: 700 }}>{row.trade}</td>
      <td style={{ ...s.td, fontWeight: 800, color: "#f8fafc" }}>
        {health === "defect" ? "🔴 " : health === "ok" ? "🟢 " : "🟡 "}
        {row.component}
      </td>
      <td style={s.td}>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#0f172a", color: "#94a3b8" }}>
          {row.inspectType}
        </span>
      </td>
      <td style={s.td}>
        {row.inspectType === "حالة" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              style={{
                ...s.statusBtn,
                background: row.conditionStatus === "سليم" ? "#10b981" : "#0f172a",
                color: row.conditionStatus === "سليم" ? "#fff" : "#94a3b8",
                borderColor: "#10b981"
              }}
              onClick={() => onSave(row.id, { conditionStatus: "سليم", defectiveCount: 0, missingCount: 0 }, userName)}
            >
              🟢 سليم
            </button>
            <button
              type="button"
              style={{
                ...s.statusBtn,
                background: row.conditionStatus === "عطل" ? "#ef4444" : "#0f172a",
                color: row.conditionStatus === "عطل" ? "#fff" : "#94a3b8",
                borderColor: "#ef4444"
              }}
              onClick={() => onSave(row.id, { conditionStatus: "عطل", defectiveCount: 1 }, userName)}
            >
              🔴 عطل
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <MiniNum label="فعلي" value={row.totalCount} color="#94a3b8" onChange={v => handleQuickNumberChange("totalCount", v)} />
            <MiniNum label="سليم" value={row.workingCount} color="#10b981" onChange={v => handleQuickNumberChange("workingCount", v)} />
            <MiniNum label="معطل" value={row.defectiveCount} color="#ef4444" onChange={v => handleQuickNumberChange("defectiveCount", v)} />
            <MiniNum label="ناقص" value={row.missingCount} color="#f59e0b" onChange={v => handleQuickNumberChange("missingCount", v)} />
          </div>
        )}
      </td>
      <td style={s.td}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            type="text"
            placeholder="وصف الملاحظة / العطل..."
            defaultValue={row.notes}
            onBlur={e => {
              if (e.target.value !== (row.notes || "")) {
                onSave(row.id, { notes: e.target.value }, userName)
              }
            }}
            style={s.inlineText}
          />
          <input
            type="text"
            placeholder="الإجراء المطلوب..."
            defaultValue={row.actionRequired}
            onBlur={e => {
              if (e.target.value !== (row.actionRequired || "")) {
                onSave(row.id, { actionRequired: e.target.value }, userName)
              }
            }}
            style={{ ...s.inlineText, fontSize: 11, color: "#93c5fd" }}
          />
        </div>
      </td>
      <td style={s.td}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(row.photos || []).map((p, i) => (
            <img
              key={p.id || i}
              src={p.dataUrl}
              alt={row.component}
              style={s.miniThumb}
              onClick={() => onPreviewPhotos(row.photos, i)}
            />
          ))}
          {(row.photos?.length || 0) < 3 && (
            <>
              <button
                type="button"
                style={s.iconBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="إرفاق صورة"
              >
                {uploading ? "⏳" : "📷"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleQuickPhoto}
              />
            </>
          )}
        </div>
      </td>
      <td style={s.td}>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" style={s.iconBtn} onClick={onOpenModal} title="تفاصيل وتعديل كامل">✏️</button>
          {health === "defect" && (
            <button
              type="button"
              style={{ ...s.iconBtn, background: row.linkedSnagId ? "#065f46" : "#dc2626" }}
              onClick={onPromoteToSnag}
              title="ترحيل لسجل السناج العام"
            >
              {row.linkedSnagId ? "✅" : "🚨"}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function MiniNum({ label, value, color, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>{label}</span>
      <input
        type="number"
        min="0"
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 48,
          padding: "4px 6px",
          borderRadius: 6,
          border: `1px solid ${color}55`,
          background: "#060d1a",
          color: "#f8fafc",
          textAlign: "center",
          fontSize: 12,
          fontWeight: 800,
        }}
      />
    </label>
  )
}

/* ─── Edit Modal for a Component Row ─── */
function EditComponentModal({ row, userName, onClose, onSave, onPromoteToSnag }) {
  const [form, setForm] = useState({
    totalCount: row.totalCount ?? "",
    workingCount: row.workingCount ?? "",
    defectiveCount: row.defectiveCount ?? "",
    missingCount: row.missingCount ?? "",
    conditionStatus: row.conditionStatus ?? "",
    notes: row.notes ?? "",
    actionRequired: row.actionRequired ?? "",
    inspector: row.inspector || userName,
    photos: row.photos || [],
  })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const added = []
      for (const file of files.slice(0, 3 - form.photos.length)) {
        const dataUrl = await processFile(file)
        added.push({
          id: Math.random().toString(36).slice(2, 9),
          name: file.name,
          type: "image/jpeg",
          dataUrl,
        })
      }
      setForm(prev => ({ ...prev, photos: [...prev.photos, ...added].slice(0, 3) }))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removePhoto(id) {
    setForm(prev => ({ ...prev, photos: prev.photos.filter(p => p.id !== id) }))
  }

  return (
    <div style={s.lightboxOverlay} onClick={onClose}>
      <div style={s.modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "#f8fafc" }}>
            🛠️ فحص مكون: {row.component}
          </h3>
          <button style={{ background: "none", border: 0, color: "#94a3b8", fontSize: 18, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>

        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14, background: "#060d1a", padding: "8px 12px", borderRadius: 8 }}>
          📍 {row.building} • {row.direction} • {row.floor} • حمام {row.gender} ({row.trade})
        </div>

        {row.inspectType === "حالة" ? (
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>حالة المكون</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["سليم", "عطل"].map(st => (
                <button
                  key={st}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 10,
                    border: "1px solid #334155",
                    fontWeight: 800,
                    cursor: "pointer",
                    background: form.conditionStatus === st ? (st === "سليم" ? "#10b981" : "#ef4444") : "#060d1a",
                    color: "#fff"
                  }}
                  onClick={() => setForm(prev => ({ ...prev, conditionStatus: st, defectiveCount: st === "عطل" ? 1 : 0 }))}
                >
                  {st === "سليم" ? "🟢 سليم" : "🔴 عطل"}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
            <div>
              <label style={s.label}>العدد الفعلي</label>
              <input
                type="number"
                style={s.input}
                value={form.totalCount}
                onChange={e => {
                  const tot = e.target.value === "" ? "" : Number(e.target.value)
                  const wrk = tot === "" ? form.workingCount : Math.max(0, tot - Number(form.defectiveCount || 0) - Number(form.missingCount || 0))
                  setForm(prev => ({ ...prev, totalCount: tot, workingCount: wrk }))
                }}
              />
            </div>
            <div>
              <label style={{ ...s.label, color: "#10b981" }}>السليم</label>
              <input
                type="number"
                style={s.input}
                value={form.workingCount}
                onChange={e => setForm(prev => ({ ...prev, workingCount: e.target.value === "" ? "" : Number(e.target.value) }))}
              />
            </div>
            <div>
              <label style={{ ...s.label, color: "#ef4444" }}>المعطل</label>
              <input
                type="number"
                style={s.input}
                value={form.defectiveCount}
                onChange={e => {
                  const def = e.target.value === "" ? "" : Number(e.target.value)
                  const wrk = form.totalCount === "" ? form.workingCount : Math.max(0, Number(form.totalCount) - Number(def || 0) - Number(form.missingCount || 0))
                  setForm(prev => ({ ...prev, defectiveCount: def, workingCount: wrk }))
                }}
              />
            </div>
            <div>
              <label style={{ ...s.label, color: "#f59e0b" }}>الناقص</label>
              <input
                type="number"
                style={s.input}
                value={form.missingCount}
                onChange={e => {
                  const mis = e.target.value === "" ? "" : Number(e.target.value)
                  const wrk = form.totalCount === "" ? form.workingCount : Math.max(0, Number(form.totalCount) - Number(form.defectiveCount || 0) - Number(mis || 0))
                  setForm(prev => ({ ...prev, missingCount: mis, workingCount: wrk }))
                }}
              />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>وصف الملاحظة / العطل</label>
          <textarea
            rows={2}
            style={s.input}
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="اكتب تفاصيل العطل أو الملاحظة الفنية..."
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={s.label}>الإجراء المطلوب</label>
          <input
            type="text"
            style={s.input}
            value={form.actionRequired}
            onChange={e => setForm(prev => ({ ...prev, actionRequired: e.target.value }))}
            placeholder="مثال: تغيير قلب خلاط / تركيب سبوت / صيانة طرد..."
          />
        </div>

        {/* Photos */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>📸 صور الفحص (تُدمج مباشرة داخل ملف الإكسيل بدون روابط)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {form.photos.map(p => (
              <div key={p.id} style={{ position: "relative" }}>
                <img src={p.dataUrl} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid #334155" }} />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  style={{ position: "absolute", top: -6, left: -6, background: "#ef4444", color: "#fff", border: 0, borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ))}
            {form.photos.length < 3 && (
              <button
                type="button"
                style={{ ...s.actionBtn, background: "#1e293b", border: "1px dashed #475569" }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "⏳ جاري الضغط..." : "📷 إرفاق صورة"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleAddPhotos} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{ ...s.actionBtn, flex: 1, background: "linear-gradient(135deg, #10b981, #059669)", justifyContent: "center" }}
            onClick={() => onSave(form)}
          >
            💾 حفظ الفحص
          </button>
          <button
            type="button"
            style={{ ...s.actionBtn, background: "#dc2626" }}
            onClick={async () => {
              await onSave(form)
              await onPromoteToSnag({ ...row, ...form })
            }}
          >
            🚨 حفظ وترحيل للسناج
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ ...s.kpiCard, borderColor: `${color}44` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, margin: "6px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{sub}</div>
    </div>
  )
}

const s = {
  wrapper: { display: "flex", flexDirection: "column", gap: 18 },
  heroBanner: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    border: "1px solid #312e81",
    borderRadius: 18,
    padding: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 16,
  },
  heroBadge: {
    display: "inline-block",
    background: "rgba(99,102,241,0.2)",
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: 800,
    padding: "3px 10px",
    borderRadius: 999,
    marginBottom: 6,
  },
  heroTitle: { margin: 0, fontSize: 22, fontWeight: 900, color: "#f8fafc" },
  heroSub: { margin: "4px 0 10px", fontSize: 13, color: "#94a3b8" },
  guideBox: {
    background: "rgba(6,13,26,0.6)",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 12,
    color: "#cbd5e1",
  },
  legendPill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    border: "1px solid",
  },
  heroActions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 230,
  },
  actionBtn: {
    border: 0,
    borderRadius: 10,
    padding: "10px 14px",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  },
  kpiCard: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "14px 16px",
  },
  subNav: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  subTab: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "10px 16px",
    color: "#94a3b8",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  subTabActive: {
    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
    color: "#fff",
    borderColor: "#3b82f6",
  },
  filterBar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 12,
  },
  select: {
    background: "#060d1a",
    color: "#e2e8f0",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    outline: "none",
  },
  card: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 18,
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 16,
    fontWeight: 800,
    color: "#f8fafc",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    background: "#0f172a",
    color: "#94a3b8",
    padding: "10px 8px",
    textAlign: "right",
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid rgba(30,41,59,0.6)",
    verticalAlign: "middle",
  },
  restroomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  },
  restroomCard: {
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    transition: "transform 0.15s, border-color 0.2s",
  },
  inspectorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 14,
    borderBottom: "1px solid #1e293b",
  },
  statusBtn: {
    border: "1px solid",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  inlineText: {
    width: "100%",
    minWidth: 150,
    padding: "5px 8px",
    borderRadius: 6,
    border: "1px solid #1e293b",
    background: "#060d1a",
    color: "#e2e8f0",
    fontSize: 12,
  },
  miniThumb: {
    width: 38,
    height: 38,
    objectFit: "cover",
    borderRadius: 6,
    border: "1px solid #334155",
    cursor: "pointer",
  },
  iconBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#fff",
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: 13,
  },
  miniBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#60a5fa",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },
  lightboxOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.85)",
    backdropFilter: "blur(4px)",
    zIndex: 10000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 520,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 4,
  },
  input: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 8,
    border: "1px solid #1e293b",
    background: "#060d1a",
    color: "#f8fafc",
    fontSize: 13,
    boxSizing: "border-box",
  },
}
