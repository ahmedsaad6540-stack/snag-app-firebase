/**
 * useSnags v3 – Firestore-Only Architecture (لا يعتمد على Storage)
 *
 * المعمارية الجديدة:
 * - الصور تُضغط عند الإضافة (في useAttachments) إلى <40KB
 * - تُحفظ مباشرة كـ dataUrl في مستند Firestore
 * - لا حاجة لـ Firebase Storage نهائياً = لا فشل = لا تعليق
 */

import { useEffect, useMemo, useState } from "react"
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDocs
} from "firebase/firestore"
import { db } from "../lib/firebase.js"
import { genId } from "../constants/index.js"

const SNAGS_COL = "snags"

export function useSnags(notify) {
  const [snags,   setSnags]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // ── Real-time listener ───────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, SNAGS_COL), orderBy("timestamp", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setSnags(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error("Firestore error:", err)
        setError(err.message)
        setLoading(false)
      }
    )
    return unsub
  }, [])

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      snags.length,
    open:       snags.filter(s => s.status === "open").length,
    inProgress: snags.filter(s => s.status === "in-progress").length,
    urgent:     snags.filter(s => s.priority === "urgent").length,
    closed:     snags.filter(s => s.status === "closed").length,
  }), [snags])

  // ── Add (Firestore-only — no Storage dependency) ────────────────────────
  async function addSnag(formData, attachments) {
    const snagId = genId()

    // المرفقات مضغوطة مسبقاً من useAttachments، نحفظها مباشرة
    const savedAttachments = attachments.map(f => ({
      id:   f.id,
      name: f.name,
      size: f.size,
      type: f.type,
      dataUrl: f.dataUrl,   // صورة مضغوطة ~30-40KB أو ملف صغير
    }))

    try {
      const docRef = await addDoc(collection(db, SNAGS_COL), {
        ...formData,
        description: formData.description.trim(),
        attachments: savedAttachments,
        timestamp:   serverTimestamp(),
        snagId,
      })
      if (notify) notify("add", `تم إضافة ملاحظة جديدة: ${formData.description.substring(0, 30)}...`, docRef.id)
    } catch (err) {
      console.error("Firestore save error:", err)

      // إذا فشل بسبب حجم المستند، نحاول بدون بيانات الصور
      if (attachments.length > 0) {
        console.warn("Retrying without image data...")
        const metaOnly = attachments.map(f => ({
          id: f.id, name: f.name, size: f.size, type: f.type, dataUrl: null,
        }))
        try {
          const docRef = await addDoc(collection(db, SNAGS_COL), {
            ...formData,
            description: formData.description.trim(),
            attachments: metaOnly,
            timestamp:   serverTimestamp(),
            snagId,
          })
          alert("⚠️ تم حفظ الملاحظة لكن بدون صور (حجم الملفات كبير)")
          if (notify) notify("add", `تم إضافة ملاحظة (بدون صور): ${formData.description.substring(0, 30)}...`, docRef.id)
          return
        } catch (e2) {
          // حتى بدون صور فشل
        }
      }

      alert("❌ فشل حفظ الملاحظة: " + err.message)
      throw err
    }
  }

  // ── Cycle status ─────────────────────────────────────────────────────────
  async function cycleStatus(id) {
    try {
      const snag = snags.find(s => s.id === id)
      if (!snag) return
      const next =
        snag.status === "open"        ? "in-progress" :
        snag.status === "in-progress" ? "closed"      : "open"
      await updateDoc(doc(db, SNAGS_COL, id), { status: next })
      
      let statusAr = next === "open" ? "مفتوح" : next === "in-progress" ? "قيد التنفيذ" : "مغلق"
      if (notify) notify("status", `تغيرت حالة الملاحظة إلى: ${statusAr}`, id)
    } catch (err) {
      console.error(err)
      alert("خطأ أثناء تغيير الحالة: " + err.message)
    }
  }

  // ── Delete snag ──────────────────────────────────────────────────────────
  async function removeSnag(id) {
    try {
      const snag = snags.find(s => s.id === id)
      await deleteDoc(doc(db, SNAGS_COL, id))
      if (notify && snag) notify("delete", `تم حذف ملاحظة: ${snag.description.substring(0, 30)}...`)
    } catch (err) {
      console.error(err)
      alert("خطأ أثناء الحذف: " + err.message)
    }
  }

  // ── Update snag fields ──────────────────────────────────────────────────
  async function updateSnag(id, updates) {
    await updateDoc(doc(db, SNAGS_COL, id), updates)
    if (notify) notify("update", "تم تعديل بيانات الملاحظة", id)
  }

  // ── Merge imported JSON ───────────────────────────────────────────────────
  async function mergeImported(imported) {
    const existingIds = new Set(snags.map(s => s.snagId || s.id))
    const newItems    = imported.filter(s => !existingIds.has(s.snagId || s.id))
    await Promise.all(
      newItems.map(item =>
        addDoc(collection(db, SNAGS_COL), { ...item, timestamp: serverTimestamp() })
      )
    )
    return newItems.length
  }

  // ── Wipe All ──────────────────────────────────────────────────────────────
  async function wipeAll() {
    try {
      const snap = await getDocs(collection(db, SNAGS_COL))
      const batchList = []
      snap.forEach(d => batchList.push(d.id))
      // Delete in chunks to avoid overwhelming if there are too many, but simple loop is fine for now
      await Promise.all(batchList.map(id => deleteDoc(doc(db, SNAGS_COL, id))))
    } catch (err) {
      console.error(err)
      alert("خطأ أثناء مسح الملاحظات: " + err.message)
    }
  }

  return { snags, stats, loading, error, addSnag, cycleStatus, removeSnag, updateSnag, mergeImported, wipeAll }
}
