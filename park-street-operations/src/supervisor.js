'use strict';

/**
 * 24/7 Resilient Process Supervisor for Park Street Operations
 * Manages both the isolated Firestore Emulator and the Slack Bolt Socket Mode app.
 * Provides automatic restart on crash, health heartbeats, and graceful shutdown.
 */

const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const LOGS_DIR = path.join(__dirname, '../logs');
fs.mkdirSync(LOGS_DIR, { recursive: true });

const supervisorLog = (msg) => {
  const line = `[${new Date().toISOString()}] [SUPERVISOR] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(path.join(LOGS_DIR, 'supervisor.log'), line, 'utf8');
};

let emulatorProcess = null;
let boltProcess = null;
let shuttingDown = false;

function checkEmulatorHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8080/', (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startEmulator() {
  if (shuttingDown) return;
  supervisorLog('Starting Firebase Firestore Emulator (snag-ops-staging on 127.0.0.1:8080)...');
  
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = [
    '--yes',
    'firebase-tools@13.35.1',
    'emulators:start',
    '--only',
    'firestore',
    '--project',
    'snag-ops-staging',
    '--import=./.emulator-data',
    '--export-on-exit=./.emulator-data'
  ];

  emulatorProcess = spawn(cmd, args, {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const outLog = fs.createWriteStream(path.join(LOGS_DIR, 'emulator-out.log'), { flags: 'a' });
  const errLog = fs.createWriteStream(path.join(LOGS_DIR, 'emulator-err.log'), { flags: 'a' });
  emulatorProcess.stdout.pipe(outLog);
  emulatorProcess.stderr.pipe(errLog);

  emulatorProcess.on('exit', (code, signal) => {
    supervisorLog(`Emulator exited with code ${code}, signal ${signal}.`);
    emulatorProcess = null;
    if (!shuttingDown) {
      supervisorLog('Restarting Emulator in 5 seconds...');
      setTimeout(startEmulator, 5000);
    }
  });
}

function startBolt() {
  if (shuttingDown) return;
  supervisorLog('Starting Slack Bolt Socket Mode App...');

  boltProcess = spawn(process.execPath, [path.join(__dirname, 'app.js')], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'staging',
      SLACK_SOCKET_MODE: 'true',
      FIREBASE_PROJECT_ID: 'snag-ops-staging',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const outLog = fs.createWriteStream(path.join(LOGS_DIR, 'bolt-out.log'), { flags: 'a' });
  const errLog = fs.createWriteStream(path.join(LOGS_DIR, 'bolt-err.log'), { flags: 'a' });
  boltProcess.stdout.pipe(outLog);
  boltProcess.stderr.pipe(errLog);

  boltProcess.on('exit', (code, signal) => {
    supervisorLog(`Slack Bolt exited with code ${code}, signal ${signal}.`);
    boltProcess = null;
    if (!shuttingDown) {
      supervisorLog('Restarting Slack Bolt in 3 seconds...');
      setTimeout(startBolt, 3000);
    }
  });
}

// Heartbeat routine
setInterval(async () => {
  if (shuttingDown) return;
  const emuHealthy = await checkEmulatorHealth();
  const boltHealthy = boltProcess !== null && !boltProcess.killed;
  
  const status = {
    timestamp: new Date().toISOString(),
    emulator: emuHealthy ? 'healthy' : 'unreachable',
    boltApp: boltHealthy ? 'running' : 'stopped',
    uptimeSeconds: Math.round(process.uptime())
  };
  
  fs.appendFileSync(
    path.join(LOGS_DIR, 'heartbeat.jsonl'),
    JSON.stringify(status) + '\n',
    'utf8'
  );
}, 30000);

// Graceful termination
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  supervisorLog('Supervisor shutting down gracefully...');
  if (boltProcess) boltProcess.kill('SIGTERM');
  if (emulatorProcess) emulatorProcess.kill('SIGINT');
  setTimeout(() => process.exit(0), 4000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Launch
startEmulator();
setTimeout(startBolt, 6000);
supervisorLog('24/7 Supervisor initialized and monitoring.');
