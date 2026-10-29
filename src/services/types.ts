/**
 * Keerthi ERPNext v16 - Core Types & Interfaces
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, any>;

export interface FrappeEnvelope<T = unknown> {
  data?: T;
  message?: T;
  _server_messages?: string;
  exc_type?: string;
  exception?: string;
}

export type DocFieldType =
  | 'Data'
  | 'Link'
  | 'Select'
  | 'Currency'
  | 'Float'
  | 'Int'
  | 'Percent'
  | 'Date'
  | 'Datetime'
  | 'Time'
  | 'Check'
  | 'Small Text'
  | 'Text'
  | 'Text Editor'
  | 'Code'
  | 'Table'
  | 'Attach'
  | 'Attach Image'
  | 'Section Break'
  | 'Column Break'
  | 'Tab Break'
  | 'HTML'
  | 'Button'
  | 'Read Only'
  | 'Password'
  | 'Phone'
  | 'Rating';

export interface DocField {
  fieldname: string;
  label: string;
  fieldtype: DocFieldType | string;
  options?: string;
  reqd?: number | boolean;
  read_only?: number | boolean;
  hidden?: number | boolean;
  in_list_view?: number | boolean;
  in_standard_filter?: number | boolean;
  description?: string;
  default?: any;
  precision?: number | string;
  depends_on?: string;
}

export interface DocTypeMeta {
  name: string;
  module?: string;
  is_submittable?: number | boolean;
  istable?: number | boolean;
  issingle?: number | boolean;
  title_field?: string;
  autoname?: string;
  fields: DocField[];
  permissions?: DocTypePermission[];
}

export interface DocTypePermission {
  role: string;
  read?: number;
  write?: number;
  create?: number;
  delete?: number;
  submit?: number;
  cancel?: number;
  amend?: number;
  report?: number;
  export?: number;
  print?: number;
  email?: number;
}

export type FilterOperator =
  | '='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'not like'
  | 'in'
  | 'not in'
  | 'is'
  | 'between';

export type FilterTuple = [string, FilterOperator, any];

export interface ListQuery {
  fields?: string[];
  filters?: FilterTuple[] | Record<string, any>;
  or_filters?: FilterTuple[] | Record<string, any>;
  order_by?: string;
  limit_start?: number;
  limit_page_length?: number;
}

export interface SessionUser {
  authenticated: boolean;
  user: string;
  email: string;
  fullName: string;
  roles: string[];
  serverBaseUrl: string;
  company?: string;
  currency?: string;
  fiscalYear?: string;
}

export type SessionHealth = 'healthy' | 'expired' | 'unauthenticated' | 'cooldown';

export interface ReportColumn {
  label: string;
  fieldname: string;
  fieldtype: string;
  options?: string;
  width?: number;
}

export interface ReportResult {
  columns: ReportColumn[];
  result: Record<string, any>[];
  message?: string;
  chart?: any;
  report_summary?: Array<{
    title: string;
    value: number | string;
    indicator?: string;
    datatype?: string;
    currency?: string;
  }>;
}

export interface ERPDocument extends JsonRecord {
  name: string;
  doctype?: string;
  docstatus?: number; // 0 = Draft, 1 = Submitted, 2 = Cancelled
  owner?: string;
  creation?: string;
  modified?: string;
  modified_by?: string;
}
