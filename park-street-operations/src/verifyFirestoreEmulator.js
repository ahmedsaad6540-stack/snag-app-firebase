'use strict';

/**
 * End-to-End Verification against the REAL Firebase Firestore Emulator (127.0.0.1:8080)
 * Project: snag-ops-staging (Zero connection to production snag-app-firebase).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createFirestoreRepo } = require('./repository');
const { createOperationsRepo } = require('./operationsRepo');
const { notifyDemoChannelFromApp, DEMO_CHANNEL_ID } = require('./slackNotifications');
const { buildMasterOperationsWorkbook, buildOperationsSummaryCsv } = require('./reportExporter');

async function runEmulatorVerification() {
  const env = {
    ...process.env,
    FIREBASE_PROJECT_ID: 'snag-ops-staging',
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    LOCAL_STAGING_STORE: 'false',
    SLACK_NOTIFICATIONS_MODE: 'test'
  };
  process.env.FIREBASE_PROJECT_ID = 'snag-ops-staging';
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  delete process.env.LOCAL_STAGING_STORE;

  const teamId = process.env.SLACK_ALLOWED_TEAM_ID || 'T000000DEMO';
  const userId = (process.env.SLACK_ALLOWED_USER_IDS || 'U000000DEMO').split(',')[0].trim();

  console.log('1. Connecting to real Firebase Firestore Emulator at 127.0.0.1:8080 (project: snag-ops-staging)...');
  const ticketRepo = createFirestoreRepo(env);
  const opsRepo = createOperationsRepo(env);

  const sentNotifications = [];
  const mockSlackClient = {
    chat: {
      postMessage: async (msg) => {
        sentNotifications.push(msg);
        return { ok: true, channel: msg.channel, ts: `${Date.now()}.000100` };
      }
    }
  };

  // Clean up previous TEST-PSO-001 if re-running
  await ticketRepo.remove(teamId, 'TEST-PSO-001');

  console.log('2. Creating work order TEST-PSO-001 in Firestore Emulator...');
  const createdId = await ticketRepo.create(
    teamId,
    userId,
    {
      title: 'TEST-PSO-001 — عطل سبوت إضاءة تجريبي في البلازا',
      location: 'Plaza',
      description: 'بلاغ اختباري للتأكد من الحفظ في Firebase Firestore Emulator واستبعاد أي اتصال بالإنتاج',
      category: 'maintenance',
      priority: 'high',
      trade: 'Electrical'
    },
    'TEST-PSO-001'
  );
  assert.equal(createdId, 'TEST-PSO-001');

  // Verify idempotency: duplicate submission with same request ID must not duplicate
  const duplicateId = await ticketRepo.create(
    teamId,
    userId,
    {
      title: 'TEST-PSO-001 — محاولة تكرار',
      location: 'Plaza',
      description: 'لا يجب أن يستبدل البلاغ الأصلي',
      category: 'maintenance',
      priority: 'high'
    },
    'TEST-PSO-001'
  );
  assert.equal(duplicateId, 'TEST-PSO-001');

  const initialDoc = await ticketRepo.get(teamId, 'TEST-PSO-001');
  assert.ok(initialDoc, 'TEST-PSO-001 must exist in Firestore Emulator');
  assert.equal(initialDoc.status, 'open');
  assert.equal(initialDoc.isDemo, true);
  assert.equal(initialDoc.source, 'slack-staging');

  // Trigger automatic notification on creation
  await notifyDemoChannelFromApp({
    client: mockSlackClient,
    mode: 'test',
    eventType: 'created',
    documentId: createdId,
    after: initialDoc
  });

  console.log('3. Transitioning TEST-PSO-001 status: open -> in-progress -> review -> closed...');
  await ticketRepo.updateStatus(teamId, 'TEST-PSO-001', userId, 'in-progress', 'بدأ الفني فحص الدائرة');
  const inProgressDoc = await ticketRepo.get(teamId, 'TEST-PSO-001');
  assert.equal(inProgressDoc.status, 'in-progress');

  await notifyDemoChannelFromApp({
    client: mockSlackClient,
    mode: 'test',
    eventType: 'updated',
    documentId: 'TEST-PSO-001',
    before: initialDoc,
    after: inProgressDoc
  });

  await ticketRepo.updateStatus(teamId, 'TEST-PSO-001', userId, 'review', 'تم تغيير السبوت وجاهز للمراجعة');
  const reviewDoc = await ticketRepo.get(teamId, 'TEST-PSO-001');
  assert.equal(reviewDoc.status, 'review');

  console.log('4. Creating and updating Park Street 51-item inspection in Firestore Emulator...');
  const parkKey = 'security__sec-cctv__nvr-recording';
  await opsRepo.upsert(teamId, userId, 'park', {
    key: parkKey,
    status: 'snag',
    note: 'توقف تسجيل كاميرا البوابة رقم 2 (تجريبي)'
  }, 'park-req-1');
  await opsRepo.upsert(teamId, userId, 'park', {
    key: parkKey,
    status: 'ok',
    note: 'تمت إعادة تشغيل التسجيل والتحقق من الأرشيف'
  }, 'park-req-2');

  const parkDoc = await opsRepo.get(teamId, 'park', parkKey);
  assert.equal(parkDoc.status, 'ok');
  assert.ok(parkDoc.history.length >= 2);

  console.log('5. Creating Restroom detailed count-based inspection in Firestore Emulator...');
  const rrId = await opsRepo.upsert(teamId, userId, 'restroom', {
    restroomKey: 'plaza_p1_m',
    component: 'elec_spots',
    totalCount: '8',
    workingCount: '6',
    defectiveCount: '1',
    missingCount: '1',
    note: 'سبوت معطل وسبوت مفقود',
    actionRequired: 'تركيب وصيانة 2 سبوت سقف',
    inspector: 'مشرف الفترة الصباحية'
  }, 'rr-req-1');
  assert.equal(rrId, 'plaza_p1_m__elec_spots');

  const rrMeta = await opsRepo.toggleRestroomConfirmed(teamId, userId, 'plaza_p1_m');
  assert.equal(rrMeta.confirmed, true);

  console.log('6. Simulating app restart and verifying data recovery from Firestore Emulator...');
  const freshTicketRepo = createFirestoreRepo(env);
  const freshOpsRepo = createOperationsRepo(env);

  const recoveredTicket = await freshTicketRepo.get(teamId, 'TEST-PSO-001');
  assert.equal(recoveredTicket.id, 'TEST-PSO-001');
  assert.equal(recoveredTicket.status, 'review');
  assert.equal(recoveredTicket.comments.length, 2);

  const recoveredPark = await freshOpsRepo.get(teamId, 'park', parkKey);
  assert.equal(recoveredPark.status, 'ok');

  const recoveredRestroom = await freshOpsRepo.get(teamId, 'restroom', rrId);
  assert.equal(recoveredRestroom.totalCount, 8);
  assert.equal(recoveredRestroom.workingCount, 6);
  assert.equal(recoveredRestroom.defectiveCount, 1);
  assert.equal(recoveredRestroom.missingCount, 1);

  console.log('7. Verifying automatic notifications routed strictly to #snag-ops-demo (C0CAS6S7RR8)...');
  assert.equal(sentNotifications.length, 2);
  assert.equal(sentNotifications[0].channel, DEMO_CHANNEL_ID);
  assert.equal(sentNotifications[1].channel, DEMO_CHANNEL_ID);
  assert.ok(JSON.stringify(sentNotifications[0]).includes('TEST-PSO-001'));

  console.log('8. Generating Master Excel (.xlsx) and CSV reports from live Firestore Emulator records...');
  const tickets = await freshTicketRepo.list(teamId);
  const parkRecords = await freshOpsRepo.list(teamId, 'park', 60);
  const restroomRecords = await freshOpsRepo.list(teamId, 'restroom', 100);
  const restroomMeta = await freshOpsRepo.listRestroomMeta(teamId);
  const exportDir = path.join(process.cwd(), 'exports');
  fs.mkdirSync(exportDir, { recursive: true });
  const xlsxBuffer = await buildMasterOperationsWorkbook({
    tickets,
    parkRecords,
    restroomRecords,
    restroomMeta
  });
  const xlsxPath = path.join(exportDir, 'Park_Street_Operations_Firestore_Emulator_Verified.xlsx');
  fs.writeFileSync(xlsxPath, xlsxBuffer);

  const csvContent = buildOperationsSummaryCsv({ tickets, parkRecords, restroomRecords });
  const csvPath = path.join(exportDir, 'Park_Street_Operations_Firestore_Emulator_Verified.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');

  const summary = {
    emulatorHost: '127.0.0.1:8080',
    projectId: 'snag-ops-staging',
    productionTouched: false,
    verifiedTicket: {
      id: recoveredTicket.id,
      title: recoveredTicket.title,
      status: recoveredTicket.status,
      historyEvents: recoveredTicket.history.length,
      commentsCount: recoveredTicket.comments.length
    },
    verifiedParkInspection: {
      id: recoveredPark.id,
      status: recoveredPark.status,
      historyEvents: recoveredPark.history.length
    },
    verifiedRestroomInspection: {
      id: recoveredRestroom.id,
      totalCount: recoveredRestroom.totalCount,
      workingCount: recoveredRestroom.workingCount,
      defectiveCount: recoveredRestroom.defectiveCount,
      missingCount: recoveredRestroom.missingCount
    },
    autoNotificationsToDemoChannel: sentNotifications.map((n) => ({
      channel: n.channel,
      text: n.text
    })),
    exportedFiles: [xlsxPath, csvPath]
  };

  console.log('=== FIRESTORE EMULATOR VERIFICATION PASSED ===');
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  runEmulatorVerification().catch((err) => {
    console.error('Emulator verification failed:', err);
    process.exitCode = 1;
  });
}

module.exports = { runEmulatorVerification };
