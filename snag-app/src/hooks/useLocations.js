import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore"
import { db } from "../lib/firebase.js"
import { LOCATIONS as defaultLocations } from "../constants/index.js"

export function useLocations() {
  const [locations, setLocations] = useState(defaultLocations)
  
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "locations"), (snap) => {
      const customLocations = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        icon: doc.data().icon || "📍"
      }))
      
      // Merge defaults with custom locations
      setLocations([...defaultLocations, ...customLocations])
    })
    
    return unsub
  }, [])

  async function addLocation(name, icon = "📍") {
    try {
      return await addDoc(collection(db, "locations"), {
        name,
        icon,
        timestamp: serverTimestamp()
      })
    } catch (err) {
      console.error("Failed to add location:", err)
      throw err
    }
  }

  async function removeLocation(id) {
    try {
      await deleteDoc(doc(db, "locations", id));
    } catch (err) {
      console.error("Failed to remove location:", err);
      throw err;
    }
  }

  return { locations, addLocation, removeLocation }
}
