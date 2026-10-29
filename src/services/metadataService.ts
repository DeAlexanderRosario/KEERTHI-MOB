/**
 * Metadata Service for DocTypes
 * Loads and caches DocType field schemas, child tables, and permissions from ERPNext.
 */

import { httpClient } from './httpClient';
import type { DocTypeMeta, DocField } from './types';

class MetadataService {
  private cache: Map<string, { meta: DocTypeMeta; timestamp: number }> = new Map();
  private readonly TTL_MS = 1000 * 60 * 10; // 10 minutes cache

  /**
   * Fetches metadata for a given DocType
   */
  public async getDocTypeMeta(doctype: string): Promise<DocTypeMeta> {
    const cached = this.cache.get(doctype);
    if (cached && Date.now() - cached.timestamp < this.TTL_MS) {
      return cached.meta;
    }

    try {
      const response = await httpClient<any>(
        `/api/erp/doctype/${encodeURIComponent(doctype)}/meta`
      );

      // httpClient unwraps { data: metaDoc } to metaDoc directly.
      const meta: DocTypeMeta =
        response && typeof response === 'object' && response.name
          ? response
          : response?.data || response?.message || response;

      if (!meta || !meta.name || !Array.isArray(meta.fields)) {
        throw new Error(`Invalid metadata received for DocType "${doctype}".`);
      }

      this.cache.set(doctype, { meta, timestamp: Date.now() });
      return meta;
    } catch (err: any) {
      throw new Error(`Failed to load schema for ${doctype}: ${err.message}`);
    }
  }

  /**
   * Returns clean visible fields excluding section/column breaks
   */
  public getFormFields(meta: DocTypeMeta): DocField[] {
    return meta.fields.filter(
      (f) =>
        f.fieldtype !== 'Section Break' &&
        f.fieldtype !== 'Column Break' &&
        f.fieldtype !== 'Tab Break' &&
        !f.hidden
    );
  }

  /**
   * Returns fields appropriate for table/grid view
   */
  public getListViewFields(meta: DocTypeMeta): DocField[] {
    const explicitlyInList = meta.fields.filter(
      (f) =>
        Boolean(f.in_list_view) &&
        f.fieldtype !== 'Section Break' &&
        f.fieldtype !== 'Column Break' &&
        f.fieldtype !== 'Tab Break' &&
        !f.hidden
    );

    let list = explicitlyInList.length > 0 ? [...explicitlyInList] : [];

    if (list.length === 0) {
      list = meta.fields
        .filter(
          (f) =>
            f.fieldtype !== 'Section Break' &&
            f.fieldtype !== 'Column Break' &&
            f.fieldtype !== 'Tab Break' &&
            f.fieldtype !== 'Table' &&
            !f.hidden
        )
        .slice(0, 6);
    }

    // Ensure primary descriptive fields (e.g. item_name for Item, customer_name for Customer) are present
    const primaryNameCandidates = ['item_name', 'customer_name', 'supplier_name', 'employee_name', 'title'];
    if (meta.title_field && !primaryNameCandidates.includes(meta.title_field)) {
      primaryNameCandidates.unshift(meta.title_field);
    }

    for (const candidate of primaryNameCandidates) {
      const field = meta.fields.find((f) => f.fieldname === candidate && !f.hidden);
      if (field && !list.some((c) => c.fieldname === candidate)) {
        list.unshift(field);
        break;
      }
    }

    return list;
  }

  /**
   * Returns mandatory fields that must be filled before saving
   */
  public getMandatoryFields(meta: DocTypeMeta): DocField[] {
    return meta.fields.filter((f) => Boolean(f.reqd) && !f.read_only && !f.hidden);
  }

  /**
   * Returns all child table fields within a DocType
   */
  public getChildTableFields(meta: DocTypeMeta): DocField[] {
    return meta.fields.filter((f) => f.fieldtype === 'Table' && f.options);
  }

  /**
   * Clears the schema cache
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

export const metadataService = new MetadataService();
