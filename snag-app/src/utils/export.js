import { tradeOf, locOf, priOf, staOf, typeOf, formatDate, TRADES, LOCATIONS } from "../constants/index.js"
import { getRowHealth, RESTROOM_LOCATIONS, STANDARD_COMPONENTS } from "../constants/restroomsData.js"
import { PARK_SECTORS } from "../constants/parkStreetData.js"
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
    wb.creator = "Park St. Mall Management"
    wb.lastModifiedBy = "Ahmed Rabie"
    wb.created = new Date()

    const THEME = {
      darkNavy: "FF0A1628",
      headerBlue: "FF1E3A8A",
      headerCyan: "FF0891B2",
      accentYellow: "FFF59E0B",
      accentGreen: "FF10B981",
      accentRed: "FFEF4444",
      white: "FFFFFFFF",
      grayBorder: "FFCBD5E1",
      grayDarkBorder: "FF334155",
      zebraRow: "FFF8FAFC",
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. DASHBOARD & KPIS SHEET
    // ──────────────────────────────────────────────────────────────────────────
    const wsDash = wb.addWorksheet("📊 لوحة المؤشرات", {
      views: [{ rightToLeft: true, showGridLines: true }],
    })
    wsDash.properties.defaultRowHeight = 22

    wsDash.mergeCells("B2:I2")
    const dTitle = wsDash.getCell("B2")
    dTitle.value = "مول بارك ستريت — منظومة إدارة ومتابعة السناج والصيانة الشاملة (تطبيق الإكسيل البديل)"
    dTitle.font = { name: "Arial", size: 15, bold: true, color: { argb: THEME.white } }
    dTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } }
    dTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsDash.getRow(2).height = 40

    wsDash.mergeCells("B3:I3")
    const dSub = wsDash.getCell("B3")
    dSub.value = `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')} | تطبيق إكسيل تفاعلي يحتوي على فلاتر وقوائم منسدلة ومعادلات تلقائية`
    dSub.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } }
    dSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    dSub.alignment = { horizontal: "center", vertical: "middle" }
    wsDash.getRow(3).height = 24

    const kpis = [
      { label: "إجمالي الملاحظات المسجلة", formula: "=COUNTA('📋 سجل الملاحظات'!A5:A500)", colStart: "B", colEnd: "C", color: "FF38BDF8" },
      { label: "ملاحظات مفتوحة 🔴", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"مفتوح\")", colStart: "D", colEnd: "E", color: "FFEF4444" },
      { label: "قيد التنفيذ 🟡", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"قيد التنفيذ\")", colStart: "F", colEnd: "G", color: "FFF59E0B" },
      { label: "ملاحظات معالجة ومغلقة ✅", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"مغلق\")", colStart: "H", colEnd: "I", color: "FF10B981" },
    ]

    kpis.forEach(k => {
      wsDash.mergeCells(`${k.colStart}5:${k.colEnd}5`)
      const valCell = wsDash.getCell(`${k.colStart}5`)
      valCell.value = { formula: k.formula }
      valCell.font = { name: "Arial", size: 22, bold: true, color: { argb: k.color } }
      valCell.alignment = { horizontal: "center", vertical: "middle" }
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
      valCell.border = { top: { style: "medium", color: { argb: k.color } }, left: { style: "thin" }, right: { style: "thin" } }

      wsDash.mergeCells(`${k.colStart}6:${k.colEnd}6`)
      const lblCell = wsDash.getCell(`${k.colStart}6`)
      lblCell.value = k.label
      lblCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFCBD5E1" } }
      lblCell.alignment = { horizontal: "center", vertical: "middle" }
      lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }
      lblCell.border = { bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
    })
    wsDash.getRow(5).height = 36
    wsDash.getRow(6).height = 24

    wsDash.mergeCells("B9:E9")
    const trTitle = wsDash.getCell("B9")
    trTitle.value = "📊 إحصائيات الملاحظات حسب التخصص / الفئة"
    trTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } }
    trTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
    trTitle.alignment = { horizontal: "center", vertical: "middle" }

    wsDash.getCell("B10").value = "م"
    wsDash.getCell("C10").value = "التخصص / الفئة"
    wsDash.getCell("D10").value = "العدد المسجل"
    wsDash.getCell("E10").value = "النسبة التقريبية"
    ;["B10", "C10", "D10", "E10"].forEach(c => {
      const cell = wsDash.getCell(c)
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })

    let trRow = 11
    TRADES.forEach((tr, idx) => {
      wsDash.getCell(`B${trRow}`).value = idx + 1
      wsDash.getCell(`C${trRow}`).value = tr.label
      wsDash.getCell(`D${trRow}`).value = { formula: `=COUNTIF('📋 سجل الملاحظات'!C$5:C$500, "${tr.label}")` }
      wsDash.getCell(`E${trRow}`).value = { formula: `=IF(D${trRow}>0, TEXT(D${trRow}/B$5, "0.0%"), "0%")` }
      ;["B", "C", "D", "E"].forEach(col => {
        const cell = wsDash.getCell(`${col}${trRow}`)
        cell.font = { name: "Arial", size: 10, bold: col === "C" || col === "D" }
        cell.alignment = { horizontal: col === "C" ? "right" : "center", vertical: "middle" }
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } }
        if (trRow % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } }
      })
      trRow++
    })

    wsDash.mergeCells("G9:I9")
    const priTitle = wsDash.getCell("G9")
    priTitle.value = "🚨 توزيع الملاحظات حسب الأولوية"
    priTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } }
    priTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } }
    priTitle.alignment = { horizontal: "center", vertical: "middle" }

    wsDash.getCell("G10").value = "درجة الأولوية"
    wsDash.getCell("H10").value = "العدد"
    wsDash.getCell("I10").value = "المعادلة التلقائية"
    ;["G10", "H10", "I10"].forEach(c => {
      const cell = wsDash.getCell(c)
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
      cell.alignment = { horizontal: "center", vertical: "middle" }
    })

    const priRows = [
      { label: "عاجل", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "عاجل")', color: "FFEF4444" },
      { label: "متوسط", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "متوسط")', color: "FFF59E0B" },
      { label: "عادي", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "عادي")', color: "FF64748B" },
    ]
    priRows.forEach((pr, i) => {
      const r = 11 + i
      wsDash.getCell(`G${r}`).value = pr.label
      wsDash.getCell(`H${r}`).value = { formula: pr.formula }
      wsDash.getCell(`I${r}`).value = { formula: `=IF(H${r}>0, TEXT(H${r}/B$5, "0.0%"), "0%")` }
      ;["G", "H", "I"].forEach(col => {
        const cell = wsDash.getCell(`${col}${r}`)
        cell.font = { name: "Arial", size: 10, bold: true, color: col === "G" ? { argb: pr.color } : undefined }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } }
      })
    })

    wsDash.columns = [
      { width: 3 }, { width: 6 }, { width: 26 }, { width: 14 }, { width: 16 }, { width: 3 }, { width: 18 }, { width: 14 }, { width: 28 },
    ]

    // ──────────────────────────────────────────────────────────────────────────
    // 2. MASTER SNAG LIST SHEET
    // ──────────────────────────────────────────────────────────────────────────
    const wsSnags = wb.addWorksheet("📋 سجل الملاحظات", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    })

    wsSnags.mergeCells("A1:M1")
    const sTitle = wsSnags.getCell("A1")
    sTitle.value = "PARK ST. MALL | سجل الملاحظات ومتابعة الصيانة الشامل (Master Snag List)"
    sTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } }
    sTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } }
    sTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsSnags.getRow(1).height = 32

    wsSnags.mergeCells("A2:M2")
    const sSub = wsSnags.getCell("A2")
    sSub.value = "استخدم فلاتر الأعمدة للتصفية والفرز | استخدم القوائم المنسدلة لاختيار الموقع والتخصص والحالة والأولوية | أضف أي ملاحظات جديدة بالأسفل"
    sSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF38BDF8" } }
    sSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } }
    sSub.alignment = { horizontal: "center", vertical: "middle" }
    wsSnags.getRow(2).height = 22
    wsSnags.getRow(3).height = 6

    const snagHeaders = [
      "كود الملاحظة",
      "الموقع المحدد",
      "التخصص / الفئة",
      "نوع الملاحظة",
      "درجة الأولوية",
      "حالة الملاحظة",
      "وصف المشكلة والملاحظة بالتفصيل",
      "الإجراء الفني المطلوب / التوصية",
      "المشرف المسؤول",
      "تاريخ الرصد والإنشاء",
      "تاريخ المعالجة / الإغلاق",
      "ملاحظات المتابعة والتشغيل",
      "الصورة المدمجة (بدون روابط)",
    ]

    const headerRow = wsSnags.getRow(4)
    snagHeaders.forEach((h, i) => {
      const c = headerRow.getCell(i + 1)
      c.value = h
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
    })
    headerRow.height = 30
    wsSnags.autoFilter = { from: "A4", to: "M4" }

    wsSnags.columns = [
      { width: 14 }, { width: 22 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 15 },
      { width: 42 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 25 }, { width: 22 },
    ]

    const locNamesList = Array.isArray(locations) && locations.length > 0
      ? locations.map(l => l.name)
      : LOCATIONS.map(l => l.name)
    const uniqueLocs = [...new Set(locNamesList)].join(",")
    const tradesList = TRADES.map(t => t.label).join(",")
    const prioritiesList = "عاجل,متوسط,عادي"
    const statusesList = "مفتوح,قيد التنفيذ,مغلق"
    const typesList = "صيانة,تشغيل,نظافة"

    let curRowIdx = 5
    for (const s of sorted) {
      const row = wsSnags.getRow(curRowIdx)
      const sCode = s.snagId ? String(s.snagId).toUpperCase() : `SNG-${curRowIdx - 4}`
      const sLoc = getLoc(s.location, locations)?.name || s.location || "—"
      const sTrade = tradeOf(s.trade)?.label || s.trade || "أعمال عامة"
      const sType = typeOf(s.type)?.label || s.type || "صيانة"
      const sPri = priOf(s.priority)?.label || s.priority || "عادي"
      const sStatus = staOf(s.status)?.label || s.status || "مفتوح"
      const sDesc = s.description || "—"
      const sAction = s.action || (sPri === "عاجل" ? "مطلوب فحص ومعالجة فورية" : "متابعة وإصلاح في خطة الصيانة")
      const sInspector = s.inspector || "مشرف التشغيل"
      const sDateLogged = formatDate(s.timestamp)
      const sDateClosed = sStatus === "مغلق" ? formatDate(s.closedAt || s.timestamp) : "—"
      const sFollowup = s.notes || ""

      row.getCell(1).value = sCode
      row.getCell(2).value = sLoc
      row.getCell(3).value = sTrade
      row.getCell(4).value = sType
      row.getCell(5).value = sPri
      row.getCell(6).value = sStatus
      row.getCell(7).value = sDesc
      row.getCell(8).value = sAction
      row.getCell(9).value = sInspector
      row.getCell(10).value = sDateLogged
      row.getCell(11).value = sDateClosed
      row.getCell(12).value = sFollowup
      row.getCell(13).value = s.attachments?.length ? "" : "لا توجد صورة"

      const statusBg =
        sStatus === "مفتوح" ? "FFFEE2E2" :
        sStatus === "قيد التنفيذ" ? "FFFEF3C7" :
        sStatus === "مغلق" ? "FFD1FAE5" : "FFFFFFFF"

      const priColor = sPri === "عاجل" ? "FFB91C1C" : sPri === "متوسط" ? "FFB45309" : "FF334155"

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c)
        cell.font = {
          name: "Arial",
          size: 10,
          bold: c === 1 || c === 5 || c === 6,
          color: c === 5 ? { argb: priColor } : c === 6 && sStatus === "مفتوح" ? { argb: "FFB91C1C" } : c === 6 && sStatus === "مغلق" ? { argb: "FF047857" } : undefined,
        }
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: c === 6 ? statusBg : curRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white },
        }
        cell.alignment = {
          horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center",
          vertical: "middle",
          wrapText: true,
        }
        cell.border = {
          top: { style: "thin", color: { argb: THEME.grayBorder } },
          bottom: { style: "thin", color: { argb: THEME.grayBorder } },
          left: { style: "thin", color: { argb: THEME.grayBorder } },
          right: { style: "thin", color: { argb: THEME.grayBorder } },
        }

        if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${uniqueLocs.slice(0, 240)}"`] }
        if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${tradesList.slice(0, 240)}"`] }
        if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${typesList}"`] }
        if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${prioritiesList}"`] }
        if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${statusesList}"`] }
      }

      const atts = (s.attachments || []).filter(f => f.type?.startsWith("image/") || f.dataUrl?.startsWith("data:image/") || f.storageUrl)
      if (atts.length > 0) {
        row.height = 72
        for (let pIdx = 0; pIdx < Math.min(atts.length, 1); pIdx++) {
          const imgData = await resolveImageBase64(atts[pIdx].dataUrl || atts[pIdx].storageUrl)
          if (imgData) {
            const imgId = wb.addImage(imgData)
            wsSnags.addImage(imgId, {
              tl: { col: 12.15, row: curRowIdx - 1 + 0.08 },
              ext: { width: 90, height: 60 },
            })
          }
        }
      } else {
        row.height = 26
      }

      curRowIdx++
    }

    // 50 Blank rows for quick entry
    for (let i = 0; i < 50; i++) {
      const row = wsSnags.getRow(curRowIdx)
      row.getCell(1).value = `SNG-NEW-${i + 1}`
      row.getCell(4).value = "صيانة"
      row.getCell(5).value = "متوسط"
      row.getCell(6).value = "مفتوح"
      row.getCell(9).value = "مشرف التشغيل"
      row.getCell(10).value = new Date().toLocaleDateString('ar-EG')
      row.height = 24

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c)
        cell.font = { name: "Arial", size: 10, color: { argb: "FF475569" } }
        cell.alignment = {
          horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center",
          vertical: "middle",
        }
        cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } }
        if (curRowIdx % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } }

        if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${uniqueLocs.slice(0, 240)}"`] }
        if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${tradesList.slice(0, 240)}"`] }
        if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${typesList}"`] }
        if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${prioritiesList}"`] }
        if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${statusesList}"`] }
      }
      curRowIdx++
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. PARK STREET CHECKLIST SHEET
    // ──────────────────────────────────────────────────────────────────────────
    const wsPark = wb.addWorksheet("🌟 فحص بارك ستريت", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    })

    wsPark.mergeCells("A1:I1")
    const pTitle = wsPark.getCell("A1")
    pTitle.value = "مول بارك ستريت — فحص القطاعات الشاملة (الأمن • رحلة العميل • الزراعة • مسار السيارات بالبيزمنت)"
    pTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } }
    pTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4C1D95" } }
    pTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsPark.getRow(1).height = 32

    wsPark.mergeCells("A2:I2")
    const pSub = wsPark.getCell("A2")
    pSub.value = "معايير التشغيل والفحص الميداني | تصفية بالقطاع أو المنطقة | اختر الحالة: سليم ✅ / ملاحظة أو عطل 🔴 / يحتاج متابعة 🟡"
    pSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFC4B5FD" } }
    pSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E1065" } }
    pSub.alignment = { horizontal: "center", vertical: "middle" }
    wsPark.getRow(2).height = 22
    wsPark.getRow(3).height = 6

    const parkHeaders = [
      "القطاع الرئيسي", "كود المنطقة", "المنطقة / المسار الفرعي", "بند الفحص والمعيار التشغيلي",
      "الفئة الفرعية", "الحالة التشغيلية", "تفاصيل الملاحظة والإجراء المطلوب", "المشرف المسؤول", "تاريخ الفحص"
    ]
    const pHeaderRow = wsPark.getRow(4)
    parkHeaders.forEach((h, i) => {
      const c = pHeaderRow.getCell(i + 1)
      c.value = h
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF581C87" } }
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
    })
    pHeaderRow.height = 30
    wsPark.autoFilter = { from: "A4", to: "I4" }
    wsPark.columns = [
      { width: 22 }, { width: 14 }, { width: 30 }, { width: 42 }, { width: 18 }, { width: 18 }, { width: 40 }, { width: 18 }, { width: 18 }
    ]

    let pRowIdx = 5
    for (const sec of PARK_SECTORS) {
      for (const zone of sec.zones) {
        for (const item of zone.items) {
          const pRow = wsPark.getRow(pRowIdx)
          pRow.getCell(1).value = sec.name
          pRow.getCell(2).value = zone.code
          pRow.getCell(3).value = zone.title
          pRow.getCell(4).value = item.name
          pRow.getCell(5).value = item.category
          pRow.getCell(6).value = "سليم ✅"
          pRow.getCell(7).value = "—"
          pRow.getCell(8).value = "مشرف بارك ستريت"
          pRow.getCell(9).value = new Date().toLocaleDateString('ar-EG')

          for (let c = 1; c <= 9; c++) {
            const cell = pRow.getCell(c)
            cell.font = { name: "Arial", size: 10, bold: c === 1 || c === 4 || c === 6 }
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: pRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white } }
            cell.alignment = { horizontal: c === 3 || c === 4 || c === 7 ? "right" : "center", vertical: "middle" }
            cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } }
            if (c === 6) {
              cell.dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: ['"سليم ✅,ملاحظة / عطل 🔴,يحتاج متابعة 🟡,لم يُفحص ⚪"'],
              }
            }
          }
          pRow.height = 24
          pRowIdx++
        }
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. RESTROOM MATRIX SHEET
    // ──────────────────────────────────────────────────────────────────────────
    const wsRest = wb.addWorksheet("🚽 فحص الحمامات", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    })

    wsRest.mergeCells("A1:N1")
    const rTitle = wsRest.getCell("A1")
    rTitle.value = "مول بارك ستريت — مركز متابعة وفحص الحمامات الفني وحصر المكونات (50 حمام × 29 مكون)"
    rTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } }
    rTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } }
    rTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsRest.getRow(1).height = 32

    wsRest.mergeCells("A2:N2")
    const rSub = wsRest.getCell("A2")
    rSub.value = "حصر فني ومتابعة للأعطال | فلترة بالمبنى والطابق والنوع والتخصص والحالة"
    rSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFA7F3D0" } }
    rSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } }
    rSub.alignment = { horizontal: "center", vertical: "middle" }
    wsRest.getRow(2).height = 22
    wsRest.getRow(3).height = 6

    const restHeaders = [
      "المبنى / المنطقة", "الاتجاه", "الطابق", "النوع", "كود الحمام", "اسم المكون / المعيار الفني",
      "التخصص", "إجمالي العدد", "العدد السليم", "العدد المعطل", "العدد المفقود", "الحالة العامة",
      "الملاحظات والتفاصيل الفنية", "المشرف وتاريخ الفحص"
    ]
    const rHeaderRow = wsRest.getRow(4)
    restHeaders.forEach((h, i) => {
      const c = rHeaderRow.getCell(i + 1)
      c.value = h
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } }
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } }
    })
    rHeaderRow.height = 30
    wsRest.autoFilter = { from: "A4", to: "N4" }
    wsRest.columns = [
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 22 }, { width: 30 },
      { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 36 }, { width: 22 }
    ]

    let rRowIdx = 5
    for (const loc of RESTROOM_LOCATIONS) {
      for (const comp of STANDARD_COMPONENTS) {
        const rRow = wsRest.getRow(rRowIdx)
        rRow.getCell(1).value = loc.building
        rRow.getCell(2).value = loc.direction
        rRow.getCell(3).value = loc.floor
        rRow.getCell(4).value = loc.gender
        rRow.getCell(5).value = loc.restroomKey
        rRow.getCell(6).value = comp.component
        rRow.getCell(7).value = comp.trade
        rRow.getCell(8).value = "—"
        rRow.getCell(9).value = "—"
        rRow.getCell(10).value = "—"
        rRow.getCell(11).value = "—"
        rRow.getCell(12).value = "سليم ومطابق ✅"
        rRow.getCell(13).value = "—"
        rRow.getCell(14).value = "مشرف الفحص"

        for (let c = 1; c <= 14; c++) {
          const cell = rRow.getCell(c)
          cell.font = { name: "Arial", size: 9.5, bold: c === 5 || c === 6 || c === 12 }
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white } }
          cell.alignment = { horizontal: c === 6 || c === 13 ? "right" : "center", vertical: "middle" }
          cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } }
          if (c === 12) {
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"سليم ومطابق ✅,يوجد عطل / نقص 🔴,لم يُفحص ⚪"'],
            }
          }
        }
        rRow.height = 22
        rRowIdx++
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. LOOKUPS & SETTINGS SHEET
    // ──────────────────────────────────────────────────────────────────────────
    const wsLookups = wb.addWorksheet("⚙️ دليل القوائم والمرجع", {
      views: [{ rightToLeft: true }],
    })
    wsLookups.mergeCells("A1:F1")
    const lTitle = wsLookups.getCell("A1")
    lTitle.value = "دليل القوائم المرجعية لتغذية القوائم المنسدلة والخيارات في الإكسيل"
    lTitle.font = { name: "Arial", size: 13, bold: true, color: { argb: THEME.white } }
    lTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } }
    lTitle.alignment = { horizontal: "center", vertical: "middle" }
    wsLookups.getRow(1).height = 28

    const lHeaders = ["قائمة المواقع", "قائمة التخصصات", "قائمة الأولويات", "قائمة الحالات", "قائمة أنواع الملاحظة", "مشرفو الفحص"]
    const lHeaderRow = wsLookups.getRow(3)
    lHeaders.forEach((h, i) => {
      const c = lHeaderRow.getCell(i + 1)
      c.value = h
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } }
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }
      c.alignment = { horizontal: "center", vertical: "middle" }
    })
    lHeaderRow.height = 24

    const maxRows = Math.max(locNamesList.length, TRADES.length, 10)
    for (let i = 0; i < maxRows; i++) {
      const r = wsLookups.getRow(4 + i)
      r.getCell(1).value = locNamesList[i] || ""
      r.getCell(2).value = TRADES[i]?.label || ""
      r.getCell(3).value = ["عاجل", "متوسط", "عادي"][i] || ""
      r.getCell(4).value = ["مفتوح", "قيد التنفيذ", "مغلق"][i] || ""
      r.getCell(5).value = ["صيانة", "تشغيل", "نظافة"][i] || ""
      r.getCell(6).value = ["احمد ربيع", "مشرف بارك ستريت", "مشرف الكهرباء", "مشرف السباكة", "مشرف التكييف", "مشرف الأمن"][i] || ""

      for (let c = 1; c <= 6; c++) {
        const cell = r.getCell(c)
        cell.font = { name: "Arial", size: 10 }
        cell.alignment = { horizontal: "center", vertical: "middle" }
        cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } }
      }
      r.height = 20
    }
    wsLookups.columns = [{ width: 28 }, { width: 26 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 22 }]

    // Trigger download
    const buf = await wb.xlsx.writeBuffer()
    _download(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `سجل_سناج_بارك_ستريت_التطبيقي_الشامل_${new Date().toISOString().slice(0, 10)}.xlsx`
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
