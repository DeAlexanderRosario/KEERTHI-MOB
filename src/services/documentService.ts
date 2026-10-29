/**
 * Document CRUD & Lifecycle Service
 * Interfaces with real ERPNext resource endpoints with verification and error handling.
 */

import { httpClient } from './httpClient';
import type { ERPDocument, JsonRecord, ListQuery } from './types';

class DocumentService {
  /**
   * Fetches a paginated list of documents
   */
  public async list<T extends ERPDocument = ERPDocument>(
    doctype: string,
    query: ListQuery = {}
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (query.fields && query.fields.length > 0) {
      params.set('fields', JSON.stringify(query.fields));
    }
    if (query.filters && (Array.isArray(query.filters) ? query.filters.length > 0 : Object.keys(query.filters).length > 0)) {
      params.set('filters', JSON.stringify(query.filters));
    }
    if (query.or_filters && (Array.isArray(query.or_filters) ? query.or_filters.length > 0 : Object.keys(query.or_filters).length > 0)) {
      params.set('or_filters', JSON.stringify(query.or_filters));
    }
    if (query.order_by) {
      params.set('order_by', query.order_by);
    }
    if (query.limit_start !== undefined) {
      params.set('limit_start', String(query.limit_start));
    }
    if (query.limit_page_length !== undefined) {
      params.set('limit_page_length', String(query.limit_page_length));
    }

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return httpClient<T[]>(
      `/api/erp/documents/${encodeURIComponent(doctype)}${queryStr}`
    );
  }

  /**
   * Returns total count of documents matching filter
   */
  public async count(
    doctype: string,
    filters?: any
  ): Promise<number> {
    const params = new URLSearchParams();
    if (filters) {
      params.set('filters', JSON.stringify(filters));
    }
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const response = await httpClient<{ count: number }>(
      `/api/erp/documents/${encodeURIComponent(doctype)}/count${queryStr}`
    );
    return response.count ?? 0;
  }

  /**
   * Retrieves a single document by DocType and name
   */
  public async get<T extends ERPDocument = ERPDocument>(
    doctype: string,
    name: string
  ): Promise<T> {
    return httpClient<T>(
      `/api/erp/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );
  }

  /**
   * Creates a new document
   */
  public async create<T extends ERPDocument = ERPDocument>(
    doctype: string,
    payload: JsonRecord
  ): Promise<T> {
    return httpClient<T>(
      `/api/erp/documents/${encodeURIComponent(doctype)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * Updates an existing document
   */
  public async update<T extends ERPDocument = ERPDocument>(
    doctype: string,
    name: string,
    payload: JsonRecord
  ): Promise<T> {
    return httpClient<T>(
      `/api/erp/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  }

  /**
   * Submits a submittable document (sets docstatus = 1)
   */
  public async submit<T extends ERPDocument = ERPDocument>(
    doctype: string,
    name: string
  ): Promise<T> {
    return httpClient<T>(
      `/api/erp/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'submit' }),
      }
    );
  }

  /**
   * Cancels a submitted document (sets docstatus = 2)
   */
  public async cancel<T extends ERPDocument = ERPDocument>(
    doctype: string,
    name: string
  ): Promise<T> {
    return httpClient<T>(
      `/api/erp/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}/action`,
      {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel' }),
      }
    );
  }

  /**
   * Deletes a document
   */
  public async delete(
    doctype: string,
    name: string
  ): Promise<void> {
    await httpClient(
      `/api/erp/documents/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const documentService = new DocumentService();
