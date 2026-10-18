import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "../lib/firebase.js"

const UNITS_COL = "units"

export function useUnits(notify) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(collection(db, UNITS_COL), orderBy("timestamp", "desc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUnits(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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

  async function addUnit(data) {
    try {
      await addDoc(collection(db, UNITS_COL), {
        ...data,
        timestamp: serverTimestamp(),
      })
      if (notify) notify("add", `تم إضافة وحدة جديدة: ${data.unitName || data.unitNo || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function updateUnit(id, data) {
    try {
      await updateDoc(doc(db, UNITS_COL, id), data)
      if (notify) notify("update", `تم تعديل بيانات الوحدة: ${data.unitName || data.unitNo || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function removeUnit(id) {
    try {
      await deleteDoc(doc(db, UNITS_COL, id))
      if (notify) notify("delete", "تم حذف الوحدة من السجل")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function wipeAllUnits() {
    try {
      const proms = units.map(u => deleteDoc(doc(db, UNITS_COL, u.id)))
      await Promise.all(proms)
      if (notify) notify("delete", "تم مسح جميع بيانات الوحدات")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  return { units, loading, error, addUnit, updateUnit, removeUnit, wipeAllUnits }
}
