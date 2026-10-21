'use strict';
const fs = require('node:fs');
const path = require('node:path');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = 'snag-ops-staging';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: 'snag-ops-staging' });
const db = admin.firestore();

async function restore(targetFile) {
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Please specify a valid backup JSON file path.');
    process.exit(1);
  }

  console.log(`Starting staging data restore from ${targetFile}...`);
  const snapshot = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  const teamId = snapshot.teamId || 'T0CBGG2QASU';

  let restored = 0;
  for (const [col, docs] of Object.entries(snapshot.collections)) {
    const parent = db.collection('slack_ops_staging_workspaces').doc(teamId).collection(col);
    for (const doc of docs) {
      await parent.doc(doc.id).set(doc.data, { merge: true });
      restored += 1;
    }
    console.log(`  ✓ Restored ${col}: ${docs.length} records`);
  }

  console.log(`\n✅ Staging data restore completed successfully. Total restored: ${restored}`);
}

const fileArg = process.argv[2];
restore(fileArg).catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
