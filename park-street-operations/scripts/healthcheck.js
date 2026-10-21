'use strict';

/**
 * Health Check and Diagnostic Probe for Park Street Operations
 * Validates Firestore Emulator, configuration preflight, and database collections.
 * Fails closed (exit code 1) if any check fails, and NEVER announces healthy on failure.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

// Load local .env if available
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]] && m[2]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const { preflight } = require('../src/preflight');

async function check() {
  console.log('=== Park Street Operations Health Check Probe ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  let allChecksPassed = true;
  const failureReasons = [];

  // 1. Emulator reachability check
  const emuPromise = new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8080/', (res) => {
      resolve({ ok: res.statusCode < 500, status: res.statusCode });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(3000, () => { req.destroy(); resolve({ ok: false, error: 'connection timeout' }); });
  });

  const emu = await emuPromise;
  if (emu.ok) {
    console.log(`[1/3] Firestore Emulator (127.0.0.1:8080): 🟢 ONLINE (Status: ${emu.status})`);
  } else {
    console.log(`[1/3] Firestore Emulator (127.0.0.1:8080): 🔴 OFFLINE / UNREACHABLE (${emu.error || emu.status})`);
    allChecksPassed = false;
    failureReasons.push('Firestore Emulator unreachable on 127.0.0.1:8080');
  }

  // 2. Preflight validation
  try {
    const manifestFile = process.env.SLACK_SOCKET_MODE === 'true'
      ? path.join(__dirname, '../app-manifest.socket-mode.yaml')
      : path.join(__dirname, '../app-manifest.yaml');
    const manifestContent = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : '';
    const pf = preflight(process.env, manifestContent);
    if (pf.ready) {
      console.log(`[2/3] Preflight Safety Checks: 🟢 PASS (${pf.checks.length}/${pf.checks.length} checks passed)`);
    } else {
      const failed = pf.checks.filter(c => !c.ok).map(c => c.key);
      console.log(`[2/3] Preflight Safety Checks: 🔴 FAIL (Failed: ${failed.join(', ')})`);
      allChecksPassed = false;
      failureReasons.push(`Preflight safety failure: ${failed.join(', ')}`);
    }
  } catch (e) {
    console.log(`[2/3] Preflight Safety Checks: 🔴 EXCEPTION (${e.message})`);
    allChecksPassed = false;
    failureReasons.push(`Preflight exception: ${e.message}`);
  }

  // 3. Staging Documents & Collections Telemetry
  if (emu.ok) {
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

      console.log(`[3/3] Staging Database Telemetry: 🟢 CONNECTED`);
      console.log(`      • Tickets (Work Orders): ${tickets.size}`);
      console.log(`      • Park Street Inspections: ${park.size}`);
      console.log(`      • Restroom Inspections: ${rr.size}`);
      console.log(`      • Units: ${units.size}`);
      console.log(`      • Stores: ${stores.size}`);
      console.log(`      • Permits: ${permits.size}`);
    } catch (e) {
      console.log(`[3/3] Staging Database Telemetry: 🔴 QUERY FAILED (${e.message})`);
      allChecksPassed = false;
      failureReasons.push(`Database query failure: ${e.message}`);
    }
  } else {
    console.log(`[3/3] Staging Database Telemetry: ⚪ SKIPPED (Emulator is offline)`);
  }

  // Final Verdict
  console.log('--------------------------------------------------');
  if (allChecksPassed) {
    console.log('OVERALL STATUS: 🟢 SYSTEM HEALTHY & FULLY OPERATIONAL');
    process.exitCode = 0;
  } else {
    console.log('OVERALL STATUS: 🔴 SYSTEM UNHEALTHY (Checks failed)');
    console.log('Failures:');
    failureReasons.forEach(r => console.log(`  - ${r}`));
    process.exitCode = 1;
  }
}

check().catch(err => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
