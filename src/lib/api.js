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

let refreshing = null;
async function refresh() {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', headers: { 'X-CSRF-Token': decodeURIComponent(csrf()) } })
    .then((r) => r.ok)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

/** fetch wrapper: JSON in/out, FormData passthrough, silent token refresh, sign-out event on 401. */
export async function api(path, { method = 'GET', body, form, signal, retry = true } = {}) {
  if (method !== 'GET' && !csrf()) await fetch('/api/config'); // first visit: get the CSRF cookie
  const headers = {};
  if (method !== 'GET') headers['X-CSRF-Token'] = decodeURIComponent(csrf());
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
      return api(path, { method, body, form, signal, retry: false });
    }
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('squaddesk:signout'));
    if (res.status === 403 && data?.code === 'csrf' && retry) {
      await fetch('/api/config');
      return api(path, { method, body, form, signal, retry: false });
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
