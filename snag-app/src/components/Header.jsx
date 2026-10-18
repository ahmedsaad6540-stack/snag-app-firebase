import React, { useState } from "react"
import { exportReport, exportExcel, exportWord } from "../utils/export.js"
import ConfirmDialog from "./ConfirmDialog.jsx"
import { useLocations } from "../hooks/useLocations.js"

export default function Header({ snags, onImport, isAdmin, onWipeAll }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const { locations } = useLocations()

  return (
    <header style={s.header} className="app-header">
      <div>
        <h1 style={s.title}>
          <span style={s.icon}>📋</span> Smart Mall OS
        </h1>
        <p style={s.sub}>نظام ذكي لتسجيل ومتابعة ملاحظات التشغيل والصيانة</p>
      </div>

      <div style={s.actions} className="header-actions">
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => exportExcel(snags, locations)}>
          📊 إكسيل
        </button>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => exportWord(snags, locations)}>
          📝 وورد
        </button>
        <button style={{ ...s.btn, ...s.ghost }} onClick={() => exportReport(snags, locations)}>
          📄 PDF
        </button>
        {isAdmin && (
          <>
            <button 
              style={{ ...s.btn, background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" }} 
              onClick={() => setShowConfirm(true)}
            >
              🗑️ مسح الكل
            </button>
            {showConfirm && (
              <ConfirmDialog
                title="تحذير خطير ⚠️"
                message="هل أنت متأكد من رغبتك في حذف جميع الملاحظات في النظام نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!"
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
