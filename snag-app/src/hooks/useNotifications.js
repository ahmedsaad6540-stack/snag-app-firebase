import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, limit } from "firebase/firestore"
import { db } from "../lib/firebase.js"
import toast from "react-hot-toast"
import { playNotifSound, requestNotifPermission, showBrowserNotification } from "../utils/notifSound.js"

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [liveToast, setLiveToast] = useState(null)
  const initialLoad = useRef(true)
  const liveTimer = useRef(null)

  // Request browser notification permission on mount
  useEffect(() => {
    requestNotifPermission()
  }, [])

  // Auto-dismiss live toast after 6 seconds
  useEffect(() => {
    if (liveToast) {
      if (liveTimer.current) clearTimeout(liveTimer.current)
      liveTimer.current = setTimeout(() => setLiveToast(null), 6000)
    }
    return () => { if (liveTimer.current) clearTimeout(liveTimer.current) }
  }, [liveToast])

  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(50))
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(n => !(n.deletedBy || []).includes(currentUser.uid))
      
      // If it's not the initial load, check for new notifications
      if (!initialLoad.current) {
        snap.docChanges().forEach(change => {
          if (change.type === "added") {
            const newNotif = change.doc.data()
            
            let icon = "🔔"
            if (newNotif.type === "add") icon = "📝"
            if (newNotif.type === "update") icon = "🔄"
            if (newNotif.type === "delete") icon = "🗑️"
            if (newNotif.type === "status") icon = "✨"
            
            // 🔊 Play sound
            playNotifSound(newNotif.type)

            // 📢 Show simple toast (in-app)
            toast(icon + " " + newNotif.senderName + ": " + newNotif.message, {
              duration: 5000,
              position: "top-center",
              style: {
                borderRadius: 14,
                background: "linear-gradient(135deg, #0f172a, #1e293b)",
                color: "#e2e8f0",
                border: "1px solid #334155",
                padding: "14px 18px",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                maxWidth: "90vw",
                direction: "rtl",
              },
            })

            // 🌐 Show native browser notification
            showBrowserNotification(
              icon + " " + newNotif.senderName,
              newNotif.message
            )

            // 💫 Set the live banner
            setLiveToast({
              icon,
              senderName: newNotif.senderName,
              message: newNotif.message,
              type: newNotif.type,
              relatedSnagId: newNotif.relatedSnagId || null,
              id: change.doc.id,
            })
          }
        })
      }
      
      setNotifications(docs)
      setLoading(false)
      initialLoad.current = false
    })
    return unsub
  }, [currentUser])

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0
    return notifications.filter(n => !n.readBy?.includes(currentUser.uid)).length
  }, [notifications, currentUser])

  async function notify(type, message, relatedSnagId = null) {
    if (!currentUser) return
    try {
      await addDoc(collection(db, "notifications"), {
        type,
        message,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        relatedSnagId,
        timestamp: serverTimestamp(),
        readBy: [],
        deletedBy: []
      })
    } catch (err) {
      console.error("Failed to push notification:", err)
    }
  }

  async function markAsRead(notificationId) {
    if (!currentUser) return
    const n = notifications.find(n => n.id === notificationId)
    if (!n || n.readBy?.includes(currentUser.uid)) return

    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        readBy: [...(n.readBy || []), currentUser.uid]
      })
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  async function markAllAsRead() {
    if (!currentUser) return
    const unread = notifications.filter(n => !n.readBy?.includes(currentUser.uid))
    await Promise.all(
      unread.map(n => 
        updateDoc(doc(db, "notifications", n.id), {
          readBy: [...(n.readBy || []), currentUser.uid]
        })
      )
    )
  }

  async function deleteNotification(notificationId) {
    if (!currentUser) return
    const n = notifications.find(n => n.id === notificationId)
    if (!n) return
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        deletedBy: [...(n.deletedBy || []), currentUser.uid]
      })
    } catch (err) {
      console.error("Failed to delete notification:", err)
    }
  }

  async function clearAllNotifications() {
    if (!currentUser) return
    try {
      await Promise.all(
        notifications.map(n => 
          updateDoc(doc(db, "notifications", n.id), {
            deletedBy: [...(n.deletedBy || []), currentUser.uid]
          })
        )
      )
    } catch (err) {
      console.error("Failed to clear notifications:", err)
    }
  }

  const dismissLiveToast = useCallback(() => setLiveToast(null), [])

  return { 
    notifications, unreadCount, loading, notify, 
    markAsRead, markAllAsRead, deleteNotification, clearAllNotifications,
    liveToast, dismissLiveToast
  }
}
