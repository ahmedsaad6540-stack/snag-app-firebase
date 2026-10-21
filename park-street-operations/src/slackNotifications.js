"use strict";

/**
 * Fail-closed Slack Notification Routing & PII Redaction Engine
 * Unified from PR #2 (copilot/slack-fail-closed-multiscope) and wired into Park Street Operations Bolt App.
 */

const DEMO_CHANNEL_ID = "C0CAS6S7RR8";

const LIVE_CHANNEL_IDS = Object.freeze({
  security: "C0CAPQKKMFG",
  "customer-journey": "C0CAPQL6Q6A",
  landscape: "C0CBL519ATS",
  "traffic-parking": "C0CALEYSRM3",
  maintenance: "C0CAL8YEMGW",
  housekeeping: "C0CAG0Y9LLT"
});

const STATUS_LABELS = Object.freeze({
  open: "مفتوح",
  "in-progress": "قيد التنفيذ",
  review: "جاهز للمراجعة",
  closed: "مغلق",
  snag: "ملاحظة / عطل",
  followup: "يحتاج متابعة",
  ok: "سليم",
  na: "لم يُفحص"
});

const LOCATION_LABELS = Object.freeze({
  "customer-journey": "رحلة العميل - بارك ستريت",
  "mall-entrances": "بوابات ومداخل بارك ستريت",
  "security-points": "نقاط الأمن والبوابات والكاميرات",
  "landscape-gardens": "الزراعة والمسطحات الخضراء",
  "basement-car-path": "مسار السيارات بالبيزمنت",
  "basement-ramps": "منحدرات ومداخل البيزمنت",
  plaza: "البلازا",
  Plaza: "البلازا",
  bathrooms: "الحمامات",
  Restrooms: "الحمامات",
  "passenger-elevators": "مصاعد الركاب",
  "service-elevators": "مصاعد الخدمات",
  "building-corridors": "ممرات المبنى",
  "service-corridors": "طرق الخدمات",
  "garage-b1": "جراج بيزمنت 1",
  "garage-b2": "جراج بيزمنت 2",
  "emergency-stairs": "سلم الطوارئ",
  roof: "السطح",
  "electrical-rooms": "غرف الكهرباء"
});

const PARK_STREET_SECTORS = Object.freeze({
  security: { channelKey: "security", label: "الأمن والحراسة" },
  "customer-journey": { channelKey: "customer-journey", label: "رحلة العميل" },
  landscape: { channelKey: "landscape", label: "الزراعة واللاند سكيب" },
  "traffic-parking": { channelKey: "traffic-parking", label: "مسار السيارات والبيزمنت" }
});

const TRADE_CHANNEL_KEYS = Object.freeze({
  security: "security",
  "customer-journey": "customer-journey",
  landscape: "landscape",
  "traffic-parking": "traffic-parking"
});

function statusChanged(before, after) {
  return before?.status !== after?.status;
}

function priorityChanged(before, after) {
  return before?.priority !== after?.priority;
}

function shouldNotifyRecord({ collection, eventType, before, after }) {
  if (collection === "snags" || collection === "tickets") {
    if (eventType === "created") return true;
    return (
      eventType === "updated" &&
      (statusChanged(before, after) || priorityChanged(before, after))
    );
  }

  if (collection !== "park_street_snags" && collection !== "park") return false;
  const hasIssue = (record) =>
    record?.status === "snag" || record?.status === "followup";

  if (eventType === "created") return hasIssue(after);
  if (eventType !== "updated") return false;

  const changed = statusChanged(before, after) || priorityChanged(before, after);
  return changed && (hasIssue(before) || hasIssue(after));
}

function safeDemoDecision({ mode, collection, eventType, before, after }) {
  if (
    mode !== "test" ||
    !["snag_integration_tests", "tickets", "park"].includes(collection)
  ) {
    return null;
  }
  if (after?.isDemo !== true) return null;

  if (eventType === "created") {
    if (collection === "park" && !shouldNotifyRecord({ collection: "park", eventType, before, after })) {
      return null;
    }
    return { channelId: DEMO_CHANNEL_ID, eventType };
  }

  if (
    eventType === "updated" &&
    before?.isDemo === true &&
    shouldNotifyRecord({
      collection: collection === "park" ? "park" : "snags",
      eventType,
      before,
      after
    })
  ) {
    return { channelId: DEMO_CHANNEL_ID, eventType };
  }

  return null;
}

function decisionForEvent({
  mode = "off",
  collection,
  eventType,
  documentId,
  before,
  after
}) {
  if (mode === "test") {
    return safeDemoDecision({ mode, collection, eventType, before, after });
  }

  // Live routing is deliberately disabled until production approval and staging verification.
  if (mode !== "live") return null;

  return null;
}

function liveChannelForRecord({ collection, documentId, data }) {
  if (collection === "park_street_snags") {
    const sectorId = String(documentId || "").split("__", 1)[0];
    const sector = PARK_STREET_SECTORS[sectorId];
    return sector ? LIVE_CHANNEL_IDS[sector.channelKey] : null;
  }

  if (collection !== "snags") return null;

  const tradeChannelKey = TRADE_CHANNEL_KEYS[data?.trade];
  const typeChannelKey =
    data?.type === "cleanliness" ? "housekeeping" : "maintenance";
  return LIVE_CHANNEL_IDS[tradeChannelKey || typeChannelKey];
}

function redactCommonIdentifiers(value) {
  return String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[محجوب]")
    .replace(
      /(?<!\w)\+?[\d٠-٩۰-۹][\d٠-٩۰-۹\s().-]{7,}[\d٠-٩۰-۹](?!\w)/gu,
      "[محجوب]"
    )
    .replace(/<@[^>]+>/g, "[محجوب]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function plainText(text, maxLength = 2000) {
  return { type: "plain_text", text: String(text).slice(0, maxLength) };
}

function safeLocation({ collection, documentId, data }) {
  if (collection === "park_street_snags" || collection === "park") {
    const sectorId = String(documentId || "").split("__", 1)[0];
    return PARK_STREET_SECTORS[sectorId]?.label || "بارك ستريت";
  }
  return LOCATION_LABELS[data?.location] || redactCommonIdentifiers(data?.location) || "غير محدد";
}

function safeDescription({ collection, documentId, data }) {
  if (collection === "park_street_snags" || collection === "park") {
    const itemId = String(documentId || "").split("__").at(-1) || "inspection";
    return `فحص بارك ستريت: ${itemId.replace(/[^a-z0-9-]/gi, "").slice(0, 80)}`;
  }
  return redactCommonIdentifiers(data?.description || data?.title) || "بدون وصف";
}

function buildSlackMessage({
  channelId,
  eventType,
  collection,
  documentId,
  data
}) {
  const description = safeDescription({ collection, documentId, data });
  const status = STATUS_LABELS[data?.status] || "غير محدد";
  const location = safeLocation({ collection, documentId, data });
  const reportId =
    redactCommonIdentifiers(documentId)
      .replace(/[^a-z0-9_-]/gi, "")
      .slice(0, 120) || "محجوب";
  const action = eventType === "created" ? "بلاغ جديد" : "تحديث بلاغ";
  const summary = `${action}: ${description}`;

  return {
    channel: channelId,
    text: summary,
    blocks: [
      { type: "header", text: plainText(action) },
      { type: "section", text: plainText(description, 1000) },
      {
        type: "section",
        fields: [
          plainText(`معرف البلاغ\n${reportId}`),
          plainText(`الحالة\n${status}`),
          plainText(`الموقع\n${location}`)
        ]
      }
    ]
  };
}

async function notifyDemoChannelFromApp({
  client,
  mode = process.env.SLACK_NOTIFICATIONS_MODE || "test",
  collection = "snag_integration_tests",
  eventType,
  documentId,
  before = null,
  after = null,
  logger = console
}) {
  const decision = decisionForEvent({
    mode,
    collection,
    eventType,
    documentId,
    before,
    after
  });
  if (!decision) return null;

  const message = buildSlackMessage({
    channelId: decision.channelId,
    eventType: decision.eventType,
    collection,
    documentId,
    data: after
  });

  if (client && client.chat && typeof client.chat.postMessage === "function") {
    try {
      await client.chat.postMessage(message);
    } catch (err) {
      if (logger && typeof logger.error === "function") {
        logger.error(`Auto-notification to ${decision.channelId} failed: ${err.message}`);
      }
    }
  }
  return message;
}

module.exports = {
  DEMO_CHANNEL_ID,
  LIVE_CHANNEL_IDS,
  decisionForEvent,
  shouldNotifyRecord,
  liveChannelForRecord,
  buildSlackMessage,
  notifyDemoChannelFromApp
};
