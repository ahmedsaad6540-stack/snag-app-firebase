/**
 * 🔊 Notification Sound Engine v2
 * يولد أصوات إشعار مختلفة باستخدام Web Audio API
 * بدون الحاجة لملفات صوتية خارجية
 */

let audioCtx = null
let userInteracted = false

// Track user interaction — required for AudioContext to work
function trackInteraction() {
  userInteracted = true
  document.removeEventListener("click", trackInteraction)
  document.removeEventListener("touchstart", trackInteraction)
  document.removeEventListener("keydown", trackInteraction)
}
document.addEventListener("click", trackInteraction)
document.addEventListener("touchstart", trackInteraction)
document.addEventListener("keydown", trackInteraction)

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume if suspended (browser blocks audio until user gesture)
  if (audioCtx.state === "suspended" && userInteracted) {
    audioCtx.resume()
  }
  return audioCtx
}

/**
 * تشغيل صوت إشعار حسب النوع
 */
export function playNotifSound(type = "default") {
  if (!userInteracted) return // Can't play without user gesture
  
  try {
    const ctx = getCtx()
    if (ctx.state === "suspended") return // Still blocked

    const now = ctx.currentTime

    switch (type) {
      case "add": {
        // نغمة صاعدة مزدوجة (إضافة جديدة)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(523, now)       // C5
        osc.frequency.setValueAtTime(659, now + 0.1)  // E5
        osc.frequency.setValueAtTime(784, now + 0.2)  // G5
        gain.gain.setValueAtTime(0.18, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        osc.start(now)
        osc.stop(now + 0.45)
        break
      }

      case "update": {
        // نغمة متوسطة (تحديث)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "triangle"
        osc.frequency.setValueAtTime(440, now)       // A4
        osc.frequency.setValueAtTime(554, now + 0.12) // C#5
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        osc.start(now)
        osc.stop(now + 0.35)
        break
      }

      case "delete": {
        // نغمة هابطة (حذف)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(659, now)       // E5
        osc.frequency.setValueAtTime(440, now + 0.1)  // A4
        osc.frequency.setValueAtTime(330, now + 0.2)  // E4
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        osc.start(now)
        osc.stop(now + 0.4)
        break
      }

      case "status": {
        // نغمة نجاح (تغيير حالة)
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(587, now)        // D5
        osc.frequency.setValueAtTime(784, now + 0.08) // G5
        osc.frequency.setValueAtTime(988, now + 0.16) // B5
        gain.gain.setValueAtTime(0.18, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
        osc.start(now)
        osc.stop(now + 0.4)
        break
      }

      case "urgent": {
        // نغمة تحذير عاجلة — beep-beep-beep
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = "square"
          osc.frequency.setValueAtTime(880, now + i * 0.15)
          gain.gain.setValueAtTime(0.06, now + i * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1)
          osc.start(now + i * 0.15)
          osc.stop(now + i * 0.15 + 0.1)
        }
        break
      }

      default: {
        // نغمة إشعار عادية
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "sine"
        osc.frequency.setValueAtTime(587, now)       // D5
        osc.frequency.setValueAtTime(784, now + 0.1)  // G5
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.3)
        break
      }
    }
  } catch (err) {
    // Audio blocked by browser — silent fallback
    console.warn("Audio not available:", err)
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission()
  }
}

/**
 * Show a native browser notification (even when tab is inactive)
 */
export function showBrowserNotification(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        vibrate: [200, 100, 200],
        tag: "smartmall-" + Date.now(),
      })
    } catch (e) {
      // ServiceWorker required on some platforms — silent fallback
    }
  }
}
