/**
 * Query Builder for ERPNext List Queries
 * Produces validated filters, pagination, order_by, and field constraints.
 */

import type { FilterTuple, ListQuery } from './types';

export class QueryBuilder {
  private query: ListQuery = {
    fields: ['*'],
    filters: [],
    limit_start: 0,
    limit_page_length: 20,
  };

  public select(fields: string[]): this {
    this.query.fields = fields;
    return this;
  }

  public where(fieldname: string, operator: FilterTuple[1], value: any): this {
    if (!Array.isArray(this.query.filters)) {
      this.query.filters = [];
    }
    (this.query.filters as FilterTuple[]).push([fieldname, operator, value]);
    return this;
  }

  public orWhere(fieldname: string, operator: FilterTuple[1], value: any): this {
    if (!this.query.or_filters) {
      this.query.or_filters = [];
    }
    if (Array.isArray(this.query.or_filters)) {
      (this.query.or_filters as FilterTuple[]).push([fieldname, operator, value]);
    }
    return this;
  }

  public orderBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    this.query.order_by = `${field} ${direction}`;
    return this;
  }

  public paginate(start: number, pageLength: number): this {
    this.query.limit_start = Math.max(0, start);
    this.query.limit_page_length = Math.max(1, Math.min(100, pageLength));
    return this;
  }

  public build(): ListQuery {
    return { ...this.query };
  }

  public toUrlParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.query.fields && this.query.fields.length > 0) {
      params.set('fields', JSON.stringify(this.query.fields));
    }
    if (this.query.filters && (Array.isArray(this.query.filters) ? this.query.filters.length > 0 : Object.keys(this.query.filters).length > 0)) {
      params.set('filters', JSON.stringify(this.query.filters));
    }
    if (this.query.or_filters && (Array.isArray(this.query.or_filters) ? this.query.or_filters.length > 0 : Object.keys(this.query.or_filters).length > 0)) {
      params.set('or_filters', JSON.stringify(this.query.or_filters));
    }
    if (this.query.order_by) {
      params.set('order_by', this.query.order_by);
    }
    if (this.query.limit_start !== undefined) {
      params.set('limit_start', String(this.query.limit_start));
    }
    if (this.query.limit_page_length !== undefined) {
      params.set('limit_page_length', String(this.query.limit_page_length));
    }
    return params;
  }
}

export function query(): QueryBuilder {
  return new QueryBuilder();
}
