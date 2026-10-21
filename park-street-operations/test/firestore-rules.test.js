'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;
const PROJECT_ID = 'snag-ops-staging';

function rawHttpRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
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

test('Firestore Security Rules: Unauthenticated client requests are blocked (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/slack_ops_staging_workspaces/T0CBGG2QASU/tickets/TEST-PSO-001');
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden, got ${res.statusCode}`);
});

test('Firestore Security Rules: Production /users collection is strictly forbidden (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/users/any-user-id');
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden, got ${res.statusCode}`);
});

test('Firestore Security Rules: Production /snags write is strictly forbidden (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/snags?documentId=exploit', 'POST', {
    fields: { title: { stringValue: 'exploit attempt' } }
  });
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden, got ${res.statusCode}`);
});

test('Firestore Security Rules: Production /companies collection is strictly forbidden (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/companies/comp-001');
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden, got ${res.statusCode}`);
});

test('Firestore Security Rules: Production /inspections collection is strictly forbidden (403 Forbidden)', async () => {
  const res = await rawHttpRequest('/inspections/insp-001');
  assert.equal(res.statusCode, 403, `Expected 403 Forbidden, got ${res.statusCode}`);
});
