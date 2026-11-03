// Preview of the real component with explicitly isolated, illustrative data.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { OperationsPanel } from '../src/operations/OperationsPanel.jsx'
import { todayCairo, periodRange, validateExecution } from '../src/operations/model.js'
const today = todayCairo()
const user = { uid: 'demo-supervisor', displayName: 'مشرف تجريبي', role: 'admin', approved: true }
const templates = [
  ['landscape', 'صيانة ونظافة أحواض الزرع', 'البلازا', 'صباحية'],
  ['spider', 'نظافة الواجهات والمداخل', 'مبنى 2', 'صباحية'],
  ['pest', 'الفحص اليومي ورصد آثار الآفات', 'منطقة التحميل', 'صباحية'],
  ['housekeeping', 'غسيل أرضية فواصل المطاعم', 'المطاعم', 'صباحية'],
  ['housekeeping', 'تنظيف المداخل والسلالم', 'مبنى 1', 'مسائية'],
  ['housekeeping', 'غسيل أرضية الجراج', 'جراج B1', 'ليلية'],
  ['standards', 'وضوح وسلامة اللوحات الإرشادية', 'المداخل', 'صباحية'],
]
const plans = templates.map(([department, title, location, shift], i) => ({ id: `demo-${i}`, department, title, location, shift, frequency: 'daily', enabled: true, review: '', standard: 'إتمام العمل ومراجعة المشرف للمطابقة', source: 'بيانات توضيحية فقط', start: today }))
const sample = ['done', 'done', 'partial', 'blocked']
const initial = Object.fromEntries(sample.map((status, i) => [`demo-${i}__${today}`, { status, plan: plans[i], planId: plans[i].id, date: today, owner: 'الفريق التجريبي', actualDate: today, quality: i < 2 ? 'accepted' : 'unreviewed', reason: i === 2 ? 'جزء من الموقع غير متاح للفحص' : i === 3 ? 'المنطقة مشغولة بأعمال مقاول' : '', action: i > 1 ? 'تنسيق إتاحة الموقع وإعادة المتابعة' : '', followup: i > 1 ? today : '', revision: 1, createdBy: { uid: user.uid }, photos: [] }]))
function Preview() {
  const [mode, setMode] = useState('today'), [period, setPeriod] = useState('week'), [anchor, setAnchor] = useState(today), [records, setRecords] = useState(initial), [allPlans, setPlans] = useState(plans)
  const [start, end] = periodRange(mode === 'reports' ? anchor : today, mode === 'reports' ? period : 'day')
  const store = { plans: allPlans, records, loading: false, error: '', manager: true,
    saveExecution: async (row, data) => { validateExecution(data); setRecords(r => ({ ...r, [row.id]: { ...data, plan: allPlans.find(p => p.id === row.planId), planId: row.planId, date: row.date, revision: (row.revision || 0) + 1, createdBy: { uid: user.uid }, updatedBy: { name: user.displayName } } })) },
    savePlan: async plan => setPlans(p => [...p, { ...plan, start: today, enabled: true, review: '' }]),
    activatePlans: async selected => setPlans(p => p.map(x => selected.some(s => s.id === x.id) ? { ...x, start: today, enabled: true } : x)),
    retirePlan: async plan => setPlans(p => p.map(x => x.id === plan.id ? { ...x, end: today } : x)),
  }
  return <><div style={{ background: '#e2bd6a', color: '#243040', padding: '12px 20px', marginBottom: 18, borderRadius: 12, textAlign: 'center', fontFamily: 'Arial', direction: 'rtl' }}><strong>معاينة تفاعلية · بيانات توضيحية فقط</strong> — جرّب تسجيل التنفيذ والفلاتر والتقارير. التغييرات هنا لا تصل إلى التطبيق الحقيقي ولا تُحفظ بعد إغلاق المعاينة.</div><OperationsPanel {...{ currentUser: user, today, mode, setMode, period, setPeriod, anchor, setAnchor, start, end, store }} /></>
}
createRoot(document.getElementById('root')).render(<Preview />)
