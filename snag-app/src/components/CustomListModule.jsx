import React, { useState, useRef } from "react"
import { useCustomItems } from "../hooks/useCustomItems.js"
import { useAttachments } from "../hooks/useAttachments.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import CameraModal from "./CameraModal.jsx"
import * as XLSX from "xlsx"
import { extractTextFromFile } from "../utils/extractText.js"

export default function CustomListModule({ list, currentUser, notify }) {
  const { items, addItem, updateItem, removeItem, wipeAllItems } = useCustomItems(list.id, notify)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const excelInputRef = useRef(null)
  const [lightbox, setLightbox] = useState(null) // { images, index }
  const [showCamera, setShowCamera] = useState(false)

  const isPdfFile = (p) => {
    return p.type === "application/pdf" || 
           p.name?.toLowerCase().endsWith(".pdf") || 
           p.dataUrl?.startsWith("data:application/pdf")
  }

  const { attachments, addFiles, removeFile, clear: clearFiles } = useAttachments()
  const fileRef = useRef(null)

  function defaultForm() {
    return { title: "", subtitle: "", notes: "" }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const data = {
      ...form,
      photos: attachments.map(a => ({ id: a.id, name: a.name, type: a.type, dataUrl: a.dataUrl }))
    }
    if (editingId) {
      const existing = items.find(i => i.id === editingId)?.photos || []
      const merged = [...existing, ...data.photos].slice(0, 3)
      await updateItem(editingId, { ...form, photos: merged })
    } else {
      await addItem({ ...form, photos: data.photos.slice(0, 3) })
    }
    closeForm()
  }

  function openEdit(item) {
    setForm({ title: item.title, subtitle: item.subtitle, notes: item.notes })
    setEditingId(item.id)
    clearFiles()
    setShowForm(true)
  }

  function closeForm() {
    setForm(defaultForm())
    setEditingId(null)
    clearFiles()
    setShowForm(false)
  }

  async function handleFileSelect(e) {
    const files = e.target.files
    if (!files || files.length === 0) return
    
    // Add to attachments
    addFiles(files)

    // Try to auto-fill form if empty
    if (!form.title && files[0]) {
      setExtracting(true)
      try {
        const text = await extractTextFromFile(files[0])
        if (text && text.trim()) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2)
          if (lines.length > 0) {
            setForm(prev => ({
              ...prev,
              title: prev.title || lines[0] || "",
              subtitle: prev.subtitle || (lines.length > 1 ? lines[1] : ""),
              notes: prev.notes || lines.slice(2).join('\n')
            }))
          }
        }
      } catch (err) {
        console.error("Extraction error", err)
      } finally {
        setExtracting(false)
      }
    }
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
        const itemData = {
          title: String(row["العنوان"] || row["الاسم"] || row["title"] || ""),
          subtitle: String(row["العنوان الفرعي"] || row["التفاصيل"] || row["subtitle"] || ""),
          notes: String(row["الملاحظات"] || row["ملاحظات"] || row["notes"] || ""),
          photos: []
        }
        
        if (itemData.title || itemData.subtitle) {
          await addItem(itemData)
          count++
        }
      }
      alert(`تم استيراد ${count} عنصر بنجاح!`)
    } catch (err) {
      console.error(err)
      alert("حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف إكسيل صالح.")
    } finally {
      setImporting(false)
      if (excelInputRef.current) excelInputRef.current.value = ""
    }
  }

  async function deletePhoto(itemId, photoId) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const updatedPhotos = (item.photos || []).filter(p => p.id !== photoId)
    await updateItem(itemId, { photos: updatedPhotos })
  }

  const filteredItems = items.filter(i => {
    const q = searchQuery.toLowerCase()
    return (
      (i.title || "").toLowerCase().includes(q) ||
      (i.subtitle || "").toLowerCase().includes(q) ||
      (i.notes || "").toLowerCase().includes(q)
    )
  })

  return (
    <div style={s.container}>
      <div style={s.header} className="module-header">
        <h2 style={{ margin: 0, color: "#e2e8f0" }}>📁 {list.name}</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }} className="module-header-actions">
          <input
            type="text"
            placeholder="🔍 بحث..."
            style={s.searchInput}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
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
            ➕ إضافة جديد
          </button>
          {currentUser?.role === "admin" && (
            <button 
              style={{ ...s.addBtn, background: "#dc2626" }} 
              onClick={() => {
                if (window.confirm("تحذير: هل أنت متأكد من مسح جميع البيانات نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
                  wipeAllItems()
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
              <th style={s.th}>العنوان</th>
              <th style={s.th}>التفاصيل الفرعية</th>
              <th style={s.th}>الملاحظات</th>
              <th style={s.th}>المرفقات</th>
              <th style={s.th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={item.id} style={{ background: idx % 2 === 0 ? "rgba(15,23,42,0.3)" : "rgba(30,41,59,0.3)" }}>
                <td style={s.td}><strong>{item.title}</strong></td>
                <td style={s.td}>{item.subtitle || "-"}</td>
                <td style={s.td}>{item.notes || "-"}</td>
                <td style={s.td}>
                  {item.photos && item.photos.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.photos.map((p, i) => (
                        <div key={p.id} style={{ position: "relative", width: 40, height: 40 }} title={p.name}>
                          {isPdfFile(p) ? (
                            <div 
                              style={{ width: "100%", height: "100%", background: "#ef4444", borderRadius: 4, display: "grid", placeItems: "center", color: "white", fontSize: 10, cursor: "pointer", border: "1px solid #334155" }}
                              onClick={() => window.open(p.dataUrl, '_blank')}
                            >
                              PDF
                            </div>
                          ) : (
                            <img 
                              src={p.dataUrl} 
                              alt="مرفق" 
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4, cursor: "pointer", border: "1px solid #334155" }}
                              onClick={() => setLightbox({ images: item.photos.filter(img => !isPdfFile(img)), index: Math.max(0, item.photos.filter(img => !isPdfFile(img)).findIndex(img => img.id === p.id)) })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : "-"}
                </td>
                <td style={s.td}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ ...s.actionBtn, background: "#3b82f6" }} onClick={() => setViewingItem(item)}>
                      👁️
                    </button>
                    {currentUser?.role === "admin" && (
                      <button style={{ ...s.actionBtn, background: "#f59e0b" }} onClick={() => openEdit(item)}>
                        ✏️
                      </button>
                    )}
                    {currentUser?.role === "admin" && (
                      <button style={{ ...s.actionBtn, background: "#ef4444" }} onClick={() => setConfirmDelete(item)}>
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                  لا توجد بيانات متاحة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h3 style={{ margin: "0 0 16px 0", color: "#e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <span>{editingId ? "تعديل بيانات" : "إضافة جديد"}</span>
              {extracting && <span style={{ fontSize: 13, color: "#f59e0b" }}>⏳ جاري قراءة الملف...</span>}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={s.label}>العنوان الأساسي</label>
                <input 
                  required 
                  style={s.input} 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                />
              </div>
              <div>
                <label style={s.label}>التفاصيل الفرعية (اختياري)</label>
                <input 
                  style={s.input} 
                  value={form.subtitle} 
                  onChange={e => setForm({ ...form, subtitle: e.target.value })} 
                />
              </div>
              <div>
                <label style={s.label}>ملاحظات</label>
                <textarea 
                  rows="3" 
                  style={{ ...s.input, resize: "vertical" }} 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                />
              </div>

              {/* Attachments Section */}
              <div style={s.attachSection}>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8, fontWeight: "bold" }}>
                  📸 المرفقات (الحد الأقصى 3)
                </div>
                {/* Existing Photos when editing */}
                {editingId && (
                  <div style={s.photoGrid}>
                    {(items.find(i => i.id === editingId)?.photos || []).map(p => (
                      <div key={p.id} style={s.photoWrap} title={p.name}>
                        {isPdfFile(p) ? (
                          <div style={{ width: "100%", height: "100%", background: "#ef4444", display: "grid", placeItems: "center", color: "white", fontSize: 14 }}>PDF</div>
                        ) : (
                          <img src={p.dataUrl} alt="مرفق" style={s.thumb} />
                        )}
                        <button type="button" style={s.delPhotoBtn} onClick={() => deletePhoto(editingId, p.id)}>✖</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* New Photos */}
                {attachments.length > 0 && (
                  <div style={{ ...s.photoGrid, marginTop: editingId ? 8 : 0 }}>
                    {attachments.map(file => (
                      <div key={file.id} style={s.photoWrap} title={file.name}>
                        {isPdfFile(file) ? (
                          <div style={{ width: "100%", height: "100%", background: "#ef4444", display: "grid", placeItems: "center", color: "white", fontSize: 14 }}>PDF</div>
                        ) : (
                          <img src={file.dataUrl} alt="preview" style={s.thumb} />
                        )}
                        <button type="button" style={s.delPhotoBtn} onClick={() => removeFile(file.id)}>✖</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add Photo Buttons */}
                {((items.find(i => i.id === editingId)?.photos?.length || 0) + attachments.length < 3) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button type="button" style={{ ...s.uploadBtn, background: "#3b82f6" }} onClick={() => setShowCamera(true)}>
                      📷 التقاط بالكاميرا
                    </button>
                    <button type="button" style={s.uploadBtn} onClick={() => fileRef.current?.click()}>
                      📁 إرفاق ملف
                    </button>
                    <input type="file" accept="image/*,application/pdf" ref={fileRef} style={{ display: "none" }} onChange={handleFileSelect} multiple />
                  </div>
                )}
                {showCamera && (
                  <CameraModal
                    onCapture={file => handleFileSelect({ target: { files: [file], value: "" } })}
                    onClose={() => setShowCamera(false)}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="submit" style={{ ...s.addBtn, flex: 1, padding: 12 }}>
                  {editingId ? "حفظ التعديلات" : "إضافة للسجل"}
                </button>
                <button type="button" style={{ ...s.addBtn, flex: 1, padding: 12, background: "#475569" }} onClick={closeForm}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Detail Modal */}
      {viewingItem && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h3 style={{ margin: "0 0 16px 0", color: "#e2e8f0", borderBottom: "1px solid #1e293b", paddingBottom: 12 }}>تفاصيل البيان</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 15, color: "#cbd5e1" }}>
              <div style={s.detailRow}><span style={s.detailLabel}>العنوان:</span> <span style={s.detailValue}>{viewingItem.title}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>التفاصيل:</span> <span style={s.detailValue}>{viewingItem.subtitle || "-"}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>ملاحظات:</span> <span style={s.detailValue}>{viewingItem.notes || "-"}</span></div>
              
              {viewingItem.photos && viewingItem.photos.length > 0 && (
                <div>
                  <span style={s.detailLabel}>المرفقات:</span>
                  <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                    {viewingItem.photos.map((p, i) => (
                      isPdfFile(p) ? (
                        <div 
                          key={p.id}
                          style={{ width: 80, height: 80, background: "#ef4444", borderRadius: 8, display: "grid", placeItems: "center", color: "white", cursor: "pointer", border: "1px solid #334155" }}
                          onClick={() => window.open(p.dataUrl, '_blank')}
                          title={p.name}
                        >
                          PDF
                        </div>
                      ) : (
                        <img 
                          key={p.id} 
                          src={p.dataUrl} 
                          alt="مرفق" 
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid #334155", cursor: "pointer" }} 
                          onClick={() => setLightbox({ images: viewingItem.photos.filter(img => !isPdfFile(img)), index: Math.max(0, viewingItem.photos.filter(img => !isPdfFile(img)).findIndex(img => img.id === p.id)) })}
                        />
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button style={{ ...s.addBtn, background: "#334155", padding: "10px 24px" }} onClick={() => setViewingItem(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null) }}>
          <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✖</button>
          <img src={lightbox.images[lightbox.index].dataUrl} alt="preview full" style={s.lightboxImg} />
          {lightbox.images.length > 1 && (
            <div style={s.lightboxNav}>
              <button 
                style={s.lightboxBtn}
                onClick={() => setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length })}
              >
                ◀
              </button>
              <button 
                style={s.lightboxBtn}
                onClick={() => setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.images.length })}
              >
                ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف ${confirmDelete.title}؟`}
          onConfirm={async () => {
            await removeItem(confirmDelete.id)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
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
  td: { padding: "12px", borderBottom: "1px solid #1e293b", verticalAlign: "middle" },
  actionBtn: { padding: "6px 10px", borderRadius: 6, border: "none", color: "white", cursor: "pointer", fontSize: 13 },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(2,6,23,0.8)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: 20 },
  modalContent: { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" },
  label: { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: "bold" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #1e293b", background: "#060d1a", color: "#f8fafc", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  attachSection: { background: "rgba(15,23,42,0.5)", border: "1px dashed #334155", borderRadius: 12, padding: 16, marginTop: 8 },
  photoGrid: { display: "flex", gap: 10, flexWrap: "wrap" },
  photoWrap: { position: "relative", width: 70, height: 70, borderRadius: 8, overflow: "hidden", border: "1px solid #334155" },
  thumb: { width: "100%", height: "100%", objectFit: "cover" },
  delPhotoBtn: { position: "absolute", top: 2, right: 2, background: "rgba(220,38,38,0.9)", color: "white", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  uploadBtn: { flex: 1, padding: "8px", borderRadius: 6, border: "none", background: "#64748b", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: 13 },
  detailRow: { display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px dashed #1e293b" },
  detailLabel: { color: "#64748b", fontWeight: "bold", width: 80, flexShrink: 0 },
  detailValue: { color: "#f8fafc" },
  lightboxOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 10000, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" },
  lightboxImg: { maxWidth: "90%", maxHeight: "80vh", borderRadius: 8, border: "2px solid #334155" },
  lightboxClose: { position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontSize: 24, cursor: "pointer", width: 40, height: 40, borderRadius: "50%" },
  lightboxNav: { display: "flex", gap: 20, marginTop: 20 },
  lightboxBtn: { background: "rgba(255,255,255,0.1)", border: "none", color: "white", fontSize: 20, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }
}
