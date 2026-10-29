/**
 * Centralized HTTP Client for ERPNext Web App
 * Communicates with same-origin server adapter (/api/erp/*)
 */

import { ErpError, parseFrappeErrorMessage } from './errors';
import type { FrappeEnvelope } from './types';
import { getSessionTokens } from './sessionTokens';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function httpClient<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // If caller provided an abort signal, listen to it
  if (fetchOptions.signal) {
    fetchOptions.signal.addEventListener('abort', () => controller.abort());
  }

  let response: Response;
  const session = getSessionTokens();
  try {
    response = await fetch(path, {
      ...fetchOptions,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(fetchOptions.body && !(fetchOptions.body instanceof FormData)
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(session.sid ? { 'X-ERP-Session': session.sid } : {}),
        ...(session.csrf ? { 'X-ERP-CSRF': session.csrf } : {}),
        ...fetchOptions.headers,
      },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ErpError(
        'Request timed out. Please check your connection and try again.',
        'NETWORK',
        408
      );
    }
    throw new ErpError(
      'Unable to reach Keerthi ERPNext service. Check network or VPN connection.',
      'NETWORK',
      0,
      err
    );
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let rawBody: any = null;
  if (isJson) {
    try {
      rawBody = await response.json();
    } catch {
      rawBody = null;
    }
  } else {
    rawBody = await response.text();
  }

  if (!response.ok) {
    const status = response.status;
    const message = parseFrappeErrorMessage(
      rawBody,
      `Request failed with status code ${status}`
    );

    let code: ErpError['code'] = 'UNKNOWN';
    if (status === 401) code = 'UNAUTHENTICATED';
    else if (status === 403) code = 'FORBIDDEN';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 409) code = 'CONFLICT';
    else if (status === 417 || status === 422) code = 'VALIDATION';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status >= 500) code = 'SERVER';

    const traceId = response.headers.get('x-frappe-request-id') || undefined;

    throw new ErpError(message, code, status, rawBody, undefined, traceId);
  }

  return unwrapEnvelope<T>(rawBody);
}

export function unwrapEnvelope<T>(payload: any): T {
  if (payload && typeof payload === 'object') {
    const env = payload as FrappeEnvelope<T>;
    if ('data' in env && env.data !== undefined) return env.data as T;
    if ('message' in env && env.message !== undefined) return env.message as T;
  }
  return payload as T;
}
