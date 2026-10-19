import React, { useState, useRef } from "react"
import { useStores } from "../hooks/useStores.js"
import { useAttachments } from "../hooks/useAttachments.js"
import { exportStoresReport, exportStoresExcel } from "../utils/export.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import CameraModal from "./CameraModal.jsx"
import * as XLSX from "xlsx"

export default function StoresModule({ currentUser, notify }) {
  const { stores, addStore, updateStore, removeStore, wipeAllStores } = useStores(notify)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewingStore, setViewingStore] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const excelInputRef = useRef(null)
  const [lightbox, setLightbox] = useState(null) // { images, index }
  const [showCamera, setShowCamera] = useState(false)

  // Attachments for the current form session
  const { attachments, addFiles, removeFile, clear: clearFiles } = useAttachments()
  const fileRef = useRef(null)

  function defaultForm() {
    return { storeNo: "", companyName: "", notes: "" }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      ...form,
      photos: attachments.map(a => ({ id: a.id, name: a.name, dataUrl: a.dataUrl }))
    }
    if (editingId) {
      // Keep existing photos + merge new ones (max 3 total)
      const existing = stores.find(s => s.id === editingId)?.photos || []
      const merged = [...existing, ...data.photos].slice(0, 3)
      await updateStore(editingId, { ...form, photos: merged })
    } else {
      await addStore({ ...form, photos: data.photos.slice(0, 3) })
    }
    closeForm()
  }

  function openEdit(s) {
    setForm({ storeNo: s.storeNo, companyName: s.companyName, notes: s.notes })
    setEditingId(s.id)
    clearFiles()
    setShowForm(true)
  }

  function closeForm() {
    setForm(defaultForm())
    setEditingId(null)
    clearFiles()
    setShowForm(false)
  }

  async function handleImportExcel(e) {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" })
      
      let count = 0
      for (const row of rows) {
        const storeData = {
          storeNo: String(row["رقم المخزن"] || row["storeNo"] || ""),
          companyName: String(row["الشركة"] || row["اسم الشركة"] || row["companyName"] || ""),
          notes: String(row["الملاحظات"] || row["ملاحظات"] || row["notes"] || ""),
          photos: []
        }
        
        if (storeData.storeNo || storeData.companyName) {
          await addStore(storeData)
          count++
        }
      }
      alert(`تم استيراد ${count} مخزن بنجاح!`)
    } catch (err) {
      console.error(err)
      alert("حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف إكسيل صالح.")
    } finally {
      setImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ""
    }
  }

  async function deletePhoto(storeId, photoId) {
    const store = stores.find(s => s.id === storeId)
    if (!store) return
    const updatedPhotos = (store.photos || []).filter(p => p.id !== photoId)
    await updateStore(storeId, { photos: updatedPhotos })
  }

  const sortedStores = [...stores].sort((a, b) => {
    return (parseInt(a.storeNo) || 0) - (parseInt(b.storeNo) || 0)
  })

  const filteredStores = sortedStores.filter(s => {
    const q = searchQuery.toLowerCase()
    return (
      (s.storeNo || "").toLowerCase().includes(q) ||
      (s.companyName || "").toLowerCase().includes(q) ||
      (s.notes || "").toLowerCase().includes(q)
    )
  })

  return (
    <div style={s.container}>
      <div style={s.header} className="module-header">
        <h2 style={{ margin: 0, color: "#e2e8f0" }}>📦 بيانات المخازن</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }} className="module-header-actions">
          <input
            type="text"
            placeholder="🔍 بحث في المخازن..."
            style={s.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button style={{ ...s.addBtn, background: "#f59e0b" }} onClick={() => exportStoresReport(filteredStores)}>
            🖨️ طباعة تقرير
          </button>
          <button style={{ ...s.addBtn, background: "#10b981" }} onClick={() => exportStoresExcel(filteredStores)}>
            📊 تصدير إكسيل
          </button>
          <button style={{ ...s.addBtn, background: "#8b5cf6" }} onClick={() => excelInputRef.current?.click()} disabled={importing}>
            {importing ? "⏳ جاري الاستيراد..." : "📥 استيراد إكسيل"}
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            style={{ display: "none" }} 
            ref={excelInputRef} 
            onChange={handleImportExcel} 
          />
          <button style={s.addBtn} onClick={() => { clearFiles(); setShowForm(true) }}>
            ➕ إضافة مخزن جديد
          </button>
          {currentUser?.role === "admin" && (
            <button 
              style={{ ...s.addBtn, background: "#dc2626" }} 
              onClick={() => {
                if (window.confirm("تحذير: هل أنت متأكد من مسح جميع المخازن نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
                  wipeAllStores()
                }
              }}
            >
              🗑️ مسح الكل
            </button>
          )}
        </div>
      </div>

      <div style={s.tableContainer} className="table-scroll">
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: "12%" }}>رقم المخزن</th>
              <th style={{ ...s.th, width: "28%" }}>الشركة</th>
              <th style={{ ...s.th, width: "28%" }}>ملاحظات</th>
              <th style={{ ...s.th, width: "20%" }}>الصور</th>
              <th style={{ ...s.th, width: "12%" }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredStores.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                  لا توجد مخازن مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredStores.map(store => {
                const isVacant = store.companyName?.toLowerCase().includes("vacant")
                const photos = store.photos || []
                return (
                  <tr key={store.id} style={{ ...s.tr, background: isVacant ? "rgba(234,179,8,0.08)" : "transparent" }}>
                    <td style={s.td}>
                      <span style={s.badge}>{store.storeNo || "-"}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight: "bold", color: isVacant ? "#facc15" : "#e2e8f0" }}>
                      {store.companyName || "-"}
                    </td>
                    <td style={{ ...s.td, color: "#94a3b8", fontSize: 13 }}>{store.notes || "-"}</td>
                    <td style={s.td}>
                      {photos.length === 0 ? (
                        <span style={{ color: "#475569", fontSize: 12 }}>لا توجد صور</span>
                      ) : (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {photos.map((p, idx) => (
                            <div key={p.id} style={s.thumbWrap}>
                              <img
                                src={p.dataUrl}
                                alt={p.name}
                                style={s.thumb}
                                onClick={() => setLightbox({ images: photos, index: idx })}
                              />
                              <button
                                style={s.thumbDelete}
                                onClick={() => deletePhoto(store.id, p.id)}
                                title="حذف الصورة"
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={{ ...s.actionBtn, background: "#059669", color: "#d1fae5" }} onClick={() => setViewingStore(store)}>تفاصيل</button>
                        <button style={{ ...s.actionBtn, background: "#1e3a8a", color: "#bfdbfe" }} onClick={() => openEdit(store)}>تعديل</button>
                        <button style={{ ...s.actionBtn, background: "#7f1d1d", color: "#fca5a5" }} onClick={() => setConfirmDelete(store.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>
              {editingId ? "تعديل بيانات المخزن" : "إضافة مخزن جديد"}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={s.label}>
                رقم المخزن:
                <input style={s.input} required value={form.storeNo} onChange={e => setForm({ ...form, storeNo: e.target.value })} />
              </label>
              <label style={s.label}>
                الشركة:
                <input style={s.input} required value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} />
              </label>
              <label style={s.label}>
                ملاحظات:
                <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </label>

              {/* ── Photo Upload ── */}
              <div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
                  📸 صور توثيق المخزن (بحد أقصى 3 صور)
                </div>

                {/* Hidden inputs */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={async e => { await addFiles(e.target.files); e.target.value = "" }}
                />
                {attachments.length < 3 && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      style={{ ...s.uploadBtn, borderColor: "#0ea5e9", color: "#0ea5e9" }}
                      onClick={() => setShowCamera(true)}
                    >
                      📷 التقاط بالكاميرا
                    </button>
                    <button
                      type="button"
                      style={s.uploadBtn}
                      onClick={() => fileRef.current?.click()}
                    >
                      🖼️ اختيار من المعرض
                    </button>
                  </div>
                )}

                {showCamera && (
                  <CameraModal
                    onCapture={file => addFiles([file])}
                    onClose={() => setShowCamera(false)}
                  />
                )}

                {attachments.length > 0 && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    {attachments.map(a => (
                      <div key={a.id} style={s.thumbWrap}>
                        <img src={a.dataUrl} alt={a.name} style={s.thumb} />
                        <button style={s.thumbDelete} type="button" onClick={() => removeFile(a.id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {editingId && (() => {
                  const existingPhotos = stores.find(st => st.id === editingId)?.photos || []
                  return existingPhotos.length > 0 ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>الصور الحالية:</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {existingPhotos.map((p, idx) => (
                          <img key={p.id} src={p.dataUrl} alt={p.name} style={{ ...s.thumb, cursor: "default" }} />
                        ))}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button type="button" style={{ ...s.btn, background: "#334155" }} onClick={closeForm}>إلغاء</button>
                <button type="submit" style={{ ...s.btn, background: "#0ea5e9" }}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={s.lightboxBox} onClick={e => e.stopPropagation()}>
            <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            <img
              src={lightbox.images[lightbox.index].dataUrl}
              alt=""
              style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: 8 }}
            />
            {lightbox.images.length > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}>
                <button style={s.lightboxNav} onClick={() => setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))}>◀</button>
                <span style={{ color: "#94a3b8", fontSize: 13 }}>{lightbox.index + 1} / {lightbox.images.length}</span>
                <button style={s.lightboxNav} onClick={() => setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }))}>▶</button>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد من رغبتك في حذف بيانات هذا المخزن؟"
          onConfirm={async () => { await removeStore(confirmDelete); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── View Details Modal ── */}
      {viewingStore && (
        <div style={s.modalOverlay} onClick={() => setViewingStore(null)}>
          <div style={{ ...s.modalContent, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📦 تفاصيل المخزن</h3>
              <button style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }} onClick={() => setViewingStore(null)}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <DetailRow label="رقم المخزن" value={viewingStore.storeNo} />
              <DetailRow label="الشركة / المستأجر" value={viewingStore.companyName} />
              <DetailRow label="ملاحظات" value={viewingStore.notes} />
              
              <div>
                <span style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4, display: "block" }}>صور التوثيق</span>
                {(!viewingStore.photos || viewingStore.photos.length === 0) ? (
                  <span style={{ fontSize: 14, color: "#64748b" }}>لا توجد صور</span>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                    {viewingStore.photos.map((p, idx) => (
                      <img 
                        key={p.id} 
                        src={p.dataUrl} 
                        alt={p.name} 
                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #334155", cursor: "pointer" }}
                        onClick={() => { setViewingStore(null); setLightbox({ images: viewingStore.photos, index: idx }); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
              <button style={{ ...s.btn, background: "#334155" }} onClick={() => setViewingStore(null)}>إغلاق</button>
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

const s = {
  container: { background: "rgba(10,22,40,0.8)", borderRadius: 16, padding: 24, border: "1px solid #1e293b", color: "#e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  addBtn: { background: "#0ea5e9", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: "bold" },
  searchInput: { padding: "10px 16px", borderRadius: 8, border: "1px solid #1e293b", background: "rgba(15,23,42,0.6)", color: "#f8fafc", outline: "none", minWidth: 0, fontFamily: "inherit" },
  tableContainer: { overflowX: "auto", maxHeight: "70vh" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "right" },
  th: { padding: "12px", background: "#0f172a", borderBottom: "1px solid #1e293b", color: "#94a3b8", fontWeight: "bold", position: "sticky", top: 0, zIndex: 1 },
  td: { padding: "10px 12px", borderBottom: "1px solid #1e293b", verticalAlign: "middle" },
  tr: { transition: "background 0.2s" },
  badge: { background: "#1e293b", padding: "4px 8px", borderRadius: 6, fontSize: 14, fontWeight: "bold", border: "1px solid #334155" },
  actionBtn: { padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold" },
  thumbWrap: { position: "relative", display: "inline-block" },
  thumb: { width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "1px solid #334155", cursor: "pointer" },
  thumbDelete: { position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 11, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", lineHeight: 1, padding: 0 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: 20 },
  modalContent: { background: "#0f172a", padding: 24, borderRadius: 16, border: "1px solid #1e293b", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto" },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#cbd5e1" },
  input: { padding: 10, borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f8fafc", outline: "none", fontFamily: "inherit" },
  uploadBtn: { background: "#1e293b", border: "1px dashed #334155", color: "#94a3b8", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  btn: { padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: "bold", color: "#fff" },
  lightboxOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000 },
  lightboxBox: { position: "relative", padding: 20, maxWidth: "90vw" },
  lightboxClose: { position: "absolute", top: 0, right: 0, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 16 },
  lightboxNav: { background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 18 }
}
