import { useState, useEffect } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "../lib/firebase.js"

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Fetch role from Firestore
        try {
          const docSnap = await getDoc(doc(db, "users", u.uid))
          if (docSnap.exists()) {
            const data = docSnap.data()
            if (data.deleted) {
              await signOut(auth)
              setError("تم إزالة هذا الحساب من قبل مدير النظام.")
              setUser(null)
              setLoading(false)
              return
            }
            if (data.disabled) {
              await signOut(auth)
              setError("تم تعطيل هذا الحساب من قبل مدير النظام.")
              setUser(null)
              setLoading(false)
              return
            }
            u.role = data.role
            u.approved = data.approved !== false // existing users without the field are approved
          } else {
            // Document doesn't exist, it means the user was removed by admin
            await signOut(auth)
            setError("هذا الحساب تم إزالته من قبل مدير النظام.")
            setUser(null)
            setLoading(false)
            return
          }
        } catch (e) {
          u.role = "user"
          u.approved = false
        }
      }
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function login(email, password, rememberMe = true) {
    setError(null)
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(translateError(err.code))
      throw err
    }
  }

  async function register(email, password, displayName) {
    setError(null)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName })
      // Save as pending user — needs admin approval
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        displayName,
        role: "user",
        approved: false,
        createdAt: new Date().toISOString()
      })
    } catch (err) {
      setError(translateError(err.code))
      throw err
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return { user, loading, error, login, register, logout, setError }
}

function translateError(code) {
  const map = {
    "auth/invalid-email":            "البريد الإلكتروني غير صالح",
    "auth/user-disabled":            "تم تعطيل هذا الحساب",
    "auth/user-not-found":           "لا يوجد حساب بهذا البريد الإلكتروني",
    "auth/wrong-password":           "كلمة المرور غير صحيحة",
    "auth/email-already-in-use":     "هذا البريد مسجل بالفعل",
    "auth/weak-password":            "كلمة المرور ضعيفة (6 أحرف على الأقل)",
    "auth/too-many-requests":        "محاولات كثيرة، حاول لاحقاً",
    "auth/invalid-credential":       "بيانات الدخول غير صحيحة",
    "auth/network-request-failed":   "خطأ في الاتصال بالإنترنت",
  }
  return map[code] || "حدث خطأ غير متوقع"
}
