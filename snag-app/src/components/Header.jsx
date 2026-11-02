import React, { useState } from "react"
import { exportReport, exportExcel, exportWord } from "../utils/export.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import { useLocations } from "../hooks/useLocations.js"
import { useLanguage } from "../i18n/LanguageContext.jsx"
import { canUser, hasPrivilege } from "../constants/permissions.js"

export default function Header({ snags, onImport, isAdmin, currentUser, activeModule = "snags", onWipeAll }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const { locations } = useLocations()
  const { tr } = useLanguage()

  const canExport = isAdmin || canUser(currentUser, activeModule, "export") || canUser(currentUser, "snags", "export")
  const canWipe = isAdmin || hasPrivilege(currentUser, "canWipeAll")

  return (
    <header style={s.header} className="app-header">
      <div>
        <h1 style={s.title}>
          <span style={s.icon}>📋</span> Smart Mall OS
        </h1>
        <p style={s.sub}>
          {tr(
            "نظام ذكي لتسجيل ومتابعة ملاحظات التشغيل والصيانة — بارك ستريت",
            "Smart Operations & Maintenance Inspection System — Park St."
          )}
        </p>
      </div>

      <div style={s.actions} className="header-actions">
        {canExport && (
          <>
            <button
              style={{ ...s.btn, background: "linear-gradient(135deg, #059669, #047857)", color: "#ffffff", border: "1px solid #10b981", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
              onClick={() => exportExcel(snags, locations)}
              title={tr(
                "تصدير شيت إكسيل تفاعلي شامل يحتوي على فلاتر وقوائم منسدلة ومعادلات ولوحة مؤشرات",
                "Export comprehensive interactive Excel workbook with filters, dropdowns, and live KPI dashboard"
              )}
            >
              📊 {tr("شيت إكسيل الشامل (بديل التطبيق)", "Master Interactive Excel")}
            </button>
            <button style={{ ...s.btn, ...s.ghost }} onClick={() => exportWord(snags, locations)}>
              📝 {tr("وورد", "Word")}
            </button>
            <button style={{ ...s.btn, ...s.ghost }} onClick={() => exportReport(snags, locations)}>
              📄 PDF
            </button>
          </>
        )}
        {canWipe && (
          <>
            <button
              style={{ ...s.btn, background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" }}
              onClick={() => setShowConfirm(true)}
            >
              🗑️ {tr("مسح الكل", "Wipe All")}
            </button>
            {showConfirm && (
              <ConfirmDialog
                title={tr("تحذير خطير ⚠️", "Critical Warning ⚠️")}
                message={tr(
                  "هل أنت متأكد من رغبتك في حذف جميع الملاحظات في النظام نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!",
                  "Are you sure you want to permanently wipe all snags in the system? This action cannot be undone!"
                )}
                onConfirm={() => { setShowConfirm(false); onWipeAll() }}
                onCancel={() => setShowConfirm(false)}
              />
            )}
          </>
        )}
      </div>
    </header>
  )
}

const s = {
  header:  { display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap", marginBottom:20, paddingBottom:20, borderBottom:"1px solid #1e293b" },
  title:   { fontSize:26, fontWeight:800, display:"flex", alignItems:"center", gap:10 },
  icon:    { fontSize:28 },
  sub:     { color:"#64748b", marginTop:4, fontSize:13 },
  actions: { display:"flex", gap:8, flexWrap:"wrap" },
  btn:     { border:0, borderRadius:10, padding:"9px 14px", cursor:"pointer", fontWeight:700, fontSize:13 },
  ghost:   { background:"#0f172a", color:"#94a3b8", border:"1px solid #1e293b" },
}
