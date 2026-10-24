import React, { useState, useEffect, useMemo, useRef } from "react"
import { db } from "../lib/firebase.js"
import {
  collection, doc, onSnapshot, setDoc, serverTimestamp
} from "firebase/firestore"
import ExcelJS from "exceljs"
import CameraModal from "./CameraModal.jsx"
import { PARK_SECTORS, STATUS_META } from "../constants/parkStreetData.js"

export { PARK_SECTORS, STATUS_META }

export default function ParkStreetModule({ currentUser, notify, onAddSnag }) {
  const [activeSectorId, setActiveSectorId] = useState("security")
  const [records, setRecords] = useState({})
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [exporting, setExporting] = useState(false)
  const [cameraTargetKey, setCameraTargetKey] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const fileInputRef = useRef(null)
  const [uploadTargetKey, setUploadTargetKey] = useState(null)

  // Real-time sync with Firestore collection `park_street_snags`
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "park_street_snags"),
      (snap) => {
        const map = {}
        snap.docs.forEach((d) => {
          map[d.id] = d.data()
        })
        setRecords(map)
      },
      (err) => {
        console.warn("park_street_snags listener warning:", err.message)
      }
    )
    return () => unsub()
  }, [])

  const activeSector = useMemo(
    () => PARK_SECTORS.find((s) => s.id === activeSectorId) || PARK_SECTORS[0],
    [activeSectorId]
  )

  // Compute stats across all sectors & per sector
  const stats = useMemo(() => {
    let totalItems = 0
    let okCount = 0
    let snagCount = 0
    let followupCount = 0
    let photosCount = 0
    const bySector = {}

    for (const sec of PARK_SECTORS) {
      let sTotal = 0, sOk = 0, sSnag = 0, sFollow = 0
      for (const zone of sec.zones) {
        for (const item of zone.items) {
          totalItems++
          sTotal++
          const key = `${sec.id}__${zone.id}__${item.id}`
          const rec = records[key]
          const st = rec?.status || "na"
          if (st === "ok") { okCount++; sOk++ }
          else if (st === "snag") { snagCount++; sSnag++ }
          else if (st === "followup") { followupCount++; sFollow++ }
          if (rec?.photos?.length) photosCount += rec.photos.length
        }
      }
      bySector[sec.id] = { total: sTotal, ok: sOk, snag: sSnag, followup: sFollow }
    }

    return { totalItems, okCount, snagCount, followupCount, photosCount, bySector }
  }, [records])

  async function saveRecord(key, patch) {
    const existing = records[key] || {}
    const updated = {
      ...existing,
      ...patch,
      updatedBy: currentUser?.displayName || currentUser?.email || "مشرف",
      updatedAt: new Date().toISOString(),
    }
    setRecords((prev) => ({ ...prev, [key]: updated }))
    try {
      await setDoc(doc(db, "park_street_snags", key), {
        ...updated,
        serverTimestamp: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      console.error("Failed saving park_street_snags:", e)
    }
  }

  async function compressImageFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const MAX = 900
          let w = img.width, h = img.height
          if (w > h && w > MAX) { h = Math.round((h * MAX) / w); w = MAX }
          else if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX }
          canvas.width = w
          canvas.height = h
          canvas.getContext("2d").drawImage(img, 0, 0, w, h)
          resolve({
            id: Math.random().toString(36).slice(2, 9),
            name: file.name || `parkst_${Date.now()}.jpg`,
            type: "image/jpeg",
            dataUrl: canvas.toDataURL("image/jpeg", 0.78),
          })
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  async function handleAddPhotoToKey(key, file) {
    if (!file) return
    const compressed = await compressImageFile(file)
    const existingPhotos = records[key]?.photos || []
    const currentStatus = records[key]?.status || "na"
    await saveRecord(key, {
      photos: [...existingPhotos, compressed].slice(0, 4),
      status: currentStatus === "na" ? "snag" : currentStatus,
    })
    if (notify) notify("add", "📸 تم إرفاق الصورة في سناج بارك ستريت")
  }

  async function handleRemovePhoto(key, photoId) {
    const existingPhotos = records[key]?.photos || []
    await saveRecord(key, {
      photos: existingPhotos.filter((p) => p.id !== photoId),
    })
  }

  async function handlePushToMainSnagList(sector, zone, item, rec) {
    if (!onAddSnag) return
    const noteText = rec?.note?.trim()
      ? `${item.name} — ${rec.note.trim()} (${zone.title})`
      : `ملاحظة في ${item.name} (${zone.title} - ${sector.name})`

    const attachments = (rec?.photos || []).map((p) => ({
      id: p.id,
      name: p.name || "photo.jpg",
      type: "image/jpeg",
      dataUrl: p.dataUrl,
    }))

    await onAddSnag(
      {
        inspector: currentUser?.displayName || currentUser?.email || "مشرف بارك ستريت",
        location: sector.locationId,
        description: noteText,
        trade: sector.tradeId,
        priority: rec?.status === "snag" ? "urgent" : "medium",
        type: "maintenance",
        status: "open",
        userEmail: currentUser?.email,
      },
      attachments
    )
    if (notify) notify("add", `✅ تم إرسال "${item.name}" إلى سجل الملاحظات العام`)
  }

  // 📊 Export Professional Excel with Embedded Images (Zero Links)
  async function exportExcelWithImages(onlyActiveSector = false) {
    if (exporting) return
    setExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = "Park St. Snag System"
      workbook.created = new Date()

      const sectorsToExport = onlyActiveSector ? [activeSector] : PARK_SECTORS

      for (const sec of sectorsToExport) {
        const sheetName = sec.name.slice(0, 28).replace(/[\\/?*[\]]/g, " ")
        const ws = workbook.addWorksheet(sheetName, {
          views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
        })

        // Title Banner
        ws.mergeCells("A1:H1")
        const titleCell = ws.getCell("A1")
        titleCell.value = `PARK ST. MALL SNAG LIST | ${sec.name} (${sec.enName})`
        titleCell.font = { name: "Arial", size: 15, bold: true, color: { argb: "FFFFFFFF" } }
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
        titleCell.alignment = { horizontal: "center", vertical: "middle" }
        ws.getRow(1).height = 34

        // Subtitle Banner
        ws.mergeCells("A2:H2")
        const subCell = ws.getCell("A2")
        subCell.value = `تاريخ التقرير: ${new Date().toLocaleString("ar-EG")} | المشرف: ${currentUser?.displayName || currentUser?.email || "مشرف التشغيل"} | تصدير احترافي بالصور المدمجة بدون روابط`
        subCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } }
        subCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
        subCell.alignment = { horizontal: "center", vertical: "middle" }
        ws.getRow(2).height = 24

        // Headers
        const headers = [
          "الكود",
          "المنطقة / المسار الفرعي",
          "بند الفحص (المعيار)",
          "الفئة",
          "الحالة",
          "تفاصيل الملاحظة / الإجراء المطلوب",
          "المشرف والتوقيت",
          "الصور المدمجة (بدون روابط)",
        ]
        const headerRow = ws.getRow(3)
        headers.forEach((h, i) => {
          const c = headerRow.getCell(i + 1)
          c.value = h
          c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
          c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
          c.border = {
            top: { style: "thin", color: { argb: "FF475569" } },
            bottom: { style: "thin", color: { argb: "FF475569" } },
            left: { style: "thin", color: { argb: "FF475569" } },
            right: { style: "thin", color: { argb: "FF475569" } },
          }
        })
        headerRow.height = 28

        ws.columns = [
          { width: 12 },
          { width: 30 },
          { width: 42 },
          { width: 18 },
          { width: 18 },
          { width: 38 },
          { width: 22 },
          { width: 36 },
        ]

        let rowIndex = 4
        for (const zone of sec.zones) {
          for (const item of zone.items) {
            const key = `${sec.id}__${zone.id}__${item.id}`
            const rec = records[key] || {}
            const st = STATUS_META[rec.status || "na"] || STATUS_META.na
            const photos = rec.photos || []

            const row = ws.getRow(rowIndex)
            row.getCell(1).value = zone.code
            row.getCell(2).value = zone.title
            row.getCell(3).value = item.name
            row.getCell(4).value = item.category
            row.getCell(5).value = st.label
            row.getCell(6).value = rec.note || "—"
            row.getCell(7).value = rec.updatedBy
              ? `${rec.updatedBy}\n${new Date(rec.updatedAt).toLocaleDateString("ar-EG")}`
              : "—"
            row.getCell(8).value = photos.length > 0 ? "" : "لا توجد صور"

            const statusColor =
              rec.status === "snag"
                ? "FFFEE2E2"
                : rec.status === "followup"
                ? "FFFEF3C7"
                : rec.status === "ok"
                ? "FFD1FAE5"
                : "FFF8FAFC"

            for (let c = 1; c <= 8; c++) {
              const cell = row.getCell(c)
              cell.font = {
                name: "Arial",
                size: 10,
                bold: c === 3 || c === 5,
                color: {
                  argb:
                    c === 5 && rec.status === "snag"
                      ? "FFB91C1C"
                      : c === 5 && rec.status === "ok"
                      ? "FF047857"
                      : "FF0F172A",
                },
              }
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: c === 5 ? statusColor : rowIndex % 2 === 0 ? "FFFFFFFF" : "FFF1F5F9" },
              }
              cell.alignment = {
                horizontal: c === 3 || c === 6 ? "right" : "center",
                vertical: "middle",
                wrapText: true,
              }
              cell.border = {
                top: { style: "thin", color: { argb: "FFCBD5E1" } },
                bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
                left: { style: "thin", color: { argb: "FFCBD5E1" } },
                right: { style: "thin", color: { argb: "FFCBD5E1" } },
              }
            }

            if (photos.length > 0) {
              row.height = 92
              photos.slice(0, 3).forEach((p, idx) => {
                if (p.dataUrl && p.dataUrl.startsWith("data:image")) {
                  const base64Data = p.dataUrl.split(",")[1]
                  const imgId = workbook.addImage({
                    base64: base64Data,
                    extension: "jpeg",
                  })
                  ws.addImage(imgId, {
                    tl: { col: 7 + idx * 0.32, row: rowIndex - 1 + 0.08 },
                    ext: { width: 82, height: 74 },
                  })
                }
              })
            } else {
              row.height = 30
            }

            rowIndex++
          }
        }
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Park_Street_Snag_${onlyActiveSector ? activeSector.id : "Full_Report"}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      if (notify) notify("add", "📊 تم تصدير شيت إكسيل بارك ستريت بالصور المدمجة بنجاح")
    } catch (err) {
      console.error("Excel export error:", err)
      alert("حدث خطأ أثناء تصدير ملف الإكسيل")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={st.wrap}>
      {/* ── Top Hero Header ── */}
      <div style={{ ...st.hero, background: activeSector.bgGrad }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#bae6fd", letterSpacing: 1 }}>
              PARK ST. MALL — INTEGRATED SNAG & OPERATIONS SYSTEM
            </div>
            <h2 style={{ margin: "4px 0 6px", fontSize: 22, fontWeight: 900, color: "#fff" }}>
              🌟 منظومة سناج بارك ستريت الشاملة
            </h2>
            <div style={{ fontSize: 13, color: "#e2e8f0" }}>
              الأمن والحراسة • رحلة العميل داخل بارك ستريت • الزراعة واللاند سكيب • مسار السيارات بالبيزمنت
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={exporting}
              onClick={() => exportExcelWithImages(true)}
              style={{ ...st.exportBtn, background: "#0ea5e9" }}
            >
              {exporting ? "⏳ جاري التصدير..." : `📥 إكسيل ${activeSector.name} (بالصور)`}
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={() => exportExcelWithImages(false)}
              style={{ ...st.exportBtn, background: "#10b981" }}
            >
              {exporting ? "⏳ جاري التصدير..." : "📊 تصدير الشيت الشامل (4 قطاعات بالصور بدون روابط)"}
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div style={st.kpiGrid}>
          <KpiCard label="إجمالي نقاط الفحص" value={stats.totalItems} color="#38bdf8" />
          <KpiCard label="سليم ومطابق ✅" value={stats.okCount} color="#10b981" />
          <KpiCard label="ملاحظات وأعطال 🔴" value={stats.snagCount} color="#ef4444" />
          <KpiCard label="يحتاج متابعة 🟡" value={stats.followupCount} color="#f59e0b" />
          <KpiCard label="صور الفحص الموثقة 📸" value={stats.photosCount} color="#c084fc" />
        </div>
      </div>

      {/* ── 4 Sector Selector Cards ── */}
      <div style={st.sectorTabs}>
        {PARK_SECTORS.map((sec) => {
          const active = sec.id === activeSectorId
          const secStat = stats.bySector[sec.id] || { total: 0, ok: 0, snag: 0, followup: 0 }
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSectorId(sec.id)}
              style={{
                ...st.sectorCard,
                border: active ? `2px solid ${sec.color}` : "1px solid #1e293b",
                background: active ? `${sec.color}18` : "#0a1628",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span style={{ fontSize: 26 }}>{sec.icon}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: secStat.snag > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.15)",
                  color: secStat.snag > 0 ? "#f87171" : "#34d399",
                }}>
                  {secStat.snag > 0 ? `🔴 ${secStat.snag} ملاحظة` : `✅ ${secStat.ok}/${secStat.total}`}
                </span>
              </div>
              <div style={{ fontWeight: 900, fontSize: 15, color: active ? "#fff" : "#e2e8f0", marginTop: 8 }}>
                {sec.name}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{sec.enName}</div>
            </button>
          )
        })}
      </div>

      {/* ── Search & Status Filter Bar ── */}
      <div style={st.filterBar}>
        <input
          style={{ ...st.input, flex: 1, minWidth: 220 }}
          placeholder={`🔍 ابحث داخل ${activeSector.name}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: "الكل" },
            { id: "snag", label: "🔴 ملاحظات وأعطال" },
            { id: "followup", label: "🟡 يحتاج متابعة" },
            { id: "ok", label: "✅ سليم" },
            { id: "na", label: "⚪ لم يُفحص" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              style={{
                ...st.filterBtn,
                background: filterStatus === tab.id ? activeSector.color : "#060d1a",
                color: filterStatus === tab.id ? "#fff" : "#94a3b8",
                borderColor: filterStatus === tab.id ? activeSector.color : "#1e293b",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file && uploadTargetKey) {
            await handleAddPhotoToKey(uploadTargetKey, file)
          }
          e.target.value = ""
        }}
      />

      {/* ── Zones & Checklist Items ── */}
      {activeSector.zones.map((zone) => {
        const filteredItems = zone.items.filter((item) => {
          const key = `${activeSector.id}__${zone.id}__${item.id}`
          const rec = records[key] || {}
          const status = rec.status || "na"
          const matchStatus = filterStatus === "all" || status === filterStatus
          const q = searchQuery.trim().toLowerCase()
          const matchQuery =
            !q ||
            item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            (rec.note || "").toLowerCase().includes(q)
          return matchStatus && matchQuery
        })

        if (filteredItems.length === 0) return null

        return (
          <div key={zone.id} style={st.zoneCard}>
            <div style={st.zoneHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  background: activeSector.color,
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 8,
                }}>
                  {zone.code}
                </span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f8fafc" }}>
                  {zone.title}
                </h3>
              </div>
              <span style={{ fontSize: 12, color: "#64748b" }}>{filteredItems.length} بنود</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredItems.map((item) => {
                const key = `${activeSector.id}__${zone.id}__${item.id}`
                const rec = records[key] || {}
                const curStatus = rec.status || "na"
                const meta = STATUS_META[curStatus] || STATUS_META.na
                const photos = rec.photos || []

                return (
                  <div
                    key={item.id}
                    style={{
                      ...st.itemRow,
                      borderRight: `4px solid ${meta.color}`,
                      background: curStatus === "snag" ? "rgba(239,68,68,0.05)" : "#060d1a",
                    }}
                  >
                    {/* Top Row: Item Title + Status Pills */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9" }}>
                            {item.name}
                          </span>
                          <span style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#0f172a",
                            color: "#94a3b8",
                            border: "1px solid #1e293b",
                          }}>
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* Status Buttons */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.values(STATUS_META).map((sOpt) => {
                          const isSel = curStatus === sOpt.id
                          return (
                            <button
                              key={sOpt.id}
                              type="button"
                              onClick={() => saveRecord(key, { status: sOpt.id })}
                              style={{
                                border: `1px solid ${isSel ? sOpt.color : "#1e293b"}`,
                                background: isSel ? sOpt.bg : "#0f172a",
                                color: isSel ? sOpt.color : "#64748b",
                                borderRadius: 8,
                                padding: "6px 10px",
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {sOpt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Second Row: Note Input + Camera + Gallery + Send to Snag List */}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <input
                        style={{ ...st.input, flex: 1, minWidth: 200, padding: "8px 12px", fontSize: 13 }}
                        placeholder="✍️ اكتب تفاصيل الملاحظة أو الموقع الدقيق (يحفظ تلقائياً)..."
                        defaultValue={rec.note || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (rec.note || "")) {
                            saveRecord(key, {
                              note: e.target.value,
                              status: curStatus === "na" && e.target.value.trim() ? "snag" : curStatus,
                            })
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setCameraTargetKey(key)}
                        style={{
                          ...st.actionBtn,
                          background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
                          color: "#fff",
                        }}
                      >
                        📷 كاميرا
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUploadTargetKey(key)
                          fileInputRef.current?.click()
                        }}
                        style={{
                          ...st.actionBtn,
                          background: "#1e293b",
                          color: "#cbd5e1",
                          border: "1px solid #334155",
                        }}
                      >
                        📎 إرفاق صورة
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePushToMainSnagList(activeSector, zone, item, rec)}
                        style={{
                          ...st.actionBtn,
                          background: "rgba(245,158,11,0.16)",
                          color: "#fbbf24",
                          border: "1px solid #b45309",
                        }}
                        title="إرسال هذا البند مع صوره كملاحظة في السجل العام"
                      >
                        ➕ إرسال للسجل العام
                      </button>
                    </div>

                    {/* Attached Photos Preview */}
                    {photos.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                        {photos.map((p) => (
                          <div key={p.id} style={{ position: "relative" }}>
                            <img
                              src={p.dataUrl}
                              alt={p.name}
                              onClick={() => setLightboxImg(p.dataUrl)}
                              style={{
                                width: 68,
                                height: 54,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid #334155",
                                cursor: "pointer",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(key, p.id)}
                              style={{
                                position: "absolute",
                                top: -6,
                                left: -6,
                                width: 20,
                                height: 20,
                                borderRadius: 999,
                                border: "none",
                                background: "#ef4444",
                                color: "#fff",
                                fontSize: 12,
                                cursor: "pointer",
                                lineHeight: "20px",
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Live Camera Modal */}
      {cameraTargetKey && (
        <CameraModal
          onCapture={(file) => handleAddPhotoToKey(cameraTargetKey, file)}
          onClose={() => setCameraTargetKey(null)}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <img
            src={lightboxImg}
            alt="Preview"
            style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 14, border: "2px solid #334155" }}
          />
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, color }) {
  return (
    <div style={{
      background: "rgba(6,13,26,0.65)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      padding: "10px 14px",
      minWidth: 130,
      flex: 1,
    }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700 }}>{label}</div>
    </div>
  )
}

const st = {
  wrap: { display: "flex", flexDirection: "column", gap: 16 },
  hero: {
    borderRadius: 18,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  kpiGrid: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 16,
  },
  exportBtn: {
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    color: "#fff",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  },
  sectorTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  sectorCard: {
    borderRadius: 14,
    padding: 14,
    cursor: "pointer",
    textAlign: "right",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    transition: "all .15s",
  },
  filterBar: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    background: "#060d1a",
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: "10px 14px",
    color: "#e2e8f0",
    fontSize: 14,
  },
  filterBtn: {
    border: "1px solid #1e293b",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  },
  zoneCard: {
    background: "#0a1628",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 16,
  },
  zoneHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: "1px solid #1e293b",
  },
  itemRow: {
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 12,
  },
  actionBtn: {
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
}
