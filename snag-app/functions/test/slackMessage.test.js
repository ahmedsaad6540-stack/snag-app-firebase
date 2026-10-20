const test = require("node:test")
const assert = require("node:assert/strict")
const { formatSlackMessage } = require("../src/slackMessage")

test("formats a new snag with localized task details and app link", () => {
  const message = formatSlackMessage({
    event: "created",
    snagId: "snag-123",
    snag: {
      description: "عطل في الإضاءة",
      status: "open",
      priority: "urgent",
      location: "security-points",
      trade: "electrical",
      inspector: "أحمد",
    },
  })

  assert.equal(message.blocks[0].text.text, "📋 ملاحظة جديدة")
  assert.equal(message.blocks[1].text.text, "عطل في الإضاءة")
  assert.ok(message.blocks[2].fields.some(field => field.text.includes("عاجل")))
  assert.ok(message.blocks[2].fields.some(field => field.text.includes("نقاط الأمن والبوابات والكاميرات")))
  assert.equal(message.blocks[3].fields[0].text, "رقم الملاحظة\nsnag-123")
  assert.equal(message.blocks[3].accessory.url, "https://snag-app-firebase.web.app")
})

test("formats an update and tolerates missing optional snag values", () => {
  const message = formatSlackMessage({
    event: "updated",
    snagId: "snag-456",
    snag: { status: "in-progress", priority: "medium" },
  })

  assert.equal(message.blocks[0].text.text, "🔄 تحديث ملاحظة")
  assert.equal(message.blocks[1].text.text, "بدون وصف")
  assert.ok(message.blocks[2].fields.some(field => field.text.includes("قيد التنفيذ")))
  assert.ok(message.blocks[2].fields.some(field => field.text.includes("غير محدد")))
})

test("limits user-provided text to Slack block size", () => {
  const message = formatSlackMessage({
    event: "created",
    snagId: "snag-789",
    snag: { description: "x".repeat(4000) },
  })

  assert.equal(message.blocks[1].text.text.length, 2500)
})
