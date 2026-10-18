import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "../lib/firebase.js"

const ITEMS_COL = "custom_items"

export function useCustomItems(listId, notify) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!listId) return
    const q = query(
      collection(db, ITEMS_COL),
      where("listId", "==", listId),
      orderBy("timestamp", "desc")
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error("Firestore error:", err)
        setError(err.message)
        setLoading(false)
      }
    )
    return unsub
  }, [listId])

  async function addItem(data) {
    try {
      await addDoc(collection(db, ITEMS_COL), {
        ...data,
        listId,
        timestamp: serverTimestamp(),
      })
      if (notify) notify("add", `تم الإضافة: ${data.title || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function updateItem(id, data) {
    try {
      await updateDoc(doc(db, ITEMS_COL, id), data)
      if (notify) notify("update", `تم التعديل: ${data.title || "-"}`)
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function removeItem(id) {
    try {
      await deleteDoc(doc(db, ITEMS_COL, id))
      if (notify) notify("delete", "تم الحذف بنجاح")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function wipeAllItems() {
    try {
      const proms = items.map(item => deleteDoc(doc(db, ITEMS_COL, item.id)))
      await Promise.all(proms)
      if (notify) notify("delete", "تم مسح جميع البيانات")
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  return { items, loading, error, addItem, updateItem, removeItem, wipeAllItems }
}
