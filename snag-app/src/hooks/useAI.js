/**
 * 🧠 useAI — React Hook for AI Intelligence
 * يربط محركات الذكاء الاصطناعي بواجهة المستخدم
 */

import { useMemo } from "react"
import { runFullAnalysis, classifyDescription, getConfidenceBreakdown, suggestForSnag, findSimilar } from "../ai/engine.js"

export function useAI(snags = []) {
  // Run full analysis — memoized to avoid re-computation on every render
  const analysis = useMemo(() => {
    if (snags.length === 0) return null
    return runFullAnalysis(snags)
  }, [snags.length, snags.map(s => s.id + s.status).join(",")])

  // Classify a description in real-time
  function classify(desc) {
    return classifyDescription(desc)
  }

  // Get confidence breakdown
  function breakdown(desc) {
    return getConfidenceBreakdown(desc)
  }

  // Get suggestions for a snag
  function suggest(snag) {
    return suggestForSnag(snag, snags)
  }

  // Find similar snags
  function similar(desc) {
    return findSimilar(desc, snags)
  }

  return {
    analysis,
    classify,
    breakdown,
    suggest,
    similar,
    // Convenience accessors
    health: analysis?.health || { score: 100, grade: "A+", details: {} },
    insights: analysis?.insights || [],
    anomalies: analysis?.anomalies || [],
    hotspots: analysis?.hotspots || [],
    trends: analysis?.trends || { trends: [], predictions: [] },
    workload: analysis?.workload || { totalOpen: 0, urgentOpen: 0 },
    peakTimes: analysis?.peakTimes || null,
    recurring: analysis?.recurring || [],
    duplicates: analysis?.duplicates || [],
  }
}
