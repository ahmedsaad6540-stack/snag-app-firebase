import { DEPARTMENTS, STATUSES, summarize } from './model.js'

export async function exportOperations(rows, start, end, department) {
  const ExcelJS = (await import('exceljs')).default
  const book = new ExcelJS.Workbook(), sheet = book.addWorksheet('تقرير التشغيل', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 5 }] })
  const summary = summarize(rows)
  sheet.addRow(['Park Street | تقرير الخطة مقابل التنفيذ'])
  sheet.addRow(['من', start, 'إلى', end, 'التخصص', DEPARTMENTS[department] || 'الكل'])
  sheet.addRow(['المطلوب حتى اليوم', summary.required, 'تم', summary.done, 'جزئي', summary.partial, 'لم يتم', summary.blocked, 'لم يسجل', summary.pending, 'غير مطلوب', summary.na, 'مستقبلي', summary.future, 'نسبة الإنجاز', summary.percent === null ? '—' : summary.percent + '%'])
  sheet.addRow(['الأسبوع من السبت إلى الجمعة. الإنجاز = المكتمل ÷ المطلوب حتى اليوم بعد استبعاد غير المطلوب؛ الجزئي لا يحتسب مكتملًا.'])
  sheet.addRow(['التاريخ المخطط', 'التخصص', 'الموقع', 'الوردية / الموعد', 'المطلوب', 'معيار القبول', 'المصدر', 'النتيجة', 'المنفذ / المسؤول', 'تاريخ التنفيذ / المتابعة', 'السبب', 'الإجراء التصحيحي', 'موعد المتابعة', 'ملاحظات', 'رابط الإثبات', 'آخر تحديث بواسطة', 'الجودة'])
  for (const r of rows) sheet.addRow([r.date, DEPARTMENTS[r.department], r.location, r.shift, r.title, r.standard, r.source, r.future ? 'مخطط مستقبلي' : STATUSES[r.status], r.owner || '', r.actualDate || '', r.reason || '', r.action || '', r.followup || '', r.notes || '', r.evidence || '', r.updatedBy?.name || '', qualityLabel(r.quality)])
  sheet.columns.forEach((c, i) => { c.width = [0, 1, 3, 7, 9, 12].includes(i) ? 20 : 36 })
  sheet.eachRow((row, n) => { row.alignment = { vertical: 'top', wrapText: true, horizontal: 'right' }; row.height = n <= 5 ? 32 : 62; if (n === 1 || n === 5) { row.font = { color: { argb: 'FFFFFFFF' }, bold: true }; row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15384B' } } }) } })
  sheet.autoFilter = { from: 'A5', to: 'Q5' }
  const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a'); a.href = url; a.download = `ParkStreet_Operations_${start}_${end}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function qualityLabel(value) { return ({ accepted: 'مطابق للمعيار', rejected: 'غير مطابق للمعيار' })[value] || 'لم تُراجع الجودة' }
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
export function printOperations(rows, start, end, department) {
  const win = window.open('', '_blank')
  if (!win) { window.alert('اسمح بالنوافذ المنبثقة لطباعة التقرير'); return }
  const summary = summarize(rows)
  const headings = ['التاريخ', 'التخصص', 'الموقع والوردية', 'المطلوب والمعيار', 'النتيجة', 'المسؤول', 'السبب والإجراء والمتابعة', 'الجودة']
  const body = rows.map(r => `<tr>${[r.date, DEPARTMENTS[r.department], `${r.location} / ${r.shift}`, `${r.title} | ${r.standard}`, r.future ? 'مخطط مستقبلي' : STATUSES[r.status], r.owner || '—', [r.reason, r.action, r.followup, r.notes].filter(Boolean).join(' | ') || '—', qualityLabel(r.quality)].map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')
  win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير تشغيل Park Street</title><style>body{font:12px Arial;color:#172b3b;margin:24px}h1{font-size:23px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aab7c2;padding:7px;text-align:right;vertical-align:top}th{background:#e5edf0}tr{break-inside:avoid}button{padding:10px 22px;margin:12px 0}@media print{button{display:none}@page{size:A4 landscape;margin:12mm}}</style></head><body><h1>Park Street | الخطة مقابل التنفيذ</h1><p>${escape(DEPARTMENTS[department] || 'جميع التخصصات')} · ${escape(start)} إلى ${escape(end)}</p><p>المطلوب حتى اليوم: ${summary.required} | تم: ${summary.done} | جزئي: ${summary.partial} | لم يتم: ${summary.blocked} | لم يسجل: ${summary.pending} | الإنجاز: ${summary.percent ?? '—'}${summary.percent === null ? '' : '%'}</p><p>المستقبلي: ${summary.future} | غير مطلوب: ${summary.na}. المعروض يعكس الفلاتر المختارة، ويشمل جميع الصفوف وليس الصفحة الحالية فقط.</p><button onclick="window.print()">طباعة / حفظ PDF</button><table><thead><tr>${headings.map(h => `<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></body></html>`)
  win.document.close()
}
