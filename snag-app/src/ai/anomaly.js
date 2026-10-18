/**
 * ⚠️ Anomaly Detection Engine
 * محرك كشف الشذوذ — ينبه عند حدوث أي شيء غير طبيعي
 */

/**
 * كشف جميع أنواع الشذوذ
 */
export function detectAnomalies(snags = []) {
  if (snags.length < 5) return []
  const anomalies = []
  
  anomalies.push(...detectVolumeAnomalies(snags))
  anomalies.push(...detectPriorityAnomalies(snags))
  anomalies.push(...detectResolutionAnomalies(snags))
  anomalies.push(...detectStaleIssues(snags))

  return anomalies.sort((a, b) => b.severity - a.severity)
}

/**
 * شذوذ حجم — ارتفاع/انخفاض مفاجئ في عدد الملاحظات
 */
function detectVolumeAnomalies(snags) {
  const DAY = 86400000
  const now = Date.now()
  const anomalies = []

  // Count snags per day for last 14 days
  const daily = Array(14).fill(0)
  snags.forEach(s => {
    const ts = getTs(s)
    if (!ts) return
    const dayIndex = Math.floor((now - ts) / DAY)
    if (dayIndex >= 0 && dayIndex < 14) daily[dayIndex]++
  })

  const today = daily[0]
  const avg = daily.slice(1, 8).reduce((a, b) => a + b, 0) / 7 || 1 // Average of last 7 days excluding today
  
  if (today > avg * 2.5 && today > 3) {
    anomalies.push({
      type: "volume_spike",
      icon: "📈",
      title: "ارتفاع حاد في عدد الملاحظات",
      message: `اليوم تم تسجيل ${today} ملاحظة مقابل متوسط ${Math.round(avg)} — ارتفاع ${Math.round((today/avg-1)*100)}%`,
      severity: 3,
      level: "critical",
    })
  } else if (today > avg * 1.5 && today > 2) {
    anomalies.push({
      type: "volume_increase",
      icon: "📊",
      title: "زيادة ملحوظة في الملاحظات",
      message: `عدد ملاحظات اليوم (${today}) أعلى من المعتاد (${Math.round(avg)})`,
      severity: 1,
      level: "warning",
    })
  }

  return anomalies
}

/**
 * شذوذ أولوية — تركيز غير عادي للملاحظات العاجلة
 */
function detectPriorityAnomalies(snags) {
  const anomalies = []
  const DAY = 86400000
  const now = Date.now()
  
  const recent = snags.filter(s => {
    const ts = getTs(s)
    return ts && (now - ts) < DAY * 7
  })

  if (recent.length < 3) return anomalies

  const urgentRatio = recent.filter(s => s.priority === "urgent").length / recent.length

  if (urgentRatio > 0.5 && recent.filter(s => s.priority === "urgent").length > 3) {
    anomalies.push({
      type: "priority_concentration",
      icon: "🚨",
      title: "تركيز عالٍ للملاحظات العاجلة",
      message: `${Math.round(urgentRatio * 100)}% من ملاحظات هذا الأسبوع عاجلة — يُنصح بتحقيق فوري`,
      severity: 3,
      level: "critical",
    })
  } else if (urgentRatio > 0.3) {
    anomalies.push({
      type: "priority_elevated",
      icon: "⚡",
      title: "نسبة عاجل مرتفعة",
      message: `${Math.round(urgentRatio * 100)}% من الملاحظات عاجلة هذا الأسبوع`,
      severity: 2,
      level: "warning",
    })
  }

  return anomalies
}

/**
 * شذوذ حل — ملاحظات تأخر حلها بشكل غير طبيعي
 */
function detectResolutionAnomalies(snags) {
  const anomalies = []
  const DAY = 86400000
  const now = Date.now()

  const stale = snags.filter(s => {
    if (s.status === "closed") return false
    const ts = getTs(s)
    return ts && (now - ts) > DAY * 14
  })

  if (stale.length >= 3) {
    anomalies.push({
      type: "resolution_delay",
      icon: "⏰",
      title: "تأخر في معالجة الملاحظات",
      message: `${stale.length} ملاحظة مفتوحة منذ أكثر من أسبوعين — يُنصح بمراجعة الأولويات`,
      severity: 2,
      level: "warning",
    })
  }

  // Urgent issues open > 3 days
  const urgentStale = snags.filter(s => {
    if (s.status === "closed" || s.priority !== "urgent") return false
    const ts = getTs(s)
    return ts && (now - ts) > DAY * 3
  })

  if (urgentStale.length > 0) {
    anomalies.push({
      type: "urgent_delay",
      icon: "🔴",
      title: "ملاحظات عاجلة متأخرة",
      message: `${urgentStale.length} ملاحظة عاجلة مفتوحة منذ أكثر من 3 أيام!`,
      severity: 3,
      level: "critical",
    })
  }

  return anomalies
}

/**
 * كشف الملاحظات الراكدة (في حالة "قيد التنفيذ" لفترة طويلة)
 */
function detectStaleIssues(snags) {
  const anomalies = []
  const DAY = 86400000
  const now = Date.now()

  const staleInProgress = snags.filter(s => {
    if (s.status !== "in-progress") return false
    const ts = getTs(s)
    return ts && (now - ts) > DAY * 10
  })

  if (staleInProgress.length >= 2) {
    anomalies.push({
      type: "stale_progress",
      icon: "🟡",
      title: "ملاحظات عالقة في التنفيذ",
      message: `${staleInProgress.length} ملاحظة في "قيد التنفيذ" منذ أكثر من 10 أيام — تحتاج متابعة`,
      severity: 2,
      level: "warning",
    })
  }

  return anomalies
}

function getTs(s) {
  if (!s?.timestamp) return null
  if (typeof s.timestamp.toDate === "function") return s.timestamp.toDate().getTime()
  if (s.timestamp.seconds) return s.timestamp.seconds * 1000
  const d = new Date(s.timestamp)
  return isNaN(d) ? null : d.getTime()
}
