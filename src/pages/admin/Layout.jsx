import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarRange, FileStack, Flag, LayoutDashboard, LogOut, Menu, QrCode, ScrollText, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { AarTechLogo, Alert, Logo, Spinner, cx } from '../../components/ui.jsx';
import { useAuth, useConfig } from '../../lib/context.jsx';
import { AuthShell, skipTwoFactor, twoFactorSkipped } from '../public/Auth.jsx';
import { MfaSetup, TeamRuleOff } from '../app/Profile.jsx';

const isAdmin = (u) => ['admin', 'super_admin'].includes(u?.role);

/** Staff gate: role + mandatory two-factor (PRD AD-01, §13.3). */
function useStaffGate() {
  const { user, loading, mfaPassed } = useAuth();
  const { config } = useConfig();
  if (loading) return <Spinner className="min-h-dvh" />;
  // Logged out: go home - the team login address is not advertised.
  if (!user) return <Navigate to="/" replace />;
  if (user.must_change_password) return <Navigate to="/set-password" replace />;
  if (!user.is_staff) return <Navigate to="/dashboard" replace />;
  if (!user.mfa_enabled) {
    if (!config) return <Spinner className="min-h-dvh" />;
    if (!config.team_2fa_required) return null; // a Super Admin turned the rule off in Settings
    return config.allow_2fa_skip && twoFactorSkipped() ? null : <Navigate to="/admin/setup-2fa" replace />;
  }
  if (!mfaPassed) return <MfaAgain />;
  return null;
}

function MfaAgain() {
  const { logout } = useAuth();
  const nav = useNavigate();
  return (
    <AuthShell title="Two-factor check needed" subtitle="This session was opened before two-factor authentication. Log in again to open the team panel.">
      <button
        onClick={async () => {
          await logout();
          nav('/admin/is/login', { state: { from: '/admin' } });
        }}
        className="h-12 w-full bg-signal font-semibold text-white hover:bg-signal-600"
      >
        Log in again
      </button>
    </AuthShell>
  );
}

export function SetupTwoFactor() {
  const { user, loading, apply, refresh } = useAuth();
  const { config } = useConfig();
  const nav = useNavigate();
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/" replace />;
  if (user.mfa_enabled) return <Navigate to="/admin" replace />;
  const canSkip = user.is_staff && (config?.allow_2fa_skip || config?.team_2fa_required === false);
  return (
    <AuthShell
      title="Protect your team account"
      subtitle={canSkip ? 'Two-factor authentication keeps the team panel safe. It takes a minute, or you can skip it for now.' : 'Team accounts must use two-factor authentication. It takes a minute.'}
    >
      {!user.is_staff && <Alert kind="info">Your account does not have team access.</Alert>}
      {canSkip && (
        <button
          onClick={() => {
            skipTwoFactor();
            nav('/admin', { replace: true });
          }}
          className="mb-5 h-11 w-full border border-ink/15 bg-white font-semibold text-ink hover:bg-ink/5"
        >
          Skip for now
        </button>
      )}
      <MfaSetup
        onEnabled={async (d, done) => {
          if (d) apply(d);
          if (done) {
            await refresh();
            nav('/admin', { replace: true });
          }
        }}
      />
      {user.role === 'super_admin' && config?.team_2fa_required && (
        <div className="mt-8 border-t border-ink/8 pt-6">
          <p className="font-bold">Don&apos;t want two-factor?</p>
          <p className="mb-3 text-sm text-muted">
            As a Super Admin you can stop requiring it for the whole team. Everyone then logs in with just their email or mobile number and password. You can turn it back on in Settings.
          </p>
          <TeamRuleOff onDone={() => nav('/admin', { replace: true })} />
        </div>
      )}
    </AuthShell>
  );
}

export default function AdminLayout() {
  const gate = useStaffGate();
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [loc.pathname]);
  if (gate) return gate;

  // Everyday pages first; rarely used tools are grouped under "More".
  const main = [
    { to: '/admin', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/admin/pds', label: 'All requests', icon: FileStack },
    { to: '/admin/slots', label: 'Schedule', icon: CalendarRange },
    ...(isAdmin(user) ? [{ to: '/admin/users', label: 'Users', icon: Users }] : []),
  ];
  const more = isAdmin(user)
    ? [
        { to: '/admin/moderation', label: 'Reported comments', icon: Flag },
        { to: '/admin/qr', label: 'QR codes', icon: QrCode },
        { to: '/admin/audit', label: 'Activity log', icon: ScrollText },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
      ]
    : [];
  const item = ({ to, label, icon: Icon, end }) => (
    <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition', isActive ? 'bg-bone text-ink' : 'text-bone/65 hover:bg-bone/8 hover:text-bone')}>
      {({ isActive }) => (
        <>
          <Icon className={cx('size-[18px]', isActive && 'text-signal')} />
          {label}
        </>
      )}
    </NavLink>
  );

  const sidebar = (
    <div className="graph-paper flex h-full flex-col bg-ink text-bone">
      <div className="flex h-16 items-center justify-between px-5">
        <Link to="/admin" aria-label="Admin home">
          <Logo dark />
        </Link>
        <button className="p-1.5 hover:bg-bone/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-5" />
        </button>
      </div>
      <p className="px-6 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">Admin panel</p>
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        {main.map(item)}
        {more.length > 0 && <p className="px-3 pb-1 pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone/40">More</p>}
        {more.map(item)}
        <div className="pt-5">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-bone/50 hover:bg-bone/8 hover:text-bone">
            <ArrowLeft className="size-[18px]" /> Back to the website
          </Link>
        </div>
      </nav>
      <div className="m-3 bg-ink-3/80 p-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center bg-signal font-bold text-white">{user.display_name[0]}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.display_name}</p>
            <p className="flex items-center gap-1 truncate text-xs text-bone/50">
              <ShieldCheck className="size-3" /> {config?.roles?.[user.role]}
            </p>
          </div>
          <button onClick={async () => { await logout(); window.location.replace('/admin/is/login'); }} className="p-2 text-bone/60 hover:bg-bone/10 hover:text-bone" aria-label="Log out" title="Log out">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-rise">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/8 bg-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-ink/5 lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </button>
        <Link to="/admin" aria-label="Admin home" className="lg:hidden">
          <Logo />
        </Link>
        <AarTechLogo className="ml-auto h-10 border border-ink/8" />
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export { isAdmin };
