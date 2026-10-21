"use strict";

/**
 * Anomaly Detection & Duplicate / Stale Ticket Finder
 * Ported from snag-app/src/ai/anomaly.js for Park Street Operations Slack App.
 */

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function jaccardSimilarity(aTokens, bTokens) {
  if (!aTokens.length || !bTokens.length) return 0;
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function detectDuplicates(snags = [], threshold = 0.5) {
  const active = snags.filter((s) => s.status !== "closed" && s.status !== "resolved");
  const pairs = [];

  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      const a = active[i];
      const b = active[j];
      if ((a.location || "") !== (b.location || "")) continue;
      const sim = jaccardSimilarity(
        tokenize(`${a.title || ""} ${a.description || ""}`),
        tokenize(`${b.title || ""} ${b.description || ""}`)
      );
      if (sim >= threshold) {
        pairs.push({
          firstId: a.id,
          secondId: b.id,
          firstTitle: a.title,
          secondTitle: b.title,
          location: a.location || "Plaza",
          similarity: Math.round(sim * 100)
        });
      }
    }
  }
  return pairs.sort((a, b) => b.similarity - a.similarity);
}

function detectAnomalies(snags = [], restroomInspections = []) {
  const anomalies = [];

  // 1. Urgent snags open without progress
  const urgentStuck = snags.filter(
    (s) => (s.priority === "urgent" || s.priority === "high") && s.status === "open"
  );
  if (urgentStuck.length > 0) {
    anomalies.push({
      id: "anom-urgent-open",
      severity: "high",
      titleAr: `${urgentStuck.length} بلاغات عاجلة لم تبدأ معالجتها بعد`,
      detailAr: `يوجد ${urgentStuck.length} بلاغ بأولوية عاجلة في حالة Open دون تحويل إلى In Progress.`,
      affectedCount: urgentStuck.length
    });
  }

  // 2. Trade bottleneck (>= 3 open tickets in same trade)
  const openByTrade = {};
  for (const s of snags) {
    if (s.status !== "closed" && s.status !== "resolved") {
      const tr = s.trade || "Civil";
      openByTrade[tr] = (openByTrade[tr] || 0) + 1;
    }
  }
  for (const [trade, count] of Object.entries(openByTrade)) {
    if (count >= 3) {
      anomalies.push({
        id: `anom-trade-${trade}`,
        severity: "medium",
        titleAr: `تكدس بلاغات مفتوحة في قسم ${trade}`,
        detailAr: `يوجد ${count} بلاغات نشطة مسجلة على تخصص ${trade} تتطلب إعادة توزيع الفرق.`,
        affectedCount: count
      });
    }
  }

  // 3. Restroom repeated defects
  for (const doc of restroomInspections) {
    const items = doc.items ? Object.values(doc.items) : [];
    const defects = items.filter(
      (it) => (Number(it.bad) || 0) > 0 || it.status === "تالف" || it.status === "ناقص" || it.status === "يحتاج نظافة"
    );
    if (defects.length >= 3) {
      anomalies.push({
        id: `anom-restroom-${doc.restroomId}`,
        severity: "high",
        titleAr: `تعدد أعطال في حمام ${doc.restroomName || doc.restroomId}`,
        detailAr: `تم رصد ${defects.length} بنود غير سليمة في هذا الحمام خلال التفتيش.`,
        affectedCount: defects.length
      });
    }
  }

  return anomalies;
}

module.exports = {
  detectDuplicates,
  detectAnomalies
};
