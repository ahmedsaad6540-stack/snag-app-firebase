/**
 * 📈 Predictive Analytics Engine
 * محرك التحليلات التنبؤية — يتنبأ بالمشاكل قبل حدوثها
 */

/**
 * تحليل الاتجاهات والأنماط الزمنية
 */
export function analyzeTrends(snags = []) {
  if (snags.length < 3) return { trends: [], predictions: [], seasonalPatterns: [] }

  const now = Date.now()
  const DAY = 86400000
  const WEEK = DAY * 7

  // Group snags by day
  const byDay = {}
  const byWeek = {}
  const byTrade = {}
  const byLocation = {}
  const byTradeWeek = {}

  snags.forEach(s => {
    const ts = getTimestamp(s)
    if (!ts) return
    const dayKey = new Date(ts).toISOString().split("T")[0]
    const weekAgo = Math.floor((now - ts) / WEEK)
    const trade = s.trade || "general"
    const loc = s.location || "unknown"

    byDay[dayKey] = (byDay[dayKey] || 0) + 1
    byWeek[weekAgo] = (byWeek[weekAgo] || 0) + 1
    byTrade[trade] = (byTrade[trade] || 0) + 1
    byLocation[loc] = (byLocation[loc] || 0) + 1

    const twKey = `${trade}-${weekAgo}`
    byTradeWeek[twKey] = (byTradeWeek[twKey] || 0) + 1
  })

  // Calculate trend direction for each trade
  const trends = []
  for (const trade of Object.keys(byTrade)) {
    const thisWeek = byTradeWeek[`${trade}-0`] || 0
    const lastWeek = byTradeWeek[`${trade}-1`] || 0
    const twoWeeks = byTradeWeek[`${trade}-2`] || 0
    const avg = (lastWeek + twoWeeks) / 2 || 1
    const changePercent = Math.round(((thisWeek - avg) / avg) * 100)
    
    trends.push({
      trade,
      thisWeek,
      lastWeek,
      direction: changePercent > 15 ? "up" : changePercent < -15 ? "down" : "stable",
      changePercent,
      severity: Math.abs(changePercent) > 50 ? "high" : Math.abs(changePercent) > 25 ? "medium" : "low",
    })
  }

  // Simple linear prediction for next week
  const predictions = trends
    .filter(t => t.direction === "up" && t.changePercent > 20)
    .map(t => ({
      trade: t.trade,
      predictedCount: Math.round(t.thisWeek * (1 + t.changePercent / 200)),
      confidence: Math.min(85, 50 + Math.abs(t.changePercent) / 2),
      warning: `تخصص ${t.trade} يتصاعد بنسبة ${t.changePercent}% — توقع زيادة الأسبوع القادم`,
    }))

  // Resolution time analysis
  const resolutionTimes = snags
    .filter(s => s.status === "closed" && getTimestamp(s))
    .map(s => {
      const created = getTimestamp(s)
      // Estimate based on status changes if available, otherwise use rough estimate
      return { trade: s.trade, location: s.location, days: Math.max(1, Math.floor((now - created) / DAY)) }
    })

  const avgResolution = {}
  resolutionTimes.forEach(r => {
    if (!avgResolution[r.trade]) avgResolution[r.trade] = { total: 0, count: 0 }
    avgResolution[r.trade].total += r.days
    avgResolution[r.trade].count++
  })

  const resolutionEstimates = Object.entries(avgResolution).map(([trade, data]) => ({
    trade,
    avgDays: Math.round(data.total / data.count),
    count: data.count,
  }))

  return {
    trends: trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)),
    predictions,
    resolutionEstimates,
    dailyVolume: byDay,
    weeklyVolume: byWeek,
    tradeDistribution: byTrade,
    locationDistribution: byLocation,
  }
}

/**
 * حساب مؤشر الصحة العام للمبنى (0-100)
 */
export function calculateHealthScore(snags = []) {
  if (snags.length === 0) return { score: 100, grade: "A+", details: {} }

  const now = Date.now()
  const DAY = 86400000
  const recentSnags = snags.filter(s => {
    const ts = getTimestamp(s)
    return ts && (now - ts) < DAY * 30
  })

  let score = 100

  // Penalty for open urgent issues
  const openUrgent = recentSnags.filter(s => s.status === "open" && s.priority === "urgent").length
  score -= openUrgent * 8

  // Penalty for total open issues
  const openTotal = recentSnags.filter(s => s.status !== "closed").length
  score -= openTotal * 2

  // Penalty for overdue issues (open > 7 days)
  const overdue = recentSnags.filter(s => {
    if (s.status === "closed") return false
    const ts = getTimestamp(s)
    return ts && (now - ts) > DAY * 7
  }).length
  score -= overdue * 5

  // Bonus for closed issues (responsive team)
  const closed = recentSnags.filter(s => s.status === "closed").length
  const closedRatio = recentSnags.length > 0 ? closed / recentSnags.length : 1
  score += Math.round(closedRatio * 15)

  score = Math.max(0, Math.min(100, score))
  const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F"

  return {
    score,
    grade,
    details: {
      openUrgent,
      openTotal,
      overdue,
      closedRatio: Math.round(closedRatio * 100),
      recentTotal: recentSnags.length,
    }
  }
}

/**
 * تحليل أوقات الذروة
 */
export function analyzePeakTimes(snags = []) {
  const byHour = Array(24).fill(0)
  const byDayOfWeek = Array(7).fill(0)

  snags.forEach(s => {
    const ts = getTimestamp(s)
    if (!ts) return
    const d = new Date(ts)
    byHour[d.getHours()]++
    byDayOfWeek[d.getDay()]++
  })

  const peakHour = byHour.indexOf(Math.max(...byHour))
  const peakDay = byDayOfWeek.indexOf(Math.max(...byDayOfWeek))
  const dayNames = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"]

  return {
    byHour,
    byDayOfWeek,
    peakHour,
    peakDayName: dayNames[peakDay],
    peakDay,
    insight: `أكثر أوقات الإبلاغ: الساعة ${peakHour}:00 يوم ${dayNames[peakDay]}`,
  }
}

function getTimestamp(snag) {
  if (!snag.timestamp) return null
  if (typeof snag.timestamp.toDate === "function") return snag.timestamp.toDate().getTime()
  if (snag.timestamp.seconds) return snag.timestamp.seconds * 1000
  const d = new Date(snag.timestamp)
  return isNaN(d) ? null : d.getTime()
}
