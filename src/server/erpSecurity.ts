function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function parseErpOrigin(value: string): URL {
  const parsed = new URL(value);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('ERPNEXT_BASE_URL must be a valid HTTP(S) origin without credentials, query, or fragment.');
  }
  return new URL(parsed.origin);
}

export function buildErpTargetUrl(origin: URL, path: string): URL {
  if (
    typeof path !== 'string' ||
    !path.startsWith('/api/') ||
    path.includes('\\') ||
    path.includes('#') ||
    hasControlCharacter(path)
  ) {
    throw new Error('Invalid ERP API path.');
  }

  const queryIndex = path.indexOf('?');
  const pathname = queryIndex < 0 ? path : path.slice(0, queryIndex);
  const target = new URL(origin.origin);
  target.pathname = pathname;
  if (queryIndex >= 0) target.search = path.slice(queryIndex);

  if (target.origin !== origin.origin || !target.pathname.startsWith('/api/')) {
    throw new Error('ERP API path escaped the configured API origin.');
  }
  return target;
}

export function isAllowedErpMethodName(value: string): boolean {
  if (!value) return false;
  let segmentLength = 0;
  let segmentStartsValid = false;
  let segmentCount = 0;

  for (let index = 0; index <= value.length; index += 1) {
    const code = index === value.length ? 46 : value.charCodeAt(index);
    if (code === 46) {
      if (!segmentLength || !segmentStartsValid) return false;
      segmentCount += 1;
      segmentLength = 0;
      segmentStartsValid = false;
      continue;
    }

    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    const isDigit = code >= 48 && code <= 57;
    if (!(isLetter || isDigit || code === 95)) return false;
    if (!segmentLength) {
      if (!(isLetter || code === 95)) return false;
      segmentStartsValid = true;
    }
    segmentLength += 1;
  }

  return segmentCount >= 2;
}

export function isSameOriginBrowserRequest(
  method: string,
  originHeader: string | undefined,
  fetchSite: string | undefined,
  expectedOrigin: string,
): boolean {
  if (fetchSite?.toLowerCase() === 'cross-site') return false;

  const normalizedMethod = method.toUpperCase();
  const safeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);
  if (!originHeader || originHeader === 'null') return safeMethod;

  try {
    const origin = new URL(originHeader);
    const expected = new URL(expectedOrigin);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.origin !== expected.origin
    ) return false;
    return true;
  } catch {
    return false;
  }
}
