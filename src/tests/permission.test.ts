import { test, describe } from 'node:test';
import assert from 'node:assert';
import { resolvePrimaryPersona, PERSONA_DEFINITIONS } from '../config/personas';

describe('Role & Persona Resolution', () => {
  test('resolves Administrator to system_admin persona', () => {
    const persona = resolvePrimaryPersona(['Administrator']);
    assert.strictEqual(persona.key, 'system_admin');
    assert.strictEqual(persona.defaultModule, 'dashboard');
  });

  test('resolves System Manager to system_admin persona', () => {
    const persona = resolvePrimaryPersona(['System Manager', 'Sales User']);
    assert.strictEqual(persona.key, 'system_admin');
  });

  test('resolves Order Biller role to order_biller persona', () => {
    const persona = resolvePrimaryPersona(['Order Biller']);
    assert.strictEqual(persona.key, 'order_biller');
    assert.strictEqual(persona.defaultModule, 'billing');
  });

  test('resolves Accounts User to accountant persona', () => {
    const persona = resolvePrimaryPersona(['Accounts User']);
    assert.strictEqual(persona.key, 'accountant');
    assert.strictEqual(persona.defaultModule, 'accounts');
  });

  test('resolves Stock User to stock_user persona', () => {
    const persona = resolvePrimaryPersona(['Stock User']);
    assert.strictEqual(persona.key, 'stock_user');
    assert.strictEqual(persona.defaultModule, 'stock');
  });

  test('resolves Delivery Staff to delivery_staff persona', () => {
    const persona = resolvePrimaryPersona(['Delivery Staff']);
    assert.strictEqual(persona.key, 'delivery_staff');
    assert.strictEqual(persona.defaultModule, 'delivery');
  });

  test('resolves HR User to hr_user persona', () => {
    const persona = resolvePrimaryPersona(['HR User']);
    assert.strictEqual(persona.key, 'hr_user');
    assert.strictEqual(persona.defaultModule, 'hr');
  });
});
