const test = require("node:test")
const assert = require("node:assert/strict")
const {
  DEMO_CHANNEL_ID,
  LIVE_CHANNEL_IDS,
  decisionForEvent,
  shouldNotifyRecord,
  liveChannelForRecord,
  buildSlackMessage,
} = require("../src/slackNotifications")

test("notification mode defaults to off and unknown or live modes fail closed", () => {
  assert.equal(decisionForEvent({ collection: "snags", eventType: "created", after: {} }), null)
  assert.equal(decisionForEvent({ mode: "off", collection: "snags", eventType: "created", after: {} }), null)
  assert.equal(decisionForEvent({ mode: "unexpected", collection: "snags", eventType: "created", after: {} }), null)
  assert.equal(decisionForEvent({ mode: "live", collection: "snags", eventType: "created", after: {} }), null)
})

test("test mode never sends events from real application collections", () => {
  for (const collection of ["snags", "park_street_snags"]) {
    assert.equal(decisionForEvent({
      mode: "test",
      collection,
      eventType: "created",
      after: { isDemo: true, status: "open" },
    }), null)
    assert.equal(decisionForEvent({
      mode: "test",
      collection,
      eventType: "updated",
      before: { status: "open" },
      after: { isDemo: true, status: "closed" },
    }), null)
  }
})

test("test mode only permits demo documents and routes them to the demo channel", () => {
  assert.equal(decisionForEvent({
    mode: "test",
    collection: "snag_integration_tests",
    eventType: "created",
    after: { isDemo: false },
  }), null)

  assert.deepEqual(decisionForEvent({
    mode: "test",
    collection: "snag_integration_tests",
    eventType: "created",
    after: { isDemo: true },
  }), { channelId: DEMO_CHANNEL_ID, eventType: "created" })

  assert.deepEqual(decisionForEvent({
    mode: "test",
    collection: "snag_integration_tests",
    eventType: "updated",
    before: { isDemo: true, status: "open", priority: "medium" },
    after: { isDemo: true, status: "closed", priority: "medium" },
  }), { channelId: DEMO_CHANNEL_ID, eventType: "updated" })
})

test("test updates require an existing demo document and a status or priority change", () => {
  const event = {
    mode: "test",
    collection: "snag_integration_tests",
    eventType: "updated",
    before: { isDemo: true, status: "open", priority: "medium" },
  }
  assert.equal(decisionForEvent({ ...event, after: { isDemo: true, status: "open", priority: "medium" } }), null)
  assert.equal(decisionForEvent({ ...event, after: { isDemo: false, status: "closed", priority: "medium" } }), null)
  assert.equal(decisionForEvent({ ...event, before: { isDemo: false }, after: { isDemo: true, status: "closed" } }), null)
})

test("real snag notifications are eligible only on create and status or priority changes", () => {
  assert.equal(shouldNotifyRecord({ collection: "snags", eventType: "created", after: {} }), true)
  assert.equal(shouldNotifyRecord({
    collection: "snags", eventType: "updated",
    before: { status: "open", priority: "normal" },
    after: { status: "open", priority: "urgent" },
  }), true)
  assert.equal(shouldNotifyRecord({
    collection: "snags", eventType: "updated",
    before: { status: "open", priority: "normal" },
    after: { status: "open", priority: "normal", attachments: ["photo"] },
  }), false)
})

test("healthy Park Street creates are ignored while issue updates and resolution are eligible", () => {
  assert.equal(shouldNotifyRecord({
    collection: "park_street_snags", eventType: "created", after: { status: "ok" },
  }), false)
  assert.equal(shouldNotifyRecord({
    collection: "park_street_snags", eventType: "created", after: { status: "na" },
  }), false)
  assert.equal(shouldNotifyRecord({
    collection: "park_street_snags", eventType: "created", after: { status: "snag" },
  }), true)
  assert.equal(shouldNotifyRecord({
    collection: "park_street_snags", eventType: "updated",
    before: { status: "snag" }, after: { status: "ok" },
  }), true)
  assert.equal(shouldNotifyRecord({
    collection: "park_street_snags", eventType: "updated",
    before: { status: "ok" }, after: { status: "ok", photos: ["photo"] },
  }), false)
})

test("Park Street live routing uses only the four fixed sector channels", () => {
  const expected = {
    security: "C0CAPQKKMFG",
    "customer-journey": "C0CAPQL6Q6A",
    landscape: "C0CBL519ATS",
    "traffic-parking": "C0CALEYSRM3",
  }
  for (const [sector, channelId] of Object.entries(expected)) {
    assert.equal(liveChannelForRecord({
      collection: "park_street_snags",
      documentId: `${sector}__zone__item`,
      data: { channelId: "attacker-controlled" },
    }), channelId)
    assert.equal(LIVE_CHANNEL_IDS[sector], channelId)
  }
  assert.equal(liveChannelForRecord({
    collection: "park_street_snags",
    documentId: "unknown-sector__zone__item",
    data: { channelId: "C0CAS6S7RR8" },
  }), null)
})

test("snag live routing uses allowlisted trade and type categories", () => {
  assert.equal(liveChannelForRecord({
    collection: "snags", documentId: "one", data: { trade: "security" },
  }), "C0CAPQKKMFG")
  assert.equal(liveChannelForRecord({
    collection: "snags", documentId: "two", data: { trade: "general", type: "cleanliness" },
  }), "C0CAG0Y9LLT")
  assert.equal(liveChannelForRecord({
    collection: "snags", documentId: "three", data: { trade: "untrusted", type: "maintenance" },
  }), "C0CAL8YEMGW")
  assert.equal(liveChannelForRecord({
    collection: "snag_integration_tests", documentId: "four", data: { channelId: "C0CAS6S7RR8" },
  }), null)
})

test("Slack payload contains only report id, status, fixed location, and short description", () => {
  const message = buildSlackMessage({
    channelId: DEMO_CHANNEL_ID,
    eventType: "created",
    collection: "snag_integration_tests",
    documentId: "test-123",
    data: {
      isDemo: true,
      description: "Light is out; contact alex@example.com at +1 (555) 123-4567 or ٠١٠١٢٣٤٥٦٧",
      status: "open",
      location: "security-points",
      priority: "urgent",
      inspector: "Private Person",
      userEmail: "private@example.com",
      attachments: [{ dataUrl: "data:image/jpeg;base64,private" }],
      photos: [{ dataUrl: "private" }],
      notes: "sensitive note",
      channelId: "attacker-controlled",
    },
  })

  assert.deepEqual(Object.keys(message).sort(), ["blocks", "channel", "text"])
  assert.equal(message.channel, DEMO_CHANNEL_ID)
  const serialized = JSON.stringify(message)
  for (const privateValue of ["alex@example.com", "+1 (555) 123-4567", "٠١٠١٢٣٤٥٦٧", "private@example.com", "Private Person", "data:image", "sensitive note", "attacker-controlled", "urgent"]) {
    assert.equal(serialized.includes(privateValue), false)
  }
  assert.ok(serialized.includes("[محجوب]"))
  assert.ok(serialized.includes("test-123"))
  assert.ok(serialized.includes("نقاط الأمن والبوابات والكاميرات"))
  assert.ok(serialized.includes("مفتوح"))
  assert.ok(serialized.includes("Light is out"))
})

test("email or phone in a report id is not shared", () => {
  const message = buildSlackMessage({
    channelId: DEMO_CHANNEL_ID,
    eventType: "created",
    collection: "snag_integration_tests",
    documentId: "owner@example.com",
    data: { isDemo: true, description: "Fixture", status: "open" },
  })
  assert.equal(JSON.stringify(message).includes("owner@example.com"), false)
  assert.ok(JSON.stringify(message).includes("محجوب"))
})

test("long descriptions are truncated before posting", () => {
  const message = buildSlackMessage({
    channelId: DEMO_CHANNEL_ID,
    eventType: "created",
    collection: "snag_integration_tests",
    documentId: "demo",
    data: { description: "x".repeat(4000) },
  })
  assert.equal(message.blocks[1].text.text.length, 240)
})
