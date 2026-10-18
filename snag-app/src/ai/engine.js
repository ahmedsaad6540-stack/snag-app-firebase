/**
 * 🧠 AI Engine — Central Orchestrator
 * المنسق المركزي لجميع محركات الذكاء الاصطناعي
 */

import { classifyNCRI, getConfidenceBreakdown } from "./ncri.js"
import { analyzeTrends, calculateHealthScore, analyzePeakTimes } from "./analytics.js"
import { getSimilarSnags, detectDuplicates, getSmartSuggestions, analyzeWorkload } from "./suggestions.js"
import { detectHotspots, detectRecurringIssues, detectEscalationPatterns, detectTimeClusters } from "./patterns.js"
import { detectAnomalies } from "./anomaly.js"

/**
 * 🎯 Full AI Analysis — runs all engines on the dataset
 */
export function runFullAnalysis(snags = []) {
  const trends = analyzeTrends(snags)
  const health = calculateHealthScore(snags)
  const peakTimes = analyzePeakTimes(snags)
  const hotspots = detectHotspots(snags)
  const recurring = detectRecurringIssues(snags)
  const escalations = detectEscalationPatterns(snags)
  const timeClusters = detectTimeClusters(snags)
  const anomalies = detectAnomalies(snags)
  const duplicates = detectDuplicates(snags)
  const workload = analyzeWorkload(snags)

  // Generate key insights (top 8 most important findings)
  const insights = generateInsights({
    health, hotspots, recurring, escalations, anomalies, workload, trends, duplicates
  })

  return {
    health,
    trends,
    peakTimes,
    hotspots,
    recurring,
    escalations,
    timeClusters,
    anomalies,
    duplicates,
    workload,
    insights,
    timestamp: Date.now(),
  }
}

/**
 * 🤖 Classify a single snag description with NCRI v2
 */
export function classifyDescription(desc) {
  return classifyNCRI(desc)
}

/**
 * 📊 Get confidence breakdown for a description
 */
export { getConfidenceBreakdown }

/**
 * 💡 Get suggestions for a specific snag
 */
export function suggestForSnag(snag, allSnags) {
  return getSmartSuggestions(snag, allSnags)
}

/**
 * 🔗 Find similar snags
 */
export function findSimilar(description, allSnags) {
  return getSimilarSnags(description, allSnags)
}

/**
 * 🧠 Generate prioritized insights
 */
function generateInsights({ health, hotspots, recurring, escalations, anomalies, workload, trends, duplicates }) {
  const insights = []

  // Health-based insights
  if (health.score < 50) {
    insights.push({
      priority: 1, icon: "🚨", category: "health",
      title: "صحة المبنى حرجة",
      message: `مؤشر الصحة ${health.score}/100 (${health.grade}) — يجب اتخاذ إجراءات فورية`,
      action: "مراجعة جميع الملاحظات العاجلة المفتوحة",
    })
  } else if (health.score < 70) {
    insights.push({
      priority: 2, icon: "⚠️", category: "health",
      title: "صحة المبنى تحتاج تحسين",
      message: `مؤشر الصحة ${health.score}/100 (${health.grade})`,
      action: "معالجة الملاحظات المتأخرة أولاً",
    })
  }

  // Anomaly insights
  anomalies.filter(a => a.severity >= 2).forEach(a => {
    insights.push({
      priority: a.severity === 3 ? 1 : 2, icon: a.icon, category: "anomaly",
      title: a.title, message: a.message, action: "تحقيق فوري",
    })
  })

  // Hotspot insights
  hotspots.filter(h => h.heatLevel === "critical" || h.heatLevel === "high").forEach(h => {
    insights.push({
      priority: 2, icon: "🔥", category: "hotspot",
      title: `بؤرة ساخنة: ${h.location}`,
      message: `${h.total} ملاحظة (${h.open} مفتوحة) — أعلى من المتوسط بـ ${Math.round(h.ratio)}x`,
      action: "جولة تفتيش عاجلة للموقع",
    })
  })

  // Recurring issue insights
  recurring.filter(r => r.severity === "critical" || r.severity === "high").forEach(r => {
    insights.push({
      priority: 2, icon: "🔄", category: "recurring",
      title: `مشكلة متكررة: ${r.trade} في ${r.location}`,
      message: `${r.count} تكرار — ${r.recommendation}`,
      action: "تحقيق جذري مطلوب",
    })
  })

  // Workload insights
  if (workload.urgentOpen > 3) {
    insights.push({
      priority: 1, icon: "🔴", category: "workload",
      title: `${workload.urgentOpen} ملاحظة عاجلة مفتوحة`,
      message: "عدد كبير من الملاحظات العاجلة يحتاج توزيع فوري للفرق",
      action: "توزيع المهام العاجلة على الفرق المتاحة",
    })
  }

  // Trend insights
  trends.predictions?.forEach(p => {
    insights.push({
      priority: 3, icon: "📈", category: "trend",
      title: p.warning,
      message: `متوقع ${p.predictedCount} ملاحظة الأسبوع القادم (ثقة ${p.confidence}%)`,
      action: "تجهيز الفريق المختص مسبقاً",
    })
  })

  // Duplicate insights
  if (duplicates.length > 0) {
    insights.push({
      priority: 3, icon: "📋", category: "duplicate",
      title: `${duplicates.length} مجموعة ملاحظات مكررة محتملة`,
      message: "يوجد ملاحظات متشابهة يمكن دمجها أو ربطها",
      action: "مراجعة التكرارات ودمج المتشابه",
    })
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 8)
}
