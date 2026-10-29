/**
 * Normalized ERP Error handling & message extraction
 */

export type ErpErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'NETWORK'
  | 'UNKNOWN';

export class ErpError extends Error {
  code: ErpErrorCode;
  statusCode?: number;
  details?: unknown;
  fieldErrors?: Record<string, string>;
  traceId?: string;

  constructor(
    message: string,
    code: ErpErrorCode = 'UNKNOWN',
    statusCode?: number,
    details?: unknown,
    fieldErrors?: Record<string, string>,
    traceId?: string
  ) {
    super(message);
    this.name = 'ErpError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.fieldErrors = fieldErrors;
    this.traceId = traceId;

    Object.setPrototypeOf(this, ErpError.prototype);
  }
}

/**
 * Parses Frappe error envelopes, extracting clean messages and validation details
 */
export function parseFrappeErrorMessage(payload: unknown, fallback: string = 'An unexpected ERPNext error occurred.'): string {
  if (!payload) return fallback;

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      return parseFrappeErrorMessage(parsed, payload);
    } catch {
      // Check for HTML error pages
      if (payload.includes('<title>') && payload.includes('</title>')) {
        const titleMatch = payload.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch?.[1]) return titleMatch[1].trim();
      }
      return payload.length > 300 ? `${payload.slice(0, 300)}...` : payload;
    }
  }

  if (typeof payload === 'object') {
    const obj = payload as Record<string, any>;

    // Handle Frappe _server_messages JSON array
    if (obj._server_messages) {
      try {
        const messages = JSON.parse(obj._server_messages);
        if (Array.isArray(messages) && messages.length > 0) {
          const first = typeof messages[0] === 'string' ? JSON.parse(messages[0]) : messages[0];
          if (first?.message) {
            // Strip HTML tags from Frappe message
            return stripHtml(first.message);
          }
        }
      } catch {
        // Fallback to next checks
      }
    }

    if (typeof obj.message === 'string' && obj.message) {
      return stripHtml(obj.message);
    }

    if (typeof obj.error === 'string' && obj.error) {
      return stripHtml(obj.error);
    }

    if (typeof obj.exception === 'string' && obj.exception) {
      return stripHtml(obj.exception.split(':').pop()?.trim() || obj.exception);
    }
  }

  return fallback;
}

export function stripHtml(input: string): string {
  return input.replace(/<\/?[^>]+(>|$)/g, '').trim();
}
