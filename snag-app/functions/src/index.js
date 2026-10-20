const { defineSecret, defineString } = require("firebase-functions/params")
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore")
const { logger } = require("firebase-functions")
const {
  decisionForEvent,
  buildSlackMessage,
} = require("./slackNotifications")

const notificationsMode = defineString("SLACK_NOTIFICATIONS_MODE", { default: "off" })
const slackBotToken = defineSecret("SLACK_BOT_TOKEN")

async function postToSlack(message) {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackBotToken.value()}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Slack API request failed with HTTP ${response.status}`)
  }

  let result
  try {
    result = await response.json()
  } catch {
    throw new Error("Slack API returned an invalid response")
  }

  if (result.ok !== true) {
    throw new Error(`Slack API rejected the message: ${result.error || "unknown_error"}`)
  }
}

function eventCollection(event) {
  return event.data?.after
    ? event.data.after.ref.parent.id
    : event.data?.ref.parent.id
}

async function handleFirestoreEvent(event, eventType) {
  const collection = eventCollection(event)
  const before = eventType === "updated" ? event.data?.before.data() : undefined
  const after = eventType === "updated"
    ? event.data?.after.data()
    : event.data?.data()
  const decision = decisionForEvent({
    mode: notificationsMode.value(),
    collection,
    eventType,
    documentId: event.params.testId || event.params.snagId || event.params.recordId,
    before,
    after,
  })

  if (!decision) return

  const message = buildSlackMessage({
    channelId: decision.channelId,
    eventType,
    collection,
    documentId: event.params.testId || event.params.snagId || event.params.recordId,
    data: after,
  })

  await postToSlack(message)
  logger.info("Slack test notification sent", {
    eventId: event.id,
    collection,
    eventType,
  })
}

function createdHandler(document) {
  return onDocumentCreated(
    { document, secrets: [slackBotToken], retry: true },
    (event) => handleFirestoreEvent(event, "created")
  )
}

function updatedHandler(document) {
  return onDocumentUpdated(
    { document, secrets: [slackBotToken], retry: true },
    (event) => handleFirestoreEvent(event, "updated")
  )
}

exports.notifySlackOnSnagCreated = createdHandler("snags/{snagId}")
exports.notifySlackOnSnagUpdated = updatedHandler("snags/{snagId}")
exports.notifySlackOnParkStreetSnagCreated = createdHandler("park_street_snags/{recordId}")
exports.notifySlackOnParkStreetSnagUpdated = updatedHandler("park_street_snags/{recordId}")
exports.notifySlackOnIntegrationTestCreated = createdHandler("snag_integration_tests/{testId}")
exports.notifySlackOnIntegrationTestUpdated = updatedHandler("snag_integration_tests/{testId}")
