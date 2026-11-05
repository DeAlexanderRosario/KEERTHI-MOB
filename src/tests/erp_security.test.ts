import assert from 'node:assert/strict';
import test from 'node:test';

import { buildErpTargetUrl, isAllowedErpMethodName, isSameOriginBrowserRequest, parseErpOrigin } from '../server/erpSecurity';

const erpOrigin = parseErpOrigin('http://erp.internal:8080');

test('ERP URL builder keeps the configured origin and preserves ERP API query strings', () => {
  const target = buildErpTargetUrl(erpOrigin, '/api/method/vms.api.common.get_bootstrap?company=KGH');
  assert.equal(target.origin, 'http://erp.internal:8080');
  assert.equal(target.pathname, '/api/method/vms.api.common.get_bootstrap');
  assert.equal(target.searchParams.get('company'), 'KGH');
});

test('ERP URL builder rejects non-API, absolute, and host-relative paths', () => {
  for (const path of [
    'https://attacker.example/api/method/x',
    '//attacker.example/api/method/x',
    '/resource/Customer',
    '/\\\\attacker.example/api/method/x',
  ]) assert.throws(() => buildErpTargetUrl(erpOrigin, path));
});

test('ERP URL builder rejects normalized and encoded path traversal', () => {
  for (const path of [
    '/api/../resource/Customer',
    '/api/%2e%2e/resource/Customer',
    '/api/%2E%2E/resource/Customer',
  ]) assert.throws(() => buildErpTargetUrl(erpOrigin, path));
});

test('ERP URL builder rejects backslashes, fragments, and control characters', () => {
  for (const path of [
    '/api/method/x\\\\..\\\\admin',
    '/api/method/x#@attacker.example',
    '/api/method/x\\nHost: attacker.example',
  ]) assert.throws(() => buildErpTargetUrl(erpOrigin, path));
});

test('ERP origin parser rejects credentials and non-HTTP schemes', () => {
  assert.throws(() => parseErpOrigin('http://user:password@erp.internal'));
  assert.throws(() => parseErpOrigin('file:///etc/passwd'));
  assert.throws(() => parseErpOrigin('http://erp.internal/?redirect=1'));
});

test('whitelisted method names accept dotted identifiers and reject route syntax', () => {
  assert.equal(isAllowedErpMethodName('vms.api.field_sales.get_customer_context'), true);
  assert.equal(isAllowedErpMethodName('frappe.client.get_list'), true);
  assert.equal(isAllowedErpMethodName('vms.api..method'), false);
  assert.equal(isAllowedErpMethodName('../admin'), false);
  assert.equal(isAllowedErpMethodName('vms/api/method'), false);
  assert.equal(isAllowedErpMethodName('vms.api.method;rm'), false);
});

test('cross-site GET requests are rejected even when the method is normally safe', () => {
  assert.equal(isSameOriginBrowserRequest('GET', undefined, 'cross-site', 'https://erp.example.test'), false);
});

test('same-origin browser requests pass and mismatched origins fail', () => {
  assert.equal(isSameOriginBrowserRequest('GET', 'https://erp.example.test', 'same-origin', 'https://erp.example.test'), true);
  assert.equal(isSameOriginBrowserRequest('POST', 'https://attacker.example', 'cross-site', 'https://erp.example.test'), false);
  assert.equal(isSameOriginBrowserRequest('POST', undefined, undefined, 'https://erp.example.test'), false);
});
