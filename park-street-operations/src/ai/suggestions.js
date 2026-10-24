"use strict";

/**
 * Proactive Operational Suggestions & Action Generator
 * Ported from snag-app/src/ai/suggestions.js for Park Street Operations Slack App.
 */

function generateSuggestions({ kpis, hotspots = [], recurring = [], anomalies = [], duplicates = [] }) {
  const suggestions = [];

  if (kpis.urgentOpen > 0) {
    suggestions.push({
      id: "sug-urgent-dispatch",
      priority: "urgent",
      category: "SLA & Safety",
      titleAr: `توجيه فوري لمعالجة ${kpis.urgentOpen} بلاغ عاجل`,
      actionAr: "مراجعة البلاغات العاجلة المفتوحة وتكليف المشرف المناوب بمتابعتها خلال ساعتين."
    });
  }

  if (hotspots.length > 0 && hotspots[0].open >= 2) {
    const top = hotspots[0];
    suggestions.push({
      id: "sug-hotspot-sweep",
      priority: "high",
      category: "Spatial Hotspot",
      titleAr: `حملة صيانة مركزة في ${top.location}`,
      actionAr: `الموقع يتصدر البؤر الساخنة بـ ${top.open} بلاغات مفتوحة (التخصص الأبرز: ${top.dominantTrade}).`
    });
  }

  if (recurring.length > 0) {
    const rec = recurring[0];
    suggestions.push({
      id: "sug-preventive-maint",
      priority: "medium",
      category: "Preventive Maintenance",
      titleAr: `جدولة صيانة وقائية لتخصص ${rec.trade} في ${rec.location}`,
      actionAr: `تكررت البلاغات ${rec.count} مرات في نفس النطاق؛ يوصى بفحص جذري بدلاً من الإصلاح المؤقت.`
    });
  }

  if (kpis.parkInspection && kpis.parkInspection.checked < 51) {
    const remaining = 51 - kpis.parkInspection.checked;
    suggestions.push({
      id: "sug-complete-park-check",
      priority: "normal",
      category: "Daily Inspection",
      titleAr: `استكمال جولة فحص Park Street (${remaining} بند متبقٍ)`,
      actionAr: "استكمال فحص القطاعات الأربعة لضمان تغطية الـ 51 بنداً اليومية."
    });
  }

  if (kpis.restrooms && kpis.restrooms.defectSlots > 0) {
    suggestions.push({
      id: "sug-restroom-defects",
      priority: "high",
      category: "Restrooms Center",
      titleAr: `تحويل ${kpis.restrooms.defectSlots} أعطال بالحمامات إلى أوامر عمل`,
      actionAr: "استخدم زر ترحيل أعطال الحمام إلى SNAG لضمان متابعة فرق السباكة والكهرباء والنظافة."
    });
  }

  if (duplicates.length > 0) {
    suggestions.push({
      id: "sug-merge-duplicates",
      priority: "normal",
      category: "Data Hygiene",
      titleAr: `مراجعة ${duplicates.length} بلاغات يشتبه في تكرارها`,
      actionAr: "دمج أو إغلاق البلاغات المكررة في نفس الموقع لتوحيد جهود الفنيين."
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "sug-steady-state",
      priority: "normal",
      category: "Operations",
      titleAr: "العمليات مستقرة — استمر في الجولات الدورية",
      actionAr: "جميع المؤشرات ضمن النطاق الآمن؛ يوصى باستكمال جولات التفتيش الوقائية."
    });
  }

  return suggestions;
}

module.exports = {
  generateSuggestions
};
