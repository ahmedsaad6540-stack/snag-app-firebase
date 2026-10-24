"use strict";

/**
 * Operational Analytics & Health Index Engine
 * Ported from snag-app/src/ai/analytics.js for Park Street Operations Slack App.
 */

function isOpenStatus(status) {
  return status !== "closed" && status !== "resolved";
}

function isUrgentPriority(priority) {
  return priority === "urgent" || priority === "high";
}

function parseDateMs(val) {
  if (!val) return Date.now();
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function computeKPIs(snags = [], parkInspection = null, restroomInspections = []) {
  const total = snags.length;
  const open = snags.filter((s) => s.status === "open").length;
  const inProgress = snags.filter((s) => s.status === "in_progress" || s.status === "in-progress").length;
  const review = snags.filter((s) => s.status === "review").length;
  const closed = snags.filter((s) => !isOpenStatus(s.status)).length;
  const activeCount = total - closed;
  const urgentOpen = snags.filter((s) => isOpenStatus(s.status) && isUrgentPriority(s.priority)).length;

  const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 100;

  // Mean Time To Resolution (MTTR) in hours
  let totalResHours = 0;
  let resolvedWithDates = 0;
  for (const s of snags) {
    if (!isOpenStatus(s.status) && s.createdAt && (s.updatedAt || s.closedAt || s.resolvedDate)) {
      const start = parseDateMs(s.createdAt);
      const end = parseDateMs(s.closedAt || s.resolvedDate || s.updatedAt);
      if (end >= start) {
        totalResHours += (end - start) / (1000 * 60 * 60);
        resolvedWithDates += 1;
      }
    }
  }
  const mttrHours = resolvedWithDates > 0 ? Number((totalResHours / resolvedWithDates).toFixed(1)) : 4.2;

  // Overdue (>48h open or >8h urgent open)
  const now = Date.now();
  const overdueCount = snags.filter((s) => {
    if (!isOpenStatus(s.status)) return false;
    const ageHours = (now - parseDateMs(s.createdAt)) / (1000 * 60 * 60);
    return isUrgentPriority(s.priority) ? ageHours > 8 : ageHours > 48;
  }).length;

  // Park Street Inspection metrics
  const parkItems = parkInspection && parkInspection.items ? Object.values(parkInspection.items) : [];
  const parkTotal = 51;
  const parkChecked = parkItems.length;
  const parkOk = parkItems.filter((i) => i.status === "ok").length;
  const parkSnags = parkItems.filter((i) => i.status === "snag").length;
  const parkFollowup = parkItems.filter((i) => i.status === "followup").length;
  const parkCompliance = parkChecked > 0 ? Math.round((parkOk / parkChecked) * 100) : 100;

  // Restroom metrics
  let restroomInspectedSlots = 0;
  let restroomDefectSlots = 0;
  let confirmedRestrooms = 0;
  for (const doc of restroomInspections) {
    if (doc.confirmed) confirmedRestrooms += 1;
    const items = doc.items ? Object.values(doc.items) : [];
    for (const item of items) {
      restroomInspectedSlots += 1;
      if ((Number(item.bad) || 0) > 0 || item.status === "تالف" || item.status === "ناقص" || item.status === "يحتاج نظافة") {
        restroomDefectSlots += 1;
      }
    }
  }

  return {
    total,
    open,
    inProgress,
    review,
    closed,
    activeCount,
    urgentOpen,
    overdueCount,
    resolutionRate,
    mttrHours,
    parkInspection: {
      total: parkTotal,
      checked: parkChecked,
      ok: parkOk,
      snag: parkSnags,
      followup: parkFollowup,
      complianceRate: parkCompliance
    },
    restrooms: {
      totalRestrooms: 50,
      totalSlots: 1450,
      confirmedRestrooms,
      inspectedSlots: restroomInspectedSlots,
      defectSlots: restroomDefectSlots
    }
  };
}

function computeDistributions(snags = []) {
  const byTrade = {};
  const byLocation = {};
  const byPriority = { urgent: 0, high: 0, medium: 0, normal: 0, low: 0 };
  const byStatus = { open: 0, in_progress: 0, review: 0, closed: 0 };
  const bySector = {
    security: 0,
    "customer-journey": 0,
    landscape: 0,
    "traffic-parking": 0
  };
  const byType = { maintenance: 0, operations: 0, cleanliness: 0 };

  for (const s of snags) {
    const trade = s.trade || "Civil";
    const loc = s.location || "Plaza";
    const prio = s.priority || "normal";
    const status = s.status === "resolved" ? "closed" : (s.status || "open");
    const sector = s.sector || "customer-journey";
    const type = s.type || "maintenance";

    byTrade[trade] = (byTrade[trade] || 0) + 1;
    byLocation[loc] = (byLocation[loc] || 0) + 1;
    byPriority[prio] = (byPriority[prio] || 0) + 1;
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (bySector[sector] !== undefined) bySector[sector] += 1;
    byType[type] = (byType[type] || 0) + 1;
  }

  const topTrades = Object.entries(byTrade)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topLocations = Object.entries(byLocation)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    byTrade,
    byLocation,
    byPriority,
    byStatus,
    bySector,
    byType,
    topTrades,
    topLocations
  };
}

function computeHealthIndex(kpis) {
  let score = 100;
  // Penalize open urgent snags
  score -= Math.min(35, kpis.urgentOpen * 7);
  // Penalize overdue snags
  score -= Math.min(20, kpis.overdueCount * 4);
  // Penalize low resolution rate when total > 0
  if (kpis.total > 0) {
    score -= Math.round((100 - kpis.resolutionRate) * 0.2);
  }
  // Factor in Park Street inspection snags
  if (kpis.parkInspection) {
    score -= Math.min(15, kpis.parkInspection.snag * 2);
  }
  // Factor in Restroom defects
  if (kpis.restrooms) {
    score -= Math.min(15, Math.floor(kpis.restrooms.defectSlots * 1.5));
  }

  const finalScore = Math.max(10, Math.min(100, score));
  let grade = "A";
  let labelAr = "ممتاز — استقرار تشغيلي عالٍ";
  if (finalScore < 55) {
    grade = "D";
    labelAr = "حرج — يتطلب تدخلاً فورياً";
  } else if (finalScore < 70) {
    grade = "C";
    labelAr = "متوسط — يوجد ضغط تشغيلي";
  } else if (finalScore < 85) {
    grade = "B";
    labelAr = "جيد — أداء مستقر مع ملاحظات محدودة";
  }

  return {
    score: finalScore,
    grade,
    labelAr
  };
}

module.exports = {
  computeKPIs,
  computeDistributions,
  computeHealthIndex
};
