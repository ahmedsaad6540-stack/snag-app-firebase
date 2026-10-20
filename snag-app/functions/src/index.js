const { defineSecret } = require("firebase-functions/params")
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore")
const { logger } = require("firebase-functions")
const { formatSlackMessage } = require("./slackMessage")

const slackWebhookUrl = defineSecret("SLACK_WEBHOOK_URL")

async function postToSlack(message) {
  const response = await fetch(slackWebhookUrl.value(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(10000),
  })
  const responseText = await response.text()

  if (!response.ok || responseText !== "ok") {
    throw new Error(`Slack webhook failed (${response.status}): ${responseText}`)
  }
}

exports.notifySlackOnSnagCreated = onDocumentCreated(
  {
    document: "snags/{snagId}",
    secrets: [slackWebhookUrl],
    retry: true,
  },
  async (event) => {
    const snag = event.data?.data()
    if (!snag) {
      logger.warn("Created snag event did not include a document", { eventId: event.id })
      return
    }

    await postToSlack(formatSlackMessage({
      event: "created",
      snagId: event.params.snagId,
      snag,
    }))
  }
)

exports.notifySlackOnSnagUpdated = onDocumentUpdated(
  {
    document: "snags/{snagId}",
    secrets: [slackWebhookUrl],
    retry: true,
  },
  async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()
    if (!before || !after) {
      logger.warn("Updated snag event did not include both document versions", { eventId: event.id })
      return
    }

    if (before.status === after.status && before.priority === after.priority) {
      return
    }

    await postToSlack(formatSlackMessage({
      event: "updated",
      snagId: event.params.snagId,
      snag: after,
    }))
  }
)
