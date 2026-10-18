// seed-stores.mjs — Run with: node seed-stores.mjs
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore"

const firebaseConfig = {
  apiKey:            "AIzaSyAOJI4wQKvWfdHM8jQTbKoU_Zj03wb2WAw",
  authDomain:        "snag-app-firebase.firebaseapp.com",
  projectId:         "snag-app-firebase",
  storageBucket:     "snag-app-firebase.firebasestorage.app",
  messagingSenderId: "1074700913936",
  appId:             "1:1074700913936:web:62894bd7ebf12b30e5a995",
}

const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)

const stores = [
  { storeNo: "73",  companyName: "Vacant",                           notes: "" },
  { storeNo: "79",  companyName: "IT Hospitality",                   notes: "" },
  { storeNo: "80",  companyName: "IT Hospitality",                   notes: "" },
  { storeNo: "81",  companyName: "IT",                               notes: "" },
  { storeNo: "82",  companyName: "Pickl (Hospitality)",              notes: "" },
  { storeNo: "86",  companyName: "Cm Sheril",                        notes: "" },
  { storeNo: "88",  companyName: "Pickl",                            notes: "" },
  { storeNo: "89",  companyName: "AOF",                              notes: "" },
  { storeNo: "90",  companyName: "AOF",                              notes: "" },
  { storeNo: "94",  companyName: "Mazloum",                          notes: "" },
  { storeNo: "95",  companyName: "Mazloum",                          notes: "" },
  { storeNo: "96",  companyName: "Car Wash",                         notes: "" },
  { storeNo: "98",  companyName: "Best Control",                     notes: "المكافحة" },
  { storeNo: "99",  companyName: "Em Sherif",                        notes: "" },
  { storeNo: "100", companyName: "Em Sherif",                        notes: "" },
  { storeNo: "102", companyName: "Em Sherif",                        notes: "" },
  { storeNo: "103", companyName: "Marzipan",                         notes: "" },
  { storeNo: "104", companyName: "Marzipan",                         notes: "" },
  { storeNo: "111", companyName: "Fish Deli",                        notes: "" },
  { storeNo: "113", companyName: "Pickl",                            notes: "" },
  { storeNo: "116", companyName: "SM Office - Leeds - Security",     notes: "" },
  { storeNo: "128", companyName: "Be Babel",                         notes: "" },
  { storeNo: "129", companyName: "Mavens",                           notes: "" },
  { storeNo: "130", companyName: "Be Babel",                         notes: "" },
  { storeNo: "139", companyName: "Haitham Office",                   notes: "" },
  { storeNo: "142", companyName: "Premium Mart",                     notes: "" },
  { storeNo: "145", companyName: "CAF",                              notes: "" },
  { storeNo: "147", companyName: "Mavens",                           notes: "" },
  { storeNo: "148", companyName: "Mavens",                           notes: "" },
  { storeNo: "149", companyName: "Aston Martin",                     notes: "" },
  { storeNo: "151", companyName: "Aston Martin",                     notes: "" },
  { storeNo: "152", companyName: "Dr. Remon Mounir",                 notes: "" },
  { storeNo: "155", companyName: "منعلقات وستائر",                  notes: "مع طيف عبدالفتاح" },
  { storeNo: "155", companyName: "Finance - Office",                 notes: "" },
  { storeNo: "155", companyName: "العقود",                           notes: "" },
  { storeNo: "155", companyName: "الزراعة",                          notes: "" },
  { storeNo: "156", companyName: "Leeds Eco",                        notes: "" },
  { storeNo: "157", companyName: "Leeds Eco",                        notes: "" },
  { storeNo: "158", companyName: "Mavens",                           notes: "" },
  { storeNo: "159", companyName: "Leeds Eco",                        notes: "" },
  { storeNo: "161", companyName: "FM - Gas Room",                    notes: "" },
  { storeNo: "162", companyName: "منعلقات و أمن",                   notes: "" },
  { storeNo: "163", companyName: "Pickl",                            notes: "" },
  { storeNo: "164", companyName: "Mavens",                           notes: "" },
  { storeNo: "200", companyName: "منعلقات و أمن",                   notes: "" },
  { storeNo: "201", companyName: "منعلقات",                         notes: "" },
  { storeNo: "203", companyName: "Vacant",                           notes: "زونج اف سلطا" },
  { storeNo: "204", companyName: "HK - TFM",                        notes: "" },
  { storeNo: "205", companyName: "Stationary Sky",                   notes: "" },
  { storeNo: "206", companyName: "Stationary Sky",                   notes: "" },
  { storeNo: "207", companyName: "Landlord Ayman Hussen",            notes: "" },
  { storeNo: "208", companyName: "Operation Consumables",            notes: "" },
  { storeNo: "209", companyName: "Nurses",                           notes: "" },
  { storeNo: "211", companyName: "Leeds Security",                   notes: "" },
  { storeNo: "212", companyName: "Vacant",                           notes: "" },
  { storeNo: "213", companyName: "TFM",                              notes: "" },
  { storeNo: "214", companyName: "TFM",                              notes: "" },
  { storeNo: "217", companyName: "حسابات Hospitality",              notes: "" },
  { storeNo: "218", companyName: "Em Sherif",                        notes: "" },
  { storeNo: "219", companyName: "AOF - Emecria",                   notes: "موظفة وهند وظيف" },
  { storeNo: "220", companyName: "Vacant",                           notes: "" },
  { storeNo: "221", companyName: "Starcom",                          notes: "" },
  { storeNo: "222", companyName: "مرت يوفيه",                       notes: "" },
  { storeNo: "223", companyName: "Mavens",                           notes: "" },
  { storeNo: "224", companyName: "Mavens",                           notes: "" },
  { storeNo: "225", companyName: "Mavens",                           notes: "" },
  { storeNo: "226", companyName: "Finance",                          notes: "" },
  { storeNo: "227", companyName: "Sky - IT",                         notes: "" },
  { storeNo: "228", companyName: "Brunch & Cake",                    notes: "" },
  { storeNo: "229", companyName: "Brunch & Cake",                    notes: "" },
  { storeNo: "230", companyName: "Sushi - Me",                       notes: "" },
  { storeNo: "231", companyName: "على مالك",                        notes: "" },
  { storeNo: "232", companyName: "Mena - Glass",                     notes: "" },
  { storeNo: "233", companyName: "Mena - Wood",                      notes: "" },
  { storeNo: "234", companyName: "Key Room",                         notes: "" },
  { storeNo: "235", companyName: "مخزن التقنيات",                   notes: "" },
  { storeNo: "236", companyName: "AOF Furniture - Emecria",         notes: "Mr. Shaslash Door" },
  { storeNo: "237", companyName: "السبر ايبله هدايا",               notes: "" },
  { storeNo: "238", companyName: "أورزق",                           notes: "" },
  { storeNo: "239", companyName: "Store Department",                 notes: "مخزن مصاري" },
  { storeNo: "240", companyName: "Kitchen Equipment",                notes: "" },
  { storeNo: "241", companyName: "Starcom",                          notes: "" },
  { storeNo: "242", companyName: "Spider",                           notes: "مبنى واحد خلف مخزن الجناح B2" },
]

async function seed() {
  console.log(`🚀 Seeding ${stores.length} stores...`)
  let count = 0
  for (const store of stores) {
    try {
      await addDoc(collection(db, "stores"), {
        ...store,
        photos: [],
        timestamp: serverTimestamp(),
      })
      count++
      console.log(`✅ [${count}/${stores.length}] مخزن ${store.storeNo} — ${store.companyName}`)
    } catch (err) {
      console.error(`❌ فشل مخزن ${store.storeNo}:`, err.message)
    }
  }
  console.log(`\n🎉 اكتمل! تم إضافة ${count} مخزن بنجاح.`)
  process.exit(0)
}

seed()
