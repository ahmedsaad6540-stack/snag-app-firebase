import React, { useEffect, useRef, useState } from "react"

/**
 * 📷 Live WebRTC Camera Modal with Front/Back Switch + Native Mobile Camera Fallback
 * Calls `onCapture(file)` with a standard `File` object (`image/jpeg`).
 */
export default function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const nativeCamRef = useRef(null)
  const streamRef = useRef(null)

  const [facingMode, setFacingMode] = useState("environment") // "environment" | "user"
  const [camError, setCamError] = useState(null)
  const [starting, setStarting] = useState(true)

  useEffect(() => {
    let active = true
    async function startCamera() {
      setStarting(true)
      setCamError(null)
      stopStream()

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (active) {
          setCamError("المتصفح لا يدعم تشغيل الكاميرا المباشرة. اضغط الزر أدناه لفتح كاميرا الجهاز.")
          setStarting(false)
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (!active) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setStarting(false)
      } catch (err) {
        console.warn("Camera access error:", err)
        if (active) {
          setCamError("تعذر الوصول المباشر للكاميرا (تأكد من السماح بصلاحية الكاميرا في المتصفح أو استخدم زر كاميرا الجهاز أدناه).")
          setStarting(false)
        }
      }
    }

    startCamera()
    return () => {
      active = false
      stopStream()
    }
  }, [facingMode])

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function handleClose() {
    stopStream()
    onClose?.()
  }

  function handleSnap() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: "image/jpeg" })
        stopStream()
        onCapture?.(file)
        onClose?.()
      },
      "image/jpeg",
      0.85
    )
  }

  function handleNativePicked(e) {
    const file = e.target.files?.[0]
    if (file) {
      stopStream()
      onCapture?.(file)
      onClose?.()
    }
    e.target.value = ""
  }

  return (
    <div style={s.overlay} onClick={handleClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#f8fafc" }}>📷 التقاط صورة بالكاميرا</div>
          <button type="button" style={s.closeBtn} onClick={handleClose}>✕</button>
        </div>

        <div style={s.videoWrap}>
          {!camError ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={s.video}
              />
              {starting && (
                <div style={s.statusOverlay}>⏳ جاري تشغيل الكاميرا...</div>
              )}
            </>
          ) : (
            <div style={s.errorBox}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 13, color: "#fca5a5", lineHeight: 1.7 }}>{camError}</div>
            </div>
          )}
        </div>

        <input
          ref={nativeCamRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleNativePicked}
        />

        <div style={s.actions}>
          {!camError && (
            <>
              <button
                type="button"
                style={s.snapBtn}
                onClick={handleSnap}
                disabled={starting}
              >
                📸 التقاط الصورة الآن
              </button>
              <button
                type="button"
                style={s.switchBtn}
                onClick={() => setFacingMode(m => (m === "environment" ? "user" : "environment"))}
                title="تبديل الكاميرا الأمامية / الخلفية"
              >
                🔄 تبديل الكاميرا
              </button>
            </>
          )}
          <button
            type="button"
            style={s.nativeBtn}
            onClick={() => nativeCamRef.current?.click()}
          >
            📱 فتح كاميرا الهاتف الأصلية
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.88)",
    backdropFilter: "blur(6px)",
    zIndex: 12000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 18,
    padding: 16,
    width: "100%",
    maxWidth: 520,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#cbd5e1",
    borderRadius: 8,
    width: 32,
    height: 32,
    cursor: "pointer",
    fontSize: 15,
  },
  videoWrap: {
    position: "relative",
    width: "100%",
    minHeight: 280,
    maxHeight: "60vh",
    background: "#020617",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #1e293b",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    maxHeight: "60vh",
    objectFit: "cover",
    display: "block",
  },
  statusOverlay: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "rgba(2,6,23,0.7)",
    color: "#93c5fd",
    fontWeight: 700,
    fontSize: 14,
  },
  errorBox: {
    padding: 24,
    textAlign: "center",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  snapBtn: {
    flex: 2,
    minWidth: 160,
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    padding: "12px 16px",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  },
  switchBtn: {
    flex: 1,
    minWidth: 120,
    background: "#1e293b",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "11px 12px",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
  },
  nativeBtn: {
    width: "100%",
    background: "#060d1a",
    color: "#93c5fd",
    border: "1px dashed #3b82f6",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
}
