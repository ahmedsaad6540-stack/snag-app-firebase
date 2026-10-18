import { tradeOf, locOf, priOf, staOf, typeOf, formatDate } from "../constants/index.js"
import { getRowHealth } from "../constants/restroomsData.js"
import * as XLSX from "xlsx"
import ExcelJS from "exceljs"

function getLoc(id, locations) {
  if (locations && Array.isArray(locations)) {
    const loc = locations.find(l => l.id === id)
    if (loc) return loc
  }
  return locOf(id)
}

function esc(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function safeSrc(url) {
  const s = String(url ?? "").trim()
  if (s.startsWith("https://") || s.startsWith("http://") || s.startsWith("data:image/")) {
    return esc(s)
  }
  return ""
}

/**
 * تحويل أي صورة (dataUrl أو رابط http) إلى Base64 صالح للإدراج المباشر داخل ExcelJS
 */
async function resolveImageBase64(urlOrDataUrl) {
  if (!urlOrDataUrl) return null
  const str = String(urlOrDataUrl).trim()
  if (str.startsWith("data:image/")) {
    const ext = str.includes("image/png") ? "png" : "jpeg"
    return { base64: str, extension: ext }
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const resp = await fetch(str)
      const blob = await resp.blob()
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      const ext = String(dataUrl).includes("image/png") ? "png" : "jpeg"
      return { base64: dataUrl, extension: ext }
    } catch {
      return null
    }
  }
  return null
}

function sortSnags(snags, locations) {
  return [...snags].sort((a, b) => {
    const tradeA = tradeOf(a.trade).label
    const tradeB = tradeOf(b.trade).label
    if (tradeA < tradeB) return -1
    if (tradeA > tradeB) return 1

    const locA = getLoc(a.location, locations).name
    const locB = getLoc(b.location, locations).name
    if (locA < locB) return -1
    if (locA > locB) return 1

    return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
  })
}

/* ════════════════════════════════════════════════════════════════════
   ██  SNAG LIST EXPORTS (Excel with Embedded Images, Word, PDF)
   ════════════════════════════════════════════════════════════════════ */

export async function exportExcel(snags, locations) {
  try {
    const sorted = sortSnags(snags, locations)
    const wb = new ExcelJS.Workbook()
    wb.creator = "Smart Mall OS"
    wb.created = new Date()

    const ws = wb.addWorksheet("سجل الملاحظات", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    })

    ws.columns = [
      { header: "م", key: "idx", width: 6 },
      { header: "التخصص", key: "trade", width: 18 },
      { header: "الموقع", key: "location", width: 20 },
      { header: "الوصف", key: "description", width: 42 },
      { header: "الأولوية", key: "priority", width: 12 },
      { header: "النوع", key: "type", width: 12 },
      { header: "الحالة", key: "status", width: 14 },
      { header: "المشرف", key: "inspector", width: 18 },
      { header: "التاريخ", key: "date", width: 20 },
      { header: "الصور المرفقة", key: "photos", width: 32 },
    ]

    // Header styling
    const headerRow = ws.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
      cell.border = {
        top: { style: "thin", color: { argb: "FF334155" } },
        bottom: { style: "thin", color: { argb: "FF334155" } },
        left: { style: "thin", color: { argb: "FF334155" } },
        right: { style: "thin", color: { argb: "FF334155" } },
      }
    })

    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i]
      const atts = (s.attachments || []).filter(f => f.type?.startsWith("image/") || f.dataUrl?.startsWith("data:image/"))
      const excelRowNumber = i + 2

      const row = ws.addRow({
        idx: i + 1,
        trade: tradeOf(s.trade)?.label || s.trade,
        location: getLoc(s.location, locations)?.name || s.location,
        description: s.description || "",
        priority: priOf(s.priority)?.label || s.priority,
        type: typeOf(s.type)?.label || s.type,
        status: staOf(s.status)?.label || s.status,
        inspector: s.inspector || "",
        date: formatDate(s.timestamp),
        photos: atts.length > 0 ? "" : "—",
      })

      row.height = atts.length > 0 ? 64 : 24
      row.eachCell((cell) => {
        cell.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
        cell.font = { name: "Arial", size: 10 }
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        }
      })

      // Embed up to 3 images directly inside Column 10 (index 9)
      for (let pIdx = 0; pIdx < Math.min(atts.length, 3); pIdx++) {
        const imgData = await resolveImageBase64(atts[pIdx].dataUrl || atts[pIdx].storageUrl)
        if (imgData) {
          const imgId = wb.addImage(imgData)
          ws.addImage(imgId, {
            tl: { col: 9 + pIdx * 0.32, row: excelRowNumber - 1 + 0.08 },
            ext: { width: 72, height: 54 },
          })
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    _download(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `snag-report-${Date.now()}.xlsx`
    )
  } catch (err) {
    console.error("Excel Export Error:", err)
    alert("⚠️ تعذر تصدير ملف إكسيل: " + err.message)
  }
}

/* ─── Word Export ─── */
export function exportWord(snags, locations) {
  const sorted = sortSnags(snags, locations)
  const rows = sorted.map((s, i) => {
    const files = (s.attachments || [])
      .map((f) => {
        const src = safeSrc(f.storageUrl || f.dataUrl)
        return f.type?.startsWith("image/") && src
          ? `<img src="${src}" style="width:68px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #ddd;margin:2px" />`
          : `<div style="font-size:12px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;display:inline-block;margin:2px">📎 ${esc(f.name)}</div>`
      })
      .join("")

    return `
    <tr>
      <td style="border:1px solid #000;padding:5px">${i + 1}</td>
      <td style="border:1px solid #000;padding:5px">${esc(tradeOf(s.trade).label)}</td>
      <td style="border:1px solid #000;padding:5px">${esc(getLoc(s.location, locations).name)}</td>
      <td style="border:1px solid #000;padding:5px">${esc(s.description)}</td>
      <td style="border:1px solid #000;padding:5px">${esc(staOf(s.status).label)}</td>
      <td style="border:1px solid #000;padding:5px">${esc(s.inspector)}</td>
      <td style="border:1px solid #000;padding:5px">${esc(formatDate(s.timestamp))}</td>
      <td style="border:1px solid #000;padding:5px">${files || "—"}</td>
    </tr>`
  }).join('')
  
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>تقرير ملاحظات</title></head>
  <body dir="rtl" style="font-family:Arial,sans-serif">
    <h1 style="text-align:center">📋 تقرير ملاحظات المشروع</h1>
    <table style="width:100%;border-collapse:collapse;border:1px solid #000">
      <thead style="background:#ddd;font-weight:bold">
        <tr>
          <td style="border:1px solid #000;padding:5px">#</td>
          <td style="border:1px solid #000;padding:5px">التخصص</td>
          <td style="border:1px solid #000;padding:5px">الموقع</td>
          <td style="border:1px solid #000;padding:5px">الوصف</td>
          <td style="border:1px solid #000;padding:5px">الحالة</td>
          <td style="border:1px solid #000;padding:5px">المشرف</td>
          <td style="border:1px solid #000;padding:5px">التاريخ</td>
          <td style="border:1px solid #000;padding:5px">المرفقات</td>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`
  _download(new Blob([html], { type: "application/msword" }), `snag-report-${Date.now()}.doc`)
}

/* ─── PDF / HTML Report ─── */
export function exportReport(snags, locations) {
  const sorted = sortSnags(snags, locations)
  const now  = new Date().toLocaleString("ar-EG")
  const rows = sorted
    .map((s, i) => {
      const tr    = tradeOf(s.trade)
      const lo    = getLoc(s.location, locations)
      const pr    = priOf(s.priority)
      const st    = staOf(s.status)
      const ty    = typeOf(s.type)
      const files = (s.attachments || [])
        .map((f) => {
          const src = safeSrc(f.storageUrl || f.dataUrl)
          return f.type?.startsWith("image/") && src
            ? `<img src="${src}" style="width:68px;height:52px;object-fit:cover;border-radius:6px;border:1px solid #ddd;margin:2px" />`
            : `<div style="font-size:12px;padding:6px 8px;border:1px solid #ddd;border-radius:6px;display:inline-block;margin:2px">📎 ${esc(f.name)}</div>`
        })
        .join("")
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(tr.icon)} ${esc(tr.label)}</td>
          <td>${esc(lo.icon)} ${esc(lo.name)}</td>
          <td>${esc(s.description)}</td>
          <td>${esc(pr.dot)} ${esc(pr.label)}</td>
          <td>${esc(ty.label)}</td>
          <td>${esc(st.label)}</td>
          <td>${esc(s.inspector)}</td>
          <td>${esc(formatDate(s.timestamp))}</td>
          <td>${files || "—"}</td>
        </tr>`
    })
    .join("")

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8" />
<title>تقرير Smart Mall OS</title>
<style>
body{font-family:Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:20px}
table{width:100%;border-collapse:collapse;background:#fff}
th,td{border:1px solid #e2e8f0;padding:10px;text-align:right;vertical-align:top}
th{background:#0f172a;color:#fff}
button{padding:10px 16px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer}
@media print {
  button { display: none; }
  body { background: #fff; padding: 0; }
  .card { border: none; padding: 0; }
}
</style>
</head>
<body onload="setTimeout(() => window.print(), 500)">
<div class="card">
<h1>📋 تقرير ملاحظات Smart Mall OS</h1>
<p>تاريخ التصدير: ${esc(now)}</p>
<p>إجمالي الملاحظات: <strong>${snags.length}</strong></p>
<button onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
</div>
<table>
<thead>
<tr>
<th>#</th><th>التخصص</th><th>الموقع</th><th>الوصف</th><th>الأولوية</th><th>النوع</th><th>الحالة</th><th>المشرف</th><th>التاريخ</th><th>المرفقات</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير"); return }
  win.document.write(html)
  win.document.close()
}

/* ─── JSON Export (for sharing between team members) ─── */
export function exportJSON(snags) {
  const payload = JSON.stringify(snags, null, 2)
  _download(new Blob([payload], { type: "application/json" }), `snag-data-${Date.now()}.json`)
}

/* ─── JSON Import ─── */
export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!Array.isArray(data)) throw new Error("الملف لا يحتوي على قائمة صحيحة")
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

/* ════════════════════════════════════════════════════════════════════
   ██  RESTROOM SNAG EXPORTS (Excel with Embedded Images & PDF Report)
   ════════════════════════════════════════════════════════════════════ */

export async function exportRestroomsExcel(rows, dashboard) {
  const wb = new ExcelJS.Workbook()
  wb.creator = "Smart Mall OS - Restroom Snag"
  wb.created = new Date()

  // ── Sheet 1: مركز متابعة الحمامات (مطابق تماماً لتصميم الشيت الأصلي + صور مدمجة) ──
  const ws = wb.addWorksheet("مركز متابعة الحمامات", {
    views: [{ rightToLeft: true }],
  })

  ws.columns = [
    { key: "c1", width: 16 }, // المبنى / المنطقة
    { key: "c2", width: 22 }, // الاتجاه
    { key: "c3", width: 12 }, // الدور
    { key: "c4", width: 12 }, // الحمام
    { key: "c5", width: 16 }, // التخصص
    { key: "c6", width: 24 }, // المكون
    { key: "c7", width: 12 }, // نوع الحصر
    { key: "c8", width: 12 }, // العدد الفعلي
    { key: "c9", width: 10 }, // السليم
    { key: "c10", width: 10 }, // المعطل
    { key: "c11", width: 10 }, // الناقص
    { key: "c12", width: 34 }, // وصف الملاحظة / العطل
    { key: "c13", width: 15 }, // تاريخ الفحص
    { key: "c14", width: 18 }, // اسم المفتش
    { key: "c15", width: 28 }, // الإجراء المطلوب
    { key: "c16", width: 34 }, // الصور المرفقة (مدمجة بدون روابط)
  ]

  // Row 1: Title
  const r1 = ws.addRow(["RESTROOM SNAG | مركز متابعة الحمامات"])
  ws.mergeCells("A1:P1")
  r1.height = 32
  r1.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
  r1.getCell(1).font = { name: "Arial", size: 15, bold: true, color: { argb: "FFFFFFFF" } }
  r1.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

  // Row 2: Subtitle
  const r2 = ws.addRow(["تشغيل وصيانة • فحص الأصول • حصر فني • بلاغات • إغلاق ومتابعة"])
  ws.mergeCells("A2:P2")
  r2.height = 22
  r2.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
  r2.getCell(1).font = { name: "Arial", size: 11, bold: true, color: { argb: "FF93C5FD" } }
  r2.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

  // Row 3: Instructions
  const r3 = ws.addRow(["ابدأ من «دليل المواقع»، ثم «حصر المكونات» و«جولات الفحص»، وسجل العطل في «سجل السناج». الأصفر إدخال مطلوب؛ الأخضر سليم؛ الأحمر عطل."])
  ws.mergeCells("A3:P3")
  r3.height = 22
  r3.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } }
  r3.getCell(1).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF854D0E" } }
  r3.getCell(1).alignment = { vertical: "middle", horizontal: "center" }

  ws.addRow([])

  // Row 5-6: KPIs Summary
  const kpiHeader = ws.addRow([
    "الحمامات المؤكدة", "", "الحمامات قيد التأكيد", "", "الجولات المسجلة", "",
    "مكونات تم فحصها", "", "سناج مفتوح / أعطال", "", "إجمالي المكونات", ""
  ])
  kpiHeader.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1E293B" } }

  const kpiVals = ws.addRow([
    dashboard.confirmedRestrooms, "",
    dashboard.pendingRestrooms, "",
    dashboard.totalRounds, "",
    dashboard.inspectedComponents, "",
    dashboard.defectComponents, "",
    dashboard.totalComponents, ""
  ])
  kpiVals.font = { name: "Arial", size: 13, bold: true, color: { argb: "FF0F172A" } }

  ws.addRow([])

  // Zone Coverage Table
  const covTitle = ws.addRow(["تغطية المواقع حسب المنطقة"])
  covTitle.getCell(1).font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } }

  const covHead = ws.addRow(["المنطقة", "إجمالي الحمامات", "مؤكد", "جولات مسجلة", "مكونات مفحوصة", "أعطال مسجلة", "مرايا سيئة"])
  covHead.eachCell((c, colNum) => {
    if (colNum <= 7) {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
      c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } }
      c.alignment = { horizontal: "center", vertical: "middle" }
    }
  })

  for (const z of dashboard.zoneCoverage) {
    const zr = ws.addRow([z.zone, z.totalRestrooms, z.confirmed, z.rounds, z.inspected, z.defects, z.badMirrors])
    zr.eachCell((c, colNum) => {
      if (colNum <= 7) {
        c.font = { name: "Arial", size: 10 }
        c.alignment = { horizontal: "center", vertical: "middle" }
        c.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        }
      }
    })
  }

  const totalMirrors = dashboard.zoneCoverage.reduce((s, z) => s + z.badMirrors, 0)
  const totRow = ws.addRow([
    "الإجمالي",
    dashboard.totalRestrooms,
    dashboard.confirmedRestrooms,
    dashboard.totalRounds,
    dashboard.inspectedComponents,
    dashboard.defectComponents,
    totalMirrors,
  ])
  totRow.eachCell((c, colNum) => {
    if (colNum <= 7) {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }
      c.font = { name: "Arial", size: 10, bold: true }
      c.alignment = { horizontal: "center", vertical: "middle" }
    }
  })

  ws.addRow([])

  // Main Inspection Table Header
  const tableHeaderRow = ws.addRow([
    "المبنى / المنطقة",
    "الاتجاه",
    "الدور",
    "الحمام",
    "التخصص",
    "المكون",
    "نوع الحصر",
    "العدد الفعلي",
    "السليم",
    "المعطل",
    "الناقص",
    "وصف الملاحظة / العطل",
    "تاريخ الفحص",
    "اسم المفتش",
    "الإجراء المطلوب",
    "الصور",
  ])
  tableHeaderRow.height = 28
  tableHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    cell.border = {
      top: { style: "thin", color: { argb: "FF334155" } },
      bottom: { style: "thin", color: { argb: "FF334155" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    }
  })

  // Populate all rows with conditional coloring & embedded images
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const health = getRowHealth(r)
    const photos = (r.photos || []).filter(p => p.dataUrl)

    const actualVal = r.inspectType === "حالة" ? (r.conditionStatus || "") : (r.totalCount ?? "")
    const dataRow = ws.addRow([
      r.building,
      r.direction,
      r.floor,
      r.gender,
      r.trade,
      r.component,
      r.inspectType,
      actualVal,
      r.workingCount ?? "",
      r.defectiveCount ?? "",
      r.missingCount ?? "",
      r.notes || "",
      r.inspectDate || "",
      r.inspector || "",
      r.actionRequired || "",
      photos.length > 0 ? "" : "",
    ])

    const rowNumber = dataRow.number
    dataRow.height = photos.length > 0 ? 64 : 22

    // Row fill color: Red (defect), Green (ok), Yellow (pending)
    const bgArgb =
      health === "defect"
        ? "FFFEE2E2"
        : health === "ok"
          ? "FFDCFCE7"
          : "FFFEF9C3"

    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= 16) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } }
        cell.font = {
          name: "Arial",
          size: 10,
          bold: colNumber === 1 || colNumber === 6 || (colNumber === 10 && Number(r.defectiveCount) > 0),
          color: { argb: health === "defect" && colNumber === 10 ? "FFB91C1C" : "FF0F172A" },
        }
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber >= 7 && colNumber <= 11 ? "center" : "right",
          wrapText: true,
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } },
        }
      }
    })

    // Embed actual images directly inside Column 16 (col index 15)
    for (let pIdx = 0; pIdx < Math.min(photos.length, 3); pIdx++) {
      const imgData = await resolveImageBase64(photos[pIdx].dataUrl)
      if (imgData) {
        const imgId = wb.addImage(imgData)
        ws.addImage(imgId, {
          tl: { col: 15 + pIdx * 0.32, row: rowNumber - 1 + 0.08 },
          ext: { width: 72, height: 54 },
        })
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  _download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `restroom-snag-report-${Date.now()}.xlsx`
  )
}

export function exportRestroomsReport(rows, dashboard) {
  const now = new Date().toLocaleString("ar-EG")
  const zoneRows = dashboard.zoneCoverage.map(z => `
    <tr>
      <td><strong>${esc(z.zone)}</strong></td>
      <td>${z.totalRestrooms}</td>
      <td style="color:#059669;font-weight:bold">${z.confirmed}</td>
      <td>${z.rounds}</td>
      <td>${z.inspected} / ${z.totalComp}</td>
      <td style="color:${z.defects > 0 ? "#dc2626" : "#059669"};font-weight:bold">${z.defects}</td>
      <td>${z.badMirrors}</td>
    </tr>
  `).join("")

  const detailRows = rows.map((r, i) => {
    const health = getRowHealth(r)
    const bg = health === "defect" ? "#fee2e2" : health === "ok" ? "#dcfce7" : "#fef9c3"
    const photos = (r.photos || []).map(p => {
      const src = safeSrc(p.dataUrl)
      return src ? `<img src="${src}" style="width:64px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;margin:2px"/>` : ""
    }).join("")
    return `
      <tr style="background:${bg}">
        <td>${i + 1}</td>
        <td><strong>${esc(r.building)}</strong></td>
        <td>${esc(r.direction)}</td>
        <td>${esc(r.floor)}</td>
        <td>${esc(r.gender)}</td>
        <td>${esc(r.trade)}</td>
        <td><strong>${esc(r.component)}</strong></td>
        <td>${esc(r.inspectType)}</td>
        <td>${esc(r.inspectType === "حالة" ? (r.conditionStatus || "—") : (r.totalCount !== "" ? r.totalCount : "—"))}</td>
        <td>${esc(r.workingCount !== "" ? r.workingCount : "—")}</td>
        <td style="color:#dc2626;font-weight:bold">${esc(r.defectiveCount !== "" ? r.defectiveCount : "—")}</td>
        <td style="color:#d97706;font-weight:bold">${esc(r.missingCount !== "" ? r.missingCount : "—")}</td>
        <td>${esc(r.notes || "—")}</td>
        <td>${esc(r.inspectDate || "—")}</td>
        <td>${esc(r.inspector || "—")}</td>
        <td>${esc(r.actionRequired || "—")}</td>
        <td>${photos || "—"}</td>
      </tr>
    `
  }).join("")

  const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>RESTROOM SNAG | مركز متابعة الحمامات</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;background:#f8fafc;color:#0f172a;margin:0}
  .header{background:linear-gradient(135deg,#0f172a,#1e1b4b);color:#fff;padding:24px;border-radius:14px;margin-bottom:20px;text-align:center}
  .header h1{margin:0 0 6px;font-size:22px}
  .header p{margin:4px 0;opacity:0.85;font-size:13px}
  .kpis{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:14px}
  .kpi{background:rgba(255,255,255,0.12);padding:10px 18px;border-radius:10px;font-size:13px}
  .kpi strong{display:block;font-size:20px;margin-bottom:2px}
  table{width:100%;border-collapse:collapse;background:#fff;margin-bottom:20px;font-size:11px}
  th{background:#0f172a;color:#fff;padding:8px 6px;text-align:right;white-space:nowrap}
  td{padding:7px 6px;border:1px solid #cbd5e1;vertical-align:middle}
  .print-btn{display:block;margin:0 auto 16px;padding:10px 24px;border:0;border-radius:10px;background:#10b981;color:#fff;font-weight:800;cursor:pointer}
  @media print{.print-btn{display:none!important}body{background:#fff;padding:0}}
</style>
</head><body onload="setTimeout(()=>window.print(),600)">
  <div class="header">
    <h1>🚽 RESTROOM SNAG | مركز متابعة الحمامات</h1>
    <p>تشغيل وصيانة • فحص الأصول • حصر فني • بلاغات • إغلاق ومتابعة — تاريخ التقرير: ${esc(now)}</p>
    <div class="kpis">
      <div class="kpi"><strong>${dashboard.confirmedRestrooms} / ${dashboard.totalRestrooms}</strong>الحمامات المؤكدة</div>
      <div class="kpi"><strong>${dashboard.totalRounds}</strong>الجولات المسجلة</div>
      <div class="kpi"><strong>${dashboard.inspectedComponents} / ${dashboard.totalComponents}</strong>مكونات تم فحصها</div>
      <div class="kpi"><strong>${dashboard.defectComponents}</strong>سناج مفتوح / أعطال</div>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <h3>📊 تغطية المواقع حسب المنطقة</h3>
  <table>
    <thead><tr><th>المنطقة</th><th>إجمالي الحمامات</th><th>مؤكد</th><th>جولات مسجلة</th><th>المكونات المفحوصة</th><th>الأعطال</th><th>مرايا سيئة</th></tr></thead>
    <tbody>${zoneRows}</tbody>
  </table>
  <h3>📑 سجل الفحص التفصيلي (${rows.length} بند)</h3>
  <table>
    <thead><tr>
      <th>#</th><th>المبنى</th><th>الاتجاه</th><th>الدور</th><th>الحمام</th><th>التخصص</th><th>المكون</th><th>النوع</th>
      <th>الفعلي</th><th>السليم</th><th>المعطل</th><th>الناقص</th><th>وصف العطل</th><th>التاريخ</th><th>المفتش</th><th>الإجراء المطلوب</th><th>الصور</th>
    </tr></thead>
    <tbody>${detailRows}</tbody>
  </table>
</body></html>`

  const win = window.open("", "_blank")
  if (!win) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير"); return }
  win.document.write(html)
  win.document.close()
}

/* ════════════════════════════════════════════════════════════════════
   ██  UNITS REPORTS
   ════════════════════════════════════════════════════════════════════ */

export function exportUnitsReport(units) {
  const now = new Date().toLocaleString("ar-EG")
  const vacantCount = units.filter(u => (u.unitName || "").toLowerCase().includes("vacant") || (u.companyActivity || "").toLowerCase().includes("vacant")).length
  const occupiedCount = units.length - vacantCount

  const rows = units.map((u, i) => {
    const isVacant = (u.unitName || "").toLowerCase().includes("vacant") || (u.companyActivity || "").toLowerCase().includes("vacant")
    return `
    <tr style="${isVacant ? "background:#fef9c3" : ""}">
      <td>${i + 1}</td>
      <td><strong>${esc(u.buildingNo || "-")}</strong></td>
      <td>${esc(u.floor || "-")}</td>
      <td>${esc(u.unitNo || "-")}</td>
      <td style="${isVacant ? "color:#b45309;font-weight:bold" : ""}">${esc(u.unitName || "-")}</td>
      <td>${esc(u.unitOwnerName || "-")}</td>
      <td>${esc(u.unitManagerName || "-")}</td>
      <td>${esc(u.mobileTelOwner || "-")}</td>
      <td>${esc(u.mobileTelManager || "-")}</td>
      <td>${esc(u.mobileTelUnit || "-")}</td>
      <td>${esc(u.email || "-")}</td>
      <td>${esc(u.workingHours || "-")}</td>
      <td>${esc(u.weeklyOff || "-")}</td>
      <td>${esc(u.companyActivity || "-")}</td>
    </tr>`
  }).join("")

  const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>تقرير بيانات الوحدات</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;background:#f0f4f8;color:#1e293b;margin:0}
  .report-header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:30px 24px;border-radius:14px;margin-bottom:24px;text-align:center}
  .report-header h1{margin:0 0 6px;font-size:22px}
  .report-header p{margin:4px 0;opacity:0.8;font-size:13px}
  .stats{display:flex;gap:16px;justify-content:center;margin-top:16px;flex-wrap:wrap}
  .stat{background:rgba(255,255,255,0.15);padding:10px 20px;border-radius:10px;font-size:14px}
  .stat strong{font-size:20px;display:block;margin-bottom:2px}
  .stat.green{background:rgba(16,185,129,0.25)}
  .stat.yellow{background:rgba(234,179,8,0.25)}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
  th{background:#0f172a;color:#fff;padding:10px 8px;font-size:12px;white-space:nowrap}
  td{padding:9px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;vertical-align:top}
  tr:nth-child(even) td{background:#f8fafc}
  tr:hover td{background:#eef2ff}
  .print-btn{display:block;margin:20px auto;padding:12px 28px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
  @media print{.print-btn{display:none!important}body{background:#fff;padding:10px}.report-header{background:#0f172a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body onload="setTimeout(()=>window.print(),600)">
  <div class="report-header">
    <h1>🏢 تقرير بيانات عملاء المركز التجاري</h1>
    <p>Westwing — Park St. West</p>
    <p>تاريخ التصدير: ${esc(now)}</p>
    <div class="stats">
      <div class="stat"><strong>${units.length}</strong>إجمالي الوحدات</div>
      <div class="stat green"><strong>${occupiedCount}</strong>مشغولة</div>
      <div class="stat yellow"><strong>${vacantCount}</strong>شاغرة</div>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <table>
    <thead><tr>
      <th>#</th><th>المبنى</th><th>الدور</th><th>رقم الوحدة</th><th>اسم الوحدة</th>
      <th>المالك</th><th>المدير</th><th>هاتف المالك</th><th>هاتف المدير</th><th>هاتف الوحدة</th>
      <th>البريد</th><th>مواعيد العمل</th><th>الراحة</th><th>النشاط</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`
  const win = window.open("", "_blank")
  if (!win) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير"); return }
  win.document.write(html)
  win.document.close()
}

export function exportUnitsExcel(units) {
  const data = units.map((u, i) => {
    const isVacant = (u.unitName || "").toLowerCase().includes("vacant") || (u.companyActivity || "").toLowerCase().includes("vacant")
    return {
      "م": i + 1,
      "رقم المبنى": u.buildingNo || "",
      "الدور": u.floor || "",
      "رقم الوحدة": u.unitNo || "",
      "اسم الوحدة": u.unitName || "",
      "اسم المالك": u.unitOwnerName || "",
      "اسم المدير": u.unitManagerName || "",
      "هاتف المالك": u.mobileTelOwner || "",
      "هاتف المدير": u.mobileTelManager || "",
      "هاتف الوحدة": u.mobileTelUnit || "",
      "البريد الإلكتروني": u.email || "",
      "مواعيد العمل": u.workingHours || "",
      "الراحة الأسبوعية": u.weeklyOff || "",
      "العنوان": u.address || "",
      "نشاط الشركة": u.companyActivity || "",
      "الحالة": isVacant ? "شاغر" : "مشغول"
    }
  })
  const ws = XLSX.utils.json_to_sheet(data)
  ws["!dir"] = "rtl"
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "بيانات الوحدات")
  XLSX.writeFile(wb, `units-report-${Date.now()}.xlsx`)
}

/* ════════════════════════════════════════════════════════════════════
   ██  STORES REPORTS (Excel with Embedded Images & PDF Report)
   ════════════════════════════════════════════════════════════════════ */

export function exportStoresReport(stores) {
  const now = new Date().toLocaleString("ar-EG")
  const sorted = [...stores].sort((a, b) => (parseInt(a.storeNo) || 0) - (parseInt(b.storeNo) || 0))
  const vacantCount = sorted.filter(s => s.companyName?.toLowerCase().includes("vacant")).length
  const occupiedCount = sorted.length - vacantCount

  const rows = sorted.map((s, i) => {
    const isVacant = s.companyName?.toLowerCase().includes("vacant")
    const photos = (s.photos || []).map(p => {
      const src = safeSrc(p.dataUrl)
      return src ? `<img src="${src}" style="width:60px;height:45px;object-fit:cover;border-radius:4px;border:1px solid #ddd;margin:2px"/>` : ""
    }).join("")
    return `
    <tr style="${isVacant ? "background:#fef9c3" : ""}">
      <td>${i + 1}</td>
      <td><strong>${esc(s.storeNo || "-")}</strong></td>
      <td style="${isVacant ? "color:#b45309;font-weight:bold" : ""}">${esc(s.companyName || "-")}</td>
      <td>${esc(s.notes || "-")}</td>
      <td>${photos || "—"}</td>
    </tr>`
  }).join("")

  const html = `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"/>
<title>تقرير بيانات المخازن</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:20px;background:#f0f4f8;color:#1e293b;margin:0}
  .report-header{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:30px 24px;border-radius:14px;margin-bottom:24px;text-align:center}
  .report-header h1{margin:0 0 6px;font-size:22px}
  .report-header p{margin:4px 0;opacity:0.8;font-size:13px}
  .stats{display:flex;gap:16px;justify-content:center;margin-top:16px;flex-wrap:wrap}
  .stat{background:rgba(255,255,255,0.15);padding:10px 20px;border-radius:10px;font-size:14px}
  .stat strong{font-size:20px;display:block;margin-bottom:2px}
  .stat.green{background:rgba(16,185,129,0.25)}
  .stat.yellow{background:rgba(234,179,8,0.25)}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
  th{background:#0f172a;color:#fff;padding:10px 12px;font-size:13px;white-space:nowrap}
  td{padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;vertical-align:middle}
  tr:nth-child(even) td{background:#f8fafc}
  tr:hover td{background:#eef2ff}
  .print-btn{display:block;margin:20px auto;padding:12px 28px;border:none;border-radius:10px;background:#f59e0b;color:#fff;font-weight:700;font-size:15px;cursor:pointer}
  @media print{.print-btn{display:none!important}body{background:#fff;padding:10px}.report-header{background:#0f172a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body onload="setTimeout(()=>window.print(),600)">
  <div class="report-header">
    <h1>📦 تقرير بيانات المخازن</h1>
    <p>Westwing — Park St. West</p>
    <p>تاريخ التصدير: ${esc(now)}</p>
    <div class="stats">
      <div class="stat"><strong>${sorted.length}</strong>إجمالي المخازن</div>
      <div class="stat green"><strong>${occupiedCount}</strong>مشغولة</div>
      <div class="stat yellow"><strong>${vacantCount}</strong>شاغرة</div>
    </div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ PDF</button>
  <table>
    <thead><tr>
      <th>#</th><th>رقم المخزن</th><th>الشركة</th><th>ملاحظات</th><th>صور التوثيق</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`
  const win = window.open("", "_blank")
  if (!win) { alert("يرجى السماح بالنوافذ المنبثقة لطباعة التقرير"); return }
  win.document.write(html)
  win.document.close()
}

export async function exportStoresExcel(stores) {
  const sorted = [...stores].sort((a, b) => (parseInt(a.storeNo) || 0) - (parseInt(b.storeNo) || 0))
  const wb = new ExcelJS.Workbook()
  wb.creator = "Smart Mall OS"
  const ws = wb.addWorksheet("بيانات المخازن", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  })

  ws.columns = [
    { header: "م", key: "idx", width: 8 },
    { header: "رقم المخزن", key: "storeNo", width: 16 },
    { header: "الشركة", key: "companyName", width: 28 },
    { header: "ملاحظات", key: "notes", width: 36 },
    { header: "الحالة", key: "status", width: 14 },
    { header: "الصور", key: "photos", width: 34 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } }
    cell.alignment = { vertical: "middle", horizontal: "center" }
  })

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    const photos = (s.photos || []).filter(p => p.dataUrl)
    const r = ws.addRow({
      idx: i + 1,
      storeNo: s.storeNo || "",
      companyName: s.companyName || "",
      notes: s.notes || "",
      status: s.companyName?.toLowerCase().includes("vacant") ? "شاغر" : "مشغول",
      photos: "",
    })
    const rowNum = r.number
    r.height = photos.length > 0 ? 64 : 22
    r.eachCell((c) => {
      c.alignment = { vertical: "middle", horizontal: "right", wrapText: true }
      c.font = { name: "Arial", size: 10 }
    })

    for (let pIdx = 0; pIdx < Math.min(photos.length, 3); pIdx++) {
      const imgData = await resolveImageBase64(photos[pIdx].dataUrl)
      if (imgData) {
        const imgId = wb.addImage(imgData)
        ws.addImage(imgId, {
          tl: { col: 5 + pIdx * 0.32, row: rowNum - 1 + 0.08 },
          ext: { width: 72, height: 54 },
        })
      }
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  _download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `stores-report-${Date.now()}.xlsx`
  )
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = Object.assign(document.createElement("a"), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
