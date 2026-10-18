import React, { useState } from "react"
import { useUnits } from "../hooks/useUnits.js"
import { exportUnitsReport, exportUnitsExcel } from "../utils/export.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import * as XLSX from "xlsx"

export default function UnitsModule({ currentUser, notify }) {
  const { units, addUnit, updateUnit, removeUnit, wipeAllUnits } = useUnits(notify)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewingUnit, setViewingUnit] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [searchQuery, setSearchQuery] = useState("")
  const [importing, setImporting] = useState(false)
  const fileInputRef = React.useRef(null)

  function defaultForm() {
    return {
      buildingNo: "",
      floor: "",
      unitNo: "",
      unitName: "",
      unitOwnerName: "",
      unitManagerName: "",
      mobileTelOwner: "",
      mobileTelManager: "",
      mobileTelUnit: "",
      address: "",
      email: "",
      workingHours: "",
      weeklyOff: "",
      companyActivity: ""
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editingId) {
      await updateUnit(editingId, form)
    } else {
      await addUnit(form)
    }
    closeForm()
  }

  function openEdit(u) {
    setForm({ ...u })
    setEditingId(u.id)
    setShowForm(true)
  }

  function closeForm() {
    setForm(defaultForm())
    setEditingId(null)
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
        const unitData = {
          buildingNo: String(row["المبنى"] || row["buildingNo"] || ""),
          floor: String(row["الدور"] || row["floor"] || ""),
          unitNo: String(row["رقم الوحدة"] || row["unitNo"] || ""),
          unitName: String(row["اسم الوحدة"] || row["الشركة"] || row["unitName"] || ""),
          unitOwnerName: String(row["المالك"] || row["اسم المالك"] || row["unitOwnerName"] || ""),
          unitManagerName: String(row["المدير"] || row["اسم المدير"] || row["unitManagerName"] || ""),
          mobileTelOwner: String(row["هاتف المالك"] || row["mobileTelOwner"] || ""),
          mobileTelManager: String(row["هاتف المدير"] || row["mobileTelManager"] || ""),
          mobileTelUnit: String(row["هاتف الوحدة"] || row["mobileTelUnit"] || ""),
          address: String(row["العنوان"] || row["address"] || ""),
          email: String(row["البريد الإلكتروني"] || row["الايميل"] || row["email"] || ""),
          workingHours: String(row["مواعيد العمل"] || row["workingHours"] || ""),
          weeklyOff: String(row["الراحة الأسبوعية"] || row["weeklyOff"] || ""),
          companyActivity: String(row["النشاط"] || row["نشاط الشركة"] || row["companyActivity"] || "")
        }
        
        if (unitData.unitNo || unitData.unitName) {
          await addUnit(unitData)
          count++
        }
      }
      alert(`تم استيراد ${count} وحدة بنجاح!`)
    } catch (err) {
      console.error(err)
      alert("حدث خطأ أثناء قراءة الملف. تأكد من أنه ملف إكسيل صالح.")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const filteredUnits = units.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.unitNo || "").toLowerCase().includes(q) ||
      (u.unitName || "").toLowerCase().includes(q) ||
      (u.unitOwnerName || "").toLowerCase().includes(q) ||
      (u.companyActivity || "").toLowerCase().includes(q) ||
      (u.buildingNo || "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={s.container}>
      <div style={s.header} className="module-header">
        <h2 style={{ margin: 0, color: "#e2e8f0" }}>🏢 بيانات الوحدات والعملاء</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }} className="module-header-actions">
          <input 
            type="text" 
            placeholder="🔍 بحث في الوحدات..." 
            style={s.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button style={{ ...s.addBtn, background: "#f59e0b" }} onClick={() => exportUnitsReport(filteredUnits)}>
            🖨️ طباعة تقرير
          </button>
          <button style={{ ...s.addBtn, background: "#10b981" }} onClick={() => exportUnitsExcel(filteredUnits)}>
            📊 تصدير إكسيل
          </button>
          <button style={{ ...s.addBtn, background: "#8b5cf6" }} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "⏳ جاري الاستيراد..." : "📥 استيراد إكسيل"}
          </button>
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            style={{ display: "none" }} 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
          />
          <button style={s.addBtn} onClick={() => setShowForm(true)}>
            ➕ إضافة وحدة جديدة
          </button>
          {currentUser?.role === "admin" && (
            <button 
              style={{ ...s.addBtn, background: "#dc2626" }} 
              onClick={() => {
                if (window.confirm("تحذير: هل أنت متأكد من مسح جميع الوحدات نهائياً؟ لا يمكن التراجع عن هذا الإجراء.")) {
                  wipeAllUnits()
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
              <th style={s.th}>المبنى</th>
              <th style={s.th}>الوحدة</th>
              <th style={s.th}>الاسم</th>
              <th style={s.th}>المالك</th>
              <th style={s.th}>النشاط</th>
              <th style={s.th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: "center", color: "#64748b" }}>
                  لا توجد وحدات مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredUnits.map(u => {
                const isVacant = (u.unitName || "").toLowerCase().includes("vacant") || (u.companyActivity || "").toLowerCase().includes("vacant")
                return (
                <tr key={u.id} style={{ ...s.tr, background: isVacant ? "rgba(234,179,8,0.08)" : "transparent" }}>
                  <td style={s.td}>{u.buildingNo || "-"} (دور {u.floor || "-"})</td>
                  <td style={s.td}>{u.unitNo || "-"}</td>
                  <td style={{ ...s.td, fontWeight: isVacant ? "bold" : "normal", color: isVacant ? "#facc15" : "inherit" }}>{u.unitName || "-"}</td>
                  <td style={s.td}>{u.unitOwnerName || "-"}</td>
                  <td style={s.td}>{u.companyActivity || "-"}</td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{ ...s.actionBtn, background: "#059669", color: "#d1fae5" }} onClick={() => setViewingUnit(u)}>تفاصيل</button>
                      <button style={{ ...s.actionBtn, background: "#1e3a8a", color: "#bfdbfe" }} onClick={() => openEdit(u)}>تعديل</button>
                      <button style={{ ...s.actionBtn, background: "#7f1d1d", color: "#fca5a5" }} onClick={() => setConfirmDelete(u.id)}>حذف</button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div style={s.modalOverlay}>
          <div style={s.modalContent}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingId ? "تعديل بيانات الوحدة" : "إضافة وحدة جديدة"}</h3>
            <form onSubmit={handleSubmit} style={s.formGrid} className="modal-form-grid">
              <label style={s.label}>
                رقم المبنى:
                <input style={s.input} value={form.buildingNo} onChange={e => setForm({...form, buildingNo: e.target.value})} />
              </label>
              <label style={s.label}>
                الدور:
                <input style={s.input} value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} />
              </label>
              <label style={s.label}>
                رقم الوحدة:
                <input style={s.input} required value={form.unitNo} onChange={e => setForm({...form, unitNo: e.target.value})} />
              </label>
              <label style={s.label}>
                اسم الوحدة:
                <input style={s.input} required value={form.unitName} onChange={e => setForm({...form, unitName: e.target.value})} />
              </label>
              <label style={s.label}>
                اسم المالك:
                <input style={s.input} value={form.unitOwnerName} onChange={e => setForm({...form, unitOwnerName: e.target.value})} />
              </label>
              <label style={s.label}>
                اسم المدير:
                <input style={s.input} value={form.unitManagerName} onChange={e => setForm({...form, unitManagerName: e.target.value})} />
              </label>
              <label style={s.label}>
                هاتف المالك:
                <input style={s.input} value={form.mobileTelOwner} onChange={e => setForm({...form, mobileTelOwner: e.target.value})} />
              </label>
              <label style={s.label}>
                هاتف المدير:
                <input style={s.input} value={form.mobileTelManager} onChange={e => setForm({...form, mobileTelManager: e.target.value})} />
              </label>
              <label style={s.label}>
                هاتف الوحدة:
                <input style={s.input} value={form.mobileTelUnit} onChange={e => setForm({...form, mobileTelUnit: e.target.value})} />
              </label>
              <label style={s.label}>
                البريد الإلكتروني:
                <input type="email" style={s.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </label>
              <label style={s.label}>
                مواعيد العمل:
                <input style={s.input} value={form.workingHours} onChange={e => setForm({...form, workingHours: e.target.value})} />
              </label>
              <label style={s.label}>
                الراحة الأسبوعية:
                <input style={s.input} value={form.weeklyOff} onChange={e => setForm({...form, weeklyOff: e.target.value})} />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                العنوان الرئيسي:
                <input style={s.input} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </label>
              <label style={{ ...s.label, gridColumn: "1 / -1" }}>
                نشاط الشركة:
                <input style={s.input} value={form.companyActivity} onChange={e => setForm({...form, companyActivity: e.target.value})} />
              </label>

              <div style={s.formActions}>
                <button type="button" style={{ ...s.btn, background: "#334155" }} onClick={closeForm}>إلغاء</button>
                <button type="submit" style={{ ...s.btn, background: "#0ea5e9" }}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد من رغبتك في حذف بيانات هذه الوحدة؟ لا يمكن التراجع عن هذا الإجراء."
          onConfirm={async () => {
            await removeUnit(confirmDelete)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* ── View Details Modal ── */}
      {viewingUnit && (
        <div style={s.modalOverlay} onClick={() => setViewingUnit(null)}>
          <div style={{ ...s.modalContent, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>📋 تفاصيل الوحدة</h3>
              <button style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }} onClick={() => setViewingUnit(null)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }} className="details-grid">
              <DetailRow label="المبنى" value={viewingUnit.buildingNo} />
              <DetailRow label="الدور" value={viewingUnit.floor} />
              <DetailRow label="رقم الوحدة" value={viewingUnit.unitNo} />
              <DetailRow label="اسم الوحدة" value={viewingUnit.unitName} />
              <DetailRow label="اسم المالك" value={viewingUnit.unitOwnerName} />
              <DetailRow label="اسم المدير" value={viewingUnit.unitManagerName} />
              <DetailRow label="هاتف المالك" value={viewingUnit.mobileTelOwner} />
              <DetailRow label="هاتف المدير" value={viewingUnit.mobileTelManager} />
              <DetailRow label="هاتف الوحدة" value={viewingUnit.mobileTelUnit} />
              <DetailRow label="البريد الإلكتروني" value={viewingUnit.email} />
              <DetailRow label="مواعيد العمل" value={viewingUnit.workingHours} />
              <DetailRow label="الراحة الأسبوعية" value={viewingUnit.weeklyOff} />
              <DetailRow label="نشاط الشركة" value={viewingUnit.companyActivity} />
            </div>
            <div style={{ marginTop: 12 }}>
              <DetailRow label="العنوان" value={viewingUnit.address} fullWidth />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button style={{ ...s.btn, background: "#334155" }} onClick={() => setViewingUnit(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, fullWidth }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: 14, color: "#f8fafc", background: "rgba(30,41,59,0.5)", padding: "8px 12px", borderRadius: 6, minHeight: 36, border: "1px solid rgba(51,65,85,0.5)" }}>
        {value || "-"}
      </span>
    </div>
  )
}

const s = {
  container: {
    background: "rgba(10,22,40,0.8)",
    borderRadius: 16,
    padding: 24,
    border: "1px solid #1e293b",
    color: "#e2e8f0"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  addBtn: {
    background: "#0ea5e9", color: "#fff",
    border: "none", padding: "10px 16px", borderRadius: 8,
    cursor: "pointer", fontWeight: "bold"
  },
  tableContainer: {
    overflowX: "auto"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "right"
  },
  th: {
    padding: "12px",
    background: "#0f172a",
    borderBottom: "1px solid #1e293b",
    color: "#94a3b8",
    fontWeight: "bold"
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #1e293b"
  },
  tr: {
    transition: "background 0.2s"
  },
  actionBtn: {
    padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: "bold"
  },
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, padding: 20
  },
  modalContent: {
    background: "#0f172a",
    padding: 24, borderRadius: 16, border: "1px solid #1e293b",
    width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto"
  },
  formGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16
  },
  label: {
    display: "flex", flexDirection: "column", gap: 6,
    fontSize: 13, color: "#cbd5e1"
  },
  input: {
    padding: 10, borderRadius: 8, border: "1px solid #334155",
    background: "#1e293b", color: "#f8fafc",
    outline: "none"
  },
  formActions: {
    gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10
  },
  btn: {
    padding: "10px 20px", borderRadius: 8, border: "none",
    cursor: "pointer", fontWeight: "bold", color: "#fff"
  },
  searchInput: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #1e293b",
    background: "rgba(15, 23, 42, 0.6)",
    color: "#f8fafc",
    outline: "none",
    minWidth: 0,
    fontFamily: "inherit"
  }
}
