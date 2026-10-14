// Auth lives in HttpOnly cookies (PRD §13.3) - page scripts never see the tokens.
// Every write sends the CSRF token from the readable `sd_csrf` cookie as a header.

export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.code = data.code;
    this.fields = data.fields;
    this.data = data;
  }
}

const csrf = () => document.cookie.match(/(?:^|;\s*)sd_csrf=([^;]+)/)?.[1] ?? '';

/** Identifies this tab on writes and on the live stream, so the server can mark the echo of our own changes. */
export const TAB_ID = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/[^\w-]/g, '').slice(0, 64);

// After our own write, the page reloads what it changed and the live echo of that write asks for the same data
// again. Within reuseFreshGets(), a GET that already started after our last write is shared instead of re-sent.
let lastWriteDone = 0;
let reuseAfter = 0;
const recentGets = new Map(); // path -> { at, promise }

export function reuseFreshGets(fn) {
  reuseAfter = lastWriteDone || Infinity;
  try {
    return fn();
  } finally {
    reuseAfter = 0;
  }
}

let refreshing = null;
async function refresh() {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': decodeURIComponent(csrf()) } })
    .then((r) => r.ok)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

/** fetch wrapper: JSON in/out, FormData passthrough, silent token refresh, sign-out event on 401. */
export function api(path, opts = {}) {
  const method = opts.method ?? 'GET';
  if (method !== 'GET') return request(path, opts).finally(() => { lastWriteDone = Date.now(); });
  if (opts.signal) return request(path, opts);
  const hit = recentGets.get(path);
  if (reuseAfter && hit && hit.at >= reuseAfter) return hit.promise;
  const entry = { at: Date.now() };
  entry.promise = request(path, opts).catch((e) => {
    if (recentGets.get(path) === entry) recentGets.delete(path);
    throw e;
  });
  recentGets.set(path, entry);
  if (recentGets.size > 50) recentGets.delete(recentGets.keys().next().value);
  return entry.promise;
}

/**
 * GET for pages whose filters can change quickly (search, tabs, paging): only the newest request per `key`
 * settles. An older answer arriving late is dropped instead of replacing newer results.
 */
const latestByKey = new Map();
const never = new Promise(() => {});
export function apiLatest(key, path) {
  const ticket = {};
  latestByKey.set(key, ticket);
  return api(path).then(
    (v) => (latestByKey.get(key) === ticket ? v : never),
    (e) => (latestByKey.get(key) === ticket ? Promise.reject(e) : never),
  );
}

async function request(path, { method = 'GET', body, form, signal, retry = true } = {}) {
  if (method !== 'GET' && !csrf()) await fetch('/api/config'); // first visit: get the CSRF cookie
  const headers = {};
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = decodeURIComponent(csrf());
    headers['X-Tab'] = TAB_ID;
  }
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload, signal, credentials: 'same-origin' });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && data?.code === 'token_expired' && retry && (await refresh())) {
      return request(path, { method, body, form, signal, retry: false });
    }
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('squaddesk:signout'));
    if (res.status === 403 && data?.code === 'csrf' && retry) {
      await fetch('/api/config');
      return request(path, { method, body, form, signal, retry: false });
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data ?? {});
  }
  return data;
}

export async function downloadFile(path, fallbackName) {
  let res = await fetch(`/api${path}`);
  if (res.status === 401 && (await refresh())) res = await fetch(`/api${path}`);
  if (!res.ok) throw new ApiError('Download failed', res.status);
  const blob = await res.blob();
  const name = res.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || fallbackName;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
