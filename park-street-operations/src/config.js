'use strict';

/** IMPORTANT: this pilot never reads from or writes to the existing SNAG production project. */
const FORBIDDEN_PROJECTS = new Set(['snag-app-firebase']);
const REMOTE_CONFIRM = 'I_CONFIRM_SEPARATE_STAGING_PROJECT';

function validateFirebaseTarget(env = process.env) {
  const projectId = (env.FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required (use snag-ops-staging for Emulator).');
  if (FORBIDDEN_PROJECTS.has(projectId)) throw new Error('PRODUCTION_BLOCK: Firebase project snag-app-firebase is prohibited by this staging app.');
  const emulator = String(env.FIRESTORE_EMULATOR_HOST || '').trim();
  if (emulator) {
    if (!/^(localhost|127\.0\.0\.1|\[::1\]):\d{2,5}$/.test(emulator)) {
      throw new Error('FIRESTORE_EMULATOR_HOST must be local (localhost:8080 or 127.0.0.1:8080).');
    }
    return { projectId, emulator: true };
  }
  if (!/-(staging|demo)$/.test(projectId)) {
    throw new Error('Remote Firebase project ID MUST end in -staging or -demo.');
  }
  if (env.ENABLE_REMOTE_STAGING !== REMOTE_CONFIRM) {
    throw new Error('Remote Firebase disabled; set ENABLE_REMOTE_STAGING after creating a SEPARATE staging project.');
  }
  return { projectId, emulator: false };
}

function parseAllowedIds(csv, prefix) {
  const ids = String(csv || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) throw new Error(`Required allowlist missing (${prefix}).`);
  if (!ids.every(x => new RegExp(`^${prefix}[A-Z0-9]+$`).test(x))) {
    throw new Error(`Invalid ${prefix} ID in allowlist.`);
  }
  return new Set(ids);
}

function appConfig(env = process.env) {
  const target = validateFirebaseTarget(env);
  const signingSecret = String(env.SLACK_SIGNING_SECRET || '').trim();
  const botToken = String(env.SLACK_BOT_TOKEN || '').trim();
  const team = String(env.SLACK_ALLOWED_TEAM_ID || '').trim();
  const socketMode = env.SLACK_SOCKET_MODE === 'true';
  const appToken = String(env.SLACK_APP_TOKEN || '').trim();
  if (!botToken.startsWith('xoxb-')) throw new Error('Slack Bot Token is required.');
  if (socketMode && !appToken.startsWith('xapp-')) throw new Error('Socket Mode requires SLACK_APP_TOKEN (xapp-), not a bot token.');
  if (!socketMode && !signingSecret) throw new Error('HTTP mode requires SLACK_SIGNING_SECRET.');
  if (!/^T[A-Z0-9]+$/.test(team)) throw new Error('SLACK_ALLOWED_TEAM_ID is required.');
  const users = parseAllowedIds(env.SLACK_ALLOWED_USER_IDS, 'U');
  return { ...target, signingSecret, botToken, socketMode, appToken, team, users, enableFiles: env.SLACK_ENABLE_FILE_UPLOAD==='true', port: Number(env.PORT || 3000) };
}

function authorized(config, body, userId) {
  const team = body?.team_id || body?.team?.id || body?.authorizations?.[0]?.team_id;
  const uid = userId || body?.user_id || body?.user?.id || body?.event?.user;
  return team === config.team && config.users.has(uid);
}

module.exports = { validateFirebaseTarget, appConfig, authorized };
