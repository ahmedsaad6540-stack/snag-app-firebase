'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ? process.env.FIRESTORE_EMULATOR_HOST.split(':')[0] : '127.0.0.1';
const EMULATOR_PORT = process.env.FIRESTORE_EMULATOR_HOST ? parseInt(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1], 10) : 8080;
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'snag-ops-staging';

function checkEmulatorOnline() {
  return new Promise((resolve) => {
    const req = http.get(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`, (res) => resolve(res.statusCode < 500));
    req.on('error', () => resolve(false));
    req.setTimeout(2500, () => { req.destroy(); resolve(false); });
  });
}

function makeJwt(claims) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.`;
}

function rawHttpRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = {
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method,
      headers
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

test('0. Emulator Pre-check: Emulator MUST be online (FAILS explicitly if offline)', async () => {
  const online = await checkEmulatorOnline();
  assert.ok(online, `CRITICAL: Firestore Emulator is NOT online on ${EMULATOR_HOST}:${EMULATOR_PORT}. Testing will NOT bypass.`);
});

test('1. Unauthenticated client requests are blocked (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU/tickets/TEST-PSO-001');
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for unauthenticated request, got ${res.statusCode}`);
});

test('2. Production /users collection is strictly blocked even for authenticated users (403 Forbidden)', async () => {
  const token = makeJwt({ sub: 'user-1', user_id: 'user-1', team_id: 'T0CBGG2QASU', email_verified: true, firebase: { sign_in_provider: 'custom' } });
  const res = await rawHttpRequest('/users/user-1', 'GET', null, token);
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for production /users, got ${res.statusCode}`);
});

test('3. Production /snags collection write is strictly blocked (403 Forbidden)', async () => {
  const token = makeJwt({ sub: 'user-1', user_id: 'user-1', team_id: 'T0CBGG2QASU', email_verified: true, firebase: { sign_in_provider: 'custom' } });
  const res = await rawHttpRequest('/snags?documentId=exploit', 'POST', {
    fields: { title: { stringValue: 'exploit attempt' } }
  }, token);
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for production /snags, got ${res.statusCode}`);
});

test('4. Production /companies and /inspections are strictly blocked (403 Forbidden)', async () => {
  const token = makeJwt({ sub: 'user-1', user_id: 'user-1', team_id: 'T0CBGG2QASU', email_verified: true, firebase: { sign_in_provider: 'custom' } });
  const r1 = await rawHttpRequest('/companies/comp-001', 'GET', null, token);
  const r2 = await rawHttpRequest('/inspections/insp-001', 'GET', null, token);
  assert.equal(r1.statusCode, 403);
  assert.equal(r2.statusCode, 403);
});

test('5. Authorized user with correct team claim (T0CBGG2QASU) and verified status can read tickets (200 OK)', async () => {
  const token = makeJwt({
    sub: 'U0CAL6BQX38',
    user_id: 'U0CAL6BQX38',
    team_id: 'T0CBGG2QASU',
    email_verified: true,
    firebase: { sign_in_provider: 'custom' }
  });
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU/tickets/TEST-PSO-001', 'GET', null, token);
  assert.equal(res.statusCode, 200, `Expected 200 OK for authorized workspace user, got ${res.statusCode}`);
});

test('6. User from a DIFFERENT workspace (T_OTHER) is blocked from T0CBGG2QASU (403 Forbidden)', async () => {
  const token = makeJwt({
    sub: 'unauthorized-user',
    user_id: 'unauthorized-user',
    team_id: 'T_OTHER',
    email_verified: true,
    firebase: { sign_in_provider: 'custom' }
  });
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU/tickets/TEST-PSO-001', 'GET', null, token);
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for cross-workspace access, got ${res.statusCode}`);
});

test('7. Unverified email user is blocked from staging tickets (403 Forbidden)', async () => {
  const token = makeJwt({
    sub: 'unverified-user',
    user_id: 'unverified-user',
    team_id: 'T0CBGG2QASU',
    email_verified: false,
    firebase: { sign_in_provider: 'password' }
  });
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU/tickets/TEST-PSO-001', 'GET', null, token);
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for unverified user, got ${res.statusCode}`);
});

test('8. Non-admin user cannot delete workspace document root (403 Forbidden)', async () => {
  const token = makeJwt({
    sub: 'regular-user',
    user_id: 'regular-user',
    team_id: 'T0CBGG2QASU',
    email_verified: true,
    admin: false,
    role: 'staff',
    firebase: { sign_in_provider: 'custom' }
  });
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU', 'DELETE', null, token);
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden for non-admin delete, got ${res.statusCode}`);
});
