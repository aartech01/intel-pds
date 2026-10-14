import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, FolderKanban, LayoutDashboard, LogOut, Plus, ShieldCheck, User, Users } from 'lucide-react';
import { AarTechLogo, Avatar, CardsSkeleton, Logo, Spinner, cx } from '../../components/ui.jsx';
import { canSharePds, useAuth } from '../../lib/context.jsx';
import { prefetchApp } from '../../lib/routes.js';

export function RequireUser({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (user.must_change_password) return <Navigate to="/set-password" replace />;
  return children;
}

const NAV = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/my', label: 'My PDS', icon: FolderKanban },
];

export default function AppShell() {
  const { user, unread, logout } = useAuth();
  const [menu, setMenu] = useState(false);
  const loc = useLocation();
  const menuRef = useRef(null);
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => { if (user) prefetchApp(); }, [user]);
  useEffect(() => {
    if (!menu) return;
    const close = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <RequireUser>
      <div className="min-h-dvh bg-paper pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-paper sm:bg-paper/90 sm:backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
            <Link to="/dashboard" aria-label="Dashboard" className="mr-4">
              <Logo compact="xs" />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map(({ to, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => cx('whitespace-nowrap px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-ink text-bone' : 'text-muted hover:bg-ink/5 hover:text-ink')}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              {canSharePds(user) && (
              <Link to="/pds/new" className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-lg bg-signal px-4 text-sm font-bold text-white hover:bg-signal-600 sm:inline-flex">
                <Plus className="size-4" /> Share a problem
              </Link>
              )}
              <Link to="/notifications" className="relative rounded-lg p-2.5 hover:bg-ink/5" aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}>
                <Bell className="size-5" />
                {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center bg-signal px-1 font-mono text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 p-1 hover:bg-ink/5" aria-label="Account menu" aria-expanded={menu}>
                  <Avatar name={user?.display_name} team={user?.is_staff} className="size-8" />
                </button>
                {menu && (
                  <div className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-xl border border-ink/10 bg-white py-1 shadow-card animate-rise">
                    <div className="border-b border-ink/6 px-4 py-3">
                      <p className="truncate font-bold">{user?.display_name}</p>
                      <p className="truncate text-xs text-muted">{user?.email}</p>
                    </div>
                    <Link to="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-paper">
                      <User className="size-4" /> My profile
                    </Link>
                    {user?.is_staff && (
                      <Link to="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-paper">
                        <ShieldCheck className="size-4 text-signal" /> Admin panel
                      </Link>
                    )}
                    <button onClick={logout} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-problem hover:bg-paper">
                      <LogOut className="size-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
              <AarTechLogo className="ml-1 h-10 border border-ink/8 sm:ml-3" />
            </div>
          </div>
        </header>


        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
          {/* Only the page area waits for a page's code; the header and tab bar stay put. */}
          <Suspense fallback={<CardsSkeleton />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Phone tab bar */}
        <nav className={cx('fixed inset-x-0 bottom-0 z-30 grid border-t border-ink/10 bg-white lg:hidden', canSharePds(user) ? 'grid-cols-4' : 'grid-cols-3')} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {(canSharePds(user) ? [NAV[0], NAV[1], { to: '/pds/new', label: 'Share', icon: Plus, accent: true }, NAV[2]] : NAV).map(({ to, label, icon: Icon, accent }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', accent ? 'text-signal-600' : isActive ? 'text-ink' : 'text-muted')}
            >
              <span className={cx('grid size-7 place-items-center', accent && 'bg-signal text-white')}>
                <Icon className={accent ? 'size-4' : 'size-5'} />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </RequireUser>
  );
}

export function PageTitle({ title, subtitle, children, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back}
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
