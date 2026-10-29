/**
 * In-memory & session storage token manager for iframe compatibility
 */

let activeSessionId: string | null = null;
let activeCsrfToken: string | null = null;

try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    activeSessionId = sessionStorage.getItem('keerthi_erp_sid');
    activeCsrfToken = sessionStorage.getItem('keerthi_erp_csrf');
  }
} catch {
  // Ignore
}

export function setSessionTokens(sid?: string | null, csrf?: string | null) {
  activeSessionId = sid || null;
  activeCsrfToken = csrf || null;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      if (sid) sessionStorage.setItem('keerthi_erp_sid', sid);
      else sessionStorage.removeItem('keerthi_erp_sid');
      if (csrf) sessionStorage.setItem('keerthi_erp_csrf', csrf);
      else sessionStorage.removeItem('keerthi_erp_csrf');
    }
  } catch {
    // Ignore
  }
}

export function getSessionTokens() {
  return { sid: activeSessionId, csrf: activeCsrfToken };
}
