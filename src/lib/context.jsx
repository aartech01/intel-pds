import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { connectLive, liveConnected, useLive } from './live.js';

// ---------- public config (types, statuses, limits, branding) ----------
const ConfigCtx = createContext(null);

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(() => api('/config').then((c) => { setConfig(c); setError(null); }).catch(setError), []);
  useEffect(() => { reload(); }, [reload]);
  useLive(['config'], reload);
  // API still starting (or restarting under --watch): keep retrying until config loads.
  useEffect(() => {
    if (!error || config) return;
    const t = setTimeout(reload, 3000);
    return () => clearTimeout(t);
  }, [error, config, reload]);
  return <ConfigCtx.Provider value={{ config, error, reload }}>{children}</ConfigCtx.Provider>;
}

export const useConfig = () => useContext(ConfigCtx);

// ---------- session ----------
const AuthCtx = createContext(null);
const EMPTY = { loading: false, user: null, mfaPassed: false, unread: 0 };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...EMPTY, loading: true });

  const apply = useCallback((d) => setState({ loading: false, user: d?.user ?? null, mfaPassed: !!d?.mfa_passed, unread: d?.unread ?? 0 }), []);
  // Only the server saying "nobody is logged in" logs the page out. A network blip or the API restarting
  // (a deploy) keeps the current user; the next check or live reconnect brings the page up to date.
  const refresh = useCallback(
    () => api('/auth/me').then(apply).catch((e) => setState((s) => (s.loading || e?.status === 401 ? { ...EMPTY } : s))),
    [apply],
  );

  useEffect(() => {
    refresh();
    const onOut = () => setState(EMPTY);
    window.addEventListener('squaddesk:signout', onOut);
    // The live stream keeps the unread badge fresh; poll only while it is down (proxy hiccup, reconnecting).
    const t = setInterval(() => document.visibilityState === 'visible' && !liveConnected() && refresh(), 60_000);
    return () => {
      window.removeEventListener('squaddesk:signout', onOut);
      clearInterval(t);
    };
  }, [refresh]);

  // One live stream per tab, reopened as whoever is signed in now.
  const who = state.loading ? null : state.user?.id ?? 'guest';
  useEffect(() => {
    if (who !== null) connectLive(who);
  }, [who]);
  useLive(['me', 'notifications'], refresh);

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setState(EMPTY);
  };

  return <AuthCtx.Provider value={{ ...state, apply, refresh, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
/** Admins manage requests from the admin panel; they do not share problems themselves. */
export const canSharePds = (u) => !!u && !['admin', 'super_admin'].includes(u.role);
