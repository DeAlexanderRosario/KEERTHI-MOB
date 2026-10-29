import { test, describe } from 'node:test';
import assert from 'node:assert';
import { query } from '../services/queryBuilder';

describe('QueryBuilder', () => {
  test('constructs basic list query', () => {
    const q = query()
      .select(['name', 'customer_name', 'status'])
      .where('docstatus', '=', 1)
      .where('company', '=', 'Keerthi Groups')
      .orderBy('modified', 'desc')
      .paginate(0, 20)
      .build();

    assert.deepStrictEqual(q.fields, ['name', 'customer_name', 'status']);
    assert.deepStrictEqual(q.filters, [
      ['docstatus', '=', 1],
      ['company', '=', 'Keerthi Groups'],
    ]);
    assert.strictEqual(q.order_by, 'modified desc');
    assert.strictEqual(q.limit_start, 0);
    assert.strictEqual(q.limit_page_length, 20);
  });

  test('serializes URL search params correctly', () => {
    const q = query()
      .select(['name', 'grand_total'])
      .where('status', '=', 'Unpaid')
      .paginate(10, 25);

    const params = q.toUrlParams();
    assert.strictEqual(params.get('fields'), JSON.stringify(['name', 'grand_total']));
    assert.strictEqual(params.get('filters'), JSON.stringify([['status', '=', 'Unpaid']]));
    assert.strictEqual(params.get('limit_start'), '10');
    assert.strictEqual(params.get('limit_page_length'), '25');
  });

  test('enforces pagination boundary constraints', () => {
    const q = query().paginate(-5, 500).build();
    assert.strictEqual(q.limit_start, 0);
    assert.strictEqual(q.limit_page_length, 100); // capped at 100
  });
});
