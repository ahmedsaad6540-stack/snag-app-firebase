import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "firebase/firestore"
import { db } from "../lib/firebase.js"

const LISTS_COL = "custom_lists"

export function useCustomLists(currentUser) {
  const [customLists, setCustomLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!currentUser) {
      setCustomLists([])
      setError(null)
      setLoading(false)
      return
    }
    const q = query(collection(db, LISTS_COL), orderBy("timestamp", "asc"))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCustomLists(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        console.error("Firestore error:", err)
        setError(err.message)
        setLoading(false)
      }
    )
    return unsub
  }, [currentUser?.uid])

  async function addCustomList(name) {
    try {
      await addDoc(collection(db, LISTS_COL), {
        name,
        timestamp: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  async function removeCustomList(id) {
    try {
      await deleteDoc(doc(db, LISTS_COL, id))
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  return { customLists, loading, error, addCustomList, removeCustomList }
}
