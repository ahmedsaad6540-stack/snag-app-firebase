'use strict';

const ExcelJS = require('exceljs');
const { PARK_ITEMS, PARK_SECTORS, INSPECTION_STATUSES } = require('./catalog');
const { RESTROOMS, COMPONENTS, computeRestroomZoneCoverage } = require('./restroomCatalog');
const { CATEGORIES, PRIORITIES, STATUSES } = require('./domain');
const { runFullAnalysis } = require('./ai/engine');

function styleHeaderRow(row, fillArgb = 'FF1E293B') {
  row.height = 26;
  row.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });
}

function styleDataRows(sheet, startRow = 2) {
  for (let i = startRow; i <= sheet.rowCount; i += 1) {
    const row = sheet.getRow(i);
    row.height = 21;
    const isEven = i % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (!cell.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }
        };
      }
      cell.font = cell.font || { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  }
}

async function buildMasterOperationsWorkbook({
  tickets = [],
  parkRecords = [],
  restroomRecords = [],
  restroomMeta = [],
  units = [],
  stores = [],
  permits = [],
  customItems = []
} = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Park Street Operations (Staging)';
  wb.created = new Date();

  const parkMap = Object.fromEntries(parkRecords.map((r) => [r.id || r.key, r]));
  const ai = runFullAnalysis({
    snags: tickets,
    parkInspection: { items: parkMap },
    restroomInspections: restroomMeta.map((m) => ({
      ...m,
      items: Object.fromEntries(
        restroomRecords.filter((r) => r.restroomKey === m.restroomKey).map((r) => [r.component, { bad: r.defectiveCount, status: r.conditionStatus }])
      )
    }))
  });

  // 1. Executive & AI Summary Sheet
  const summarySheet = wb.addWorksheet('الملخص التنفيذي والذكاء', { views: [{ rightToLeft: true }] });
  summarySheet.columns = [
    { header: 'المؤشر التشغيلي', key: 'metric', width: 34 },
    { header: 'القيمة', key: 'value', width: 24 },
    { header: 'التفاصيل والتوصية', key: 'note', width: 55 }
  ];
  styleHeaderRow(summarySheet.getRow(1), 'FF0F172A');
  summarySheet.addRows([
    { metric: 'مؤشر الصحة التشغيلية (AI Health Index)', value: `${ai.health.score}/100 (${ai.health.grade})`, note: ai.health.labelAr },
    { metric: 'إجمالي أوامر العمل / SNAGs', value: ai.kpis.total, note: `جديد: ${ai.kpis.open} | قيد التنفيذ: ${ai.kpis.inProgress} | للمراجعة: ${ai.kpis.review} | مغلق: ${ai.kpis.closed}` },
    { metric: 'نسبة الإنجاز والإغلاق', value: `${ai.kpis.resolutionRate}%`, note: `متوسط زمن الحل: ${ai.kpis.mttrHours} ساعة` },
    { metric: 'تفتيش Park Street (51 بند)', value: `${ai.kpis.parkInspection.checked} / 51`, note: `سليم: ${ai.kpis.parkInspection.ok} | Snag: ${ai.kpis.parkInspection.snag} | متابعة: ${ai.kpis.parkInspection.followup}` },
    { metric: 'فحص الحمامات (50 حمام × 29 مكون)', value: `${restroomRecords.length} / 1450`, note: `حمامات مؤكدة: ${restroomMeta.filter((m) => m.confirmed).length} / 50` },
    { metric: 'الوحدات المسجلة', value: units.length, note: `شاغر: ${units.filter((u) => u.isVacant).length}` },
    { metric: 'المخازن المسجلة', value: stores.length, note: `شاغر (Vacant): ${stores.filter((s) => s.isVacant).length}` },
    { metric: 'تصاريح العمل التجريبية', value: permits.length, note: 'جميع التصاريح في بيئة Staging تتطلب اعتماداً رسمياً منفصلاً' },
    { metric: 'القوائم المخصصة', value: customItems.length, note: 'عناصر الفحص القابلة للتخصيص' }
  ]);
  for (const sug of ai.suggestions) {
    summarySheet.addRow({
      metric: `توصية ذكية (${sug.priority})`,
      value: sug.titleAr,
      note: sug.actionAr
    });
  }
  styleDataRows(summarySheet, 2);

  // 2. Work Orders / SNAGs Sheet
  const snagSheet = wb.addWorksheet('أوامر العمل SNAGs', { views: [{ rightToLeft: true }] });
  snagSheet.columns = [
    { header: 'المعرف', key: 'id', width: 18 },
    { header: 'العنوان', key: 'title', width: 32 },
    { header: 'الموقع', key: 'location', width: 24 },
    { header: 'القسم', key: 'category', width: 18 },
    { header: 'التخصص الهندسي', key: 'trade', width: 18 },
    { header: 'الأولوية', key: 'priority', width: 14 },
    { header: 'الحالة', key: 'status', width: 16 },
    { header: 'التفاصيل', key: 'description', width: 42 },
    { header: 'المسؤول', key: 'assignedTo', width: 16 },
    { header: 'تاريخ الاستحقاق', key: 'dueDate', width: 16 },
    { header: 'تاريخ الإنشاء', key: 'createdAt', width: 22 }
  ];
  styleHeaderRow(snagSheet.getRow(1), 'FF1D4ED8');
  for (const t of tickets) {
    snagSheet.addRow({
      id: t.id,
      title: t.title,
      location: t.location,
      category: CATEGORIES[t.category] || t.category,
      trade: t.trade || 'Civil',
      priority: PRIORITIES[t.priority] || t.priority,
      status: STATUSES[t.status] || t.status,
      description: t.description || '',
      assignedTo: t.assignedTo || '-',
      dueDate: t.dueDate || '-',
      createdAt: t.createdAt || ''
    });
  }
  styleDataRows(snagSheet, 2);

  // 3. Park Street 51-Item Inspection Sheet
  const parkSheet = wb.addWorksheet('فحص Park Street (51)', { views: [{ rightToLeft: true }] });
  parkSheet.columns = [
    { header: 'كود البند', key: 'code', width: 14 },
    { header: 'القطاع', key: 'sectorName', width: 24 },
    { header: 'المنطقة / النطاق', key: 'zone', width: 26 },
    { header: 'بند الفحص', key: 'name', width: 32 },
    { header: 'المواصفة القياسية', key: 'spec', width: 38 },
    { header: 'النتيجة', key: 'statusLabel', width: 20 },
    { header: 'الملاحظات', key: 'note', width: 36 },
    { header: 'آخر تحديث', key: 'updatedAt', width: 22 }
  ];
  styleHeaderRow(parkSheet.getRow(1), 'FF047857');
  const sectorLabelMap = Object.fromEntries(PARK_SECTORS.map((s) => [s.id, s.name]));
  for (const item of PARK_ITEMS) {
    const saved = parkMap[item.key];
    const statusKey = saved ? saved.status : 'na';
    parkSheet.addRow({
      code: item.code,
      sectorName: sectorLabelMap[item.sector] || item.sector,
      zone: item.zone,
      name: item.name,
      spec: item.spec,
      statusLabel: INSPECTION_STATUSES[statusKey] || 'لم يُفحص',
      note: saved ? saved.note : '',
      updatedAt: saved ? saved.updatedAt : '-'
    });
  }
  styleDataRows(parkSheet, 2);

  // 4. Restroom Inspection Sheet + Zone Coverage Sheet
  const rrSheet = wb.addWorksheet('تفتيش الحمامات (1450)', { views: [{ rightToLeft: true }] });
  rrSheet.columns = [
    { header: 'المبنى / القطاع', key: 'building', width: 16 },
    { header: 'الاتجاه', key: 'direction', width: 22 },
    { header: 'الدور', key: 'floor', width: 14 },
    { header: 'النوع', key: 'gender', width: 12 },
    { header: 'التصنيف الهندسي', key: 'trade', width: 18 },
    { header: 'المكون', key: 'componentName', width: 24 },
    { header: 'نوع القياس', key: 'inputType', width: 12 },
    { header: 'الإجمالي', key: 'totalCount', width: 10 },
    { header: 'السليم', key: 'workingCount', width: 10 },
    { header: 'المعطل', key: 'defectiveCount', width: 10 },
    { header: 'المفقود', key: 'missingCount', width: 10 },
    { header: 'الحالة', key: 'conditionStatus', width: 14 },
    { header: 'الملاحظات', key: 'note', width: 30 },
    { header: 'الإجراء المطلوب', key: 'actionRequired', width: 26 },
    { header: 'القائم بالفحص', key: 'inspector', width: 18 },
    { header: 'التاريخ', key: 'inspectDate', width: 16 }
  ];
  styleHeaderRow(rrSheet.getRow(1), 'FF0369A1');
  for (const r of restroomRecords) {
    const comp = COMPONENTS.find((c) => c.code === r.component);
    const room = RESTROOMS.find((rm) => rm.key === r.restroomKey);
    rrSheet.addRow({
      building: r.building || room?.building || '',
      direction: r.direction || room?.direction || '',
      floor: r.floor || room?.floor || '',
      gender: r.gender || room?.gender || '',
      trade: r.trade || comp?.trade || '',
      componentName: r.componentName || comp?.name || r.component,
      inputType: r.inputType || comp?.type || '',
      totalCount: r.totalCount ?? '-',
      workingCount: r.workingCount ?? '-',
      defectiveCount: r.defectiveCount ?? '-',
      missingCount: r.missingCount ?? '-',
      conditionStatus: r.conditionStatus || (Number(r.defectiveCount) > 0 ? 'تالف' : 'سليم'),
      note: r.note || '',
      actionRequired: r.actionRequired || '',
      inspector: r.inspector || r.updatedBy || '',
      inspectDate: r.inspectDate || (r.updatedAt ? r.updatedAt.slice(0, 10) : '')
    });
  }
  styleDataRows(rrSheet, 2);

  const zoneSheet = wb.addWorksheet('تغطية قطاعات الحمامات', { views: [{ rightToLeft: true }] });
  zoneSheet.columns = [
    { header: 'القطاع / المبنى', key: 'zone', width: 22 },
    { header: 'إجمالي الحمامات', key: 'total', width: 16 },
    { header: 'المؤكد فحصه', key: 'confirmed', width: 16 },
    { header: 'نسبة التغطية %', key: 'pct', width: 16 },
    { header: 'عدد الجولات', key: 'rounds', width: 14 },
    { header: 'إجمالي الأعطال', key: 'defects', width: 16 },
    { header: 'المرايا التالفة', key: 'badMirrors', width: 16 }
  ];
  styleHeaderRow(zoneSheet.getRow(1), 'FF4338CA');
  const zoneCoverage = computeRestroomZoneCoverage(restroomRecords, restroomMeta);
  for (const z of zoneCoverage) {
    zoneSheet.addRow({
      zone: z.zone,
      total: z.total,
      confirmed: z.confirmed,
      pct: `${z.pct}%`,
      rounds: z.rounds,
      defects: z.defects,
      badMirrors: z.badMirrors
    });
  }
  styleDataRows(zoneSheet, 2);

  // 5. Units Sheet (14 Fields)
  const unitsSheet = wb.addWorksheet('الوحدات Units', { views: [{ rightToLeft: true }] });
  unitsSheet.columns = [
    { header: 'المبنى', key: 'buildingNo', width: 12 },
    { header: 'الدور', key: 'floor', width: 12 },
    { header: 'رقم الوحدة', key: 'unitNo', width: 14 },
    { header: 'اسم الوحدة', key: 'unitName', width: 26 },
    { header: 'الحالة', key: 'vacancy', width: 14 },
    { header: 'اسم المالك', key: 'unitOwnerName', width: 22 },
    { header: 'اسم المدير', key: 'unitManagerName', width: 22 },
    { header: 'هاتف المالك', key: 'mobileTelOwner', width: 16 },
    { header: 'هاتف المدير', key: 'mobileTelManager', width: 16 },
    { header: 'هاتف الوحدة', key: 'mobileTelUnit', width: 16 },
    { header: 'العنوان', key: 'address', width: 26 },
    { header: 'البريد الإلكتروني', key: 'email', width: 24 },
    { header: 'مواعيد العمل', key: 'workingHours', width: 20 },
    { header: 'الإجازة الأسبوعية', key: 'weeklyOff', width: 18 },
    { header: 'النشاط', key: 'companyActivity', width: 24 }
  ];
  styleHeaderRow(unitsSheet.getRow(1), 'FF6D28D9');
  for (const u of units) {
    unitsSheet.addRow({
      buildingNo: u.buildingNo || '-',
      floor: u.floor || '-',
      unitNo: u.unitNo || '-',
      unitName: u.unitName || u.title || '-',
      vacancy: u.isVacant ? 'Vacant (شاغر)' : 'Occupied (مشغول)',
      unitOwnerName: u.unitOwnerName || '-',
      unitManagerName: u.unitManagerName || '-',
      mobileTelOwner: u.mobileTelOwner || '-',
      mobileTelManager: u.mobileTelManager || '-',
      mobileTelUnit: u.mobileTelUnit || '-',
      address: u.address || u.location || '-',
      email: u.email || '-',
      workingHours: u.workingHours || '-',
      weeklyOff: u.weeklyOff || '-',
      companyActivity: u.companyActivity || u.description || '-'
    });
  }
  styleDataRows(unitsSheet, 2);

  // 6. Stores Sheet
  const storesSheet = wb.addWorksheet('المخازن Stores', { views: [{ rightToLeft: true }] });
  storesSheet.columns = [
    { header: 'رقم المخزن', key: 'storeNo', width: 16 },
    { header: 'الشركة / المستأجر', key: 'companyName', width: 30 },
    { header: 'الحالة', key: 'vacancy', width: 18 },
    { header: 'الملاحظات', key: 'notes', width: 36 },
    { header: 'آخر تحديث', key: 'updatedAt', width: 22 }
  ];
  styleHeaderRow(storesSheet.getRow(1), 'FFB45309');
  for (const s of stores) {
    storesSheet.addRow({
      storeNo: s.storeNo || '-',
      companyName: s.companyName || s.title || '-',
      vacancy: s.isVacant ? 'Vacant (شاغر)' : 'Occupied (مشغول)',
      notes: s.notes || s.description || '',
      updatedAt: s.updatedAt || ''
    });
  }
  styleDataRows(storesSheet, 2);

  return wb.xlsx.writeBuffer();
}

function buildOperationsSummaryCsv({
  tickets = [],
  parkRecords = [],
  restroomRecords = [],
  units = [],
  stores = [],
  permits = []
} = {}) {
  const rows = [
    ['Section', 'ID/Code', 'Title', 'Location/Zone', 'Status/Condition', 'Priority/Trade', 'UpdatedAt']
  ];
  for (const t of tickets) {
    rows.push(['WorkOrder', t.id, t.title, t.location, t.status, t.priority, t.updatedAt]);
  }
  for (const p of parkRecords) {
    rows.push(['ParkStreet51', p.code || p.id, p.title, p.zone, p.status, p.sector, p.updatedAt]);
  }
  for (const r of restroomRecords) {
    rows.push(['Restroom1450', r.id, `${r.building} - ${r.componentName || r.component}`, r.gender, r.conditionStatus || `W:${r.workingCount}/D:${r.defectiveCount}`, r.trade || '', r.updatedAt]);
  }
  for (const u of units) {
    rows.push(['Unit', u.unitNo || u.id, u.unitName || u.title, u.location, u.isVacant ? 'Vacant' : 'Occupied', u.companyActivity || '', u.updatedAt]);
  }
  for (const s of stores) {
    rows.push(['Store', s.storeNo || s.id, s.companyName || s.title, s.location, s.isVacant ? 'Vacant' : 'Occupied', s.notes || '', s.updatedAt]);
  }
  for (const pm of permits) {
    rows.push(['Permit', pm.id, pm.title, pm.location, pm.approvalStage || pm.status, 'requiresOfficialApproval=true', pm.updatedAt]);
  }
  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n');
}

module.exports = {
  buildMasterOperationsWorkbook,
  buildOperationsSummaryCsv
};
