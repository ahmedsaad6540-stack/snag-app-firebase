'use strict';
const fs = require('node:fs');
const path = require('node:path');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'snag-ops-staging';

const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
const db = admin.firestore();

async function restore(targetFile, overrideWorkspace = null) {
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('Usage: node scripts/restore-staging-data.js <backup-file.json> [--target-workspace <ID>]');
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  const originalTeamId = snapshot.teamId || 'T0CBGG2QASU';
  const teamId = overrideWorkspace || originalTeamId;

  console.log(`Starting staging data restore from ${path.basename(targetFile)}...`);
  console.log(`Original Team ID in backup: ${originalTeamId}`);
  console.log(`Target Team ID for restore: ${teamId} ${overrideWorkspace ? '(ISOLATED RESTORE VERIFICATION)' : '(PRIMARY)'}`);

  let restoredTotal = 0;
  const restoredCounts = {};

  for (const [col, docs] of Object.entries(snapshot.collections)) {
    const parent = db.collection('slack_ops_staging_workspaces').doc(teamId).collection(col);
    for (const doc of docs) {
      const payload = {
        ...doc.data,
        teamId: teamId
      };
      await parent.doc(doc.id).set(payload, { merge: true });
      restoredTotal += 1;
    }
    restoredCounts[col] = docs.length;
    console.log(`  ✓ Restored ${col}: ${docs.length} records`);
  }

  console.log(`\n✅ Staging data restore completed successfully.`);
  console.log(`Target Workspace: slack_ops_staging_workspaces/${teamId}`);
  console.log(`Total documents restored: ${restoredTotal}`);
  return { teamId, restoredTotal, restoredCounts };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const fileArg = args[0];
  const targetIdx = args.indexOf('--target-workspace');
  const overrideTeam = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : null;

  restore(fileArg, overrideTeam).catch(err => {
    console.error('Restore failed:', err);
    process.exit(1);
  });
}

module.exports = { restore };
