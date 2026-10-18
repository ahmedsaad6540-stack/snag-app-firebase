/**
 * 🔍 Pattern Recognition Engine
 * محرك التعرف على الأنماط — يكتشف المشاكل المتكررة والبؤر الساخنة
 */

/**
 * كشف البؤر الساخنة (المواقع التي تولد مشاكل بشكل مفرط)
 */
export function detectHotspots(snags = []) {
  if (snags.length < 5) return []

  const byLocation = {}
  snags.forEach(s => {
    const loc = s.location || "unknown"
    if (!byLocation[loc]) byLocation[loc] = { total: 0, open: 0, urgent: 0, trades: {} }
    byLocation[loc].total++
    if (s.status !== "closed") byLocation[loc].open++
    if (s.priority === "urgent") byLocation[loc].urgent++
    byLocation[loc].trades[s.trade] = (byLocation[loc].trades[s.trade] || 0) + 1
  })

  const avgPerLocation = snags.length / Math.max(Object.keys(byLocation).length, 1)

  return Object.entries(byLocation)
    .map(([loc, data]) => {
      const ratio = data.total / avgPerLocation
      const isHotspot = ratio > 1.5 || data.urgent > 2 || data.open > 5
      const dominantTrade = Object.entries(data.trades).sort((a, b) => b[1] - a[1])[0]
      
      return {
        location: loc,
        total: data.total,
        open: data.open,
        urgent: data.urgent,
        ratio: Math.round(ratio * 100) / 100,
        isHotspot,
        heatLevel: ratio > 3 ? "critical" : ratio > 2 ? "high" : ratio > 1.5 ? "medium" : "low",
        dominantTrade: dominantTrade ? dominantTrade[0] : null,
        dominantTradeCount: dominantTrade ? dominantTrade[1] : 0,
      }
    })
    .filter(h => h.isHotspot)
    .sort((a, b) => b.ratio - a.ratio)
}

/**
 * كشف المشاكل المتكررة (نفس المكان + نفس النوع)
 */
export function detectRecurringIssues(snags = []) {
  const patterns = {}

  snags.forEach(s => {
    const key = `${s.location}::${s.trade}`
    if (!patterns[key]) patterns[key] = { location: s.location, trade: s.trade, count: 0, snags: [] }
    patterns[key].count++
    patterns[key].snags.push(s.id)
  })

  return Object.values(patterns)
    .filter(p => p.count >= 3)
    .sort((a, b) => b.count - a.count)
    .map(p => ({
      ...p,
      severity: p.count >= 8 ? "critical" : p.count >= 5 ? "high" : "medium",
      recommendation: p.count >= 5
        ? `مشكلة جذرية في ${p.location} (${p.trade}) — يُنصح بتحقيق شامل`
        : `تكرار ملحوظ — مراقبة مستمرة مطلوبة`,
    }))
}

/**
 * كشف أنماط التصعيد (الملاحظات التي تُعاد فتحها)
 */
export function detectEscalationPatterns(snags = []) {
  // Group by location and check for multiple open issues
  const byLocation = {}
  snags.filter(s => s.status === "open").forEach(s => {
    const loc = s.location || "unknown"
    if (!byLocation[loc]) byLocation[loc] = []
    byLocation[loc].push(s)
  })

  return Object.entries(byLocation)
    .filter(([_, issues]) => issues.length >= 3)
    .map(([loc, issues]) => ({
      location: loc,
      openCount: issues.length,
      urgentCount: issues.filter(s => s.priority === "urgent").length,
      severity: issues.some(s => s.priority === "urgent") ? "critical" : "warning",
      message: `${issues.length} ملاحظة مفتوحة في ${loc} — يُنصح بمعالجة جماعية`,
    }))
    .sort((a, b) => b.openCount - a.openCount)
}

/**
 * تحليل التجميع الزمني (مشاكل كثيرة في وقت قصير = سبب مشترك)
 */
export function detectTimeClusters(snags = []) {
  const HOUR = 3600000
  const clusters = []
  const sorted = [...snags]
    .filter(s => getTs(s))
    .sort((a, b) => (getTs(a) || 0) - (getTs(b) || 0))

  let currentCluster = []
  for (let i = 0; i < sorted.length; i++) {
    const ts = getTs(sorted[i])
    if (currentCluster.length === 0) {
      currentCluster = [sorted[i]]
      continue
    }
    const lastTs = getTs(currentCluster[currentCluster.length - 1])
    if (ts - lastTs < HOUR * 2) {
      currentCluster.push(sorted[i])
    } else {
      if (currentCluster.length >= 3) {
        clusters.push({
          count: currentCluster.length,
          snagIds: currentCluster.map(s => s.id),
          startTime: getTs(currentCluster[0]),
          endTime: getTs(currentCluster[currentCluster.length - 1]),
          trades: [...new Set(currentCluster.map(s => s.trade))],
          locations: [...new Set(currentCluster.map(s => s.location))],
          possibleRootCause: currentCluster.length >= 5
            ? "حدث كبير أو مشكلة منظومية"
            : "تزامن ملحوظ — ربما مرتبطة",
        })
      }
      currentCluster = [sorted[i]]
    }
  }
  // Check last cluster
  if (currentCluster.length >= 3) {
    clusters.push({
      count: currentCluster.length,
      snagIds: currentCluster.map(s => s.id),
      startTime: getTs(currentCluster[0]),
      endTime: getTs(currentCluster[currentCluster.length - 1]),
      trades: [...new Set(currentCluster.map(s => s.trade))],
      locations: [...new Set(currentCluster.map(s => s.location))],
      possibleRootCause: currentCluster.length >= 5 ? "حدث كبير" : "تزامن ملحوظ",
    })
  }

  return clusters
}

function getTs(s) {
  if (!s?.timestamp) return null
  if (typeof s.timestamp.toDate === "function") return s.timestamp.toDate().getTime()
  if (s.timestamp.seconds) return s.timestamp.seconds * 1000
  const d = new Date(s.timestamp)
  return isNaN(d) ? null : d.getTime()
}
