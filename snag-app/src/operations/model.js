export const DEPARTMENTS = { landscape: 'اللاندسكيب', spider: 'الواجهات وSpider', pest: 'مكافحة الآفات', housekeeping: 'الهاوس كيبنج', standards: 'Standards' }
export const STATUSES = { pending: 'لم يُسجل', done: 'تم التنفيذ', partial: 'تنفيذ جزئي', blocked: 'لم يتم التنفيذ', na: 'غير مطلوب' }
export const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
export function todayCairo(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now) }
export function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value }
export function addDays(date, count) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10) }
export function periodRange(date, period) {
  if (!validDate(date)) throw new Error('اختر تاريخًا صالحًا')
  if (period === 'day') return [date, date]
  if (period === 'week') { const start = addDays(date, -((new Date(date + 'T12:00:00Z').getUTCDay() + 1) % 7)); return [start, addDays(start, 6)] }
  const start = date.slice(0, 7) + '-01'; const d = new Date(start + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 1); return [start, addDays(d.toISOString().slice(0, 10), -1)]
}
export function isDue(plan, date) {
  if (!plan.enabled || plan.review || !validDate(date) || (plan.start && date < plan.start) || (plan.end && date > plan.end)) return false
  if (plan.frequency === 'once') return date === plan.date
  if (plan.frequency === 'daily') return true
  if (plan.frequency === 'weekly') return (plan.days || []).includes(new Date(date + 'T12:00:00Z').getUTCDay())
  if (plan.frequency === 'monthly') return (plan.monthDays || []).includes(Number(date.slice(-2)))
  return false
}
export function occurrenceId(planId, date) { return `${planId}__${date}` }
export function buildReport(plans, records, start, end, department = 'all', today = todayCairo()) {
  if (!validDate(start) || !validDate(end) || end < start) return []
  const rows = []
  for (let date = start; date <= end; date = addDays(date, 1)) {
    for (const plan of plans) {
      if (department !== 'all' && plan.department !== department) continue
      const id = occurrenceId(plan.id, date), record = records[id]
      // Saved occurrence snapshots preserve historical plans when templates change.
      if (!record && !isDue(plan, date)) continue
      const snapshot = record?.plan || plan
      rows.push({ ...snapshot, id, planId: plan.id, date, status: 'pending', ...record, future: date > today })
    }
  }
  return rows
}
export function summarize(rows) {
  const due = rows.filter(r => !r.future)
  const count = status => due.filter(r => r.status === status).length
  const required = due.filter(r => r.status !== 'na').length
  return { planned: rows.length, future: rows.filter(r => r.future).length, due: due.length, required, done: count('done'), partial: count('partial'), blocked: count('blocked'), pending: count('pending'), na: count('na'), percent: required ? Math.round(count('done') / required * 100) : null }
}
export function validateExecution(data) {
  if (!Object.hasOwn(STATUSES, data.status) || data.status === 'pending') throw new Error('اختر نتيجة التنفيذ')
  if (!data.owner?.trim()) throw new Error('اسم المنفذ / المسؤول مطلوب')
  if (!validDate(data.actualDate)) throw new Error('تاريخ التنفيذ / المتابعة مطلوب')
  if (data.actualDate > todayCairo()) throw new Error('لا يمكن تسجيل تنفيذ بتاريخ مستقبلي')
  if (['blocked', 'partial', 'na'].includes(data.status) && !data.reason?.trim()) throw new Error('اكتب سبب عدم التنفيذ أو التنفيذ الجزئي أو الاستثناء')
  if (['blocked', 'partial'].includes(data.status) && (!data.action?.trim() || !validDate(data.followup))) throw new Error('الإجراء التصحيحي وموعد المتابعة مطلوبان')
  if (data.evidence && !/^https:\/\//i.test(data.evidence)) throw new Error('رابط الإثبات يجب أن يبدأ بـ https://')
  if (!['unreviewed', 'accepted', 'rejected'].includes(data.quality)) throw new Error('تقييم الجودة غير صالح')
  if (data.quality === 'accepted' && data.status !== 'done') throw new Error('اعتماد الجودة يتطلب تنفيذ البند بالكامل')
  if (!Array.isArray(data.photos) || data.photos.length > 2 || data.photos.some(p => !/^data:image\/(jpeg|png|webp);base64,/.test(p.dataUrl || '') || p.dataUrl.length > 170000)) throw new Error('صور الإثبات غير صالحة أو أكبر من الحد المسموح')
}
