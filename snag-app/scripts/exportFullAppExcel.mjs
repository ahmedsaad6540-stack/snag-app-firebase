import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

// ── Firebase Initialization ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAOJI4wQKvWfdHM8jQTbKoU_Zj03wb2WAw",
  authDomain: "snag-app-firebase.firebaseapp.com",
  projectId: "snag-app-firebase",
  storageBucket: "snag-app-firebase.firebasestorage.app",
  messagingSenderId: "1074700913936",
  appId: "1:1074700913936:web:62894bd7ebf12b30e5a995",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── App Constants ────────────────────────────────────────────────────────
import { LOCATIONS, TRADES, PRIORITIES, TYPES, STATUSES } from '../src/constants/index.js';
import { RESTROOM_LOCATIONS, STANDARD_COMPONENTS } from '../src/constants/restroomsData.js';
import { PARK_SECTORS } from '../src/constants/parkStreetData.js';

async function generateMasterExcelApp() {
  console.log("⏳ جاري جلب البيانات الحية من Firebase...");

  // 1. Fetch live snags
  let snags = [];
  try {
    const snagsSnap = await getDocs(collection(db, 'snags'));
    snagsSnap.forEach(d => snags.push({ id: d.id, ...d.data() }));
    // Sort descending by timestamp
    snags.sort((a, b) => {
      const ta = a.timestamp?.seconds || 0;
      const tb = b.timestamp?.seconds || 0;
      return tb - ta;
    });
    console.log(`✓ تم جلب ${snags.length} ملاحظة من سجل السناج.`);
  } catch (e) {
    console.error("خطأ في جلب snags:", e.message);
  }

  // 2. Fetch dynamic locations
  const dynLocationsMap = {};
  try {
    const locsSnap = await getDocs(collection(db, 'locations'));
    locsSnap.forEach(d => {
      dynLocationsMap[d.id] = d.data().name || d.id;
    });
    console.log(`✓ تم جلب ${locsSnap.size} موقع إضافي.`);
  } catch (e) {
    console.error("خطأ في جلب locations:", e.message);
  }

  // 3. Fetch park_street_snags
  const parkStreetRecords = {};
  try {
    const psSnap = await getDocs(collection(db, 'park_street_snags'));
    psSnap.forEach(d => {
      parkStreetRecords[d.id] = d.data();
    });
    console.log(`✓ تم جلب ${psSnap.size} بند فحص مسجل لبارك ستريت.`);
  } catch (e) {
    console.error("خطأ في جلب park_street_snags:", e.message);
  }

  // 4. Fetch restroom inspections
  const restroomRecords = {};
  try {
    const rrSnap = await getDocs(collection(db, 'restroom_inspections'));
    rrSnap.forEach(d => {
      restroomRecords[d.id] = d.data();
    });
    console.log(`✓ تم جلب ${rrSnap.size} فحص حمامات مسجل.`);
  } catch (e) {
    console.error("خطأ في جلب restroom_inspections:", e.message);
  }

  // 5. Fetch stores
  const stores = [];
  try {
    const stSnap = await getDocs(collection(db, 'stores'));
    stSnap.forEach(d => stores.push({ id: d.id, ...d.data() }));
    stores.sort((a, b) => String(a.storeNo || '').localeCompare(String(b.storeNo || ''), undefined, { numeric: true }));
    console.log(`✓ تم جلب ${stores.length} مخزن.`);
  } catch (e) {
    console.error("خطأ في جلب stores:", e.message);
  }

  // Lookup helpers
  const resolveLocationName = (locId) => {
    if (!locId) return "—";
    if (dynLocationsMap[locId]) return dynLocationsMap[locId];
    const std = LOCATIONS.find(l => l.id === locId);
    if (std) return std.name;
    return locId;
  };

  const resolveTradeLabel = (tradeId) => {
    if (!tradeId) return "أعمال عامة";
    const tr = TRADES.find(t => t.id === tradeId);
    return tr ? tr.label : tradeId;
  };

  const resolvePriorityLabel = (pri) => {
    if (pri === 'urgent') return "عاجل";
    if (pri === 'medium') return "متوسط";
    if (pri === 'normal') return "عادي";
    return pri || "عادي";
  };

  const resolveStatusLabel = (st) => {
    if (st === 'open') return "مفتوح";
    if (st === 'in-progress') return "قيد التنفيذ";
    if (st === 'closed') return "مغلق";
    return st || "مفتوح";
  };

  const resolveTypeLabel = (ty) => {
    if (ty === 'maintenance') return "صيانة";
    if (ty === 'operations') return "تشغيل";
    if (ty === 'cleanliness') return "نظافة";
    return ty || "صيانة";
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    try {
      if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString('ar-EG');
      if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString('ar-EG');
      const d = new Date(ts);
      return isNaN(d) ? "—" : d.toLocaleString('ar-EG');
    } catch (e) {
      return "—";
    }
  };

  // ── Create Workbook ──────────────────────────────────────────────────────
  console.log("🎨 جاري بناء ملف الإكسيل التطبيقي الشامل وتنسيق الشيتات والفلاتر...");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Park St. Mall Management";
  workbook.lastModifiedBy = "Ahmed Rabie";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color Palette
  const THEME = {
    darkNavy: "FF0A1628",
    headerBlue: "FF0F2B48",
    headerCyan: "FF0891B2",
    accentYellow: "FFF59E0B",
    accentGreen: "FF10B981",
    accentRed: "FFEF4444",
    white: "FFFFFFFF",
    grayBorder: "FFCBD5E1",
    grayDarkBorder: "FF334155",
    zebraRow: "FFF8FAFC",
    zebraRowAlt: "FFF1F5F9",
    kpiCardBg: "FF1E293B",
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 1: 📊 لوحة المؤشرات (Dashboard & KPIs)
  // ──────────────────────────────────────────────────────────────────────────
  const wsDash = workbook.addWorksheet("📊 لوحة المؤشرات", {
    views: [{ rightToLeft: true, showGridLines: true }],
  });
  wsDash.properties.defaultRowHeight = 22;

  // Title Row
  wsDash.mergeCells("B2:I2");
  const dashTitle = wsDash.getCell("B2");
  dashTitle.value = "مول بارك ستريت — منظومة إدارة ومتابعة السناج والصيانة الشاملة (تطبيق الإكسيل البديل)";
  dashTitle.font = { name: "Arial", size: 16, bold: true, color: { argb: THEME.white } };
  dashTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
  dashTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsDash.getRow(2).height = 42;

  // Subtitle Row
  wsDash.mergeCells("B3:I3");
  const dashSub = wsDash.getCell("B3");
  dashSub.value = `تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-EG')} | يحتوي على فلاتر تفاعلية ومعادلات تلقائية وقوائم منسدلة وكافة بيانات الأقسام`;
  dashSub.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } };
  dashSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  dashSub.alignment = { horizontal: "center", vertical: "middle" };
  wsDash.getRow(3).height = 26;

  // KPI Cards Rows (B5..I6)
  const kpis = [
    { label: "إجمالي الملاحظات المسجلة", formula: "=COUNTA('📋 سجل الملاحظات'!A5:A500)", colStart: "B", colEnd: "C", color: "FF38BDF8" },
    { label: "ملاحظات مفتوحة 🔴", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"مفتوح\")", colStart: "D", colEnd: "E", color: "FFEF4444" },
    { label: "قيد التنفيذ 🟡", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"قيد التنفيذ\")", colStart: "F", colEnd: "G", color: "FFF59E0B" },
    { label: "ملاحظات معالجة ومغلقة ✅", formula: "=COUNTIF('📋 سجل الملاحظات'!F5:F500, \"مغلق\")", colStart: "H", colEnd: "I", color: "FF10B981" },
  ];

  kpis.forEach(k => {
    wsDash.mergeCells(`${k.colStart}5:${k.colEnd}5`);
    const valCell = wsDash.getCell(`${k.colStart}5`);
    valCell.value = { formula: k.formula };
    valCell.font = { name: "Arial", size: 22, bold: true, color: { argb: k.color } };
    valCell.alignment = { horizontal: "center", vertical: "middle" };
    valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    valCell.border = { top: { style: "medium", color: { argb: k.color } }, left: { style: "thin", color: { argb: THEME.grayDarkBorder } }, right: { style: "thin", color: { argb: THEME.grayDarkBorder } } };

    wsDash.mergeCells(`${k.colStart}6:${k.colEnd}6`);
    const lblCell = wsDash.getCell(`${k.colStart}6`);
    lblCell.value = k.label;
    lblCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFCBD5E1" } };
    lblCell.alignment = { horizontal: "center", vertical: "middle" };
    lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    lblCell.border = { bottom: { style: "medium", color: { argb: THEME.grayDarkBorder } }, left: { style: "thin", color: { argb: THEME.grayDarkBorder } }, right: { style: "thin", color: { argb: THEME.grayDarkBorder } } };
  });
  wsDash.getRow(5).height = 36;
  wsDash.getRow(6).height = 24;

  // Breakdown Tables:
  // Left: Trades Breakdown (B9..E26)
  wsDash.mergeCells("B9:E9");
  const trTitle = wsDash.getCell("B9");
  trTitle.value = "📊 إحصائيات الملاحظات حسب التخصص / الفئة (محدثة تلقائياً بالمعادلات)";
  trTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } };
  trTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  trTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsDash.getRow(9).height = 28;

  wsDash.getCell("B10").value = "م";
  wsDash.getCell("C10").value = "التخصص / الفئة";
  wsDash.getCell("D10").value = "العدد المسجل";
  wsDash.getCell("E10").value = "النسبة التقريبية";
  ["B10", "C10", "D10", "E10"].forEach(c => {
    const cell = wsDash.getCell(c);
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  wsDash.getRow(10).height = 24;

  let trRow = 11;
  TRADES.forEach((tr, idx) => {
    wsDash.getCell(`B${trRow}`).value = idx + 1;
    wsDash.getCell(`C${trRow}`).value = tr.label;
    wsDash.getCell(`D${trRow}`).value = { formula: `=COUNTIF('📋 سجل الملاحظات'!C$5:C$500, "${tr.label}")` };
    wsDash.getCell(`E${trRow}`).value = { formula: `=IF(D${trRow}>0, TEXT(D${trRow}/B$5, "0.0%"), "0%")` };

    ["B", "C", "D", "E"].forEach(col => {
      const cell = wsDash.getCell(`${col}${trRow}`);
      cell.font = { name: "Arial", size: 10, bold: col === "C" || col === "D" };
      cell.alignment = { horizontal: col === "C" ? "right" : "center", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
      if (trRow % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } };
      }
    });
    wsDash.getRow(trRow).height = 20;
    trRow++;
  });

  // Right Table: Priority & Status Breakdown & App Instructions (F9..I26)
  wsDash.mergeCells("G9:I9");
  const priTitle = wsDash.getCell("G9");
  priTitle.value = "🚨 توزيع الملاحظات حسب الأولوية";
  priTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } };
  priTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
  priTitle.alignment = { horizontal: "center", vertical: "middle" };

  wsDash.getCell("G10").value = "درجة الأولوية";
  wsDash.getCell("H10").value = "العدد";
  wsDash.getCell("I10").value = "المعادلة التلقائية";
  ["G10", "H10", "I10"].forEach(c => {
    const cell = wsDash.getCell(c);
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const priRows = [
    { label: "عاجل", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "عاجل")', color: "FFEF4444" },
    { label: "متوسط", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "متوسط")', color: "FFF59E0B" },
    { label: "عادي", formula: '=COUNTIF(\'📋 سجل الملاحظات\'!E$5:E$500, "عادي")', color: "FF64748B" },
  ];
  priRows.forEach((pr, i) => {
    const r = 11 + i;
    wsDash.getCell(`G${r}`).value = pr.label;
    wsDash.getCell(`H${r}`).value = { formula: pr.formula };
    wsDash.getCell(`I${r}`).value = { formula: `=IF(H${r}>0, TEXT(H${r}/B$5, "0.0%"), "0%")` };
    ["G", "H", "I"].forEach(col => {
      const cell = wsDash.getCell(`${col}${r}`);
      cell.font = { name: "Arial", size: 10, bold: true, color: col === "G" ? { argb: pr.color } : undefined };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
    });
    wsDash.getRow(r).height = 22;
  });

  // Instructions Box (G16..I26)
  wsDash.mergeCells("G16:I16");
  const guideTitle = wsDash.getCell("G16");
  guideTitle.value = "💡 دليل استخدام هذا الشيت كتطبيق عملي بديل";
  guideTitle.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } };
  guideTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
  guideTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsDash.getRow(16).height = 26;

  const instructions = [
    "1. الشيت مفعل به فلاتر ذكية في كل الأعمدة (اضغط سهم الفلتر بالأعلى لفرز أي موقع أو تخصص).",
    "2. شيت '📋 سجل الملاحظات' به قوائم منسدلة لاختيار (الموقع، التخصص، الأولوية، الحالة، النوع).",
    "3. لتسجيل ملاحظة جديدة: انزل لأول سطر فارغ في السجل واكتب الوصف واختر من القوائم.",
    "4. شيت '🌟 فحص بارك ستريت' مقسم لـ 4 قطاعات (الأمن، رحلة العميل، الزراعة، مسار البيزمنت).",
    "5. شيت '🚽 فحص الحمامات' يحتوي حصر الـ 50 حمام والـ 29 مكون مع أرقام وسليم ومعطل.",
    "6. كل شيت يحتوي على أعمدة خاصة بالملاحظات والإجراءات وتواريخ المتابعة والمشرف.",
    "7. المعادلات في هذه اللوحة تتحدث لحظياً فور تعديل أو إضافة أي سطر في السجل.",
  ];

  instructions.forEach((txt, idx) => {
    const r = 17 + idx;
    wsDash.mergeCells(`G${r}:I${r}`);
    const cell = wsDash.getCell(`G${r}`);
    cell.value = txt;
    cell.font = { name: "Arial", size: 9.5, bold: false, color: { argb: "FF0F172A" } };
    cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? "FFF0FDF4" : "FFFFFFFF" } };
    cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
    wsDash.getRow(r).height = 22;
  });

  wsDash.columns = [
    { width: 3 },  // A
    { width: 6 },  // B
    { width: 26 }, // C
    { width: 14 }, // D
    { width: 16 }, // E
    { width: 3 },  // F
    { width: 18 }, // G
    { width: 14 }, // H
    { width: 28 }, // I
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 2: 📋 سجل الملاحظات (Master Snag List)
  // ──────────────────────────────────────────────────────────────────────────
  const wsSnags = workbook.addWorksheet("📋 سجل الملاحظات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });

  // Title Banner
  wsSnags.mergeCells("A1:M1");
  const sTitle = wsSnags.getCell("A1");
  sTitle.value = "PARK ST. MALL | سجل الملاحظات ومتابعة الصيانة الشامل (Master Snag List)";
  sTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
  sTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
  sTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsSnags.getRow(1).height = 32;

  // Subtitle
  wsSnags.mergeCells("A2:M2");
  const sSub = wsSnags.getCell("A2");
  sSub.value = "استخدم فلاتر الأعمدة للتصفية والفرز | استخدم القوائم المنسدلة لاختيار الموقع والتخصص والحالة والأولوية | أضف أي ملاحظات جديدة بالأسفل";
  sSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF38BDF8" } };
  sSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  sSub.alignment = { horizontal: "center", vertical: "middle" };
  wsSnags.getRow(2).height = 22;

  // Blank space row
  wsSnags.getRow(3).height = 6;

  // Column Headers (Row 4)
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
  ];

  const headerRow = wsSnags.getRow(4);
  snagHeaders.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "medium", color: { argb: THEME.darkNavy } }, bottom: { style: "medium", color: { argb: THEME.darkNavy } }, left: { style: "thin", color: { argb: THEME.grayDarkBorder } }, right: { style: "thin", color: { argb: THEME.grayDarkBorder } } };
  });
  headerRow.height = 30;

  // Set AutoFilter on row 4
  wsSnags.autoFilter = {
    from: "A4",
    to: "M4",
  };

  // Define column widths
  wsSnags.columns = [
    { width: 14 }, // كود
    { width: 22 }, // الموقع
    { width: 20 }, // التخصص
    { width: 14 }, // النوع
    { width: 14 }, // الأولوية
    { width: 15 }, // الحالة
    { width: 42 }, // الوصف
    { width: 30 }, // الإجراء المطلوب
    { width: 18 }, // المشرف
    { width: 18 }, // تاريخ الرصد
    { width: 18 }, // تاريخ المعالجة
    { width: 25 }, // ملاحظات المتابعة
    { width: 22 }, // الصورة
  ];

  // List of values for Data Validation
  const locationNamesList = [
    ...LOCATIONS.map(l => l.name),
    ...Object.values(dynLocationsMap),
  ];
  const uniqueLocs = [...new Set(locationNamesList)].join(",");
  const tradesList = TRADES.map(t => t.label).join(",");
  const prioritiesList = "عاجل,متوسط,عادي";
  const statusesList = "مفتوح,قيد التنفيذ,مغلق";
  const typesList = "صيانة,تشغيل,نظافة";

  // Populate Existing 43 Snags
  let curRowIdx = 5;
  for (const s of snags) {
    const row = wsSnags.getRow(curRowIdx);

    const sCode = s.snagId ? String(s.snagId).toUpperCase() : `SNG-${curRowIdx - 4}`;
    const sLoc = resolveLocationName(s.location);
    const sTrade = resolveTradeLabel(s.trade);
    const sType = resolveTypeLabel(s.type);
    const sPri = resolvePriorityLabel(s.priority);
    const sStatus = resolveStatusLabel(s.status);
    const sDesc = s.description || "—";
    const sAction = s.action || (sPri === "عاجل" ? "مطلوب فحص ومعالجة فورية" : "متابعة وإصلاح في خطة الصيانة");
    const sInspector = s.inspector || "مشرف التشغيل";
    const sDateLogged = formatDate(s.timestamp);
    const sDateClosed = sStatus === "مغلق" ? formatDate(s.closedAt || s.timestamp) : "—";
    const sFollowup = s.notes || "";

    row.getCell(1).value = sCode;
    row.getCell(2).value = sLoc;
    row.getCell(3).value = sTrade;
    row.getCell(4).value = sType;
    row.getCell(5).value = sPri;
    row.getCell(6).value = sStatus;
    row.getCell(7).value = sDesc;
    row.getCell(8).value = sAction;
    row.getCell(9).value = sInspector;
    row.getCell(10).value = sDateLogged;
    row.getCell(11).value = sDateClosed;
    row.getCell(12).value = sFollowup;
    row.getCell(13).value = s.attachments?.length ? "" : "لا توجد صورة";

    // Styling
    const statusBg =
      sStatus === "مفتوح" ? "FFFEE2E2" :
      sStatus === "قيد التنفيذ" ? "FFFEF3C7" :
      sStatus === "مغلق" ? "FFD1FAE5" : "FFFFFFFF";

    const priColor = sPri === "عاجل" ? "FFB91C1C" : sPri === "متوسط" ? "FFB45309" : "FF334155";

    for (let c = 1; c <= 13; c++) {
      const cell = row.getCell(c);
      cell.font = {
        name: "Arial",
        size: 10,
        bold: c === 1 || c === 5 || c === 6,
        color: c === 5 ? { argb: priColor } : c === 6 && sStatus === "مفتوح" ? { argb: "FFB91C1C" } : c === 6 && sStatus === "مغلق" ? { argb: "FF047857" } : undefined,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: c === 6 ? statusBg : curRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white },
      };
      cell.alignment = {
        horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin", color: { argb: THEME.grayBorder } },
        bottom: { style: "thin", color: { argb: THEME.grayBorder } },
        left: { style: "thin", color: { argb: THEME.grayBorder } },
        right: { style: "thin", color: { argb: THEME.grayBorder } },
      };

      // Set Dropdown Validations on editable columns
      if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${uniqueLocs.slice(0, 240)}"`] };
      if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${tradesList.slice(0, 240)}"`] };
      if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${typesList}"`] };
      if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${prioritiesList}"`] };
      if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${statusesList}"`] };
    }

    // Embed Image if exists
    const firstImg = s.attachments?.find(a => a.dataUrl && a.dataUrl.startsWith("data:image"));
    if (firstImg) {
      row.height = 75;
      try {
        const base64Data = firstImg.dataUrl.split(",")[1];
        const imgId = workbook.addImage({
          base64: base64Data,
          extension: "jpeg",
        });
        wsSnags.addImage(imgId, {
          tl: { col: 12.15, row: curRowIdx - 1 + 0.08 },
          ext: { width: 95, height: 65 },
        });
      } catch (err) {
        console.warn("Could not embed image for row", curRowIdx, err.message);
      }
    } else {
      row.height = 26;
    }

    curRowIdx++;
  }

  // Add 100 Pre-formatted Empty Rows with Data Validations ready for new inputs!
  for (let i = 0; i < 100; i++) {
    const row = wsSnags.getRow(curRowIdx);
    row.getCell(1).value = `SNG-NEW-${i + 1}`;
    row.getCell(4).value = "صيانة";
    row.getCell(5).value = "متوسط";
    row.getCell(6).value = "مفتوح";
    row.getCell(9).value = "مشرف التشغيل";
    row.getCell(10).value = new Date().toLocaleDateString('ar-EG');
    row.height = 24;

    for (let c = 1; c <= 13; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 10, color: { argb: "FF475569" } };
      cell.alignment = {
        horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center",
        vertical: "middle",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (curRowIdx % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } };
      }

      if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${uniqueLocs.slice(0, 240)}"`] };
      if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${tradesList.slice(0, 240)}"`] };
      if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${typesList}"`] };
      if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${prioritiesList}"`] };
      if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${statusesList}"`] };
    }

    curRowIdx++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 3: 🌟 فحص بارك ستريت (Park Street Checklist)
  // ──────────────────────────────────────────────────────────────────────────
  const wsPark = workbook.addWorksheet("🌟 فحص بارك ستريت", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });

  wsPark.mergeCells("A1:J1");
  const pTitle = wsPark.getCell("A1");
  pTitle.value = "مول بارك ستريت — فحص القطاعات الشاملة (الأمن • رحلة العميل • الزراعة واللاندسكيب • مسار السيارات بالبيزمنت)";
  pTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
  pTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4C1D95" } };
  pTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsPark.getRow(1).height = 32;

  wsPark.mergeCells("A2:J2");
  const pSub = wsPark.getCell("A2");
  pSub.value = "فحص ومعايير الجودة والتشغيل | فلترة بحسب القطاع أو المنطقة أو المعيار | اختر الحالة: سليم ✅ / ملاحظة أو عطل 🔴 / يحتاج متابعة 🟡";
  pSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFC4B5FD" } };
  pSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E1065" } };
  pSub.alignment = { horizontal: "center", vertical: "middle" };
  wsPark.getRow(2).height = 22;

  wsPark.getRow(3).height = 6;

  const parkHeaders = [
    "القطاع الرئيسي",
    "كود المنطقة",
    "المنطقة / المسار الفرعي",
    "بند الفحص والمعيار التشغيلي",
    "الفئة الفرعية",
    "الحالة التشغيلية",
    "تفاصيل الملاحظة والإجراء المطلوب",
    "المشرف المسؤول",
    "تاريخ آخر فحص",
    "الصورة الموثقة (مدمجة)",
  ];

  const pHeaderRow = wsPark.getRow(4);
  parkHeaders.forEach((h, i) => {
    const c = pHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF581C87" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  pHeaderRow.height = 30;

  wsPark.autoFilter = { from: "A4", to: "J4" };
  wsPark.columns = [
    { width: 22 }, // القطاع
    { width: 14 }, // الكود
    { width: 30 }, // المنطقة
    { width: 42 }, // البند
    { width: 18 }, // الفئة
    { width: 18 }, // الحالة
    { width: 40 }, // الملاحظات
    { width: 18 }, // المشرف
    { width: 18 }, // التاريخ
    { width: 20 }, // الصورة
  ];

  let pRowIdx = 5;
  for (const sec of PARK_SECTORS) {
    for (const zone of sec.zones) {
      for (const item of zone.items) {
        const key = `${sec.id}__${zone.id}__${item.id}`;
        const rec = parkStreetRecords[key] || {};

        let statusText = "لم يُفحص ⚪";
        if (rec.status === "ok") statusText = "سليم ✅";
        else if (rec.status === "snag") statusText = "ملاحظة / عطل 🔴";
        else if (rec.status === "followup") statusText = "يحتاج متابعة 🟡";

        const pRow = wsPark.getRow(pRowIdx);
        pRow.getCell(1).value = sec.name;
        pRow.getCell(2).value = zone.code;
        pRow.getCell(3).value = zone.title;
        pRow.getCell(4).value = item.name;
        pRow.getCell(5).value = item.category;
        pRow.getCell(6).value = statusText;
        pRow.getCell(7).value = rec.note || "—";
        pRow.getCell(8).value = rec.updatedBy || "مشرف بارك ستريت";
        pRow.getCell(9).value = rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('ar-EG') : "—";
        pRow.getCell(10).value = rec.photos?.length ? "" : "لا توجد صورة";

        const stBg =
          rec.status === "snag" ? "FFFEE2E2" :
          rec.status === "followup" ? "FFFEF3C7" :
          rec.status === "ok" ? "FFD1FAE5" : "FFFFFFFF";

        for (let c = 1; c <= 10; c++) {
          const cell = pRow.getCell(c);
          cell.font = {
            name: "Arial",
            size: 10,
            bold: c === 1 || c === 4 || c === 6,
            color: c === 6 && rec.status === "snag" ? { argb: "FFB91C1C" } : c === 6 && rec.status === "ok" ? { argb: "FF047857" } : undefined,
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: c === 6 ? stBg : pRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white },
          };
          cell.alignment = {
            horizontal: c === 3 || c === 4 || c === 7 ? "right" : "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: THEME.grayBorder } },
            bottom: { style: "thin", color: { argb: THEME.grayBorder } },
            left: { style: "thin", color: { argb: THEME.grayBorder } },
            right: { style: "thin", color: { argb: THEME.grayBorder } },
          };

          if (c === 6) {
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"سليم ✅,ملاحظة / عطل 🔴,يحتاج متابعة 🟡,لم يُفحص ⚪"'],
            };
          }
        }

        const pPhoto = rec.photos?.find(p => p.dataUrl && p.dataUrl.startsWith("data:image"));
        if (pPhoto) {
          pRow.height = 70;
          try {
            const b64 = pPhoto.dataUrl.split(",")[1];
            const imgId = workbook.addImage({ base64: b64, extension: "jpeg" });
            wsPark.addImage(imgId, {
              tl: { col: 9.15, row: pRowIdx - 1 + 0.08 },
              ext: { width: 90, height: 60 },
            });
          } catch (e) {
            console.warn("Could not embed image in park st sheet:", e.message);
          }
        } else {
          pRow.height = 26;
        }

        pRowIdx++;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 4: 🚽 فحص الحمامات (Restroom Matrix)
  // ──────────────────────────────────────────────────────────────────────────
  const wsRest = workbook.addWorksheet("🚽 فحص الحمامات", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });

  wsRest.mergeCells("A1:N1");
  const rTitle = wsRest.getCell("A1");
  rTitle.value = "مول بارك ستريت — مركز متابعة وفحص الحمامات الفني وحصر المكونات (50 حمام × 29 مكون)";
  rTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
  rTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF065F46" } };
  rTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsRest.getRow(1).height = 32;

  wsRest.mergeCells("A2:N2");
  const rSub = wsRest.getCell("A2");
  rSub.value = "فلترة شاملة لكافة الحمامات والمكونات والأعطال | فلاتر بالمبنى والطابق والنوع والتخصص والحالة";
  rSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFA7F3D0" } };
  rSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
  rSub.alignment = { horizontal: "center", vertical: "middle" };
  wsRest.getRow(2).height = 22;
  wsRest.getRow(3).height = 6;

  const restHeaders = [
    "المبنى / المنطقة",
    "الاتجاه",
    "الطابق",
    "النوع",
    "كود الحمام",
    "اسم المكون / المعيار الفني",
    "التخصص",
    "إجمالي العدد",
    "العدد السليم",
    "العدد المعطل",
    "العدد المفقود",
    "الحالة العامة",
    "الملاحظات والتفاصيل الفنية",
    "المشرف وتاريخ الفحص",
  ];

  const rHeaderRow = wsRest.getRow(4);
  restHeaders.forEach((h, i) => {
    const c = rHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  rHeaderRow.height = 30;

  wsRest.autoFilter = { from: "A4", to: "N4" };
  wsRest.columns = [
    { width: 16 }, // المبنى
    { width: 14 }, // الاتجاه
    { width: 14 }, // الطابق
    { width: 12 }, // النوع
    { width: 22 }, // الكود
    { width: 30 }, // المكون
    { width: 16 }, // التخصص
    { width: 12 }, // الاجمالي
    { width: 12 }, // السليم
    { width: 12 }, // المعطل
    { width: 12 }, // المفقود
    { width: 16 }, // الحالة
    { width: 36 }, // الملاحظات
    { width: 22 }, // المشرف والتاريخ
  ];

  let rRowIdx = 5;
  for (const loc of RESTROOM_LOCATIONS) {
    for (const comp of STANDARD_COMPONENTS) {
      const docKey = `${loc.restroomKey}__${comp.code}`;
      const rec = restroomRecords[docKey] || {};

      let health = "لم يُفحص ⚪";
      if (rec.defectiveCount > 0 || rec.missingCount > 0) health = "يوجد عطل / نقص 🔴";
      else if (rec.workingCount !== undefined && rec.workingCount !== null && rec.workingCount !== "") health = "سليم ومطابق ✅";

      const rRow = wsRest.getRow(rRowIdx);
      rRow.getCell(1).value = loc.building;
      rRow.getCell(2).value = loc.direction;
      rRow.getCell(3).value = loc.floor;
      rRow.getCell(4).value = loc.gender;
      rRow.getCell(5).value = loc.restroomKey;
      rRow.getCell(6).value = comp.component;
      rRow.getCell(7).value = comp.trade;
      rRow.getCell(8).value = rec.totalCount ?? "—";
      rRow.getCell(9).value = rec.workingCount ?? "—";
      rRow.getCell(10).value = rec.defectiveCount ?? "—";
      rRow.getCell(11).value = rec.missingCount ?? "—";
      rRow.getCell(12).value = health;
      rRow.getCell(13).value = rec.notes || "—";
      rRow.getCell(14).value = rec.inspector ? `${rec.inspector} (${rec.inspectDate || '—'})` : "—";

      const hBg = health.includes("عطل") ? "FFFEE2E2" : health.includes("سليم") ? "FFD1FAE5" : "FFFFFFFF";

      for (let c = 1; c <= 14; c++) {
        const cell = rRow.getCell(c);
        cell.font = {
          name: "Arial",
          size: 9.5,
          bold: c === 5 || c === 6 || c === 12,
          color: c === 12 && health.includes("عطل") ? { argb: "FFB91C1C" } : c === 12 && health.includes("سليم") ? { argb: "FF047857" } : undefined,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: c === 12 ? hBg : rRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white },
        };
        cell.alignment = {
          horizontal: c === 6 || c === 13 ? "right" : "center",
          vertical: "middle",
        };
        cell.border = {
          top: { style: "thin", color: { argb: THEME.grayBorder } },
          bottom: { style: "thin", color: { argb: THEME.grayBorder } },
          left: { style: "thin", color: { argb: THEME.grayBorder } },
          right: { style: "thin", color: { argb: THEME.grayBorder } },
        };

        if (c === 12) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"سليم ومطابق ✅,يوجد عطل / نقص 🔴,لم يُفحص ⚪"'],
          };
        }
      }
      rRow.height = 22;
      rRowIdx++;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 5: 📦 بيانات وحصر المخازن (Stores Data)
  // ──────────────────────────────────────────────────────────────────────────
  const wsStores = workbook.addWorksheet("📦 بيانات المخازن", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });

  wsStores.mergeCells("A1:D1");
  const stTitle = wsStores.getCell("A1");
  stTitle.value = "مول بارك ستريت — حصر وبيانات المخازن والشركات المستأجرة (90 مخزن)";
  stTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
  stTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } };
  stTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsStores.getRow(1).height = 30;

  wsStores.mergeCells("A2:D2");
  const stSub = wsStores.getCell("A2");
  stSub.value = "حصر أرقام المخازن والجهات التابعة لها وملاحظات التشغيل";
  stSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFEF3C7" } };
  stSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
  stSub.alignment = { horizontal: "center", vertical: "middle" };
  wsStores.getRow(2).height = 20;
  wsStores.getRow(3).height = 6;

  const stHeaders = ["رقم المخزن (Store No)", "الشركة / الجهة / التخصيص", "الملاحظات وتفاصيل الاستخدام", "تاريخ الرصد والتوثيق"];
  const stHeaderRow = wsStores.getRow(4);
  stHeaders.forEach((h, i) => {
    const c = stHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  stHeaderRow.height = 28;
  wsStores.autoFilter = { from: "A4", to: "D4" };
  wsStores.columns = [{ width: 22 }, { width: 42 }, { width: 46 }, { width: 22 }];

  let stRowIdx = 5;
  for (const store of stores) {
    const row = wsStores.getRow(stRowIdx);
    row.getCell(1).value = store.storeNo || "—";
    row.getCell(2).value = store.companyName || "—";
    row.getCell(3).value = store.notes || "—";
    row.getCell(4).value = formatDate(store.timestamp);

    for (let c = 1; c <= 4; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Arial", size: 10, bold: c === 1 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stRowIdx % 2 === 0 ? THEME.zebraRow : THEME.white } };
      cell.alignment = { horizontal: c === 1 || c === 4 ? "center" : "right", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
    }
    row.height = 22;
    stRowIdx++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SHEET 6: ⚙️ دليل القوائم والمرجع (Lookups)
  // ──────────────────────────────────────────────────────────────────────────
  const wsLookups = workbook.addWorksheet("⚙️ دليل القوائم والمرجع", {
    views: [{ rightToLeft: true }],
  });

  wsLookups.mergeCells("A1:F1");
  const lTitle = wsLookups.getCell("A1");
  lTitle.value = "دليل القوائم والمرجع الموحد لتغذية القوائم المنسدلة والخيارات في الإكسيل";
  lTitle.font = { name: "Arial", size: 13, bold: true, color: { argb: THEME.white } };
  lTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
  lTitle.alignment = { horizontal: "center", vertical: "middle" };
  wsLookups.getRow(1).height = 28;

  const lHeaders = ["قائمة المواقع", "قائمة التخصصات", "قائمة الأولويات", "قائمة الحالات", "قائمة أنواع الملاحظة", "مشرفو الفحص"];
  const lHeaderRow = wsLookups.getRow(3);
  lHeaders.forEach((h, i) => {
    const c = lHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });
  lHeaderRow.height = 24;

  const maxRows = Math.max(locationNamesList.length, TRADES.length, 10);
  for (let i = 0; i < maxRows; i++) {
    const r = wsLookups.getRow(4 + i);
    r.getCell(1).value = locationNamesList[i] || "";
    r.getCell(2).value = TRADES[i]?.label || "";
    r.getCell(3).value = ["عاجل", "متوسط", "عادي"][i] || "";
    r.getCell(4).value = ["مفتوح", "قيد التنفيذ", "مغلق"][i] || "";
    r.getCell(5).value = ["صيانة", "تشغيل", "نظافة"][i] || "";
    r.getCell(6).value = ["احمد ربيع", "مشرف بارك ستريت", "مشرف الكهرباء", "مشرف السباكة", "مشرف التكييف", "مشرف الأمن"][i] || "";

    for (let c = 1; c <= 6; c++) {
      const cell = r.getCell(c);
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } };
    }
    r.height = 20;
  }
  wsLookups.columns = [{ width: 28 }, { width: 26 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 22 }];

  // ── Save Workbook ────────────────────────────────────────────────────────
  const fileName = "سجل_سناج_بارك_ستريت_التطبيقي_الشامل_2026.xlsx";
  const outputPathRoot = path.resolve(`D:/Ahmed Rabie/snag-app-firebase/${fileName}`);
  const outputPathDesktop = `C:/Users/ahmed_rabie/Desktop/${fileName}`;

  console.log(`💾 جاري حفظ ملف الإكسيل في المسار: ${outputPathRoot}`);
  await workbook.xlsx.writeFile(outputPathRoot);
  console.log(`✅ تم حفظ الملف بنجاح في مجلد المشروع!`);

  try {
    fs.copyFileSync(outputPathRoot, outputPathDesktop);
    console.log(`✅ تم نسخ الملف بنجاح إلى سطح المكتب: ${outputPathDesktop}`);
  } catch (copyErr) {
    console.warn("تنبيه عند النسخ لسطح المكتب:", copyErr.message);
  }

  console.log("🎉 اكتمل إنشاء وتجهيز تطبيق الإكسيل الشامل بنجاح!");
}

generateMasterExcelApp().catch(err => {
  console.error("❌ خطأ أثناء توليد ملف الإكسيل:", err);
  process.exit(1);
});
