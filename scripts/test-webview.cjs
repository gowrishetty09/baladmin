const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/webview/policy.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exportsObject = {};
vm.runInNewContext(code, { exports: exportsObject, URL });
const { adminConfig, isAdminUrl, isExternalUrl, notificationPath, safeFilename } = exportsObject;
const config = adminConfig('https://bestaerolimo.com/admin/');
for (const url of ['https://bestaerolimo.com/admin', 'https://bestaerolimo.com/admin/bookings/123?tab=details']) assert.equal(isAdminUrl(url, config), true);
for (const url of ['https://evil.example/admin/', 'http://bestaerolimo.com/admin/', 'https://bestaerolimo.com/admin-other/', 'https://bestaerolimo.com/admin/../api', 'https://bestaerolimo.com/admin/%2e%2e/api', 'https://user@bestaerolimo.com/admin/', 'javascript:alert(1)', 'file:///admin']) assert.equal(isAdminUrl(url, config), false, url);
for (const url of ['http://localhost/admin', 'https://user:password@example.com/admin', 'https://example.com/admin?token=secret']) assert.throws(() => adminConfig(url));
assert.equal(notificationPath({ bookingId: 'booking-123' }), '/bookings/booking-123');
assert.equal(notificationPath({ entityType: 'BOOKING', entityId: '123' }), '/bookings/123');
assert.equal(notificationPath({ bookingId: '../../settings' }), '/notifications');
assert.equal(notificationPath({ type: 'SOS_ALERT' }), '/monitoring');
assert.equal(notificationPath({}), '/notifications');
assert.equal(safeFilename('../../secret.pdf'), 'secret.pdf');
assert.equal(safeFilename('..\\..\\invoice.csv'), 'invoice.csv');
assert.equal(safeFilename('...'), 'document');
assert.equal(isExternalUrl('tel:+60123456789'), true);
assert.equal(isExternalUrl('intent://arbitrary'), false);
assert.equal(isExternalUrl('javascript:alert(1)'), false);
console.log('PASS: trusted admin navigation, external scheme restrictions, notification destinations, safe export filenames');
