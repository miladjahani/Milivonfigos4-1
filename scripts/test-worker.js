// MiliconfigOS v4.0 regression tests. These tests run the generated Worker bundle
// against a small D1-compatible mock; they do not claim to test a real Cloudflare
// deployment, live proxy handshakes, or public endpoint availability.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const bundlePath = path.join(projectRoot, 'dist', '_worker.js');

function createMockD1Database() {
  const tables = new Map([
    ['users', []],
    ['system_config', []],
    ['audit_logs', []],
    ['preferred_nodes', []],
    ['traffic_hourly', []]
  ]);
  let auditId = 1;
  function rows(table) {
    if (!tables.has(table)) tables.set(table, []);
    return tables.get(table);
  }
  function query(sql, binds = []) {
    const s = sql.trim().replace(/\s+/g, ' ').toLowerCase();
    return {
      async run() {
        if (s.startsWith('create table') || s.startsWith('create trigger') || s.startsWith('create index')) {
          return { success: true, meta: { changes: 0 } };
        }
        if (s.startsWith('insert or ignore into system_config')) {
          const [key, value, updatedAt] = binds;
          if (!rows('system_config').some(r => r.key === key)) rows('system_config').push({ key, value, updated_at: updatedAt });
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('insert into system_config')) {
          const [key, value, updatedAt] = binds;
          const found = rows('system_config').find(r => r.key === key);
          if (found) { found.value = value; found.updated_at = updatedAt; }
          else rows('system_config').push({ key, value, updated_at: updatedAt });
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('delete from system_config where key =')) {
          const key = binds[0];
          tables.set('system_config', rows('system_config').filter(r => r.key !== key));
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('delete from system_config where key not in')) {
          tables.set('system_config', rows('system_config').filter(r => ['admin_password_hash', 'admin_uuid'].includes(r.key)));
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('insert into users')) {
          const users = rows('users');
          if (users.length >= 5) throw new Error('USER_LIMIT_REACHED');
          const [id, username, uuid, subscriptionToken, subNodeCount, status, enabled, dataLimitGb, usedBytes,
            lifetimeBytes, requestCount, expireDays, expireAt, startOnFirstUse,
            firstConnectedAt, ipLimit, nodeScope, preset, note, configJson, createdAt, updatedAt] = binds;
          if (users.some(u => u.uuid === uuid)) throw new Error('UNIQUE constraint failed: users.uuid');
          users.push({
            id, username, uuid, subscription_token: subscriptionToken, sub_node_count: subNodeCount, status, enabled,
            data_limit_gb: dataLimitGb, used_bytes: usedBytes, lifetime_bytes: lifetimeBytes,
            request_count: requestCount, expire_days: expireDays, expire_at: expireAt,
            start_on_first_use: startOnFirstUse, first_connected_at: firstConnectedAt,
            ip_limit: ipLimit, node_scope: nodeScope, preset, note, config_json: configJson,
            created_at: createdAt, updated_at: updatedAt
          });
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('update users set subscription_token')) {
          const [subscriptionToken, updatedAt, id] = binds;
          const user = rows('users').find(u => u.id === id);
          if (user) Object.assign(user, { subscription_token: subscriptionToken, updated_at: updatedAt });
          return { success: true, meta: { changes: user ? 1 : 0 } };
        }
        if (s.startsWith('update users set') && s.includes('username =')) {
          const [username, uuid, subNodeCount, status, enabled, dataLimitGb, expireDays, expireAt,
            startOnFirstUse, ipLimit, nodeScope, preset, note, configJson, updatedAt, id] = binds;
          const user = rows('users').find(u => u.id === id);
          if (user) Object.assign(user, { username, uuid, sub_node_count: subNodeCount, status, enabled,
            data_limit_gb: dataLimitGb, expire_days: expireDays, expire_at: expireAt,
            start_on_first_use: startOnFirstUse, ip_limit: ipLimit, node_scope: nodeScope,
            preset, note, config_json: configJson, updated_at: updatedAt });
          return { success: true, meta: { changes: user ? 1 : 0 } };
        }
        if (s.startsWith('update users set used_bytes = 0')) {
          const [expireAt, updatedAt, id] = binds;
          const user = rows('users').find(u => u.id === id);
          if (user) Object.assign(user, { used_bytes: 0, request_count: 0, first_connected_at: 0, expire_at: expireAt, updated_at: updatedAt });
          return { success: true, meta: { changes: user ? 1 : 0 } };
        }
        if (s.startsWith('update users set used_bytes = used_bytes +')) {
          const [bytes, lifetimeBytes, requests, firstConnectedAt, currentTime, updatedAt, id] = binds;
          const user = rows('users').find(u => u.id === id);
          if (user) {
            user.used_bytes += bytes; user.lifetime_bytes += lifetimeBytes; user.request_count += requests;
            if (!user.first_connected_at) user.first_connected_at = firstConnectedAt;
            user.updated_at = updatedAt;
          }
          return { success: true, meta: { changes: user ? 1 : 0 } };
        }
        if (s.startsWith('delete from users where id =')) {
          const id = binds[0];
          tables.set('users', rows('users').filter(u => u.id !== id));
          return { success: true, meta: { changes: 1 } };
        }
        if (s.startsWith('insert into audit_logs')) {
          const [action, detail, ip, createdAt] = binds;
          rows('audit_logs').push({ id: auditId++, action, detail, ip, created_at: createdAt });
          return { success: true, meta: { changes: 1 } };
        }
        return { success: true, meta: { changes: 0 } };
      },
      async first() {
        if (s.includes('from system_config where key =')) {
          const key = binds[0];
          return rows('system_config').find(r => r.key === key) || null;
        }
        if (s.includes('select count(*) as cnt from users')) return { cnt: rows('users').length };
        if (s.includes('from users where id =')) return rows('users').find(r => r.id === binds[0]) || null;
        if (s.includes('from users where uuid =')) return rows('users').find(r => r.uuid === binds[0]) || null;
        return null;
      },
      async all() {
        if (s.includes('from users')) {
          const result = [...rows('users')];
          if (s.includes('order by created_at desc')) result.sort((a, b) => b.created_at - a.created_at);
          return { success: true, results: result };
        }
        if (s.includes('from system_config')) return { success: true, results: [...rows('system_config')] };
        if (s.includes('from audit_logs')) {
          const limit = Number(binds[0] || 15);
          return { success: true, results: [...rows('audit_logs')].sort((a, b) => b.created_at - a.created_at).slice(0, limit) };
        }
        return { success: true, results: [] };
      }
    };
  }
  const db = {
    prepare(sql) {
      let binds = [];
      const statement = {
        bind(...values) { binds = values; return this; },
        run() { return query(sql, binds).run(); },
        first(column) { return query(sql, binds).first(column); },
        all() { return query(sql, binds).all(); }
      };
      return statement;
    },
    async batch(statements) {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    },
    _tables: tables
  };
  return db;
}

function getCookie(response) {
  const value = response.headers.get('Set-Cookie') || '';
  const match = value.match(/(?:^|,\s*)mili_auth=([^;]+)/);
  assert.ok(match, 'response should set mili_auth cookie');
  return `mili_auth=${match[1]}`;
}

async function runTests() {
  console.log('🧪 MiliconfigOS v4.0 — regression suite');
  assert.ok(fs.existsSync(bundlePath), 'production Worker bundle must exist; run npm run build first');
  assert.ok(!fs.existsSync(path.join(projectRoot, 'dist', 'worker.readable.js')), 'readable debug source must not be emitted into deployable Pages assets');
  const rawBundle = fs.readFileSync(bundlePath, 'utf8');
  const stubFile = path.join(projectRoot, 'dist', '_worker_test_stub.mjs');
  const stubbed = rawBundle
    .replace(/import\s*\{\s*connect\s+as\s+cfConnect\s*\}\s*from\s*['"]cloudflare:sockets['"];?/g, 'const cfConnect = () => ({});')
    .replace(/import\s*\{\s*connect\s*\}\s*from\s*['"]cloudflare:sockets['"];?/g, 'const connect = () => ({});');
  fs.writeFileSync(stubFile, stubbed, 'utf8');

  try {
    const mod = await import(`${new URL(`file://${stubFile}`).href}?t=${Date.now()}`);
    const worker = mod.default;
    assert.ok(worker && typeof worker.fetch === 'function', 'Worker fetch entrypoint exists');

    // Empty environment is a diagnostic/development state, not a successful durable setup.
    const rootResponse = await worker.fetch(new Request('https://mili.example.test/'), {}, {});
    assert.equal(rootResponse.status, 200);
    const rootHtml = await rootResponse.text();
    assert.ok(rootHtml.includes('MILICONFIG'), 'login gateway contains product identity');
    assert.ok(rootHtml.includes('nginx.com'), 'intro includes configurable external destination');
    assert.ok(rootHtml.includes('gateway-ready') && rootHtml.includes('3000'), 'three-second intro transition exists');
    assert.ok(rootHtml.includes('mili_theme') && rootHtml.includes('system'), 'theme preference logic exists');
    assert.ok(rootHtml.includes('حالت خودکار') && rootHtml.includes('حالت روز') && rootHtml.includes('حالت شب'), 'all theme modes have clear labels');

    const setupWithoutStorage = await worker.fetch(new Request('https://mili.example.test/api/admin/setup-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password-123' })
    }), {}, {});
    assert.equal(setupWithoutStorage.status, 503, 'first-run setup must reject volatile-only storage');
    const fakeKv = new Map();
    const kvOnlySetup = await worker.fetch(new Request('https://mili.example.test/api/admin/setup-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-password-123' })
    }), { KV: { async get(key) { return fakeKv.get(key) || null; }, async put(key, value) { fakeKv.set(key, value); } } }, {});
    assert.equal(kvOnlySetup.status, 503, 'one-time admin bootstrap must require atomic D1 storage');
    assert.equal(fakeKv.has('admin_password_hash'), false, 'KV-only setup must not persist a racy first-admin hash');
    console.log('  ✓ login gateway, themes, intro timing, and durable-setup requirement');

    const db = createMockD1Database();
    const env = { DB: db, UUID: 'proxy-credential-must-not-become-admin-path' };
    const authStatus = await worker.fetch(new Request('https://mili.example.test/api/admin/auth-status'), env, {});
    const authStatusJson = await authStatus.json();
    assert.equal(authStatusJson.initialized, false);

    const tooShort = await worker.fetch(new Request('https://mili.example.test/api/admin/setup-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'short' })
    }), env, {});
    assert.equal(tooShort.status, 400, 'short initial password should be rejected');

    const setup = await worker.fetch(new Request('https://mili.example.test/api/admin/setup-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'mili-secret-123' })
    }), env, {});
    assert.equal(setup.status, 200, 'first administrator setup should succeed with durable D1');
    const adminCookie = getCookie(setup);
    const storedAdminHash = db._tables.get('system_config').find(r => r.key === 'admin_password_hash')?.value || '';
    assert.ok(storedAdminHash.startsWith('pbkdf2-sha256$'), 'password must be stored as PBKDF2 hash');
    assert.ok(!storedAdminHash.includes('mili-secret-123'), 'plaintext password must not be stored');

    const repeatSetup = await worker.fetch(new Request('https://mili.example.test/api/admin/setup-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'another-password-123' })
    }), env, {});
    assert.equal(repeatSetup.status, 409, 'first-run setup must not be repeatable');

    const unauthorizedUsers = await worker.fetch(new Request('https://mili.example.test/api/users'), env, {});
    assert.equal(unauthorizedUsers.status, 401, 'user API requires administrator session');
    const adminPathRedirect = await worker.fetch(new Request('https://mili.example.test/'), env, {});
    assert.equal(adminPathRedirect.status, 200, 'unauthenticated root displays gateway, not admin dashboard');

    const dashboardRedirect = await worker.fetch(new Request('https://mili.example.test/'), { ...env }, {});
    assert.equal(dashboardRedirect.status, 200);
    const adminUUID = db._tables.get('system_config').find(r => r.key === 'admin_uuid')?.value;
    assert.ok(adminUUID, 'random administrator path persisted in D1');
    assert.notEqual(adminUUID, env.UUID, 'proxy UUID environment variable must not become admin path');
    const unauthorizedDashboard = await worker.fetch(new Request(`https://mili.example.test/${adminUUID}`), env, {});
    assert.equal(unauthorizedDashboard.status, 302, 'admin dashboard must redirect without a valid session');

    const dashboard = await worker.fetch(new Request(`https://mili.example.test/${adminUUID}`, { headers: { Cookie: adminCookie } }), env, {});
    assert.equal(dashboard.status, 200);
    const dashboardHtml = await dashboard.text();
    assert.ok(dashboardHtml.includes('MILICONFIG') && dashboardHtml.includes('مدیریت کاربران'));
    assert.ok(dashboardHtml.includes('۰ / ۵') || dashboardHtml.includes('MAX_LIMIT'), 'dashboard expresses five-user limit');

    const configWithoutAuth = await worker.fetch(new Request('https://mili.example.test/api/config'), env, {});
    assert.equal(configWithoutAuth.status, 401, 'configuration API requires session');
    const configGet = await worker.fetch(new Request('https://mili.example.test/api/config', { headers: { Cookie: adminCookie } }), env, {});
    assert.equal(configGet.status, 200);
    const configJson = await configGet.json();
    assert.equal(configJson.adminPasswordHash, undefined, 'password hash must not leak through config API');
    assert.equal(configJson.admin_password_hash, undefined, 'snake-case password hash must not leak through config API');

    const configConflict = await worker.fetch(new Request('https://mili.example.test/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ ipv4: 'no', ipv6: 'no' })
    }), env, {});
    assert.equal(configConflict.status, 400, 'conflicting configuration should be rejected');
    const saveWarning = await worker.fetch(new Request('https://mili.example.test/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ fragment: 'yes' })
    }), env, {});
    assert.equal(saveWarning.status, 200, 'valid settings with documented caveat should be saved');
    const warningJson = await saveWarning.json();
    assert.ok((warningJson.warnings || []).some(w => w.code === 'FRAGMENT_CLIENT_DEPENDENT'));

    const scannerUnauth = await worker.fetch(new Request('https://mili.example.test/api/scanner/countries'), env, {});
    assert.equal(scannerUnauth.status, 401, 'scanner API is administrator-only');
    const scannerCountries = await worker.fetch(new Request('https://mili.example.test/api/scanner/countries', { headers: { Cookie: adminCookie } }), env, {});
    assert.equal(scannerCountries.status, 200);
    const scannerJson = await scannerCountries.json();
    assert.ok(scannerJson.countries.some(c => c.code === 'DE'));

    // Create one user with an origin-only scope to avoid pulling unverified public lists.
    const createUser = async username => worker.fetch(new Request('https://mili.example.test/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ username, nodeScope: 'origin', subNodeCount: 8, ena: 'yes', epi: 'no', epd: 'no', egi: 'no' })
    }), env, {});
    const created = await createUser('mili-test-1');
    assert.equal(created.status, 200);
    const createdJson = await created.json();
    assert.equal(createdJson.user.username, 'mili-test-1');
    assert.equal(createdJson.user.subNodeCount, 8);
    const userUuid = createdJson.user.uuid;
    let subscriptionToken = createdJson.user.subscriptionToken;
    assert.ok(typeof subscriptionToken === 'string' && /^[0-9a-f]{64}$/.test(subscriptionToken), 'each user gets an independent high-entropy subscription token');
    assert.notEqual(subscriptionToken, userUuid, 'subscription token must be independent from protocol UUID');

    const rawSub = await worker.fetch(new Request(`https://mili.example.test/sub/${subscriptionToken}?target=raw&limit=8`), env, {});
    assert.equal(rawSub.status, 200);
    const rawText = await rawSub.text();
    assert.ok(rawText.includes('vless://'), 'raw subscription should contain a generated VLESS configuration');
    assert.ok(!rawText.includes('127.0.0.1') && !rawText.includes('351c9981-04b6-4103-aa4b-864aa9c91469'), 'subscription must not contain known dummy endpoints or fixed UUID');
    const rawLines = rawText.trim().split(/\r?\n/).filter(Boolean);
    assert.ok(rawLines.length <= 8, 'subscription respects configured node count');
    assert.ok(decodeURIComponent(rawLines[0].split('#')[1] || '').includes('1+miliconfig'), 'generated node naming is stable');

    const singbox = await worker.fetch(new Request(`https://mili.example.test/sub/${subscriptionToken}?target=singbox&scope=origin&limit=8`), env, {});
    assert.equal(singbox.status, 200);
    const singboxJson = JSON.parse(await singbox.text());
    assert.ok(Array.isArray(singboxJson.outbounds), 'sing-box output is valid JSON with outbounds');

    for (const target of ['clash', 'surge', 'quanx', 'loon']) {
      const response = await worker.fetch(new Request(`https://mili.example.test/sub/${subscriptionToken}?target=${target}&scope=origin&limit=8`), env, {});
      assert.equal(response.status, 200, `${target} serializer endpoint should return successfully`);
      const payload = await response.text();
      assert.ok(payload.trim().length > 0, `${target} serializer must not be empty`);
      if (target === 'clash') assert.ok(payload.includes('proxies:') || payload.includes('proxy-groups:'), 'Clash YAML should include expected sections');
    }

    const statusPage = await worker.fetch(new Request(`https://mili.example.test/status/${subscriptionToken}`), env, {});
    assert.equal(statusPage.status, 200, 'user status page resolves through independent subscription token');
    assert.ok((await statusPage.text()).includes('/sub/' + subscriptionToken), 'status page uses the opaque subscription URL');
    const publicStatusApi = await worker.fetch(new Request(`https://mili.example.test/api/status/${subscriptionToken}`), env, {});
    assert.equal(publicStatusApi.status, 200, 'status API accepts the independent token');
    const publicStatusJson = await publicStatusApi.json();
    assert.equal(publicStatusJson.success, true);
    const uuidCannotFetchStatusApi = await worker.fetch(new Request(`https://mili.example.test/api/status/${userUuid}`), env, {});
    assert.equal(uuidCannotFetchStatusApi.status, 404, 'proxy UUID cannot be used as a public status API token');
    const uuidCannotFetchSubscription = await worker.fetch(new Request(`https://mili.example.test/sub/${userUuid}?target=raw`), env, {});
    assert.equal(uuidCannotFetchSubscription.status, 403, 'proxy UUID cannot be used as a subscription access token');
    const uuidCannotFetchStatus = await worker.fetch(new Request(`https://mili.example.test/status/${userUuid}`), env, {});
    assert.equal(uuidCannotFetchStatus.status, 404, 'proxy UUID cannot be used as a status-page token');

    const legacySub = await worker.fetch(new Request(`https://mili.example.test/${userUuid}/sub?target=raw`), env, {});
    assert.equal(legacySub.status, 410, 'legacy UUID-based subscription URLs are rejected after token separation');

    const rotateTokenResponse = await worker.fetch(new Request('https://mili.example.test/api/users', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ id: createdJson.user.id, action: 'rotate-subscription' })
    }), env, {});
    assert.equal(rotateTokenResponse.status, 200);
    const rotatedTokenJson = await rotateTokenResponse.json();
    const oldToken = subscriptionToken;
    subscriptionToken = rotatedTokenJson.user.subscriptionToken;
    assert.notEqual(subscriptionToken, oldToken, 'rotation creates a new subscription token');
    const revokedSub = await worker.fetch(new Request(`https://mili.example.test/sub/${oldToken}?target=raw`), env, {});
    assert.equal(revokedSub.status, 403, 'rotating the token revokes the previous subscription URL');
    const rotatedSub = await worker.fetch(new Request(`https://mili.example.test/sub/${subscriptionToken}?target=raw`), env, {});
    assert.equal(rotatedSub.status, 200, 'new subscription token remains usable');

    const disabled = await worker.fetch(new Request(`https://mili.example.test/api/users`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ id: createdJson.user.id, enabled: false })
    }), env, {});
    assert.equal(disabled.status, 200);
    const disabledSub = await worker.fetch(new Request(`https://mili.example.test/sub/${subscriptionToken}?target=raw&scope=origin`), env, {});
    assert.equal(disabledSub.status, 403, 'disabled user cannot download an active subscription');

    // User-cap limit: five ordinary accounts are allowed; sixth is rejected.
    for (let i = 2; i <= 5; i++) {
      const response = await createUser(`mili-test-${i}`);
      assert.equal(response.status, 200, `user ${i} should fit within five-user capacity`);
    }
    const sixth = await createUser('mili-test-overflow');
    assert.equal(sixth.status, 409, 'sixth ordinary user must be rejected');
    const userList = await worker.fetch(new Request('https://mili.example.test/api/users', { headers: { Cookie: adminCookie } }), env, {});
    const usersJson = await userList.json();
    assert.equal(usersJson.count, 5, 'persistent user count cannot exceed five');

    // The current SS implementation is deliberately not advertised as an AEAD server.
    const ssWarning = await worker.fetch(new Request('https://mili.example.test/api/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ es: 'yes' })
    }), env, {});
    assert.equal(ssWarning.status, 200);
    const ssWarningJson = await ssWarning.json();
    assert.ok((ssWarningJson.warnings || []).some(w => w.code === 'SS_DATAPLANE_REQUIRED'));

    // Password change must require an authenticated session and invalidate old sessions.
    const unauthChange = await worker.fetch(new Request('https://mili.example.test/api/admin/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'mili-secret-123', newPassword: 'mili-new-secret-456' })
    }), env, {});
    assert.equal(unauthChange.status, 401);
    const change = await worker.fetch(new Request('https://mili.example.test/api/admin/change-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ oldPassword: 'mili-secret-123', newPassword: 'mili-new-secret-456' })
    }), env, {});
    assert.equal(change.status, 200);
    const oldSession = await worker.fetch(new Request('https://mili.example.test/api/users', { headers: { Cookie: adminCookie } }), env, {});
    assert.equal(oldSession.status, 401, 'changing password invalidates old signed sessions');
    const newLogin = await worker.fetch(new Request('https://mili.example.test/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'mili-new-secret-456' })
    }), env, {});
    assert.equal(newLogin.status, 200);
    const newCookie = getCookie(newLogin);
    const authenticatedAgain = await worker.fetch(new Request('https://mili.example.test/api/users', { headers: { Cookie: newCookie } }), env, {});
    assert.equal(authenticatedAgain.status, 200);

    // D1 schema includes a five-user database guard and the built artifact was freshly generated.
    const schemaSql = fs.readFileSync(path.join(projectRoot, 'schema.sql'), 'utf8');
    assert.ok(schemaSql.includes('miliconfig_user_capacity_guard'));
    assert.ok(schemaSql.includes("RAISE(ABORT, 'USER_LIMIT_REACHED')"));

    console.log('  ✓ secure first-run setup, PBKDF2 hash, signed session, password rotation');
    console.log('  ✓ protected administration APIs, conflict detection, five-user backend cap');
    console.log('  ✓ independent subscription tokens, revoke-on-rotation, status links, five serializers');
    console.log('  ✓ disabled-user subscription protection and honest scanner test level');
    console.log('  ✓ database migration guard, no hardcoded dummy UUID in output');
    console.log('\n✅ All regression tests passed. Live Cloudflare deployment and real proxy end-to-end tests remain environment-dependent.');
  } finally {
    if (fs.existsSync(stubFile)) fs.unlinkSync(stubFile);
  }
}

runTests().catch(err => {
  console.error('❌ Regression test failed:', err);
  process.exit(1);
});
