// Code-split pages. App.jsx renders them lazily; the shells call prefetch*() once the browser is idle,
// so moving between pages no longer waits for a download.

export const appPages = {
  Shell: () => import('../pages/app/Shell.jsx'),
  Dashboard: () => import('../pages/app/Dashboard.jsx'),
  Community: () => import('../pages/app/Community.jsx'),
  PdsForm: () => import('../pages/app/PdsForm.jsx'),
  PdsView: () => import('../pages/app/PdsView.jsx'),
  MyPds: () => import('../pages/app/MyPds.jsx'),
  Notifications: () => import('../pages/app/Notifications.jsx'),
  Profile: () => import('../pages/app/Profile.jsx'),
};

export const adminPages = {
  Layout: () => import('../pages/admin/Layout.jsx'),
  Overview: () => import('../pages/admin/Overview.jsx'),
  PdsList: () => import('../pages/admin/PdsList.jsx'),
  PdsAdmin: () => import('../pages/admin/PdsAdmin.jsx'),
  Slots: () => import('../pages/admin/Slots.jsx'),
  Moderation: () => import('../pages/admin/Moderation.jsx'),
  Users: () => import('../pages/admin/Users.jsx'),
  QrCodes: () => import('../pages/admin/QrCodes.jsx'),
  Audit: () => import('../pages/admin/Audit.jsx'),
  Settings: () => import('../pages/admin/Settings.jsx'),
};

const done = new Set();
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));

function prefetch(group) {
  if (done.has(group)) return;
  done.add(group);
  // Respect data-saver and very slow connections: pages then load on first visit, as before.
  const net = navigator.connection;
  if (net?.saveData || /(^|-)2g$/.test(net?.effectiveType ?? '')) return;
  idle(() => Object.values(group).forEach((load) => load().catch(() => done.delete(group))));
}

export const prefetchApp = () => prefetch(appPages);
export const prefetchAdmin = () => prefetch(adminPages);
