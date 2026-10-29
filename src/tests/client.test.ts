import { test, describe } from 'node:test';
import assert from 'node:assert';
import { unwrapEnvelope } from '../services/httpClient';
import { parseFrappeErrorMessage, ErpError } from '../services/errors';

describe('HTTP Client & Error Normalization', () => {
  test('unwraps data envelope', () => {
    const payload = { data: [{ name: 'ACC-001', title: 'Bank Account' }] };
    const result = unwrapEnvelope<any>(payload);
    assert.deepStrictEqual(result, [{ name: 'ACC-001', title: 'Bank Account' }]);
  });

  test('unwraps message envelope', () => {
    const payload = { message: 'Logged In' };
    const result = unwrapEnvelope<any>(payload);
    assert.strictEqual(result, 'Logged In');
  });

  test('passes raw value when no envelope exists', () => {
    const payload = { simple: 'value' };
    const result = unwrapEnvelope<any>(payload);
    assert.deepStrictEqual(result, { simple: 'value' });
  });

  test('parses Frappe _server_messages correctly', () => {
    const frappePayload = {
      _server_messages: JSON.stringify([
        JSON.stringify({
          message: 'Item <b>ITEM-101</b> is out of stock in warehouse Main.',
        }),
      ]),
    };
    const message = parseFrappeErrorMessage(frappePayload);
    assert.strictEqual(message, 'Item ITEM-101 is out of stock in warehouse Main.');
  });

  test('parses simple message field', () => {
    const payload = { message: 'Invalid login credentials' };
    const message = parseFrappeErrorMessage(payload);
    assert.strictEqual(message, 'Invalid login credentials');
  });

  test('instantiates ErpError with code and status', () => {
    const err = new ErpError('Permission Denied', 'FORBIDDEN', 403);
    assert.strictEqual(err.name, 'ErpError');
    assert.strictEqual(err.code, 'FORBIDDEN');
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.message, 'Permission Denied');
  });
});
