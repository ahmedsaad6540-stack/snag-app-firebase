import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "../lib/firebase.js"

const STORES_COL = "stores"

export function useStores(notify) {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, STORES_COL), orderBy("timestamp", "desc")),
      (snap) => {
        setStores(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

  async function addStore(data) {
    try {
      await addDoc(collection(db, STORES_COL), {
        ...data,
        timestamp: serverTimestamp(),
      })
      if (notify) notify("add", `تم إضافة مخزن جديد: ${data.storeNo || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function updateStore(id, data) {
    try {
      await updateDoc(doc(db, STORES_COL, id), data)
      if (notify) notify("update", `تم تعديل بيانات المخزن: ${data.storeNo || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function removeStore(id) {
    try {
      await deleteDoc(doc(db, STORES_COL, id))
      if (notify) notify("delete", "تم حذف المخزن من السجل")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function wipeAllStores() {
    try {
      const proms = stores.map(s => deleteDoc(doc(db, STORES_COL, s.id)))
      await Promise.all(proms)
      if (notify) notify("delete", "تم مسح جميع بيانات المخازن")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  return { stores, loading, error, addStore, updateStore, removeStore, wipeAllStores }
}
