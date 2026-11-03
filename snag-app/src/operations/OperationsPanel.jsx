import React, { useEffect, useMemo, useRef, useState } from 'react'
import { canUser, hasPrivilege } from '../constants/permissions.js'
import { compressImageFile } from '../utils/imageCompression.js'
import { DEPARTMENTS, STATUSES, DAYS, todayCairo, buildReport, summarize } from './model.js'
import { exportOperations, printOperations } from './export.js'
import './operations.css'
const SHIFTS = ['صباحية', 'مسائية', 'ليلية']
const QUALITY = { unreviewed: 'لم تُراجع الجودة', accepted: 'مطابق للمعيار', rejected: 'غير مطابق للمعيار' }
const normalizeShift = value => SHIFTS.find(s => value?.includes(s)) || value

export function OperationsPanel({ currentUser, today, mode, setMode, period, setPeriod, anchor, setAnchor, start, end, store }) {
  const { plans, records, loading, error, manager, savePlan, saveExecution, activatePlans, retirePlan } = store
  const [department, setDepartment] = useState('all'), [shift, setShift] = useState('all'), [status, setStatus] = useState('all'), [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null), [planEditor, setPlanEditor] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [page, setPage] = useState(0)
  useEffect(() => setPage(0), [department, shift, status, search, mode, start, end])
  const rows = useMemo(() => buildReport(plans, records, start, end, department, today).filter(r =>
    (shift === 'all' || normalizeShift(r.shift) === shift) && (status === 'all' || r.status === status) && `${r.title} ${r.location} ${r.owner || ''}`.includes(search)
  ), [plans, records, start, end, department, today, shift, status, search])
  const summary = summarize(rows)
  const planRows = plans.filter(p => (department === 'all' || p.department === department) && (shift === 'all' || normalizeShift(p.shift) === shift) && `${p.title} ${p.location}`.includes(search))
  const list = mode === 'plans' ? planRows : rows
  const visible = list.slice(page * 35, page * 35 + 35)
  async function perform(fn) { setBusy(true); setMessage(''); try { await fn(); setMessage('تم الحفظ بنجاح'); return true } catch (e) { setMessage(e.message); return false } finally { setBusy(false) } }
  async function activateClean() {
    const clean = planRows.filter(p => !p.enabled && !p.review)
    if (!clean.length) return
    if (!window.confirm(`تفعيل ${clean.length} بندًا من اليوم؟ راجع التخصص والمواقع والورديات أولًا. البنود المتعارضة ستظل للمراجعة.`)) return
    await perform(() => activatePlans(clean))
  }
  return <section className="ops" dir="rtl" aria-label="متابعة أعمال التشغيل">
    <div className="ops-heading"><div><div className="ops-eyebrow">PARK STREET · OPERATIONS</div><h2>متابعة أعمال اليوم</h2><p>الخطة المطلوبة، التنفيذ الفعلي، وجودة العمل في مكان واحد.</p></div><div className="ops-date"><strong>{DAYS[new Date(today + 'T12:00:00Z').getUTCDay()]}</strong><span>{today}</span><small>توقيت القاهرة · يتحدث تلقائيًا</small></div></div>
    <nav className="ops-tabs" aria-label="شاشات المتابعة">{[['today', 'أعمال اليوم'], ['reports', 'التقارير'], ['plans', 'الخطط والمعايير']].map(([id, label]) => <button key={id} className={mode === id ? 'selected' : ''} onClick={() => { setMode(id); setMessage('') }}>{label}</button>)}</nav>
    {error && <div className="ops-alert" role="alert">تعذر تحميل البيانات: {error}. لا يمكن إصدار تقرير مكتمل قبل استعادة الاتصال.</div>}
    {message && <div className="ops-message" role="status">{message}</div>}
    <div className="ops-toolbar">
      <label>التخصص<select aria-label="التخصص" value={department} onChange={e => setDepartment(e.target.value)}><option value="all">جميع التخصصات</option>{Object.entries(DEPARTMENTS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>الوردية<select aria-label="الوردية" value={shift} onChange={e => setShift(e.target.value)}><option value="all">جميع الورديات</option>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select></label>
      {mode !== 'plans' && <label>النتيجة<select aria-label="النتيجة" value={status} onChange={e => setStatus(e.target.value)}><option value="all">جميع النتائج</option>{Object.entries(STATUSES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
      <label className="ops-search">بحث<input value={search} onChange={e => setSearch(e.target.value)} placeholder="المهمة أو الموقع أو المسؤول" /></label>
    </div>
    {mode === 'reports' && <div className="ops-toolbar ops-period"><label>الفترة<select aria-label="الفترة" value={period} onChange={e => setPeriod(e.target.value)}><option value="day">يومي</option><option value="week">أسبوعي</option><option value="month">شهري</option></select></label><label>تاريخ داخل الفترة<input type="date" value={anchor} onChange={e => e.target.value && setAnchor(e.target.value)} /></label><span>من {start} إلى {end}{period === 'week' ? ' · السبت إلى الجمعة' : ''}</span></div>}
    {mode !== 'plans' && <>
      <div className="ops-kpis">{[['المطلوب حتى اليوم', summary.required], ['تم التنفيذ', summary.done], ['تنفيذ جزئي', summary.partial], ['لم يتم', summary.blocked], ['لم يُسجل', summary.pending], ['الإنجاز', summary.percent === null ? '—' : `${summary.percent}%`]].map(([label, value], i) => <div key={label} className={`ops-kpi k${i}`}><small>{label}</small><strong>{loading ? '…' : value}</strong></div>)}</div>
      <div className="ops-footnote">المكتمل ÷ المطلوب حتى اليوم، بعد استبعاد «غير مطلوب» ({summary.na}). الأعمال المستقبلية ({summary.future}) منفصلة. جودة التنفيذ: مطابق {rows.filter(r => !r.future && r.quality === "accepted").length} · غير مطابق {rows.filter(r => !r.future && r.quality === "rejected").length} · بقية البنود تحتاج مراجعة المشرف.</div>
      <div className="ops-actions"><strong>{mode === 'today' ? 'المطلوب اليوم مقابل التنفيذ' : 'نتائج الفترة المحددة'} <span className="ops-muted">({rows.length})</span></strong>{canUser(currentUser, 'operations', 'export') && <div><button disabled={busy || loading || !!error || !rows.length} onClick={() => perform(() => exportOperations(rows, start, end, department))}>تصدير Excel</button><button disabled={loading || !!error || !rows.length} onClick={() => printOperations(rows, start, end, department)}>طباعة / PDF</button></div>}</div>
    </>}
    {mode === 'plans' && <><div className="ops-note">الخطط تتكرر تلقائيًا دون اختيار شهر. يبدأ احتساب البند من يوم تفعيله، ولا تُنشأ نتائج تنفيذ لأيام سابقة. أيام 29–31 تُنفذ فقط في الشهور التي تحتوي عليها. أي تعديل على خطة مفعلة يكون ببند جديد لحفظ تاريخ الخطة.</div><div className="ops-actions"><strong>الخطط والمعايير <span className="ops-muted">({planRows.length})</span></strong>{manager && <div><button disabled={busy || loading} onClick={activateClean}>تفعيل البنود الواضحة المعروضة</button><button onClick={() => setPlanEditor({ department: department === 'all' ? 'housekeeping' : department, title: '', location: '', standard: '', shift: 'صباحية', frequency: 'daily', days: [], monthDays: [], source: 'إضافة المشرف' })}>إضافة مهمة / معيار</button></div>}</div></>}
    {loading ? <p role="status">جاري تحميل البيانات…</p> : <div className="ops-table-wrap"><table><thead><tr>{(mode === 'plans' ? ['التخصص / الدورية', 'المهمة والموقع', 'الوردية', 'المعيار / المرجع', 'حالة الخطة', 'الإجراء'] : ['التاريخ / التخصص', 'المطلوب والموقع', 'الوردية', 'النتيجة', 'السبب / المتابعة', 'الجودة', 'الإجراء']).map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{visible.map(row => mode === 'plans' ? <tr key={row.id}>
      <td>{DEPARTMENTS[row.department]}<small>{recurrenceText(row)}</small></td><td><strong>{row.title}</strong><small>{row.location}</small></td><td>{normalizeShift(row.shift) || 'يُحدد'}</td><td>{row.standard}<details><summary>مرجع المهمة</summary>{row.source}</details></td><td><span className={`ops-badge ${row.enabled ? 'done' : 'pending'}`}>{row.enabled ? (row.end ? 'متوقفة بعد ' + row.end : 'مفعلة') : row.review ? 'تحتاج مراجعة' : 'جاهزة للتفعيل'}</span>{row.review && <small>{row.review}</small>}</td><td>{manager && !row.enabled && <button onClick={() => setPlanEditor(row)}>مراجعة وتفعيل</button>}{manager && row.enabled && !row.end && <button disabled={busy} onClick={() => { if (window.confirm("إيقاف تكرار هذه المهمة من غدًا مع الاحتفاظ بسجلها؟")) perform(() => retirePlan(row)) }}>إيقاف التكرار</button>}</td>
    </tr> : <tr key={row.id}><td>{row.date}<small>{DEPARTMENTS[row.department]}</small></td><td><strong>{row.title}</strong><small>{row.location}</small><details><summary>المعيار والمرجع</summary>{row.standard}<small>{row.source}</small></details>{row.photos?.map((photo, i) => <a key={i} href={photo.dataUrl} target="_blank" rel="noreferrer"><img className="ops-thumb" src={photo.dataUrl} alt={`إثبات التنفيذ ${i + 1}`} /></a>)}</td><td>{normalizeShift(row.shift)}</td><td><span className={`ops-badge ${row.future ? 'pending' : row.status}`}>{row.future ? 'مخطط مستقبلي' : STATUSES[row.status]}</span><small>{row.owner}{row.actualDate && ` · متابعة ${row.actualDate}`}</small></td><td>{row.reason || '—'}{row.action && <small>{row.action} · {row.followup}</small>}{row.notes && <small>{row.notes}</small>}</td><td>{QUALITY[row.quality || 'unreviewed']}</td><td>{!row.future && canUser(currentUser, 'operations', row.revision ? 'status' : 'add') && (!row.revision || row.createdBy?.uid === currentUser.uid || hasPrivilege(currentUser, 'canEditAll')) && <button onClick={() => setEditing(row)}>تسجيل / متابعة</button>}</td></tr>)}</tbody></table>{!list.length && <div className="ops-empty"><strong>لا توجد أعمال مطابقة</strong><p>{plans.some(p => p.enabled) ? 'راجع التخصص والوردية والفترة المختارة.' : 'ابدأ بمراجعة وتفعيل المهام من «الخطط والمعايير».'}</p>{mode !== 'plans' && <button onClick={() => setMode('plans')}>عرض الخطط والمعايير</button>}</div>}</div>}
    <div className="ops-pagination"><button disabled={!page} onClick={() => setPage(p => p - 1)}>السابق</button><span>{list.length ? page + 1 : 0} / {Math.ceil(list.length / 35)}</span><button disabled={(page + 1) * 35 >= list.length} onClick={() => setPage(p => p + 1)}>التالي</button></div>
    {editing && <ExecutionForm row={editing} currentUser={currentUser} onClose={() => setEditing(null)} onSave={async data => { if (await perform(() => saveExecution(editing, data))) setEditing(null) }} busy={busy} message={message} />}
    {planEditor && <PlanForm initial={planEditor} onClose={() => setPlanEditor(null)} onSave={async plan => { if (await perform(() => savePlan(plan))) setPlanEditor(null) }} busy={busy} message={message} />}
  </section>
}

function recurrenceText(p) { if (p.frequency === 'daily') return 'يومي'; if (p.frequency === 'weekly') return 'أسبوعي: ' + (p.days || []).map(d => DAYS[d]).join('، '); return 'شهري: أيام ' + (p.monthDays || []).join('، ') }
function Modal({ title, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.querySelector('button,input,select,textarea')?.focus()
    return () => previous?.focus()
  }, [])
  function keys(event) {
    if (event.key === 'Escape') { event.preventDefault(); onClose() }
    if (event.key !== 'Tab') return
    const nodes = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')]
    const first = nodes[0], last = nodes[nodes.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return <div className="ops-overlay"><section ref={ref} onKeyDown={keys} className="ops-modal" role="dialog" aria-modal="true" aria-label={title}><div className="ops-actions"><h3>{title}</h3><button aria-label="إغلاق" onClick={onClose}>إغلاق</button></div>{children}</section></div> }

function ExecutionForm({ row, currentUser, onClose, onSave, busy, message }) {
  const [data, setData] = useState({ status: row.status === 'pending' ? 'done' : row.status, owner: row.owner || '', actualDate: row.actualDate || todayCairo(), reason: row.reason || '', action: row.action || '', followup: row.followup || '', notes: row.notes || '', evidence: row.evidence || '', quality: row.quality || 'unreviewed', photos: row.photos || [] })
  const [photoError, setPhotoError] = useState(''), [photoBusy, setPhotoBusy] = useState(false)
  const field = (key, value) => setData(d => ({ ...d, [key]: value }))
  const reviewer = canUser(currentUser, 'operations', 'edit') && hasPrivilege(currentUser, 'canEditAll')
  async function addPhoto(event) { const files = Array.from(event.target.files || []).slice(0, Math.max(0, 2 - data.photos.length)); setPhotoBusy(true); setPhotoError(''); try { for (const file of files) { const dataUrl = await compressImageFile(file); if (!dataUrl.startsWith('data:image/') || dataUrl.length > 170000) throw new Error('الصورة أكبر من الحد المسموح بعد الضغط'); setData(d => ({ ...d, photos: [...d.photos, { name: file.name, dataUrl }].slice(0, 2) })) } } catch (e) { setPhotoError(e.message) } finally { setPhotoBusy(false); event.target.value = '' } }
  return <Modal title="تسجيل التنفيذ والمتابعة" onClose={onClose}><p><strong>{row.title}</strong><br />{row.location} · استحقاق {row.date}</p><form onSubmit={e => { e.preventDefault(); onSave(data) }}>
    <label>النتيجة<select value={data.status} onChange={e => field('status', e.target.value)}>{Object.entries(STATUSES).filter(([id]) => id !== 'pending').map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <label>المنفذ / المسؤول<input required value={data.owner} onChange={e => field('owner', e.target.value)} /></label><p className="ops-muted">تاريخ التسجيل ووقت آخر تحديث يحفظان تلقائيًا. تاريخ المتابعة: {data.actualDate}</p>
    <label>السبب<input required={['partial', 'blocked', 'na'].includes(data.status)} value={data.reason} onChange={e => field('reason', e.target.value)} /></label>
    <label>الإجراء التصحيحي<input required={['partial', 'blocked'].includes(data.status)} value={data.action} onChange={e => field('action', e.target.value)} /></label><label>موعد المتابعة<input required={['partial', 'blocked'].includes(data.status)} type="date" value={data.followup} onChange={e => field('followup', e.target.value)} /></label>
    <label>ملاحظات التنفيذ<textarea value={data.notes} onChange={e => field('notes', e.target.value)} /></label>
    <label>رابط إثبات اختياري<input type="url" placeholder="https://" value={data.evidence} onChange={e => field('evidence', e.target.value)} /></label>
    <label>صور التنفيذ (صورتان بحد أقصى)<input disabled={photoBusy || data.photos.length >= 2} type="file" accept="image/*" multiple onChange={addPhoto} /></label><div>{data.photos.map((p, i) => <span key={i}><img className="ops-thumb" src={p.dataUrl} alt={p.name} /><button type="button" onClick={() => field('photos', data.photos.filter((_, n) => n !== i))}>حذف الصورة</button></span>)}</div>
    <label>مراجعة الجودة<select disabled={!reviewer} value={data.quality} onChange={e => field('quality', e.target.value)}>{Object.entries(QUALITY).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    {row.history?.length > 0 && <details><summary>سجل التعديلات ({row.history.length})</summary>{row.history.map((h, i) => <p key={i}>{h.actor.name} · {h.at} · {STATUSES[h.status]} · {h.reason}</p>)}</details>}
    {(message || photoError) && <p role="alert">{photoError || message}</p>}<button className="ops-primary" disabled={busy || photoBusy}>{busy ? 'جاري الحفظ…' : 'حفظ المتابعة'}</button>
  </form></Modal>
}

function PlanForm({ initial, onClose, onSave, busy, message }) {
  const [plan, setPlan] = useState({ ...initial, shift: normalizeShift(initial.shift) || 'صباحية', monthDays: initial.monthDays || [], days: initial.days || [] })
  const [localError, setLocalError] = useState('')
  const morningOnly = ['pest', 'spider', 'landscape'].includes(plan.department)
  const field = (key, value) => setPlan(p => ({ ...p, [key]: value }))
  function submit(e) { e.preventDefault(); setLocalError(''); if (plan.frequency === 'weekly' && !plan.days.length) return setLocalError('اختر يوم التنفيذ الأسبوعي'); if (plan.frequency === 'monthly' && (!plan.monthDays.length || plan.monthDays.some(d => !Number.isInteger(d) || d < 1 || d > 31))) return setLocalError('أدخل أيام الشهر من 1 إلى 31'); if (!SHIFTS.includes(plan.shift) && !morningOnly) return setLocalError('حدد الوردية المسؤولة'); if (plan.department === 'pest' && plan.review?.includes('مرتين') && (plan.frequency !== 'weekly' || plan.days.length !== 2)) return setLocalError('اختر يومين في الأسبوع حسب المصدر'); onSave({ ...plan, id: plan.id || 'plan-' + crypto.randomUUID(), shift: morningOnly ? 'صباحية' : plan.shift, enabled: true, review: '' }) }
  return <Modal title="مراجعة الخطة وتفعيلها" onClose={onClose}>{initial.review && <div className="ops-note">{initial.review}</div>}<form onSubmit={submit}>
    <label>التخصص<select value={plan.department} onChange={e => { field('department', e.target.value); if (['pest', 'spider', 'landscape'].includes(e.target.value)) field('shift', 'صباحية') }}>{Object.entries(DEPARTMENTS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label>المهمة<input required value={plan.title} onChange={e => field('title', e.target.value)} /></label><label>الموقع<input required value={plan.location} onChange={e => field('location', e.target.value)} /></label><label>معيار قبول العمل<textarea required value={plan.standard} onChange={e => field('standard', e.target.value)} /></label>
    <label>الوردية<select required value={morningOnly ? 'صباحية' : plan.shift} disabled={morningOnly} onChange={e => field('shift', e.target.value)}><option value="يُحدد">يُحدد</option>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select></label>
    <label>التكرار<select value={plan.frequency} onChange={e => field('frequency', e.target.value)}><option value="daily">يومي</option><option value="weekly">أيام أسبوعية</option><option value="monthly">أيام شهرية</option></select></label>
    {plan.frequency === 'weekly' && <fieldset><legend>أيام التنفيذ</legend>{DAYS.map((day, i) => <label className="ops-check" key={day}><input type="checkbox" checked={plan.days.includes(i)} onChange={e => field('days', e.target.checked ? [...plan.days, i] : plan.days.filter(d => d !== i))} />{day}</label>)}</fieldset>}
    {plan.frequency === 'monthly' && <label>أيام الشهر (مثل 1، 15)<input required defaultValue={plan.monthDays.join(', ')} onChange={e => field('monthDays', [...new Set(e.target.value.split(/[,،\s]+/).filter(Boolean).map(Number))])} /></label>}
    <small>المرجع: {plan.source}</small><p>التفعيل من اليوم، والتكرار يستمر تلقائيًا عبر الشهور.</p>{(localError || message) && <p role="alert">{localError || message}</p>}<button className="ops-primary" disabled={busy}>{busy ? 'جاري الحفظ…' : 'اعتماد وتفعيل الخطة'}</button>
  </form></Modal>
}
