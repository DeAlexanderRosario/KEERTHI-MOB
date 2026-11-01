/**
 * Secure Server-Side Adapter & Proxy for ERPNext v16
 * Forwards requests to target ERPNext with HttpOnly session cookies.
 */

import express from 'express';
import type { Request, Response } from 'express';

const { Router } = express;

export const erpRouter = Router();

const ERPNEXT_BASE_URL = (process.env.ERPNEXT_BASE_URL || 'https://erp.keerthigroup.co.in').replace(/\/+$/, '');

const SID_COOKIE = 'keerthi_sid';
const CSRF_COOKIE = 'keerthi_csrf';

function getTargetUrl(path: string): URL {
  const cleanPath = path.replace(/^\/+/, '');
  return new URL(cleanPath, `${ERPNEXT_BASE_URL}/`);
}

function extractCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;\\s]+)`));
  return match ? match[1] : undefined;
}

function getUpstreamCookies(req: Request): string | undefined {
  const headerSession = req.headers['x-erp-session'] as string | undefined;
  const authHeader = req.headers.authorization;
  const bearerAuth = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

  const sid = req.cookies?.[SID_COOKIE] || extractCookie(req.headers.cookie, SID_COOKIE) || headerSession || bearerAuth;
  if (!sid || sid === 'Guest') return undefined;
  return `sid=${sid}; system_user=yes`;
}

function getUpstreamCsrf(req: Request): string | undefined {
  const headerCsrf = req.headers['x-erp-csrf'] as string | undefined;
  return req.cookies?.[CSRF_COOKIE] || extractCookie(req.headers.cookie, CSRF_COOKIE) || headerCsrf;
}

// Security: Enforce same-origin check for state-changing requests
function verifySameOrigin(req: Request, res: Response, next: Function) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;

  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const expectedHost = String(host).split(',')[0].trim().toLowerCase();
      const appUrlHost = process.env.APP_URL ? new URL(process.env.APP_URL).host.toLowerCase() : null;

      const isAllowed =
        originHost === expectedHost ||
        (appUrlHost && originHost === appUrlHost) ||
        originHost.endsWith('.run.app') ||
        originHost.endsWith('.vercel.app') ||
        originHost.includes('localhost') ||
        originHost.includes('127.0.0.1');

      if (!isAllowed) {
        return res.status(403).json({ error: 'Cross-origin request forbidden.' });
      }
    } catch {
      return res.status(403).json({ error: 'Invalid origin header.' });
    }
  }

  next();
}

erpRouter.use(verifySameOrigin);

/**
 * Connectivity & latency check
 */
erpRouter.get('/diagnostics/ping', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const upstreamRes = await fetch(ERPNEXT_BASE_URL, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    return res.json({
      status: 'online',
      serverBaseUrl: ERPNEXT_BASE_URL,
      statusCode: upstreamRes.status,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(502).json({
      status: 'offline',
      serverBaseUrl: ERPNEXT_BASE_URL,
      error: err.message || 'Cannot connect to ERPNext',
      latencyMs: Date.now() - start,
    });
  }
});

/**
 * POST /api/erp/auth/login
 */
erpRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { usr, pwd } = req.body || {};
  if (!usr || !pwd) {
    return res.status(400).json({ error: 'Username/email and password are required.' });
  }

  try {
    const loginUrl = getTargetUrl('/api/method/login');
    const upstreamRes = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usr: String(usr).trim(), pwd: String(pwd) }),
      redirect: 'manual',
      cache: 'no-store',
    });

    const text = await upstreamRes.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text };
    }

    if (!upstreamRes.ok || body.message !== 'Logged In') {
      const msg = typeof body.message === 'string' ? body.message : 'Invalid login credentials.';
      return res.status(upstreamRes.status >= 400 && upstreamRes.status < 500 ? upstreamRes.status : 401).json({
        error: msg,
        details: body,
      });
    }

    // Extract cookies from Set-Cookie headers
    // Node-fetch / global fetch headers.getSetCookie()
    const setCookieHeaders = (upstreamRes.headers as any).getSetCookie
      ? (upstreamRes.headers as any).getSetCookie()
      : [upstreamRes.headers.get('set-cookie') || ''];

    let sid: string | undefined;
    let csrf: string | undefined;

    for (const h of setCookieHeaders) {
      if (!h) continue;
      const sidMatch = h.match(/(?:^|[,;]\s*)sid=([^;,\s]+)/);
      if (sidMatch?.[1]) sid = sidMatch[1];
      const csrfMatch = h.match(/(?:^|[,;]\s*)csrf_token=([^;,\s]+)/);
      if (csrfMatch?.[1]) csrf = csrfMatch[1];
    }

    if (!sid || sid === 'Guest') {
      return res.status(502).json({
        error: 'Login succeeded but server did not issue a valid session cookie.',
      });
    }

    // Set HttpOnly cookies on the client (SameSite=None for iframe support over HTTPS)
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie(SID_COOKIE, sid, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (csrf) {
      res.cookie(CSRF_COOKIE, csrf, {
        httpOnly: true,
        secure: isHttps,
        sameSite: isHttps ? 'none' : 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    // Retrieve user's actual roles and email
    let userEmail = String(usr).trim();
    let fullName = typeof body.full_name === 'string' ? body.full_name : userEmail;
    let roles: string[] = [];
    let company: string | undefined;
    let currency = 'INR';

    try {
      const loggedUserRes = await fetch(getTargetUrl('/api/method/frappe.auth.get_logged_user'), {
        headers: {
          Accept: 'application/json',
          Cookie: `sid=${sid}; system_user=yes`,
        },
      });
      if (loggedUserRes.ok) {
        const userData: any = await loggedUserRes.json();
        if (userData?.message) {
          userEmail = userData.message;
        }
      }

      // Fetch user profile and roles
      const userDocRes = await fetch(getTargetUrl(`/api/resource/User/${encodeURIComponent(userEmail)}`), {
        headers: {
          Accept: 'application/json',
          Cookie: `sid=${sid}; system_user=yes`,
        },
      });
      if (userDocRes.ok) {
        const userDoc: any = await userDocRes.json();
        const data = userDoc.data || userDoc;
        if (data.full_name) fullName = data.full_name;
        if (Array.isArray(data.roles)) {
          roles = data.roles.map((r: any) => (typeof r === 'string' ? r : r.role)).filter(Boolean);
        }
      }

      // If roles still empty, query Has Role child records
      if (roles.length === 0) {
        const rolesRes = await fetch(
          getTargetUrl(
            `/api/method/frappe.client.get_list?doctype=Has Role&filters=${encodeURIComponent(
              JSON.stringify([['parent', '=', userEmail]])
            )}&fields=${encodeURIComponent(JSON.stringify(['role']))}&limit_page_length=100`
          ),
          {
            headers: {
              Accept: 'application/json',
              Cookie: `sid=${sid}; system_user=yes`,
            },
          }
        );
        if (rolesRes.ok) {
          const rolesData: any = await rolesRes.json();
          const list = rolesData.message || rolesData.data || [];
          roles = list.map((r: any) => r.role).filter(Boolean);
        }
      }

      // Try to get default company
      const companyRes = await fetch(
        getTargetUrl(
          `/api/method/frappe.client.get_list?doctype=Company&fields=${encodeURIComponent(
            JSON.stringify(['name', 'default_currency'])
          )}&limit_page_length=1`
        ),
        {
          headers: {
            Accept: 'application/json',
            Cookie: `sid=${sid}; system_user=yes`,
          },
        }
      );
      if (companyRes.ok) {
        const companyData: any = await companyRes.json();
        const companies = companyData.message || companyData.data || [];
        if (companies.length > 0) {
          company = companies[0].name;
          currency = companies[0].default_currency || 'INR';
        }
      }
    } catch {
      // Non-fatal, use basic details
    }

    return res.json({
      authenticated: true,
      user: userEmail,
      email: userEmail,
      fullName,
      roles,
      company,
      currency,
      sid,
      csrf,
      serverBaseUrl: ERPNEXT_BASE_URL,
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'Could not communicate with ERPNext server.', details: err.message });
  }
});

/**
 * POST /api/erp/auth/logout
 */
erpRouter.post('/auth/logout', async (req: Request, res: Response) => {
  const cookies = getUpstreamCookies(req);
  if (cookies) {
    try {
      await fetch(getTargetUrl('/api/method/logout'), {
        method: 'POST',
        headers: { Cookie: cookies },
      });
    } catch {
      // Continue cleanup
    }
  }

  res.clearCookie(SID_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
  return res.json({ authenticated: false });
});

/**
 * GET /api/erp/auth/session
 */
erpRouter.get('/auth/session', async (req: Request, res: Response) => {
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.json({ authenticated: false });
  }

  try {
    const upstreamRes = await fetch(getTargetUrl('/api/method/frappe.auth.get_logged_user'), {
      headers: {
        Accept: 'application/json',
        Cookie: cookies,
      },
      cache: 'no-store',
    });

    if (!upstreamRes.ok) {
      res.clearCookie(SID_COOKIE, { path: '/' });
      res.clearCookie(CSRF_COOKIE, { path: '/' });
      return res.json({ authenticated: false });
    }

    const data: any = await upstreamRes.json();
    const userEmail = data.message;
    if (!userEmail || userEmail === 'Guest') {
      res.clearCookie(SID_COOKIE, { path: '/' });
      res.clearCookie(CSRF_COOKIE, { path: '/' });
      return res.json({ authenticated: false });
    }

    let fullName = userEmail;
    let roles: string[] = [];
    let company: string | undefined;
    let currency = 'INR';

    try {
      const userDocRes = await fetch(getTargetUrl(`/api/resource/User/${encodeURIComponent(userEmail)}`), {
        headers: { Accept: 'application/json', Cookie: cookies },
      });
      if (userDocRes.ok) {
        const userDoc: any = await userDocRes.json();
        const d = userDoc.data || userDoc;
        if (d.full_name) fullName = d.full_name;
        if (Array.isArray(d.roles)) {
          roles = d.roles.map((r: any) => (typeof r === 'string' ? r : r.role)).filter(Boolean);
        }
      }

      if (roles.length === 0) {
        const rolesRes = await fetch(
          getTargetUrl(
            `/api/method/frappe.client.get_list?doctype=Has Role&filters=${encodeURIComponent(
              JSON.stringify([['parent', '=', userEmail]])
            )}&fields=${encodeURIComponent(JSON.stringify(['role']))}&limit_page_length=100`
          ),
          { headers: { Accept: 'application/json', Cookie: cookies } }
        );
        if (rolesRes.ok) {
          const rolesData: any = await rolesRes.json();
          const list = rolesData.message || rolesData.data || [];
          roles = list.map((r: any) => r.role).filter(Boolean);
        }
      }

      const companyRes = await fetch(
        getTargetUrl(
          `/api/method/frappe.client.get_list?doctype=Company&fields=${encodeURIComponent(
            JSON.stringify(['name', 'default_currency'])
          )}&limit_page_length=1`
        ),
        { headers: { Accept: 'application/json', Cookie: cookies } }
      );
      if (companyRes.ok) {
        const companyData: any = await companyRes.json();
        const companies = companyData.message || companyData.data || [];
        if (companies.length > 0) {
          company = companies[0].name;
          currency = companies[0].default_currency || 'INR';
        }
      }
    } catch {
      // Non-fatal
    }

    return res.json({
      authenticated: true,
      user: userEmail,
      email: userEmail,
      fullName,
      roles,
      company,
      currency,
      serverBaseUrl: ERPNEXT_BASE_URL,
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'Failed to revalidate session with ERPNext.', details: err.message });
  }
});

/**
 * GET /api/erp/doctype/:doctype/meta
 */
erpRouter.get('/doctype/:doctype/meta', async (req: Request, res: Response) => {
  const { doctype } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required to inspect metadata.' });
  }

  try {
    let metaDoc: any = null;

    // Strategy 1: frappe.desk.form.load.getdoctype
    try {
      const metaUrl = getTargetUrl(
        `/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(doctype)}`
      );
      const upstreamRes = await fetch(metaUrl, {
        headers: { Accept: 'application/json', Cookie: cookies },
      });
      if (upstreamRes.ok) {
        const body: any = await upstreamRes.json();
        const docs = body.docs || body.message?.docs || [];
        metaDoc = docs.find((d: any) => d.name === doctype) || docs[0] || body.message || body;
      }
    } catch {
      // Continue to fallback
    }

    // Strategy 2: /api/resource/DocType/:doctype
    if (!metaDoc || !metaDoc.name || !Array.isArray(metaDoc.fields)) {
      try {
        const resourceUrl = getTargetUrl(`/api/resource/DocType/${encodeURIComponent(doctype)}`);
        const fallbackRes = await fetch(resourceUrl, {
          headers: { Accept: 'application/json', Cookie: cookies },
        });
        if (fallbackRes.ok) {
          const body: any = await fallbackRes.json();
          metaDoc = body.data || body.message || body;
        }
      } catch {
        // Continue to fallback
      }
    }

    // Strategy 3: frappe.client.get
    if (!metaDoc || !metaDoc.name || !Array.isArray(metaDoc.fields)) {
      try {
        const clientGetUrl = getTargetUrl(
          `/api/method/frappe.client.get?doctype=DocType&name=${encodeURIComponent(doctype)}`
        );
        const clientRes = await fetch(clientGetUrl, {
          headers: { Accept: 'application/json', Cookie: cookies },
        });
        if (clientRes.ok) {
          const body: any = await clientRes.json();
          metaDoc = body.message || body.data || body;
        }
      } catch {
        // End of fallbacks
      }
    }

    if (!metaDoc || !metaDoc.name) {
      return res.status(404).json({ error: `DocType "${doctype}" not found or unauthorized on ERPNext.` });
    }

    return res.json({ data: metaDoc });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not load metadata for ${doctype}.`, details: err.message });
  }
});

/**
 * GET /api/erp/documents/:doctype
 */
erpRouter.get('/documents/:doctype', async (req: Request, res: Response) => {
  const { doctype } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const params = new URLSearchParams();
    params.set('doctype', doctype);

    if (req.query.fields) params.set('fields', String(req.query.fields));
    if (req.query.filters) params.set('filters', String(req.query.filters));
    if (req.query.or_filters) params.set('or_filters', String(req.query.or_filters));
    if (req.query.order_by) params.set('order_by', String(req.query.order_by));
    if (req.query.limit_start) params.set('limit_start', String(req.query.limit_start));
    if (req.query.limit_page_length) params.set('limit_page_length', String(req.query.limit_page_length));

    const listUrl = getTargetUrl(`/api/method/frappe.client.get_list?${params.toString()}`);
    const upstreamRes = await fetch(listUrl, {
      headers: {
        Accept: 'application/json',
        Cookie: cookies,
      },
    });

    const text = await upstreamRes.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text };
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    const items = body.message !== undefined ? body.message : body.data !== undefined ? body.data : body;
    return res.json({ data: items });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not list ${doctype} documents.`, details: err.message });
  }
});

/**
 * GET /api/erp/documents/:doctype/count
 */
erpRouter.get('/documents/:doctype/count', async (req: Request, res: Response) => {
  const { doctype } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const params = new URLSearchParams();
    params.set('doctype', doctype);
    if (req.query.filters) params.set('filters', String(req.query.filters));

    const countUrl = getTargetUrl(`/api/method/frappe.client.get_count?${params.toString()}`);
    const upstreamRes = await fetch(countUrl, {
      headers: {
        Accept: 'application/json',
        Cookie: cookies,
      },
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ count: body.message ?? 0 });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not count ${doctype} documents.`, details: err.message });
  }
});

/**
 * GET /api/erp/documents/:doctype/:name
 */
erpRouter.get('/documents/:doctype/:name', async (req: Request, res: Response) => {
  const { doctype, name } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const docUrl = getTargetUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    const upstreamRes = await fetch(docUrl, {
      headers: {
        Accept: 'application/json',
        Cookie: cookies,
      },
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ data: body.data || body.message || body });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not load ${doctype} ${name}.`, details: err.message });
  }
});

/**
 * POST /api/erp/documents/:doctype
 */
erpRouter.post('/documents/:doctype', async (req: Request, res: Response) => {
  const { doctype } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const csrf = getUpstreamCsrf(req);
  try {
    const createUrl = getTargetUrl(`/api/resource/${encodeURIComponent(doctype)}`);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookies,
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const upstreamRes = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body),
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ data: body.data || body.message || body });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not create ${doctype}.`, details: err.message });
  }
});

/**
 * PUT /api/erp/documents/:doctype/:name
 */
erpRouter.put('/documents/:doctype/:name', async (req: Request, res: Response) => {
  const { doctype, name } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const csrf = getUpstreamCsrf(req);
  try {
    const updateUrl = getTargetUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookies,
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const upstreamRes = await fetch(updateUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(req.body),
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ data: body.data || body.message || body });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not update ${doctype} ${name}.`, details: err.message });
  }
});

/**
 * POST /api/erp/documents/:doctype/:name/action (submit, cancel)
 */
erpRouter.post('/documents/:doctype/:name/action', async (req: Request, res: Response) => {
  const { doctype, name } = req.params;
  const { action } = req.body || {};
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const csrf = getUpstreamCsrf(req);
  try {
    let targetDocstatus: number | null = null;
    if (action === 'submit') targetDocstatus = 1;
    else if (action === 'cancel') targetDocstatus = 2;
    else {
      return res.status(400).json({ error: `Unsupported document action: ${action}` });
    }

    const docUrl = getTargetUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookies,
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const upstreamRes = await fetch(docUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: targetDocstatus }),
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ data: body.data || body.message || body });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not execute ${action} on ${doctype} ${name}.`, details: err.message });
  }
});

/**
 * DELETE /api/erp/documents/:doctype/:name
 */
erpRouter.delete('/documents/:doctype/:name', async (req: Request, res: Response) => {
  const { doctype, name } = req.params;
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const csrf = getUpstreamCsrf(req);
  try {
    const deleteUrl = getTargetUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Cookie: cookies,
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const upstreamRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers,
    });

    const text = await upstreamRes.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text };
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not delete ${doctype} ${name}.`, details: err.message });
  }
});

/**
 * POST /api/erp/reports/run
 */
erpRouter.post('/reports/run', async (req: Request, res: Response) => {
  const { report_name, filters } = req.body || {};
  if (!report_name) {
    return res.status(400).json({ error: 'Report name is required.' });
  }

  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const reportUrl = getTargetUrl('/api/method/frappe.desk.query_report.run');
    const upstreamRes = await fetch(reportUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        report_name,
        filters: filters || {},
      }),
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    const payload = body.message || body.data || body;
    return res.json({
      columns: payload.columns || [],
      result: payload.result || [],
      message: payload.message,
      chart: payload.chart,
      report_summary: payload.report_summary,
    });
  } catch (err: any) {
    return res.status(502).json({ error: `Could not run report ${report_name}.`, details: err.message });
  }
});

/**
 * GET /api/erp/search/link
 */
erpRouter.get('/search/link', async (req: Request, res: Response) => {
  const { doctype, txt = '', filters, page_length = '20' } = req.query;
  if (!doctype) {
    return res.status(400).json({ error: 'doctype is required.' });
  }

  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const searchUrl = getTargetUrl('/api/method/frappe.desk.search.search_link');
    const upstreamRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        doctype: String(doctype),
        txt: String(txt),
        filters: filters ? JSON.parse(String(filters)) : {},
        page_length: parseInt(String(page_length), 10) || 20,
      }),
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    const list = body.message || body.data || [];
    return res.json({ data: list });
  } catch (err: any) {
    return res.status(502).json({ error: 'Could not search link options.', details: err.message });
  }
});

/**
 * POST /api/erp/attachments/upload
 */
erpRouter.post('/attachments/upload', async (req: Request, res: Response) => {
  const cookies = getUpstreamCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const csrf = getUpstreamCsrf(req);
  try {
    const uploadUrl = getTargetUrl('/api/method/upload_file');
    const contentType = req.headers['content-type'] || '';

    // Pipe the raw request stream directly to ERPNext upload_file
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': contentType,
      Cookie: cookies,
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const upstreamRes = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: req as any,
      // @ts-ignore
      duplex: 'half',
    });

    const body: any = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json({ data: body.message || body.data || body });
  } catch (err: any) {
    return res.status(502).json({ error: 'Could not upload attachment.', details: err.message });
  }
});

/**
 * ALL /api/erp/method/:methodName(*)
 * Forwards requests to Frappe / VMS whitelisted Python methods (/api/method/<methodName>)
 */
erpRouter.all('/method/:methodName(*)', async (req: Request, res: Response) => {
  const methodName = req.params.methodName;
  if (!methodName) {
    return res.status(400).json({ error: 'Method name is required.' });
  }

  const cookies = getUpstreamCookies(req);
  const csrf = getUpstreamCsrf(req);

  try {
    const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = getTargetUrl(`/api/method/${methodName}${queryStr}`);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (cookies) headers['Cookie'] = cookies;
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase())) {
      headers['Content-Type'] = req.headers['content-type'] || 'application/json';
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    const text = await upstreamRes.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { message: text };
    }

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json(body);
    }

    return res.json(body);
  } catch (err: any) {
    return res.status(502).json({
      error: `Could not execute method ${methodName}.`,
      details: err.message,
    });
  }
});

