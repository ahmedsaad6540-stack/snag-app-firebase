import { initializeApp } from "firebase/app"
import { getFirestore }  from "firebase/firestore"
import { getStorage }    from "firebase/storage"
import { getAuth }       from "firebase/auth"

// ──────────────────────────────────────────────────────────────────────────
// خطوات الإعداد:
// 1. اذهب إلى https://console.firebase.google.com
// 2. أنشئ مشروع جديد أو اختر مشروع موجود
// 3. اذهب إلى Project Settings → General → Your apps → Add app (Web)
// 4. انسخ firebaseConfig والصقه هنا
// 5. فعّل Firestore Database (mode: test لبداية سريعة)
// 6. فعّل Storage
// 7. فعّل Authentication → Email/Password
// ──────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const db      = getFirestore(app)
export const storage = getStorage(app)
export const auth    = getAuth(app)
