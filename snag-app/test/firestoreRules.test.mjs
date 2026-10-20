import { readFile } from "node:fs/promises"
import { after, before, beforeEach, test } from "node:test"
import assert from "node:assert/strict"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore"

const projectId = "demo-snag-rules"
const appCollections = [
  "snags",
  "park_street_snags",
  "units",
  "stores",
  "custom_lists",
  "custom_items",
  "locations",
  "restroom_inspections",
  "restroom_status",
  "notifications",
]
let environment

before(async () => {
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: process.env.FIRESTORE_EMULATOR_HOST?.split(":")[0] || "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST?.split(":")[1] || 8085),
      rules: await readFile(new URL("../firestore.staging.rules", import.meta.url), "utf8"),
    },
  })
})

after(async () => {
  await environment?.cleanup()
})

beforeEach(async () => {
  await environment.clearFirestore()
})

function profile(uid, fields = {}) {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: uid,
    role: "user",
    approved: true,
    ...fields,
  }
}

async function seedProfiles() {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, "users/admin"), profile("admin", { role: "admin" }))
    await setDoc(doc(db, "users/approved"), profile("approved"))
    await setDoc(doc(db, "users/pending"), profile("pending", { approved: false }))
  })
}

test("registration can create and read its own pending profile, but cannot access modules", async () => {
  const registrationDb = environment.authenticatedContext("new-user", {
    email: "new-user@example.test",
  }).firestore()
  const newProfile = {
    uid: "new-user",
    email: "new-user@example.test",
    displayName: "New User",
    role: "user",
    approved: false,
    createdAt: "test",
  }

  await assertSucceeds(setDoc(doc(registrationDb, "users/new-user"), newProfile))
  await assertSucceeds(getDoc(doc(registrationDb, "users/new-user")))
  await assertFails(getDocs(collection(registrationDb, "snags")))
})

test("self-registration cannot grant admin or approval fields", async () => {
  const db = environment.authenticatedContext("new-user", {
    email: "new-user@example.test",
  }).firestore()

  await assertFails(setDoc(doc(db, "users/new-user"), {
    ...profile("new-user", { approved: true }),
  }))
  await assertFails(setDoc(doc(db, "users/new-user"), {
    ...profile("new-user", { role: "admin", approved: false }),
  }))
})

test("approved users can perform CRUD operations used by every app module", async () => {
  await seedProfiles()
  const db = environment.authenticatedContext("approved").firestore()

  for (const name of appCollections) {
    const reference = doc(db, name, `rules-test-${name}`)
    await assertSucceeds(setDoc(reference, { rulesTest: true }))
    await assertSucceeds(getDoc(reference))
    await assertSucceeds(getDocs(collection(db, name)))
    await assertSucceeds(updateDoc(reference, { rulesTest: false }))
    await assertSucceeds(deleteDoc(reference))
  }
})

test("anonymous and pending users cannot read or write app modules", async () => {
  await seedProfiles()
  const anonymousDb = environment.unauthenticatedContext().firestore()
  const pendingDb = environment.authenticatedContext("pending").firestore()

  for (const name of appCollections) {
    await assertFails(getDocs(collection(anonymousDb, name)))
    await assertFails(setDoc(doc(anonymousDb, name, "anonymous"), { value: true }))
    await assertFails(getDocs(collection(pendingDb, name)))
    await assertFails(setDoc(doc(pendingDb, name, "pending"), { value: true }))
  }
  await assertFails(getDocs(collection(
    environment.authenticatedContext("approved").firestore(),
    "snag_integration_tests"
  )))
})

test("only an active admin can list profiles and approve another user", async () => {
  await seedProfiles()
  const adminDb = environment.authenticatedContext("admin").firestore()
  const userDb = environment.authenticatedContext("approved").firestore()

  await assertSucceeds(getDocs(collection(adminDb, "users")))
  await assertSucceeds(updateDoc(doc(adminDb, "users/pending"), { approved: true }))
  await assertFails(getDocs(collection(userDb, "users")))
  await assertFails(updateDoc(doc(userDb, "users/pending"), { approved: true }))
  await assertFails(updateDoc(doc(adminDb, "users/admin"), { role: "user" }))
})
