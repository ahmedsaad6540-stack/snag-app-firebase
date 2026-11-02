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
import { doc, setDoc, onSnapshot } from "firebase/firestore"
import { auth, db } from "../lib/firebase.js"
import { resolveUserPermissions, ROLE_PRESETS } from "../constants/permissions.js"

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let unsubUserDoc = null

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      if (unsubUserDoc) {
        unsubUserDoc()
        unsubUserDoc = null
      }

      if (u) {
        const userDocRef = doc(db, "users", u.uid)
        unsubUserDoc = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data()
              if (data.deleted) {
                await signOut(auth)
                setError("تم إزالة هذا الحساب من قبل مدير النظام. / Account removed by System Admin.")
                setUser(null)
                setLoading(false)
                return
              }
              if (data.disabled) {
                await signOut(auth)
                setError("تم تعطيل هذا الحساب من قبل مدير النظام. / Account disabled by System Admin.")
                setUser(null)
                setLoading(false)
                return
              }

              const enrichedUser = {
                uid: u.uid,
                email: u.email || data.email,
                displayName: data.displayName || u.displayName || u.email,
                role: data.role || "user",
                rolePreset: data.rolePreset || (data.role === "admin" ? "admin" : "supervisor"),
                permissions: data.permissions || null,
                jobTitle: data.jobTitle || "",
                department: data.department || "",
                approved: data.approved !== false,
              }
              enrichedUser.resolvedPermissions = resolveUserPermissions(enrichedUser)
              setUser(enrichedUser)
              setLoading(false)
            } else {
              await signOut(auth)
              setError("هذا الحساب تم إزالته من قبل مدير النظام. / Account removed by System Admin.")
              setUser(null)
              setLoading(false)
            }
          },
          (err) => {
            console.warn("User profile snapshot fallback:", err.message)
            const fallbackUser = {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || u.email,
              role: "user",
              rolePreset: "supervisor",
              permissions: null,
              approved: false,
            }
            fallbackUser.resolvedPermissions = resolveUserPermissions(fallbackUser)
            setUser(fallbackUser)
            setLoading(false)
          }
        )
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      if (unsubUserDoc) unsubUserDoc()
      unsubAuth()
    }
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
      const defaultPreset = ROLE_PRESETS.supervisor
      // Save as pending user — needs admin approval
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        displayName,
        role: "user",
        rolePreset: "supervisor",
        permissions: {
          privileges: { ...defaultPreset.privileges },
          matrix: JSON.parse(JSON.stringify(defaultPreset.matrix)),
          allowedTrades: "all",
        },
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
    "auth/invalid-email":            "البريد الإلكتروني غير صالح / Invalid email address",
    "auth/user-disabled":            "تم تعطيل هذا الحساب / This account has been disabled",
    "auth/user-not-found":           "لا يوجد حساب بهذا البريد الإلكتروني / User not found",
    "auth/wrong-password":           "كلمة المرور غير صحيحة / Incorrect password",
    "auth/email-already-in-use":     "هذا البريد مسجل بالفعل / Email is already registered",
    "auth/weak-password":            "كلمة المرور ضعيفة (6 أحرف على الأقل) / Weak password (min 6 chars)",
    "auth/too-many-requests":        "محاولات كثيرة، حاول لاحقاً / Too many attempts, try again later",
    "auth/invalid-credential":       "بيانات الدخول غير صحيحة / Invalid login credentials",
    "auth/network-request-failed":   "خطأ في الاتصال بالإنترنت / Network connection error",
  }
  return map[code] || "حدث خطأ غير متوقع / An unexpected error occurred"
}
