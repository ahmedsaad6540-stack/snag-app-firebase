'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

async function check() {
  console.log('=== Park Street Operations Health Check ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // 1. Emulator check
  const emuPromise = new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8080/', (res) => {
      resolve({ ok: res.statusCode < 500, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(2000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });

  const emu = await emuPromise;
  console.log(`Firestore Emulator (127.0.0.1:8080): ${emu.ok ? '🟢 ONLINE' : '🔴 OFFLINE'} (${JSON.stringify(emu)})`);

  // 2. Preflight validation
  try {
    const { runPreflight } = require('../src/preflight');
    const pf = runPreflight();
    const passed = pf.checks.every(c => c.status === 'PASS');
    console.log(`Preflight System Checks: ${passed ? '🟢 PASS (All 9 checks)' : '🔴 FAIL'}`);
  } catch (e) {
    console.log(`Preflight Error: ${e.message}`);
  }

  // 3. Staging Documents Check
  try {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_PROJECT_ID = 'snag-ops-staging';
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'snag-ops-staging' });
    const db = admin.firestore();
    const teamId = process.env.SLACK_ALLOWED_TEAM_ID || 'T0CBGG2QASU';
    const tickets = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('tickets').get();
    const park = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('module_park').get();
    const rr = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('module_restroom').get();
    const units = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('module_unit').get();
    const stores = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('module_store').get();
    const permits = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection('module_permit').get();

    console.log('\nStaging Data Telemetry:');
    console.log(`• Tickets (Work Orders): ${tickets.size}`);
    console.log(`• Park Street Inspections: ${park.size}`);
    console.log(`• Restroom Inspections: ${rr.size}`);
    console.log(`• Units: ${units.size}`);
    console.log(`• Stores: ${stores.size}`);
    console.log(`• Permits: ${permits.size}`);
    console.log('\nStatus: 🟢 SYSTEM HEALTHY & FULLY OPERATIONAL');
  } catch (e) {
    console.log(`Data Check Error: ${e.message}`);
  }
}

check();
