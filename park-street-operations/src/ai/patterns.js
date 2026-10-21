"use strict";

/**
 * Pattern Recognition, Spatial Hotspots & Recurrence Detector
 * Ported from snag-app/src/ai/patterns.js for Park Street Operations Slack App.
 */

function detectHotspots(snags = []) {
  const byLocation = {};
  for (const s of snags) {
    const loc = s.location || "Plaza";
    if (!byLocation[loc]) {
      byLocation[loc] = {
        location: loc,
        total: 0,
        open: 0,
        urgent: 0,
        trades: {}
      };
    }
    byLocation[loc].total += 1;
    if (s.status !== "closed" && s.status !== "resolved") {
      byLocation[loc].open += 1;
    }
    if (s.priority === "urgent" || s.priority === "high") {
      byLocation[loc].urgent += 1;
    }
    const trade = s.trade || "Civil";
    byLocation[loc].trades[trade] = (byLocation[loc].trades[trade] || 0) + 1;
  }

  return Object.values(byLocation)
    .map((entry) => {
      const dominantTrade = Object.entries(entry.trades).sort((a, b) => b[1] - a[1])[0];
      const riskScore = entry.open * 3 + entry.urgent * 5 + entry.total;
      return {
        location: entry.location,
        total: entry.total,
        open: entry.open,
        urgent: entry.urgent,
        dominantTrade: dominantTrade ? dominantTrade[0] : "Civil",
        riskScore,
        riskLevel: riskScore >= 15 ? "critical" : riskScore >= 8 ? "elevated" : "normal"
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

function detectRecurringIssues(snags = []) {
  const clusters = {};
  for (const s of snags) {
    const key = `${s.location || "Plaza"}::${s.trade || "Civil"}`;
    if (!clusters[key]) {
      clusters[key] = {
        location: s.location || "Plaza",
        trade: s.trade || "Civil",
        count: 0,
        openCount: 0,
        titles: []
      };
    }
    clusters[key].count += 1;
    if (s.status !== "closed" && s.status !== "resolved") {
      clusters[key].openCount += 1;
    }
    if (s.title && clusters[key].titles.length < 3) {
      clusters[key].titles.push(s.title);
    }
  }

  return Object.values(clusters)
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  detectHotspots,
  detectRecurringIssues
};
