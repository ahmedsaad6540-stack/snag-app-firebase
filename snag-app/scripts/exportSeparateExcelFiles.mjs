import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

// Global Themes & Styles
const THEME = {
  darkNavy: "FF0A1628",
  headerBlue: "FF1E3A8A",
  headerPurple: "FF4C1D95",
  headerGreen: "FF065F46",
  headerAmber: "FFB45309",
  headerSlate: "FF334155",
  accentYellow: "FFF59E0B",
  accentGreen: "FF10B981",
  accentRed: "FFEF4444",
  white: "FFFFFFFF",
  grayBorder: "FFCBD5E1",
  zebraRow: "FFF8FAFC",
  zebraRowAlt: "FFF1F5F9",
};

async function main() {
  console.log("⏳ 1/6 جاري جلب البيانات من Firebase...");

  // 1. Fetch live snags
  let snags = [];
  try {
    const snagsSnap = await getDocs(collection(db, 'snags'));
    snagsSnap.forEach(d => snags.push({ id: d.id, ...d.data() }));
    snags.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    console.log(`✓ تم جلب ${snags.length} ملاحظة من سجل السناج.`);
  } catch (e) {
    console.error("خطأ snags:", e.message);
  }

  // 2. Fetch dynamic locations
  const dynLocationsMap = {};
  try {
    const locsSnap = await getDocs(collection(db, 'locations'));
    locsSnap.forEach(d => { dynLocationsMap[d.id] = d.data().name || d.id; });
  } catch (e) {
    console.error("خطأ locations:", e.message);
  }

  // 3. Fetch park_street_snags
  const parkStreetRecords = {};
  try {
    const psSnap = await getDocs(collection(db, 'park_street_snags'));
    psSnap.forEach(d => { parkStreetRecords[d.id] = d.data(); });
  } catch (e) {}

  // 4. Fetch restroom inspections
  const restroomRecords = {};
  try {
    const rrSnap = await getDocs(collection(db, 'restroom_inspections'));
    rrSnap.forEach(d => { restroomRecords[d.id] = d.data(); });
  } catch (e) {}

  // 5. Fetch stores
  const stores = [];
  try {
    const stSnap = await getDocs(collection(db, 'stores'));
    stSnap.forEach(d => stores.push({ id: d.id, ...d.data() }));
    stores.sort((a, b) => String(a.storeNo || '').localeCompare(String(b.storeNo || ''), undefined, { numeric: true }));
  } catch (e) {}

  // Helpers
  const resolveLocationName = (locId) => {
    if (!locId) return "—";
    if (dynLocationsMap[locId]) return dynLocationsMap[locId];
    const std = LOCATIONS.find(l => l.id === locId);
    return std ? std.name : locId;
  };
  const resolveTradeLabel = (tradeId) => {
    if (!tradeId) return "أعمال عامة";
    const tr = TRADES.find(t => t.id === tradeId);
    return tr ? tr.label : tradeId;
  };
  const resolvePriorityLabel = (pri) => {
    if (pri === 'urgent') return "عاجل";
    if (pri === 'medium') return "متوسط";
    return "عادي";
  };
  const resolveStatusLabel = (st) => {
    if (st === 'open') return "مفتوح";
    if (st === 'in-progress') return "قيد التنفيذ";
    if (st === 'closed') return "مغلق";
    return st || "مفتوح";
  };
  const resolveTypeLabel = (ty) => {
    if (ty === 'operations') return "تشغيل";
    if (ty === 'cleanliness') return "نظافة";
    return "صيانة";
  };
  const formatDate = (ts) => {
    if (!ts) return "—";
    try {
      if (typeof ts.toDate === 'function') return ts.toDate().toLocaleString('ar-EG');
      if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString('ar-EG');
      const d = new Date(ts);
      return isNaN(d) ? "—" : d.toLocaleString('ar-EG');
    } catch {
      return "—";
    }
  };

  // Directories setup
  const rootDir = "D:/Ahmed Rabie/snag-app-firebase";
  const desktopDir = "C:/Users/ahmed_rabie/Desktop";
  const desktopFolder = path.join(desktopDir, "ملفات_سناج_بارك_ستريت_المستقلة_2026");
  if (!fs.existsSync(desktopFolder)) {
    fs.mkdirSync(desktopFolder, { recursive: true });
  }

  async function saveFile(wb, baseFileName) {
    const fullFileName = `${baseFileName}.xlsx`;
    const pRoot = path.join(rootDir, fullFileName);
    const pDesktopRoot = path.join(desktopDir, fullFileName);
    const pDesktopFolder = path.join(desktopFolder, fullFileName);

    await wb.xlsx.writeFile(pRoot);
    try { fs.copyFileSync(pRoot, pDesktopRoot); } catch {}
    try { fs.copyFileSync(pRoot, pDesktopFolder); } catch {}
    console.log(`  ✅ تم حفظ: ${fullFileName}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 1: 01_سجل_ملاحظات_المباني_والممرات_التفصيلي.xlsx
  // التقسيم الدقيق زي شيت الحمامات: المبنى، الجهة، الدور، سلم 1 وسلالم 2 وطرقة الخدمات وممر الوحدات وكافة المكونات
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🏢 2/6 جاري بناء ملف 01: سجل ملاحظات المباني والممرات التفصيلي + لوحة المؤشرات التفاعلية المدمجة...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    // الشيت الأول: لوحة المؤشرات التفاعلية (Dashboard)
    const wsDash = wb.addWorksheet("لوحة المؤشرات التفاعلية", {
      views: [{ rightToLeft: true, showGridLines: true }],
    });

    // الشيت الثاني: فحص المباني والممرات التفصيلي (Inspection Matrix)
    const ws = wb.addWorksheet("فحص المباني والممرات", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    });

    // Setup ws headers & columns
    ws.mergeCells("A1:N1");
    const tCell = ws.getCell("A1");
    tCell.value = "مول بارك ستريت — سجل الفحص الهندسي وتفاصيل المباني والممرات والسلالم (Architecture & Floor Inspection Matrix)";
    tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 34;

    ws.mergeCells("A2:N2");
    const sCell = ws.getCell("A2");
    sCell.value = "مقسم بالكامل وفق مواقع شيت الحمامات الحقيقية لمول بارك ستريت (المبنى • الجهة • الدور • المكان التفصيلي • المعايير الـ 13) | فلاتر تفاعلية وقوائم منسدلة";
    sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF38BDF8" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 6;

    const headers = [
      "كود البند",
      "المبنى",
      "الجهة / الجناح",
      "الدور / الطابق",
      "المكان التفصيلي",
      "المكون / بند الفحص",
      "التخصص الفني",
      "الحالة التشغيلية",
      "درجة الأولوية",
      "نوع الملاحظة",
      "تفاصيل الملاحظة والإجراء المطلوب",
      "المشرف المسؤول",
      "تاريخ الرصد / الفحص",
      "الصورة الموثقة (مدمجة)",
    ];

    const hRow = ws.getRow(4);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    hRow.height = 30;
    ws.autoFilter = { from: "A4", to: "N4" };

    ws.columns = [
      { width: 18 }, // كود
      { width: 16 }, // المبنى
      { width: 22 }, // الجهة
      { width: 14 }, // الدور
      { width: 24 }, // المكان التفصيلي
      { width: 34 }, // المكون
      { width: 18 }, // التخصص
      { width: 18 }, // الحالة
      { width: 14 }, // الأولوية
      { width: 14 }, // النوع
      { width: 42 }, // الملاحظات
      { width: 18 }, // المشرف
      { width: 18 }, // التاريخ
      { width: 22 }, // الصورة
    ];

    // Building Specs matching Restroom locations & architecture
    const BUILDING_SPECS = [
      {
        id: "b1",
        name: "مبنى 1",
        wings: [
          {
            name: "اتجاه راميدا",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث", "الدور الرابع", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          },
          {
            name: "Sky القديمة / Art of form",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث", "الدور الرابع", "الدور الخامس", "الدور السادس", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          }
        ]
      },
      {
        id: "b2",
        name: "مبنى 2",
        wings: [
          {
            name: "اتجاه العيادات",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث", "الدور الرابع", "الدور الخامس", "الدور السادس", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          },
          {
            name: "اتجاه المكاتب",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "الدور الثالث", "الدور الرابع", "الدور الخامس", "الدور السادس", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 3",
              "سلم طوارئ 4",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          }
        ]
      },
      {
        id: "b3",
        name: "مبنى 3",
        wings: [
          {
            name: "ريتشارد",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          },
          {
            name: "ناحية البنك العربي",
            floors: ["الدور الأرضي", "الدور الأول", "الدور الثاني", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          },
          {
            name: "ناحية مستر ايمن",
            floors: ["الدور الثالث", "الدور الرابع", "الدور الخامس", "الدور السادس", "السطح والخدمات"],
            subLocations: [
              "سلم طوارئ 1",
              "سلم طوارئ 2",
              "طرقة الخدمات",
              "ممر الدور الخاص بالوحدات",
            ]
          },
          {
            name: "المصلى",
            floors: ["دور المصلى", "السطح والخدمات"],
            subLocations: [
              "مدخل المصلى والممر الرئيسي",
              "طرقة الخدمات والوضوء",
              "سلم الطوارئ",
            ]
          }
        ]
      },
      {
        id: "b_plaza",
        name: "البلازا والمنطقة المركزية",
        wings: [
          {
            name: "بلازا 1",
            floors: ["العام"],
            subLocations: [
              "الممشى الرئيسي للزوار (بلازا 1)",
              "منطقة مقاعد واستراحات الزوار (بلازا 1)",
              "مداخل المباني (بلازا 1)",
              "السلالم والمصاعد البانورامية (بلازا 1)",
            ]
          },
          {
            name: "بلازا 3",
            floors: ["العام"],
            subLocations: [
              "الممشى الرئيسي للزوار (بلازا 3)",
              "منطقة مقاعد واستراحات الزوار (بلازا 3)",
              "مداخل المباني (بلازا 3)",
              "السلالم والمصاعد البانورامية (بلازا 3)",
            ]
          }
        ]
      },
      {
        id: "b_basement",
        name: "البيزمنت والجراج",
        wings: [
          {
            name: "بيزمنت 1 (B1)",
            floors: ["العام"],
            subLocations: [
              "مسار السيارات الرئيسي (B1)",
              "منحدر الدخول والخروج (Ramp B1)",
              "مداخل مصاعد الركاب والخدمات (B1)",
              "سلالم الطوارئ ومخارج الهروب (B1)",
            ]
          },
          {
            name: "بيزمنت 2 (B2)",
            floors: ["العام"],
            subLocations: [
              "مسار السيارات الرئيسي (B2)",
              "منحدر النزول والصعود (Ramp B2)",
              "مداخل مصاعد الركاب والخدمات (B2)",
              "سلالم الطوارئ ومخارج الهروب (B2)",
            ]
          }
        ]
      },
      {
        id: "b_lmd",
        name: "مبنى LMD",
        wings: [
          {
            name: "مبنى LMD",
            floors: ["العام"],
            subLocations: [
              "المدخل الرئيسي واللوبي",
              "ممرات الأدوار الخاصة بالوحدات",
              "طرقة الخدمات ومخارج الهروب",
              "سلالم الطوارئ",
            ]
          }
        ]
      },
      {
        id: "b_mosque",
        name: "المسجد",
        wings: [
          {
            name: "مبنى ومحيط المسجد",
            floors: ["العام"],
            subLocations: [
              "قاعة الصلاة والمدخل الرئيسي",
              "الممرات الخارجية ومحيط المسجد",
              "أماكن الوضوء والمداخل",
              "سلالم الطوارئ والخدمات",
            ]
          }
        ]
      }
    ];

    const STANDARD_FLOOR_COMPONENTS = [
      { name: "الحوائط والدهانات والتشطيبات", trade: "دهانات", defaultType: "صيانة" },
      { name: "سبوتات الإنارة وكشافات السقف وكشافات الطوارئ", trade: "كهرباء", defaultType: "صيانة" },
      { name: "أفياش ومقابس ومفاتيح الكهرباء", trade: "كهرباء", defaultType: "صيانة" },
      { name: "التكييف وجريليات التهوية والدكت", trade: "تكييف وتهوية", defaultType: "صيانة" },
      { name: "الأبواب والمقابض والمفصلات ومغاليق الطوارئ", trade: "نجارة", defaultType: "صيانة" },
      { name: "العلامات الإرشادية واللوحات المضيئة ومخارج الهروب", trade: "أعمال عامة", defaultType: "تشغيل" },
      { name: "الأرضيات والسيراميك والرخام والوزرات", trade: "حوائط وبلاط", defaultType: "صيانة" },
      { name: "كباين الحريق والخراطيم والرشاشات والطَفايات", trade: "أنظمة إطفاء", defaultType: "تشغيل" },
      { name: "الأسقف المعلقة وبلاطات الجبس بورد", trade: "جبس بورد", defaultType: "صيانة" },
      { name: "لوحات الكهرباء الفرعية والرايزرات", trade: "كهرباء", defaultType: "تشغيل" },
      { name: "كاميرات المراقبة وحساسات الحركة", trade: "الأمن والمراقبة والحراسة", defaultType: "تشغيل" },
      { name: "درج السلالم والدرابزين ومضادات الانزلاق", trade: "أعمال مدنية", defaultType: "صيانة" },
      { name: "النظافة العامة وخلو المسار من أي عوائق أو تشوينات", trade: "نظافة ومكافحة حشرات", defaultType: "نظافة" },
    ];

    let rowIdx = 5;
    const usedSnagIds = new Set();

    // Map each live snag ONCE to the most appropriate row
    const findLiveSnagMatch = (bName, wingName, floor, subLoc, compName, compTrade) => {
      const match = snags.find(s => {
        if (usedSnagIds.has(s.id)) return false;
        const desc = (s.description || "").toLowerCase();
        const loc = resolveLocationName(s.location).toLowerCase();

        const bMatch =
          loc.includes(bName.toLowerCase()) ||
          desc.includes(bName.toLowerCase()) ||
          (bName === "مبنى 1" && (loc.includes("واحد") || desc.includes("واحد"))) ||
          (bName === "مبنى 2" && (loc.includes("اثنين") || desc.includes("اثنين"))) ||
          (bName === "مبنى 3" && (loc.includes("ثلاثة") || desc.includes("ثلاثة") || loc.includes("ريتشارد") || desc.includes("ريتشارد"))) ||
          (bName.includes("بيزمنت") && (loc.includes("garage") || desc.includes("بيزمنت") || desc.includes("جراج"))) ||
          (bName.includes("البلازا") && (loc.includes("plaza") || desc.includes("بلازا") || loc.includes("جزيره") || desc.includes("نافوره"))) ||
          (bName.includes("LMD") && (loc.includes("lmd") || desc.includes("lmd") || desc.includes("ال ام دي")));

        if (!bMatch) return false;

        const trLabel = resolveTradeLabel(s.trade);
        const tradeMatch = trLabel === compTrade || desc.includes(compTrade.toLowerCase());
        const compMatch = desc.includes(compName.slice(0, 5).toLowerCase());

        return tradeMatch || compMatch;
      });

      if (match) {
        usedSnagIds.add(match.id);
        return match;
      }
      return null;
    };

    let countSleem = 0;
    let countSnags = 0;
    let countFollowup = 0;
    let countUrgent = 0;

    for (const bldg of BUILDING_SPECS) {
      for (const wing of bldg.wings) {
        for (const fl of wing.floors) {
          for (const sub of wing.subLocations) {
            for (const comp of STANDARD_FLOOR_COMPONENTS) {
              const row = ws.getRow(rowIdx);
              const itemCode = `${bldg.id.toUpperCase()}-${fl === 'العام' ? 'GEN' : fl.slice(5, 10)}-${sub.slice(0, 4)}-${comp.name.slice(0, 4)}`.replace(/\s+/g, '');

              const liveSnag = findLiveSnagMatch(bldg.name, wing.name, fl, sub, comp.name, comp.trade);
              const statusVal = liveSnag ? "ملاحظة أو عطل 🔴" : "سليم ومطابق ✅";
              const priVal = liveSnag ? resolvePriorityLabel(liveSnag.priority) : "عادي";
              const noteVal = liveSnag ? liveSnag.description : "—";
              const inspVal = liveSnag ? liveSnag.inspector : "مشرف التشغيل";
              const dateVal = liveSnag ? formatDate(liveSnag.timestamp) : new Date().toLocaleDateString('ar-EG');

              if (statusVal.includes("عطل")) {
                countSnags++;
                if (priVal === "عاجل") countUrgent++;
              } else {
                countSleem++;
              }

              row.getCell(1).value = itemCode;
              row.getCell(2).value = bldg.name;
              row.getCell(3).value = wing.name;
              row.getCell(4).value = fl;
              row.getCell(5).value = sub;
              row.getCell(6).value = comp.name;
              row.getCell(7).value = comp.trade;
              row.getCell(8).value = statusVal;
              row.getCell(9).value = priVal;
              row.getCell(10).value = comp.defaultType;
              row.getCell(11).value = noteVal;
              row.getCell(12).value = inspVal;
              row.getCell(13).value = dateVal;
              row.getCell(14).value = liveSnag?.attachments?.length ? "مرفق بالصورة" : "لا توجد صورة";

              const stColor = statusVal.includes("عطل") ? "FFFEE2E2" : "FFD1FAE5";

              for (let c = 1; c <= 14; c++) {
                const cell = row.getCell(c);
                cell.font = {
                  name: "Arial",
                  size: 9.5,
                  bold: c === 1 || c === 2 || c === 6 || c === 8,
                  color: c === 8 && statusVal.includes("عطل") ? { argb: "FFB91C1C" } : c === 8 && statusVal.includes("سليم") ? { argb: "FF047857" } : undefined,
                };
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: c === 8 ? stColor : rowIdx % 2 === 0 ? THEME.zebraRow : THEME.white },
                };
                cell.alignment = {
                  horizontal: c === 6 || c === 11 ? "right" : "center",
                  vertical: "middle",
                  wrapText: true,
                };
                cell.border = {
                  top: { style: "thin", color: { argb: THEME.grayBorder } },
                  bottom: { style: "thin", color: { argb: THEME.grayBorder } },
                  left: { style: "thin", color: { argb: THEME.grayBorder } },
                  right: { style: "thin", color: { argb: THEME.grayBorder } },
                };

                // Data Validations
                if (c === 8) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"سليم ومطابق ✅,ملاحظة أو عطل 🔴,يحتاج متابعة 🟡,لم يُفحص ⚪"'] };
                if (c === 9) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"عاجل,متوسط,عادي"'] };
                if (c === 10) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"صيانة,تشغيل,نظافة"'] };
              }

              if (liveSnag?.attachments?.[0]?.dataUrl?.startsWith("data:image")) {
                row.height = 70;
                try {
                  const b64 = liveSnag.attachments[0].dataUrl.split(",")[1];
                  const imgId = wb.addImage({ base64: b64, extension: "jpeg" });
                  ws.addImage(imgId, {
                    tl: { col: 13.15, row: rowIdx - 1 + 0.08 },
                    ext: { width: 85, height: 58 },
                  });
                } catch {}
              } else {
                row.height = 24;
              }

              rowIdx++;
            }
          }
        }
      }
    }

    const lastRow = rowIdx - 1;
    const totalInspectionRows = lastRow - 4;

    // ────────────────────────────────────────────────────────────────────────
    // بناء لوحة المؤشرات التفاعلية المدمجة في الشيت الأول (wsDash)
    // ────────────────────────────────────────────────────────────────────────
    wsDash.columns = [
      { width: 3 },  // A
      { width: 6 },  // B (م)
      { width: 28 }, // C (المبنى / التخصص)
      { width: 16 }, // D (إجمالي)
      { width: 16 }, // E (سليم)
      { width: 16 }, // F (أعطال)
      { width: 16 }, // G (متابعة / نسبة)
      { width: 16 }, // H (عاجل)
      { width: 20 }, // I (نسبة الجاهزية)
      { width: 14 }, // J
      { width: 14 }, // K
      { width: 16 }, // L
      { width: 16 }, // M
    ];

    // Main Header
    wsDash.mergeCells("B2:M2");
    const dTitle = wsDash.getCell("B2");
    dTitle.value = "مول بارك ستريت — لوحة المؤشرات التفاعلية لملاحظات وفحص المباني (Live Building Snag Dashboard)";
    dTitle.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    dTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
    dTitle.alignment = { horizontal: "center", vertical: "middle" };
    wsDash.getRow(2).height = 36;

    wsDash.mergeCells("B3:M3");
    const dSub = wsDash.getCell("B3");
    dSub.value = "لوحة ديناميكية مربوطة بالكامل بمعادلات إكسيل الذكية — تتحدث المؤشرات والنسب لحظياً وبشكل تلقائي بمجرد تعديل أي حالة في شيت فحص المباني";
    dSub.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF38BDF8" } };
    dSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    dSub.alignment = { horizontal: "center", vertical: "middle" };
    wsDash.getRow(3).height = 22;
    wsDash.getRow(4).height = 8;

    // KPI Summary Cards
    const kpiDefs = [
      {
        colS: "B", colE: "C",
        label: "إجمالي بنود الفحص",
        color: "FF38BDF8",
        formula: `COUNTA('فحص المباني والممرات'!$A$5:$A$${lastRow})`,
        initVal: totalInspectionRows,
        numFmt: "#,##0"
      },
      {
        colS: "D", colE: "E",
        label: "سليم ومطابق للمواصفات ✅",
        color: "FF10B981",
        formula: `COUNTIF('فحص المباني والممرات'!$H$5:$H$${lastRow}, "*سليم*")`,
        initVal: countSleem,
        numFmt: "#,##0"
      },
      {
        colS: "F", colE: "G",
        label: "ملاحظات وأعطال مرصودة 🔴",
        color: "FFEF4444",
        formula: `COUNTIF('فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*") + COUNTIF('فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*")`,
        initVal: countSnags,
        numFmt: "#,##0"
      },
      {
        colS: "H", colE: "I",
        label: "ملاحظات تحتاج متابعة 🟡",
        color: "FFF59E0B",
        formula: `COUNTIF('فحص المباني والممرات'!$H$5:$H$${lastRow}, "*متابعة*")`,
        initVal: countFollowup,
        numFmt: "#,##0"
      },
      {
        colS: "J", colE: "K",
        label: "أعطال ذات أولوية عاجلة ⚠️",
        color: "FFB91C1C",
        formula: `COUNTIFS('فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*") + COUNTIFS('فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*")`,
        initVal: countUrgent,
        numFmt: "#,##0"
      },
      {
        colS: "L", colE: "M",
        label: "نسبة الجاهزية والسلامة العامة %",
        color: "FF10B981",
        formula: `IF(B5>0, D5/B5, 1)`,
        initVal: totalInspectionRows > 0 ? (countSleem / totalInspectionRows) : 1,
        numFmt: "0.0%"
      },
    ];

    kpiDefs.forEach(k => {
      wsDash.mergeCells(`${k.colS}5:${k.colE}5`);
      const vCell = wsDash.getCell(`${k.colS}5`);
      vCell.value = { formula: k.formula, result: k.initVal };
      vCell.font = { name: "Arial", size: 20, bold: true, color: { argb: k.color } };
      vCell.alignment = { horizontal: "center", vertical: "middle" };
      vCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      vCell.border = { top: { style: "medium", color: { argb: k.color } }, left: { style: "thin" }, right: { style: "thin" } };
      if (k.numFmt) vCell.numFmt = k.numFmt;

      wsDash.mergeCells(`${k.colS}6:${k.colE}6`);
      const lCell = wsDash.getCell(`${k.colS}6`);
      lCell.value = k.label;
      lCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFCBD5E1" } };
      lCell.alignment = { horizontal: "center", vertical: "middle" };
      lCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      lCell.border = { bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    wsDash.getRow(5).height = 34;
    wsDash.getRow(6).height = 22;

    // ── Table 1: المباني والقطاعات ──────────────────────────────────────────
    wsDash.mergeCells("B8:I8");
    const t1Header = wsDash.getCell("B8");
    t1Header.value = "🏢 مؤشرات الفحص الهندسي والسلامة حسب المبنى والقطاع (تفاعلي مباشر)";
    t1Header.font = { name: "Arial", size: 11.5, bold: true, color: { argb: THEME.white } };
    t1Header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    t1Header.alignment = { horizontal: "center", vertical: "middle" };
    wsDash.getRow(8).height = 26;

    const t1Cols = [
      "م", "المبنى / القطاع", "إجمالي البنود", "سليم ومطابق ✅",
      "ملاحظات وأعطال 🔴", "تحت المتابعة 🟡", "أعطال عاجلة ⚠️", "نسبة الجاهزية %"
    ];
    const r9 = wsDash.getRow(9);
    t1Cols.forEach((th, i) => {
      const c = r9.getCell(i + 2);
      c.value = th;
      c.font = { name: "Arial", size: 10, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    r9.height = 24;

    const bldgNamesList = [
      "مبنى 1",
      "مبنى 2",
      "مبنى 3",
      "البلازا والمنطقة المركزية",
      "البيزمنت والجراج",
      "مبنى LMD",
      "المسجد"
    ];

    let t1Row = 10;
    bldgNamesList.forEach((bName, idx) => {
      const row = wsDash.getRow(t1Row);
      row.getCell(2).value = idx + 1;
      row.getCell(3).value = bName;

      row.getCell(4).value = { formula: `COUNTIF('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row})`, result: 0 };
      row.getCell(5).value = { formula: `COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*سليم*")`, result: 0 };
      row.getCell(6).value = { formula: `COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*") + COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*")`, result: 0 };
      row.getCell(7).value = { formula: `COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*متابعة*")`, result: 0 };
      row.getCell(8).value = { formula: `COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*") + COUNTIFS('فحص المباني والممرات'!$B$5:$B$${lastRow}, C${t1Row}, 'فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*")`, result: 0 };
      row.getCell(9).value = { formula: `IF(D${t1Row}>0, E${t1Row}/D${t1Row}, 1)`, result: 1 };
      row.getCell(9).numFmt = "0.0%";

      for (let c = 2; c <= 9; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 10, bold: c === 3 || c === 6 || c === 8 || c === 9 };
        cell.alignment = { horizontal: c === 3 ? "right" : "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: t1Row % 2 === 0 ? THEME.zebraRow : THEME.white } };
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
        if (c === 6) cell.font.color = { argb: "FFB91C1C" };
        if (c === 5) cell.font.color = { argb: "FF047857" };
      }
      row.height = 22;
      t1Row++;
    });

    // Total Row for Table 1
    const totRow1 = wsDash.getRow(t1Row);
    totRow1.getCell(2).value = "Σ";
    totRow1.getCell(3).value = "الإجمالي العام لكافة القطاعات";
    totRow1.getCell(4).value = { formula: `SUM(D10:D${t1Row - 1})`, result: totalInspectionRows };
    totRow1.getCell(5).value = { formula: `SUM(E10:E${t1Row - 1})`, result: countSleem };
    totRow1.getCell(6).value = { formula: `SUM(F10:F${t1Row - 1})`, result: countSnags };
    totRow1.getCell(7).value = { formula: `SUM(G10:G${t1Row - 1})`, result: countFollowup };
    totRow1.getCell(8).value = { formula: `SUM(H10:H${t1Row - 1})`, result: countUrgent };
    totRow1.getCell(9).value = { formula: `IF(D${t1Row}>0, E${t1Row}/D${t1Row}, 1)`, result: 1 };
    totRow1.getCell(9).numFmt = "0.0%";

    for (let c = 2; c <= 9; c++) {
      const cell = totRow1.getCell(c);
      cell.font = { name: "Arial", size: 10.5, bold: true, color: { argb: THEME.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
      cell.alignment = { horizontal: c === 3 ? "right" : "center", vertical: "middle" };
      cell.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    }
    totRow1.height = 24;

    // ── Table 2: التخصصات الفنية ────────────────────────────────────────────
    const t2Start = t1Row + 2;
    wsDash.mergeCells(`B${t2Start}:H${t2Start}`);
    const t2Header = wsDash.getCell(`B${t2Start}`);
    t2Header.value = "🔧 تحليل وتوزيع الملاحظات والأعطال حسب التخصص الهندسي (تفاعلي مباشر)";
    t2Header.font = { name: "Arial", size: 11.5, bold: true, color: { argb: THEME.white } };
    t2Header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.headerGreen } };
    t2Header.alignment = { horizontal: "center", vertical: "middle" };
    wsDash.getRow(t2Start).height = 26;

    const t2Cols = ["م", "التخصص الفني", "إجمالي البنود", "سليم ومطابق ✅", "أعطال وملاحظات 🔴", "عاجل ⚠️", "نسبة الأعطال في التخصص"];
    const rT2H = wsDash.getRow(t2Start + 1);
    t2Cols.forEach((th, i) => {
      const c = rT2H.getCell(i + 2);
      c.value = th;
      c.font = { name: "Arial", size: 10, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    rT2H.height = 24;

    const floorTradesList = [
      "دهانات", "كهرباء", "تكييف وتهوية", "نجارة", "أعمال مدنية",
      "أعمال عامة", "أنظمة إطفاء", "جبس بورد", "حوائط وبلاط",
      "الأمن والمراقبة والحراسة", "نظافة ومكافحة حشرات"
    ];

    let t2Row = t2Start + 2;
    floorTradesList.forEach((tr, idx) => {
      const row = wsDash.getRow(t2Row);
      row.getCell(2).value = idx + 1;
      row.getCell(3).value = tr;

      row.getCell(4).value = { formula: `COUNTIF('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row})`, result: 0 };
      row.getCell(5).value = { formula: `COUNTIFS('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*سليم*")`, result: 0 };
      row.getCell(6).value = { formula: `COUNTIFS('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*") + COUNTIFS('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*")`, result: 0 };
      row.getCell(7).value = { formula: `COUNTIFS('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row}, 'فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*") + COUNTIFS('فحص المباني والممرات'!$G$5:$G$${lastRow}, C${t2Row}, 'فحص المباني والممرات'!$I$5:$I$${lastRow}, "عاجل", 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*")`, result: 0 };
      row.getCell(8).value = { formula: `IF(D${t2Row}>0, F${t2Row}/D${t2Row}, 0)`, result: 0 };
      row.getCell(8).numFmt = "0.0%";

      for (let c = 2; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 10, bold: c === 3 || c === 6 || c === 8 };
        cell.alignment = { horizontal: c === 3 ? "right" : "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: t2Row % 2 === 0 ? THEME.zebraRow : THEME.white } };
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
        if (c === 6) cell.font.color = { argb: "FFB91C1C" };
        if (c === 5) cell.font.color = { argb: "FF047857" };
      }
      row.height = 22;
      t2Row++;
    });

    // ── Table 3: الأدوار والارتفاعات ────────────────────────────────────────
    const t3Start = t2Row + 2;
    wsDash.mergeCells(`B${t3Start}:G${t3Start}`);
    const t3Header = wsDash.getCell(`B${t3Start}`);
    t3Header.value = "🏢 مؤشرات الفحص الهندسي حسب الدور والارتفاع (تفاعلي مباشر)";
    t3Header.font = { name: "Arial", size: 11.5, bold: true, color: { argb: THEME.white } };
    t3Header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.headerAmber } };
    t3Header.alignment = { horizontal: "center", vertical: "middle" };
    wsDash.getRow(t3Start).height = 26;

    const t3Cols = ["م", "الدور / الطابق", "إجمالي البنود", "سليم ومطابق ✅", "أعطال وملاحظات 🔴", "نسبة الجاهزية والسلامة %"];
    const rT3H = wsDash.getRow(t3Start + 1);
    t3Cols.forEach((th, i) => {
      const c = rT3H.getCell(i + 2);
      c.value = th;
      c.font = { name: "Arial", size: 10, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    rT3H.height = 24;

    const floorLevelsList = [
      "الدور الأرضي",
      "الدور الأول",
      "الدور الثاني",
      "الدور الثالث",
      "الدور الرابع",
      "الدور الخامس",
      "الدور السادس",
      "دور المصلى",
      "السطح والخدمات",
      "العام"
    ];

    let t3Row = t3Start + 2;
    floorLevelsList.forEach((fl, idx) => {
      const row = wsDash.getRow(t3Row);
      row.getCell(2).value = idx + 1;
      row.getCell(3).value = fl;

      row.getCell(4).value = { formula: `COUNTIF('فحص المباني والممرات'!$D$5:$D$${lastRow}, C${t3Row})`, result: 0 };
      row.getCell(5).value = { formula: `COUNTIFS('فحص المباني والممرات'!$D$5:$D$${lastRow}, C${t3Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*سليم*")`, result: 0 };
      row.getCell(6).value = { formula: `COUNTIFS('فحص المباني والممرات'!$D$5:$D$${lastRow}, C${t3Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*ملاحظة*") + COUNTIFS('فحص المباني والممرات'!$D$5:$D$${lastRow}, C${t3Row}, 'فحص المباني والممرات'!$H$5:$H$${lastRow}, "*عطل*")`, result: 0 };
      row.getCell(7).value = { formula: `IF(D${t3Row}>0, E${t3Row}/D${t3Row}, 1)`, result: 1 };
      row.getCell(7).numFmt = "0.0%";

      for (let c = 2; c <= 7; c++) {
        const cell = row.getCell(c);
        cell.font = { name: "Arial", size: 10, bold: c === 3 || c === 6 || c === 7 };
        cell.alignment = { horizontal: c === 3 ? "right" : "center", vertical: "middle" };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: t3Row % 2 === 0 ? THEME.zebraRow : THEME.white } };
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
        if (c === 6) cell.font.color = { argb: "FFB91C1C" };
        if (c === 5) cell.font.color = { argb: "FF047857" };
      }
      row.height = 22;
      t3Row++;
    });

    await saveFile(wb, "01_سجل_ملاحظات_المباني_والممرات_التفصيلي");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 2: 02_سجل_الملاحظات_العام_المركزي.xlsx
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📋 3/6 جاري بناء ملف 02: سجل الملاحظات العام المركزي...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("سجل الملاحظات العام", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    });

    ws.mergeCells("A1:M1");
    const tCell = ws.getCell("A1");
    tCell.value = "مول بارك ستريت — سجل الملاحظات المركزي العام (Master General Snag List)";
    tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 32;

    ws.mergeCells("A2:M2");
    const sCell = ws.getCell("A2");
    sCell.value = "يتضمن كافة الملاحظات المسجلة بقاعدة البيانات مع الصور المدمجة والفلاتر والقوائم المنسدلة + أسطر فارغة للإضافة اليومية";
    sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF38BDF8" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 6;

    const snagHeaders = [
      "كود الملاحظة", "الموقع المحدد", "التخصص / الفئة", "نوع الملاحظة", "درجة الأولوية", "حالة الملاحظة",
      "وصف المشكلة والملاحظة بالتفصيل", "الإجراء الفني المطلوب / التوصية", "المشرف المسؤول",
      "تاريخ الرصد والإنشاء", "تاريخ المعالجة / الإغلاق", "ملاحظات المتابعة والتشغيل", "الصورة المدمجة (بدون روابط)"
    ];
    const hRow = ws.getRow(4);
    snagHeaders.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    hRow.height = 30;
    ws.autoFilter = { from: "A4", to: "M4" };

    ws.columns = [
      { width: 14 }, { width: 22 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 15 },
      { width: 42 }, { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 25 }, { width: 22 },
    ];

    const allLocs = [...new Set([...LOCATIONS.map(l => l.name), ...Object.values(dynLocationsMap)])].join(",");
    const allTrades = TRADES.map(t => t.label).join(",");

    let curRow = 5;
    for (const s of snags) {
      const row = ws.getRow(curRow);
      const sCode = s.snagId ? String(s.snagId).toUpperCase() : `SNG-${curRow - 4}`;
      const sLoc = resolveLocationName(s.location);
      const sTrade = resolveTradeLabel(s.trade);
      const sType = resolveTypeLabel(s.type);
      const sPri = resolvePriorityLabel(s.priority);
      const sStatus = resolveStatusLabel(s.status);

      row.getCell(1).value = sCode;
      row.getCell(2).value = sLoc;
      row.getCell(3).value = sTrade;
      row.getCell(4).value = sType;
      row.getCell(5).value = sPri;
      row.getCell(6).value = sStatus;
      row.getCell(7).value = s.description || "—";
      row.getCell(8).value = s.action || (sPri === "عاجل" ? "مطلوب فحص ومعالجة فورية" : "متابعة وإصلاح في خطة الصيانة");
      row.getCell(9).value = s.inspector || "مشرف التشغيل";
      row.getCell(10).value = formatDate(s.timestamp);
      row.getCell(11).value = sStatus === "مغلق" ? formatDate(s.closedAt || s.timestamp) : "—";
      row.getCell(12).value = s.notes || "";
      row.getCell(13).value = s.attachments?.length ? "" : "لا توجد صورة";

      const statusBg = sStatus === "مفتوح" ? "FFFEE2E2" : sStatus === "قيد التنفيذ" ? "FFFEF3C7" : sStatus === "مغلق" ? "FFD1FAE5" : "FFFFFFFF";

      for (let c = 1; c <= 13; c++) {
        const cell = row.getCell(c);
        cell.font = {
          name: "Arial",
          size: 10,
          bold: c === 1 || c === 5 || c === 6,
          color: c === 5 && sPri === "عاجل" ? { argb: "FFB91C1C" } : c === 6 && sStatus === "مفتوح" ? { argb: "FFB91C1C" } : c === 6 && sStatus === "مغلق" ? { argb: "FF047857" } : undefined,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: c === 6 ? statusBg : curRow % 2 === 0 ? THEME.zebraRow : THEME.white },
        };
        cell.alignment = { horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center", vertical: "middle", wrapText: true };
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };

        if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${allLocs.slice(0, 240)}"`] };
        if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${allTrades.slice(0, 240)}"`] };
        if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"صيانة,تشغيل,نظافة"'] };
        if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"عاجل,متوسط,عادي"'] };
        if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"مفتوح,قيد التنفيذ,مغلق"'] };
      }

      const imgAtt = s.attachments?.find(a => a.dataUrl && a.dataUrl.startsWith("data:image"));
      if (imgAtt) {
        row.height = 72;
        try {
          const b64 = imgAtt.dataUrl.split(",")[1];
          const imgId = wb.addImage({ base64: b64, extension: "jpeg" });
          ws.addImage(imgId, {
            tl: { col: 12.15, row: curRow - 1 + 0.08 },
            ext: { width: 90, height: 60 },
          });
        } catch {}
      } else {
        row.height = 26;
      }

      curRow++;
    }

    // 100 Blank rows for ongoing daily entries
    for (let i = 0; i < 100; i++) {
      const row = ws.getRow(curRow);
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
        cell.alignment = { horizontal: c === 7 || c === 8 || c === 12 ? "right" : "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: "FFE2E8F0" } }, bottom: { style: "thin", color: { argb: "FFE2E8F0" } }, left: { style: "thin", color: { argb: "FFE2E8F0" } }, right: { style: "thin", color: { argb: "FFE2E8F0" } } };
        if (curRow % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } };

        if (c === 2) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${allLocs.slice(0, 240)}"`] };
        if (c === 3) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${allTrades.slice(0, 240)}"`] };
        if (c === 4) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"صيانة,تشغيل,نظافة"'] };
        if (c === 5) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"عاجل,متوسط,عادي"'] };
        if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"مفتوح,قيد التنفيذ,مغلق"'] };
      }
      curRow++;
    }

    await saveFile(wb, "02_سجل_الملاحظات_العام_المركزي");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 3: 03_فحص_قطاعات_بارك_ستريت_الشامل.xlsx
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🌟 4/6 جاري بناء ملف 03: فحص قطاعات بارك ستريت الشامل (الأمن، رحلة العميل، الزراعة، مسار البيزمنت)...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("فحص قطاعات بارك ستريت", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    });

    ws.mergeCells("A1:J1");
    const tCell = ws.getCell("A1");
    tCell.value = "مول بارك ستريت — فحص القطاعات الرئيسية (الأمن • رحلة العميل • الزراعة واللاندسكيب • مسار السيارات بالبيزمنت)";
    tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.headerPurple } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 32;

    ws.mergeCells("A2:J2");
    const sCell = ws.getCell("A2");
    sCell.value = "معايير التشغيل والفحص الميداني | فلاتر كاملة للقطاعات والمناطق والمعايير مع صور مدمجة وقوائم منسدلة للحالة";
    sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFC4B5FD" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E1065" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 6;

    const parkHeaders = [
      "القطاع الرئيسي", "كود المنطقة", "المنطقة / المسار الفرعي", "بند الفحص والمعيار التشغيلي",
      "الفئة الفرعية", "الحالة التشغيلية", "تفاصيل الملاحظة والإجراء المطلوب", "المشرف المسؤول",
      "تاريخ الفحص", "الصورة الموثقة (مدمجة)"
    ];
    const hRow = ws.getRow(4);
    parkHeaders.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF581C87" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    hRow.height = 30;
    ws.autoFilter = { from: "A4", to: "J4" };

    ws.columns = [
      { width: 22 }, { width: 14 }, { width: 30 }, { width: 42 }, { width: 18 },
      { width: 18 }, { width: 40 }, { width: 18 }, { width: 18 }, { width: 20 },
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

          const row = ws.getRow(pRowIdx);
          row.getCell(1).value = sec.name;
          row.getCell(2).value = zone.code;
          row.getCell(3).value = zone.title;
          row.getCell(4).value = item.name;
          row.getCell(5).value = item.category;
          row.getCell(6).value = statusText;
          row.getCell(7).value = rec.note || "—";
          row.getCell(8).value = rec.updatedBy || "مشرف بارك ستريت";
          row.getCell(9).value = rec.updatedAt ? new Date(rec.updatedAt).toLocaleDateString('ar-EG') : "—";
          row.getCell(10).value = rec.photos?.length ? "" : "لا توجد صورة";

          const stBg = rec.status === "snag" ? "FFFEE2E2" : rec.status === "followup" ? "FFFEF3C7" : rec.status === "ok" ? "FFD1FAE5" : "FFFFFFFF";

          for (let c = 1; c <= 10; c++) {
            const cell = row.getCell(c);
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
            cell.alignment = { horizontal: c === 3 || c === 4 || c === 7 ? "right" : "center", vertical: "middle", wrapText: true };
            cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };

            if (c === 6) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"سليم ✅,ملاحظة / عطل 🔴,يحتاج متابعة 🟡,لم يُفحص ⚪"'] };
          }

          const pPhoto = rec.photos?.find(p => p.dataUrl && p.dataUrl.startsWith("data:image"));
          if (pPhoto) {
            row.height = 70;
            try {
              const b64 = pPhoto.dataUrl.split(",")[1];
              const imgId = wb.addImage({ base64: b64, extension: "jpeg" });
              ws.addImage(imgId, {
                tl: { col: 9.15, row: pRowIdx - 1 + 0.08 },
                ext: { width: 90, height: 60 },
              });
            } catch {}
          } else {
            row.height = 26;
          }

          pRowIdx++;
        }
      }
    }

    await saveFile(wb, "03_فحص_قطاعات_بارك_ستريت_الشامل");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 4: 04_حصر_وفحص_الحمامات_الشامل.xlsx
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n🚽 5/6 جاري بناء ملف 04: حصر وفحص الحمامات الشامل (50 حمام × 29 مكون)...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("حصر وفحص الحمامات", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    });

    ws.mergeCells("A1:N1");
    const tCell = ws.getCell("A1");
    tCell.value = "مول بارك ستريت — مركز متابعة وفحص الحمامات الفني وحصر المكونات (50 حمام × 29 مكون = 1,450 سطر فحص)";
    tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.headerGreen } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 32;

    ws.mergeCells("A2:N2");
    const sCell = ws.getCell("A2");
    sCell.value = "فلاتر كاملة للفرز حسب: المبنى • الاتجاه • الطابق • النوع • المكون الفني • التخصص • وحالة العطل";
    sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFA7F3D0" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF064E3B" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 6;

    const restHeaders = [
      "المبنى / المنطقة", "الاتجاه", "الطابق", "النوع", "كود الحمام", "اسم المكون / المعيار الفني",
      "التخصص", "إجمالي العدد", "العدد السليم", "العدد المعطل", "العدد المفقود", "الحالة العامة",
      "الملاحظات والتفاصيل الفنية", "المشرف وتاريخ الفحص"
    ];
    const hRow = ws.getRow(4);
    restHeaders.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    hRow.height = 30;
    ws.autoFilter = { from: "A4", to: "N4" };

    ws.columns = [
      { width: 16 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 22 }, { width: 30 },
      { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 36 }, { width: 22 }
    ];

    let rRowIdx = 5;
    for (const loc of RESTROOM_LOCATIONS) {
      for (const comp of STANDARD_COMPONENTS) {
        const docKey = `${loc.restroomKey}__${comp.code}`;
        const rec = restroomRecords[docKey] || {};

        let health = "لم يُفحص ⚪";
        if (rec.defectiveCount > 0 || rec.missingCount > 0) health = "يوجد عطل / نقص 🔴";
        else if (rec.workingCount !== undefined && rec.workingCount !== null && rec.workingCount !== "") health = "سليم ومطابق ✅";

        const row = ws.getRow(rRowIdx);
        row.getCell(1).value = loc.building;
        row.getCell(2).value = loc.direction;
        row.getCell(3).value = loc.floor;
        row.getCell(4).value = loc.gender;
        row.getCell(5).value = loc.restroomKey;
        row.getCell(6).value = comp.component;
        row.getCell(7).value = comp.trade;
        row.getCell(8).value = rec.totalCount ?? "—";
        row.getCell(9).value = rec.workingCount ?? "—";
        row.getCell(10).value = rec.defectiveCount ?? "—";
        row.getCell(11).value = rec.missingCount ?? "—";
        row.getCell(12).value = health;
        row.getCell(13).value = rec.notes || "—";
        row.getCell(14).value = rec.inspector ? `${rec.inspector} (${rec.inspectDate || '—'})` : "—";

        const hBg = health.includes("عطل") ? "FFFEE2E2" : health.includes("سليم") ? "FFD1FAE5" : "FFFFFFFF";

        for (let c = 1; c <= 14; c++) {
          const cell = row.getCell(c);
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
          cell.alignment = { horizontal: c === 6 || c === 13 ? "right" : "center", vertical: "middle" };
          cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };

          if (c === 12) cell.dataValidation = { type: 'list', allowBlank: true, formulae: ['"سليم ومطابق ✅,يوجد عطل / نقص 🔴,لم يُفحص ⚪"'] };
        }
        row.height = 22;
        rRowIdx++;
      }
    }

    await saveFile(wb, "04_حصر_وفحص_الحمامات_الشامل");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 5: 05_حصر_وبيانات_المخازن_بارك_ستريت.xlsx
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 6/6 جاري بناء ملف 05: حصر وبيانات المخازن (90 مخزن)...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("بيانات المخازن", {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
    });

    ws.mergeCells("A1:D1");
    const tCell = ws.getCell("A1");
    tCell.value = "مول بارك ستريت — حصر وبيانات المخازن والشركات المستأجرة (90 مخزن بالبيزمنت)";
    tCell.font = { name: "Arial", size: 14, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.headerAmber } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    ws.mergeCells("A2:D2");
    const sCell = ws.getCell("A2");
    sCell.value = "حصر كامل لأرقام المخازن والجهات التابعة لها وملاحظات التشغيل بالبيزمنت";
    sCell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFEF3C7" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF78350F" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 6;

    const stHeaders = ["رقم المخزن (Store No)", "الشركة / الجهة / التخصيص", "الملاحظات وتفاصيل الاستخدام", "تاريخ الرصد والتوثيق"];
    const hRow = ws.getRow(4);
    stHeaders.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      c.border = { top: { style: "medium" }, bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    hRow.height = 28;
    ws.autoFilter = { from: "A4", to: "D4" };
    ws.columns = [{ width: 22 }, { width: 42 }, { width: 46 }, { width: 22 }];

    let stRowIdx = 5;
    for (const store of stores) {
      const row = ws.getRow(stRowIdx);
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

    await saveFile(wb, "05_حصر_وبيانات_المخازن_بارك_ستريت");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ملف 6: 06_لوحة_المؤشرات_والإحصائيات_الرئيسية.xlsx
  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n📊 إضافي: جاري بناء ملف 06: لوحة المؤشرات والإحصائيات الرئيسية...");
  {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Park St. Mall Management";
    wb.created = new Date();

    const ws = wb.addWorksheet("لوحة المؤشرات", {
      views: [{ rightToLeft: true, showGridLines: true }],
    });

    ws.mergeCells("B2:I2");
    const tCell = ws.getCell("B2");
    tCell.value = "مول بارك ستريت — لوحة المؤشرات والإحصائيات العامة للملاحظات";
    tCell.font = { name: "Arial", size: 15, bold: true, color: { argb: THEME.white } };
    tCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.darkNavy } };
    tCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 40;

    ws.mergeCells("B3:I3");
    const sCell = ws.getCell("B3");
    sCell.value = `ملخص الأداء العام والمؤشرات التشغيلية حتى تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
    sCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF38BDF8" } };
    sCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
    sCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(3).height = 24;

    const stats = {
      total: snags.length,
      open: snags.filter(s => s.status === 'open').length,
      inProgress: snags.filter(s => s.status === 'in-progress').length,
      closed: snags.filter(s => s.status === 'closed').length,
      urgent: snags.filter(s => s.priority === 'urgent').length,
    };

    const kpiCards = [
      { label: "إجمالي الملاحظات المسجلة", val: stats.total, colStart: "B", colEnd: "C", color: "FF38BDF8" },
      { label: "ملاحظات مفتوحة 🔴", val: stats.open, colStart: "D", colEnd: "E", color: "FFEF4444" },
      { label: "قيد التنفيذ 🟡", val: stats.inProgress, colStart: "F", colEnd: "G", color: "FFF59E0B" },
      { label: "ملاحظات معالجة ومغلقة ✅", val: stats.closed, colStart: "H", colEnd: "I", color: "FF10B981" },
    ];

    kpiCards.forEach(k => {
      ws.mergeCells(`${k.colStart}5:${k.colEnd}5`);
      const valCell = ws.getCell(`${k.colStart}5`);
      valCell.value = k.val;
      valCell.font = { name: "Arial", size: 24, bold: true, color: { argb: k.color } };
      valCell.alignment = { horizontal: "center", vertical: "middle" };
      valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      valCell.border = { top: { style: "medium", color: { argb: k.color } }, left: { style: "thin" }, right: { style: "thin" } };

      ws.mergeCells(`${k.colStart}6:${k.colEnd}6`);
      const lblCell = ws.getCell(`${k.colStart}6`);
      lblCell.value = k.label;
      lblCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFCBD5E1" } };
      lblCell.alignment = { horizontal: "center", vertical: "middle" };
      lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      lblCell.border = { bottom: { style: "medium" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    ws.getRow(5).height = 36;
    ws.getRow(6).height = 24;

    ws.mergeCells("B9:E9");
    const trT = ws.getCell("B9");
    trT.value = "📊 إحصائيات التخصصات والفئات الفنية";
    trT.font = { name: "Arial", size: 12, bold: true, color: { argb: THEME.white } };
    trT.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    trT.alignment = { horizontal: "center", vertical: "middle" };

    ws.getCell("B10").value = "م";
    ws.getCell("C10").value = "التخصص الفني";
    ws.getCell("D10").value = "العدد المسجل";
    ws.getCell("E10").value = "النسبة";
    ["B10", "C10", "D10", "E10"].forEach(c => {
      const cell = ws.getCell(c);
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: THEME.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    let trRow = 11;
    TRADES.forEach((tr, idx) => {
      const count = snags.filter(s => s.trade === tr.id || resolveTradeLabel(s.trade) === tr.label).length;
      ws.getCell(`B${trRow}`).value = idx + 1;
      ws.getCell(`C${trRow}`).value = tr.label;
      ws.getCell(`D${trRow}`).value = count;
      ws.getCell(`E${trRow}`).value = stats.total > 0 ? `${((count / stats.total) * 100).toFixed(1)}%` : "0%";

      ["B", "C", "D", "E"].forEach(col => {
        const cell = ws.getCell(`${col}${trRow}`);
        cell.font = { name: "Arial", size: 10, bold: col === "C" || col === "D" };
        cell.alignment = { horizontal: col === "C" ? "right" : "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: THEME.grayBorder } }, bottom: { style: "thin", color: { argb: THEME.grayBorder } }, left: { style: "thin", color: { argb: THEME.grayBorder } }, right: { style: "thin", color: { argb: THEME.grayBorder } } };
        if (trRow % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: THEME.zebraRow } };
      });
      trRow++;
    });

    ws.columns = [
      { width: 3 }, { width: 6 }, { width: 26 }, { width: 14 }, { width: 16 }, { width: 3 }, { width: 18 }, { width: 14 }, { width: 28 },
    ];

    await saveFile(wb, "06_لوحة_المؤشرات_والإحصائيات_الرئيسية");
  }

  console.log("\n🎉 اكتمل إنشاء جميع الملفات المستقلة الستة بنجاح!");
}

main().catch(err => {
  console.error("❌ خطأ غير متوقع:", err);
  process.exit(1);
});
