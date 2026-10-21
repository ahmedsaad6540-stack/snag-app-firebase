"use strict";

/**
 * Park Street Stores & Units Reference Catalog
 * Ported from snag-app/seed-stores.mjs (84 stores) + Vacant detection & numeric sorting.
 */

const PARK_STREET_STORES_CATALOG = [
  { storeNo: "73", companyName: "Vacant", notes: "" },
  { storeNo: "79", companyName: "IT Hospitality", notes: "" },
  { storeNo: "80", companyName: "IT Hospitality", notes: "" },
  { storeNo: "81", companyName: "IT", notes: "" },
  { storeNo: "82", companyName: "Pickl (Hospitality)", notes: "" },
  { storeNo: "86", companyName: "Cm Sheril", notes: "" },
  { storeNo: "88", companyName: "Pickl", notes: "" },
  { storeNo: "89", companyName: "AOF", notes: "" },
  { storeNo: "90", companyName: "AOF", notes: "" },
  { storeNo: "94", companyName: "Mazloum", notes: "" },
  { storeNo: "95", companyName: "Mazloum", notes: "" },
  { storeNo: "96", companyName: "Car Wash", notes: "" },
  { storeNo: "98", companyName: "Best Control", notes: "المكافحة" },
  { storeNo: "99", companyName: "Em Sherif", notes: "" },
  { storeNo: "100", companyName: "Em Sherif", notes: "" },
  { storeNo: "102", companyName: "Em Sherif", notes: "" },
  { storeNo: "103", companyName: "Marzipan", notes: "" },
  { storeNo: "104", companyName: "Marzipan", notes: "" },
  { storeNo: "111", companyName: "Fish Deli", notes: "" },
  { storeNo: "113", companyName: "Pickl", notes: "" },
  { storeNo: "116", companyName: "SM Office - Leeds - Security", notes: "" },
  { storeNo: "128", companyName: "Be Babel", notes: "" },
  { storeNo: "129", companyName: "Mavens", notes: "" },
  { storeNo: "130", companyName: "Be Babel", notes: "" },
  { storeNo: "139", companyName: "Haitham Office", notes: "" },
  { storeNo: "142", companyName: "Premium Mart", notes: "" },
  { storeNo: "145", companyName: "CAF", notes: "" },
  { storeNo: "147", companyName: "Mavens", notes: "" },
  { storeNo: "148", companyName: "Mavens", notes: "" },
  { storeNo: "149", companyName: "Aston Martin", notes: "" },
  { storeNo: "151", companyName: "Aston Martin", notes: "" },
  { storeNo: "152", companyName: "Dr. Remon Mounir", notes: "" },
  { storeNo: "155", companyName: "منعلقات وستائر", notes: "مع طيف عبدالفتاح" },
  { storeNo: "155", companyName: "Finance - Office", notes: "" },
  { storeNo: "155", companyName: "العقود", notes: "" },
  { storeNo: "155", companyName: "الزراعة", notes: "" },
  { storeNo: "156", companyName: "Leeds Eco", notes: "" },
  { storeNo: "157", companyName: "Leeds Eco", notes: "" },
  { storeNo: "158", companyName: "Mavens", notes: "" },
  { storeNo: "159", companyName: "Leeds Eco", notes: "" },
  { storeNo: "161", companyName: "FM - Gas Room", notes: "" },
  { storeNo: "162", companyName: "منعلقات و أمن", notes: "" },
  { storeNo: "163", companyName: "Pickl", notes: "" },
  { storeNo: "164", companyName: "Mavens", notes: "" },
  { storeNo: "200", companyName: "منعلقات و أمن", notes: "" },
  { storeNo: "201", companyName: "منعلقات", notes: "" },
  { storeNo: "203", companyName: "Vacant", notes: "زونج اف سلطا" },
  { storeNo: "204", companyName: "HK - TFM", notes: "" },
  { storeNo: "205", companyName: "Stationary Sky", notes: "" },
  { storeNo: "206", companyName: "Stationary Sky", notes: "" },
  { storeNo: "207", companyName: "Landlord Ayman Hussen", notes: "" },
  { storeNo: "208", companyName: "Operation Consumables", notes: "" },
  { storeNo: "209", companyName: "Nurses", notes: "" },
  { storeNo: "211", companyName: "Leeds Security", notes: "" },
  { storeNo: "212", companyName: "Vacant", notes: "" },
  { storeNo: "213", companyName: "TFM", notes: "" },
  { storeNo: "214", companyName: "TFM", notes: "" },
  { storeNo: "217", companyName: "حسابات Hospitality", notes: "" },
  { storeNo: "218", companyName: "Em Sherif", notes: "" },
  { storeNo: "219", companyName: "AOF - Emecria", notes: "موظفة وهند وظيف" },
  { storeNo: "220", companyName: "Vacant", notes: "" },
  { storeNo: "221", companyName: "Starcom", notes: "" },
  { storeNo: "222", companyName: "مرت يوفيه", notes: "" },
  { storeNo: "223", companyName: "Mavens", notes: "" },
  { storeNo: "224", companyName: "Mavens", notes: "" },
  { storeNo: "225", companyName: "Mavens", notes: "" },
  { storeNo: "226", companyName: "Finance", notes: "" },
  { storeNo: "227", companyName: "Sky - IT", notes: "" },
  { storeNo: "228", companyName: "Brunch & Cake", notes: "" },
  { storeNo: "229", companyName: "Brunch & Cake", notes: "" },
  { storeNo: "230", companyName: "Sushi - Me", notes: "" },
  { storeNo: "231", companyName: "على مالك", notes: "" },
  { storeNo: "232", companyName: "Mena - Glass", notes: "" },
  { storeNo: "233", companyName: "Mena - Wood", notes: "" },
  { storeNo: "234", companyName: "Key Room", notes: "" },
  { storeNo: "235", companyName: "مخزن التقنيات", notes: "" },
  { storeNo: "236", companyName: "AOF Furniture - Emecria", notes: "Mr. Shaslash Door" },
  { storeNo: "237", companyName: "السبر ايبله هدايا", notes: "" },
  { storeNo: "238", companyName: "أورزق", notes: "" },
  { storeNo: "239", companyName: "Store Department", notes: "مخزن مصاري" },
  { storeNo: "240", companyName: "Kitchen Equipment", notes: "" },
  { storeNo: "241", companyName: "Starcom", notes: "" },
  { storeNo: "242", companyName: "Spider", notes: "مبنى واحد خلف مخزن الجناح B2" }
];

const DEMO_UNITS_CATALOG = [
  {
    buildingNo: "B1",
    floor: "GF",
    unitNo: "G-01",
    unitName: "Brunch & Cake (Demo)",
    unitOwnerName: "Demo Hospitality Group",
    unitManagerName: "Branch Manager Demo",
    mobileTelOwner: "01000000001",
    mobileTelManager: "01000000002",
    mobileTelUnit: "0238000001",
    address: "Building 1 - Ground Floor - Plaza View",
    email: "demo.b1g01@parkst-staging.local",
    workingHours: "08:00 AM - 12:00 AM",
    weeklyOff: "None",
    companyActivity: "F&B / Restaurant"
  },
  {
    buildingNo: "B2",
    floor: "GF",
    unitNo: "G-05",
    unitName: "Em Sherif Cafe (Demo)",
    unitOwnerName: "Levant Dining Demo",
    unitManagerName: "Operations Lead Demo",
    mobileTelOwner: "01000000003",
    mobileTelManager: "01000000004",
    mobileTelUnit: "0238000002",
    address: "Building 2 - Ground Floor - Main Spine",
    email: "demo.b2g05@parkst-staging.local",
    workingHours: "10:00 AM - 01:00 AM",
    weeklyOff: "None",
    companyActivity: "F&B / Cafe & Dining"
  },
  {
    buildingNo: "B3",
    floor: "1F",
    unitNo: "1-04",
    unitName: "Vacant",
    unitOwnerName: "Park Street Leasing",
    unitManagerName: "-",
    mobileTelOwner: "-",
    mobileTelManager: "-",
    mobileTelUnit: "-",
    address: "Building 3 - First Floor",
    email: "leasing.demo@parkst-staging.local",
    workingHours: "-",
    weeklyOff: "-",
    companyActivity: "Vacant / Available for Lease"
  },
  {
    buildingNo: "B4",
    floor: "2F",
    unitNo: "2-10",
    unitName: "Mavens Corporate Office (Demo)",
    unitOwnerName: "Mavens Group Demo",
    unitManagerName: "Office Admin Demo",
    mobileTelOwner: "01000000005",
    mobileTelManager: "01000000006",
    mobileTelUnit: "0238000005",
    address: "Building 4 - Second Floor",
    email: "demo.b4@parkst-staging.local",
    workingHours: "09:00 AM - 06:00 PM",
    weeklyOff: "Friday - Saturday",
    companyActivity: "Corporate Office"
  }
];

function isVacantText(value) {
  const v = String(value || "").trim().toLowerCase();
  return !v || v === "vacant" || v === "فارغ" || v === "شاغر" || v === "خالي";
}

function sortStoresByNo(stores = []) {
  return [...stores].sort((a, b) => {
    const na = parseInt(a.storeNo || a.title, 10);
    const nb = parseInt(b.storeNo || b.title, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.storeNo || a.title || "").localeCompare(String(b.storeNo || b.title || ""), "ar");
  });
}

module.exports = {
  PARK_STREET_STORES_CATALOG,
  DEMO_UNITS_CATALOG,
  isVacantText,
  sortStoresByNo
};
