import React, { useState, useRef, useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"

export default function NotificationCenter({
  notifications,
  unreadCount,
  currentUser,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onNotificationClick
}) {
  const [open, setOpen] = useState(false)
  const popupRef = useRef(null)

  // Close on outside click (desktop) or back gesture
  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [open])

  // Lock body scroll when notification panel is open on mobile
  useEffect(() => {
    if (open && window.innerWidth <= 600) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [open])

  const getIcon = (type) => {
    switch (type) {
      case "add":    return "📝"
      case "update": return "🔄"
      case "status": return "✨"
      case "delete": return "🗑️"
      default:       return "🔔"
    }
  }

  const getAccent = (type) => {
    switch (type) {
      case "add":    return "#3b82f6"
      case "update": return "#f59e0b"
      case "status": return "#10b981"
      case "delete": return "#ef4444"
      default:       return "#6366f1"
    }
  }

  const getTime = (ts) => {
    if (!ts) return "الآن"
    try {
      return formatDistanceToNow(ts.toDate(), { addSuffix: true, locale: ar })
    } catch {
      return "الآن"
    }
  }

  const isUnread = (n) => !n.readBy?.includes(currentUser?.uid)

  return (
    <div style={{ position: "relative" }} ref={popupRef}>
      {/* Bell Button */}
      <button 
        style={{
          background: "rgba(30,41,59,0.7)", border: "1px solid #334155",
          color: "#fff", fontSize: 18, width: 42, height: 42,
          borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center",
          cursor: "pointer", position: "relative", transition: "all 0.2s",
          animation: unreadCount > 0 ? "bellPulse 2s ease-in-out infinite" : "none"
        }}
        onClick={() => setOpen(!open)}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6,
            background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: 10,
            fontWeight: "bold", padding: "2px 7px", borderRadius: 10,
            border: "2px solid #0f172a", minWidth: 20, textAlign: "center",
            animation: "badgeBounce 1.5s ease-in-out infinite"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {open && (
        <div className="notif-overlay" onClick={() => setOpen(false)}>
          <div className="notif-panel" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              padding: "16px 18px", borderBottom: "1px solid #1e293b",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Close button for mobile */}
                <button 
                  onClick={() => setOpen(false)}
                  style={{
                    background: "none", border: "none", color: "#94a3b8",
                    fontSize: 20, cursor: "pointer", padding: "0 4px",
                  }}
                >
                  ✕
                </button>
                <span style={{ fontSize: 18 }}>🔔</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#e2e8f0" }}>الإشعارات</h3>
                {unreadCount > 0 && (
                  <span style={{
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    padding: "3px 10px", borderRadius: 10
                  }}>
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button 
                    style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "6px 8px", borderRadius: 6 }}
                    onClick={onMarkAllAsRead}
                  >
                    ✅ قراءة الكل
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "6px 8px", borderRadius: 6 }}
                    onClick={() => {
                      if (window.confirm("هل أنت متأكد من حذف جميع الإشعارات؟")) {
                        onClearAll()
                      }
                    }}
                  >
                    🗑️ مسح
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: "auto", flex: 1, padding: "4px 0", WebkitOverflowScrolling: "touch" }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 50, textAlign: "center", color: "#475569", fontSize: 14 }}>
                  <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.4 }}>🔕</div>
                  <div>لا توجد إشعارات حالياً</div>
                </div>
              ) : (
                notifications.map((n) => {
                  const accent = getAccent(n.type)
                  const unread = isUnread(n)
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: "flex", gap: 10, padding: "14px 16px",
                        borderBottom: "1px solid rgba(30,41,59,0.5)",
                        alignItems: "flex-start", transition: "all 0.2s",
                        background: unread ? "rgba(59,130,246,0.06)" : "transparent",
                        borderRight: unread ? "3px solid " + accent : "3px solid transparent",
                      }}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: accent + "18", border: "1px solid " + accent + "30",
                        display: "flex", justifyContent: "center", alignItems: "center",
                        fontSize: 17, flexShrink: 0
                      }}>
                        {getIcon(n.type)}
                      </div>

                      {/* Content */}
                      <div
                        style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
                        onClick={() => {
                          if (onNotificationClick) {
                            onNotificationClick(n)
                            setOpen(false) // Auto-close on mobile
                          } else {
                            onMarkAsRead(n.id)
                          }
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{n.senderName}</div>
                        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 6, whiteSpace: "normal", wordWrap: "break-word" }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{getTime(n.timestamp)}</div>
                      </div>

                      {/* Unread dot */}
                      {unread && (
                        <div style={{
                          width: 9, height: 9, borderRadius: "50%",
                          background: "#3b82f6", flexShrink: 0, marginTop: 6,
                          boxShadow: "0 0 8px rgba(59,130,246,0.5)"
                        }} />
                      )}

                      {/* Delete button */}
                      <button
                        style={{
                          background: "transparent", border: "none",
                          color: "#475569", fontSize: 16, cursor: "pointer",
                          padding: "4px 6px", borderRadius: 6, flexShrink: 0, lineHeight: 1
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(n.id)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 🌟 Live Notification Banner — shown at bottom of screen
 */
export function LiveNotifBanner({ liveToast, onDismiss, onClick }) {
  if (!liveToast) return null

  const accentMap = {
    add: "#3b82f6", update: "#f59e0b", status: "#10b981", delete: "#ef4444"
  }
  const accent = accentMap[liveToast.type] || "#6366f1"

  return (
    <div 
      style={{
        position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 10001, width: "92%", maxWidth: 480, cursor: "pointer",
        animation: "slideUpNotif 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
      onClick={() => {
        if (onClick) onClick(liveToast)
        onDismiss()
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        border: "1px solid " + accent,
        borderRadius: 16, padding: "14px 16px",
        boxShadow: "0 0 30px " + accent + "40, 0 20px 50px rgba(0,0,0,0.5)",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: accent + "20", border: "1px solid " + accent + "40",
          display: "grid", placeItems: "center", flexShrink: 0
        }}>
          <span style={{ fontSize: 24 }}>{liveToast.icon}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", marginBottom: 2 }}>{liveToast.senderName}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{liveToast.message}</div>
        </div>
        <div style={{
          background: accent + "25", color: accent,
          fontSize: 10, fontWeight: 800, padding: "4px 10px",
          borderRadius: 8, flexShrink: 0
        }}>الآن</div>
      </div>
    </div>
  )
}
