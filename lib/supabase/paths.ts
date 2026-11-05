const LOCAL_ORIGIN = 'https://cotiza.local';

/** Authentication never accepts an external return URL or another authentication route. */
export function safeReturnPath(value: unknown, fallback = '/app'): string {
  if (typeof value !== 'string' || value.length > 1500 || !value.startsWith('/') || value.startsWith('//')) return fallback;
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) {
      if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return fallback;
    const url = new URL(decoded, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN || /^(?:\/auth|\/acceso|\/signin-with-chatgpt|\/signout-with-chatgpt|\/callback)(?:\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site');
}
