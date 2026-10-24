const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('=== Park Street Operations - Automated Staging Backup Daemon ===');
console.log('Timestamp: ' + new Date().toISOString());

const scriptPath = path.join(__dirname, 'backup-staging-data.js');

function runBackup() {
  try {
    console.log(`[${new Date().toISOString()}] Initiating scheduled backup...`);
    const output = execSync(`node "${scriptPath}"`, { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Backup execution error:`, err.message);
  }
}

// Run immediately on start
runBackup();

// Run every 2 hours (2 * 60 * 60 * 1000 ms)
const INTERVAL_MS = 2 * 60 * 60 * 1000;
setInterval(runBackup, INTERVAL_MS);

console.log('Scheduled backup job active: running every 2 hours.');
