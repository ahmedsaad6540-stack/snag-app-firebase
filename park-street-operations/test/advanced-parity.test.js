'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyNCRI, runFullAnalysis } = require('../src/ai/engine');
const { PARK_STREET_STORES_CATALOG, sortStoresByNo, isVacantText } = require('../src/storesCatalog');
const { RESTROOM_ZONES, computeRestroomZoneCoverage } = require('../src/restroomCatalog');
const { buildPromotedSnagFromParkItem, buildPromotedSnagFromRestroomRow } = require('../src/operationsDomain');
const { createMemoryRepo } = require('../src/repository');
const { memoryOperationsRepo } = require('../src/operationsRepo');
const { registerOperations } = require('../src/operationsHandlers');
const { buildMasterOperationsWorkbook, buildOperationsSummaryCsv } = require('../src/reportExporter');
const { DEMO_CHANNEL_ID, notifyDemoChannelFromApp, buildSlackMessage } = require('../src/slackNotifications');
const { appConfig } = require('../src/config');

const user = 'UABC123456';
const team = 'TABC123456';
const env = {
  SLACK_BOT_TOKEN: 'xoxb-fake',
  SLACK_SIGNING_SECRET: 'placeholder',
  SLACK_ALLOWED_TEAM_ID: team,
  SLACK_ALLOWED_USER_IDS: user,
  FIREBASE_PROJECT_ID: 'snag-ops-staging',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
};

test('NCRI v2 engine classifies Arabic and English operational descriptions accurately', () => {
  const plumbing = classifyNCRI('انفجار ماسورة وتسريب مياه كبير في حمام البلازا');
  assert.equal(plumbing.trade, 'Plumbing');
  assert.equal(plumbing.priority, 'urgent');
  assert.equal(plumbing.urgencyLevel, 'critical');
  assert.ok(plumbing.confidence >= 0.7);

  const electrical = classifyNCRI('سبوت إضاءة لا يعمل في مبنى 2');
  assert.equal(electrical.trade, 'Electrical');
  assert.equal(electrical.suggestedLocation, 'Building 2');

  const hvac = classifyNCRI('توقف تكييف في الممر الرئيسي');
  assert.equal(hvac.trade, 'HVAC');
  assert.equal(hvac.priority, 'urgent');
});

test('AI Command Center runFullAnalysis computes health index, hotspots, duplicates, and suggestions', () => {
  const snags = [
    { id: '1', title: 'كسر رخام في البلازا', description: 'شرخ في رخام الممشى', location: 'Plaza', trade: 'Civil', priority: 'high', status: 'open', createdAt: '2026-10-20T00:00:00Z' },
    { id: '2', title: 'كسر رخام في البلازا', description: 'شرخ في رخام الممشى أمام النافورة', location: 'Plaza', trade: 'Civil', priority: 'urgent', status: 'open', createdAt: '2026-10-20T01:00:00Z' },
    { id: '3', title: 'تنظيف سلال المهملات', description: 'تفريغ السلال', location: 'Landscape', trade: 'Housekeeping', priority: 'low', status: 'closed', createdAt: '2026-10-20T00:00:00Z', closedAt: '2026-10-20T02:00:00Z' }
  ];
  const analysis = runFullAnalysis({
    snags,
    parkInspection: { items: { a: { status: 'ok' }, b: { status: 'snag' } } },
    restroomInspections: [{ restroomId: 'plaza_p1_m', confirmed: true, items: { c1: { bad: 3, status: 'تالف' }, c2: { bad: 1, status: 'تالف' }, c3: { bad: 1, status: 'تالف' } } }]
  });

  assert.ok(analysis.health.score >= 10 && analysis.health.score <= 100);
  assert.equal(analysis.kpis.total, 3);
  assert.equal(analysis.kpis.urgentOpen, 2);
  assert.ok(analysis.hotspots.length >= 1);
  assert.equal(analysis.hotspots[0].location, 'Plaza');
  assert.ok(analysis.duplicates.length >= 1);
  assert.ok(analysis.anomalies.length >= 1);
  assert.ok(analysis.suggestions.length >= 1);
});

test('Restroom round confirmation, markAllRestroomOk, and 6-zone coverage work end-to-end', async () => {
  const repo = memoryOperationsRepo();
  const added = await repo.markAllRestroomOk(team, user, 'plaza_p1_m', 'مفتش تجريبي');
  assert.equal(added, 29);

  const list = await repo.list(team, 'restroom', 50);
  assert.equal(list.length, 29);

  const meta = await repo.listRestroomMeta(team);
  assert.equal(meta.length, 1);
  assert.equal(meta[0].confirmed, true);
  assert.equal(meta[0].roundsCount, 1);

  // Record a mirror defect and check zone coverage
  await repo.upsert(team, user, 'restroom', {
    restroomKey: 'plaza_p1_m',
    component: 'fix_mirrors',
    totalCount: '4',
    workingCount: '2',
    defectiveCount: '2',
    missingCount: '0',
    note: 'مرآة مشروخة'
  }, 'mirror-update');

  const updatedList = await repo.list(team, 'restroom', 50);
  const coverage = computeRestroomZoneCoverage(updatedList, meta);
  assert.equal(coverage.length, RESTROOM_ZONES.length);
  const plazaZone = coverage.find((z) => z.zone === 'البلازا');
  assert.equal(plazaZone.confirmed, 1);
  assert.equal(plazaZone.defects, 1);
  assert.equal(plazaZone.badMirrors, 2);
});

test('83 catalog stores and 14-field demo units seed idempotently and track Vacant status', async () => {
  const repo = memoryOperationsRepo();
  assert.equal(PARK_STREET_STORES_CATALOG.length, 83);

  const seededStores = await repo.seedCatalogStores(team, user);
  assert.equal(seededStores, 83);
  const stores = await repo.list(team, 'store', 100);
  assert.equal(stores.length, 83);
  const sorted = sortStoresByNo(stores);
  assert.equal(sorted[0].storeNo, '73');
  assert.equal(sorted[0].isVacant, true);
  assert.equal(isVacantText('Vacant'), true);

  const seededUnits = await repo.seedDemoUnits(team, user);
  assert.equal(seededUnits, 4);
  const units = await repo.list(team, 'unit', 20);
  assert.equal(units.length, 4);
  const b1Unit = units.find((u) => u.unitNo === 'G-01');
  assert.equal(b1Unit.buildingNo, 'B1');
  assert.equal(b1Unit.workingHours, '08:00 AM - 12:00 AM');
});

test('Park Street and Restroom defects promote directly into main SNAG work orders', async () => {
  const handlers = new Map();
  const app = { action: (k, v) => handlers.set(k, v), view: () => {} };
  const originalRepo = createMemoryRepo();
  const repo = memoryOperationsRepo();
  const cfg = appConfig(env);

  registerOperations(app, { repo, originalRepo, config: cfg, logger: { error: () => {} } });

  // 1. Record a Park Street snag and promote it
  const parkId = await repo.upsert(team, user, 'park', {
    key: 'security__sec-cctv__nvr-recording',
    status: 'snag',
    note: 'توقف تسجيل NVR تجريبي'
  }, 'req-park-1');

  await handlers.get('parkops_promote_park')({
    ack: async () => {},
    body: { team_id: team, user: { id: user } },
    action: { value: parkId },
    client: { views: { publish: async () => {} } }
  });

  let snags = await originalRepo.list(team);
  assert.equal(snags.length, 1);
  assert.ok(snags[0].title.includes('[فحص Park St]'));

  // 2. Record a Restroom defect and promote it
  const rrId = await repo.upsert(team, user, 'restroom', {
    restroomKey: 'plaza_p1_m',
    component: 'plumb_leaks',
    conditionStatus: 'عطل',
    note: 'تسريب محبس رئيسي',
    actionRequired: 'تغيير المحبس فوراً'
  }, 'req-rr-1');

  await handlers.get('parkops_promote_restroom')({
    ack: async () => {},
    body: { team_id: team, user: { id: user } },
    action: { value: rrId },
    client: { views: { publish: async () => {} } }
  });

  snags = await originalRepo.list(team);
  assert.equal(snags.length, 2);
  assert.ok(snags.some((s) => s.title.includes('[حمامات]') && s.trade === 'Plumbing'));
});

test('Work Order full editing, comments, and multi-stage Permit workflow preserve safety constraints', async () => {
  const snagRepo = createMemoryRepo();
  const id = await snagRepo.create(team, user, {
    title: 'عطل كشاف ممر',
    location: 'Building 1',
    description: 'كشاف لا يعمل',
    category: 'maintenance',
    priority: 'medium',
    trade: 'Electrical'
  }, 'edit-1');

  await snagRepo.updateTicket(team, id, user, {
    title: 'عطل كشاف ممر محدث',
    priority: 'high',
    comment: 'تم استلام قطع الغيار'
  });

  const updated = await snagRepo.get(team, id);
  assert.equal(updated.title, 'عطل كشاف ممر محدث');
  assert.equal(updated.priority, 'high');
  assert.equal(updated.comments.length, 1);
  assert.equal(updated.comments[0].text, 'تم استلام قطع الغيار');

  // Permit workflow
  const opsRepo = memoryOperationsRepo();
  const permitId = await opsRepo.upsert(team, user, 'permit', {
    title: 'تصريح صيانة واجهة',
    location: 'Plaza',
    description: 'أعمال تجريبية',
    contractorName: 'شركة تجريبية',
    risk: 'سقالات'
  }, 'permit-1');

  await opsRepo.updatePermitStage(team, user, permitId, 'safety-review', 'تم فحص السقالة');
  const permit = await opsRepo.get(team, 'permit', permitId);
  assert.equal(permit.approvalStage, 'safety-review');
  assert.equal(permit.requiresOfficialApproval, true);
});

test('Master ExcelJS (.xlsx) and CSV exporters generate valid buffers across all modules', async () => {
  const buffer = await buildMasterOperationsWorkbook({
    tickets: [{ id: 'T1', title: 'بلاغ تجريبي', location: 'Plaza', category: 'maintenance', priority: 'high', status: 'open' }],
    parkRecords: [{ id: 'security__sec-cctv__nvr-recording', key: 'security__sec-cctv__nvr-recording', status: 'snag', note: 'ملاحظة' }],
    restroomRecords: [{ id: 'plaza_p1_m__elec_spots', restroomKey: 'plaza_p1_m', component: 'elec_spots', totalCount: 4, workingCount: 3, defectiveCount: 1, missingCount: 0 }],
    restroomMeta: [{ restroomKey: 'plaza_p1_m', confirmed: true, roundsCount: 1 }],
    units: [{ unitNo: 'G-01', unitName: 'Brunch & Cake', isVacant: false }],
    stores: [{ storeNo: '73', companyName: 'Vacant', isVacant: true }],
    permits: [{ id: 'P1', title: 'تصريح اختبار', approvalStage: 'requested', requiresOfficialApproval: true }]
  });

  assert.ok(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array);
  const bytes = Buffer.from(buffer);
  assert.ok(bytes.length > 5000);
  // Verify ZIP/XLSX magic header "PK"
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const csv = buildOperationsSummaryCsv({
    tickets: [{ id: 'T1', title: 'بلاغ تجريبي', location: 'Plaza', status: 'open', priority: 'high', updatedAt: '2026-10-21' }]
  });
  assert.ok(csv.includes('WorkOrder'));
  assert.ok(csv.includes('بلاغ تجريبي'));
});

test('TEST-PSO-001 preserves exact ID and triggers fail-closed auto-notification to #snag-ops-demo (C0CAS6S7RR8)', async () => {
  const repo = createMemoryRepo();
  const id = await repo.create(team, user, {
    title: 'TEST-PSO-001 — بلاغ اختباري',
    location: 'Plaza',
    description: 'تواصل على test@example.com أو 01012345678',
    category: 'maintenance',
    priority: 'high'
  }, 'TEST-PSO-001');

  assert.equal(id, 'TEST-PSO-001');
  const saved = await repo.get(team, 'TEST-PSO-001');
  assert.equal(saved.id, 'TEST-PSO-001');

  const posted = [];
  const client = {
    chat: {
      postMessage: async (msg) => {
        posted.push(msg);
      }
    }
  };

  await notifyDemoChannelFromApp({
    client,
    mode: 'test',
    eventType: 'created',
    documentId: id,
    after: saved
  });

  assert.equal(posted.length, 1);
  assert.equal(posted[0].channel, DEMO_CHANNEL_ID);
  const raw = JSON.stringify(posted[0]);
  assert.ok(raw.includes('TEST-PSO-001'));
  assert.ok(raw.includes('[محجوب]'));
  assert.equal(raw.includes('test@example.com'), false);
  assert.equal(raw.includes('01012345678'), false);
});

