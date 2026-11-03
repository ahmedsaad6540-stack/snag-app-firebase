// Run only against a disposable demo Firestore emulator, never a real project.
import { initializeApp, deleteApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, terminate } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const host = process.env.FIRESTORE_EMULATOR_HOST
if (!host || !host.startsWith('127.0.0.1:')) throw new Error('A local Firestore emulator is required')
const projectId = 'demo-parkstreet-ops', [hostname, port] = host.split(':')
const base = `http://${host}/v1/projects/${projectId}/databases/(default)/documents`
const apps = [], clients = []
async function seedUser(uid, role, approved = true) {
  const response = await fetch(`${base}/users/${uid}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { role: { stringValue: role }, rolePreset: { stringValue: role }, approved: { booleanValue: approved } } }) })
  assert.ok(response.ok, await response.text())
}
function client(uid) {
  const app = initializeApp({ projectId, apiKey: 'demo-test-key' }, uid || 'anonymous'); apps.push(app)
  const db = getFirestore(app); connectFirestoreEmulator(db, hostname, Number(port), uid ? { mockUserToken: { sub: uid, user_id: uid, email: `${uid}@example.test` } } : {}); clients.push(db); return db
}
async function denied(promise) { await assert.rejects(promise, e => e.code === 'permission-denied') }
try {
  await Promise.all([seedUser('admin', 'admin'), seedUser('supervisor', 'supervisor'), seedUser('other', 'supervisor'), seedUser('viewer', 'viewer'), seedUser('pending', 'supervisor', false), seedUser('opsmanager', 'operations_manager')])
  const admin = client('admin'), supervisor = client('supervisor'), other = client('other'), viewer = client('viewer'), pending = client('pending'), opsmanager = client('opsmanager'), anon = client()
  const plan = { department: 'pest', title: 'فحص يومي', location: 'البلازا', standard: 'تسجيل النتيجة', frequency: 'daily', shift: 'صباحية', enabled: true, review: '', start: '2026-11-03', updatedBy: { uid: 'admin', name: 'Admin' }, updatedAt: serverTimestamp() }
  await denied(setDoc(doc(supervisor, 'operations_plans/p1'), { ...plan, updatedBy: { uid: 'supervisor' } }))
  await denied(setDoc(doc(admin, 'operations_plans/wrong-shift'), { ...plan, shift: 'ليلية' }))
  await setDoc(doc(admin, 'operations_plans/p1'), plan)
  await getDoc(doc(viewer, 'operations_plans/p1'))
  await denied(getDoc(doc(anon, 'operations_plans/p1')))
  await denied(getDoc(doc(pending, 'operations_plans/p1')))
  await getDoc(doc(pending, 'users/pending'))
  await denied(updateDoc(doc(supervisor, 'users/supervisor'), { role: 'admin', approved: true }))
  await denied(setDoc(doc(anon, 'users/forged-admin'), { role: 'admin', approved: true }))
  await updateDoc(doc(admin, 'users/viewer'), { jobTitle: 'مشاهد' })
  await denied(updateDoc(doc(opsmanager, 'users/viewer'), { role: 'admin' }))
  const savedPlan = (await getDoc(doc(admin, 'operations_plans/p1'))).data()
  const record = { planId: 'p1', date: '2026-11-03', plan: savedPlan, status: 'done', owner: 'الفريق', actualDate: '2026-11-03', photos: [], reason: '', action: '', followup: '', notes: '', evidence: '', quality: 'unreviewed', revision: 1, createdBy: { uid: 'supervisor' }, updatedBy: { uid: 'supervisor' }, updatedAt: serverTimestamp(), history: [{ at: 'initial' }] }
  await denied(setDoc(doc(viewer, 'operations_execution/p1__2026-11-03'), { ...record, createdBy: { uid: 'viewer' }, updatedBy: { uid: 'viewer' } }))
  await denied(setDoc(doc(supervisor, 'operations_execution/p1__2026-11-03'), { ...record, quality: 'accepted' }))
  await setDoc(doc(supervisor, 'operations_execution/p1__2026-11-03'), record)
  await denied(updateDoc(doc(other, 'operations_execution/p1__2026-11-03'), { revision: 2, updatedBy: { uid: 'other' }, updatedAt: serverTimestamp() }))
  await updateDoc(doc(admin, 'operations_execution/p1__2026-11-03'), { quality: 'accepted', history: [{ at: 'initial' }, { at: 'review' }], revision: 2, updatedBy: { uid: 'admin' }, updatedAt: serverTimestamp() })
  await denied(updateDoc(doc(supervisor, 'operations_execution/p1__2026-11-03'), { notes: 'changed', revision: 3, updatedBy: { uid: 'supervisor' }, updatedAt: serverTimestamp() }))
  await updateDoc(doc(supervisor, 'operations_execution/p1__2026-11-03'), { notes: 'changed', quality: 'unreviewed', history: [{ at: 'initial' }, { at: 'review' }, { at: 'revised' }], revision: 3, updatedBy: { uid: 'supervisor' }, updatedAt: serverTimestamp() })
  await denied(deleteDoc(doc(admin, 'operations_execution/p1__2026-11-03')))
  await denied(updateDoc(doc(admin, 'operations_plans/p1'), { frequency: 'weekly', updatedAt: serverTimestamp() }))
  await updateDoc(doc(admin, 'operations_plans/p1'), { end: '2026-11-03', updatedBy: { uid: 'admin' }, updatedAt: serverTimestamp() })
  // Legacy policy stays unchanged for the separate migration.
  await setDoc(doc(anon, 'legacy_test/document'), { test: true })
  assert.ok(readFileSync('firestore.rules', 'utf8').includes('operations_execution'))
  console.log('PASS: plan activation, morning-only, authentication, approval, read-only, ownership, quality review, retirement, revision and legacy-policy checks')
} finally { await Promise.all(clients.map(db => terminate(db))); await Promise.all(apps.map(app => deleteApp(app))) }
