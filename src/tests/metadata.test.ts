import { test, describe } from 'node:test';
import assert from 'node:assert';
import { metadataService } from '../services/metadataService';
import type { DocTypeMeta } from '../services/types';

describe('MetadataService', () => {
  const sampleMeta: DocTypeMeta = {
    name: 'Sales Invoice',
    is_submittable: 1,
    fields: [
      { fieldname: 'title_sb', label: 'Title Section', fieldtype: 'Section Break' },
      { fieldname: 'customer', label: 'Customer', fieldtype: 'Link', reqd: 1, in_list_view: 1 },
      { fieldname: 'posting_date', label: 'Posting Date', fieldtype: 'Date', reqd: 1, in_list_view: 1 },
      { fieldname: 'company', label: 'Company', fieldtype: 'Link', reqd: 1, in_list_view: 0 },
      { fieldname: 'items_sb', label: 'Items Section', fieldtype: 'Section Break' },
      { fieldname: 'items', label: 'Items Table', fieldtype: 'Table', options: 'Sales Invoice Item' },
      { fieldname: 'grand_total', label: 'Grand Total', fieldtype: 'Currency', read_only: 1, in_list_view: 1 },
    ],
  };

  test('filters out section/column breaks from form fields', () => {
    const formFields = metadataService.getFormFields(sampleMeta);
    assert.strictEqual(formFields.length, 5);
    assert.strictEqual(formFields.some((f) => f.fieldtype === 'Section Break'), false);
  });

  test('extracts list view columns', () => {
    const listCols = metadataService.getListViewFields(sampleMeta);
    const names = listCols.map((c) => c.fieldname);
    assert.deepStrictEqual(names, ['customer', 'posting_date', 'grand_total']);
  });

  test('extracts mandatory fields', () => {
    const mandatory = metadataService.getMandatoryFields(sampleMeta);
    const names = mandatory.map((c) => c.fieldname);
    assert.deepStrictEqual(names, ['customer', 'posting_date', 'company']);
  });

  test('extracts child table fields', () => {
    const childTables = metadataService.getChildTableFields(sampleMeta);
    assert.strictEqual(childTables.length, 1);
    assert.strictEqual(childTables[0].fieldname, 'items');
    assert.strictEqual(childTables[0].options, 'Sales Invoice Item');
  });
});
