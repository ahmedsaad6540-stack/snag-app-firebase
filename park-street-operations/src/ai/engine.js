"use strict";

/**
 * Unified AI Command Center Engine for Park Street Operations
 * Combines NCRI v2, KPIs, Health Index, Spatial Hotspots, Anomalies, Duplicates & Proactive Suggestions.
 */

const { classifyNCRI, classifyBatch } = require("./ncri");
const { computeKPIs, computeDistributions, computeHealthIndex } = require("./analytics");
const { detectHotspots, detectRecurringIssues } = require("./patterns");
const { detectDuplicates, detectAnomalies } = require("./anomaly");
const { generateSuggestions } = require("./suggestions");

function runFullAnalysis({ snags = [], parkInspection = null, restroomInspections = [] } = {}) {
  const kpis = computeKPIs(snags, parkInspection, restroomInspections);
  const distributions = computeDistributions(snags);
  const health = computeHealthIndex(kpis);
  const hotspots = detectHotspots(snags);
  const recurring = detectRecurringIssues(snags);
  const duplicates = detectDuplicates(snags);
  const anomalies = detectAnomalies(snags, restroomInspections);
  const suggestions = generateSuggestions({
    kpis,
    hotspots,
    recurring,
    anomalies,
    duplicates
  });

  return {
    generatedAt: new Date().toISOString(),
    health,
    kpis,
    distributions,
    hotspots,
    recurring,
    duplicates,
    anomalies,
    suggestions
  };
}

module.exports = {
  classifyNCRI,
  classifyBatch,
  computeKPIs,
  computeDistributions,
  computeHealthIndex,
  detectHotspots,
  detectRecurringIssues,
  detectDuplicates,
  detectAnomalies,
  generateSuggestions,
  runFullAnalysis
};
