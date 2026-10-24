'use strict';
const fs = require('node:fs');
const path = require('node:path');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = 'snag-ops-staging';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'snag-ops-staging' });
const db = admin.firestore();

const BACKUPS_DIR = path.join(__dirname, '../backups');
fs.mkdirSync(BACKUPS_DIR, { recursive: true });

async function backup() {
  const teamId = process.env.SLACK_ALLOWED_TEAM_ID || 'T0CBGG2QASU';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `staging-backup-${timestamp}.json`);

  console.log(`Starting staging data backup for workspace ${teamId}...`);
  const collections = ['tickets', 'module_park', 'module_restroom', 'module_unit', 'module_store', 'module_permit', 'module_custom', 'module_notifications'];
  const snapshot = {
    teamId,
    timestamp: new Date().toISOString(),
    collections: {}
  };

  let totalDocs = 0;
  for (const col of collections) {
    const snap = await db.collection('slack_ops_staging_workspaces').doc(teamId).collection(col).get();
    snapshot.collections[col] = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    totalDocs += snap.size;
    console.log(`  ✓ Backed up ${col}: ${snap.size} records`);
  }

  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\n✅ Backup successfully created:`);
  console.log(`File: ${backupFile}`);
  console.log(`Total documents saved: ${totalDocs}`);
  return backupFile;
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
