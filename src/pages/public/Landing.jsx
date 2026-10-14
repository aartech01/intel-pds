import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, FileText, LockKeyhole, MessagesSquare, ScanLine, ShieldCheck, UserPlus } from 'lucide-react';
import { AarTechLogo, Logo, TYPE_ICONS, cx } from '../../components/ui.jsx';
import { SlotCalendar, SlotLegend } from '../../components/slots.jsx';
import { canSharePds, useAuth, useConfig } from '../../lib/context.jsx';
import { api } from '../../lib/api.js';
import { TYPE_STYLE } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export function PublicShell({ children, dark = false }) {
  const { user } = useAuth();
  return (
    <div className={cx('min-h-dvh', dark ? 'bg-ink text-bone' : 'bg-paper')}>
      <header className={cx('sticky top-0 z-30 border-b sm:backdrop-blur', dark ? 'border-bone/10 bg-ink sm:bg-ink/80' : 'border-ink/8 bg-paper sm:bg-paper/85')}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="IntelSquad home">
            <Logo dark={dark} compact />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            {user ? (
              <Link to="/dashboard" className="bg-signal px-3.5 py-2 text-white hover:bg-signal-600">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className={cx('px-3 py-2', dark ? 'hover:bg-bone/10' : 'hover:bg-ink/5')}>
                  Log in
                </Link>
                <Link to="/signup" className="bg-signal px-3.5 py-2 text-white hover:bg-signal-600">
                  Sign up
                </Link>
              </>
            )}
            <AarTechLogo className={cx('ml-2 h-10 sm:ml-4', !dark && 'border border-ink/8')} />
          </nav>
        </div>
      </header>
      {children}
      <footer className={cx('border-t py-8 text-center text-sm', dark ? 'border-bone/10 text-bone/50' : 'border-ink/8 text-muted')}>
        <p className="mb-3 flex items-center justify-center gap-2.5">
          <span>A product of</span>
          <AarTechLogo className="h-9" />
        </p>
        © {new Date().getFullYear()} Team Intelligent Squad · <Link to="/privacy" className="underline-offset-2 hover:underline">Privacy</Link> ·{' '}
        <Link to="/terms" className="underline-offset-2 hover:underline">Terms</Link>
      </footer>
    </div>
  );
}

export default function Landing() {
  const { config } = useConfig();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const load = () => api('/public/summary').then(setSummary).catch(() => {});
  useEffect(() => { load(); }, []);
  useLive(['slots', 'pds'], load);
  const types = config?.types ?? [];
  const team = config?.branding.team_name ?? 'Intelligent Squad';
  const start = !user ? '/signup' : canSharePds(user) ? '/pds/new' : '/admin';

  return (
    <PublicShell dark>
      {/* Hero */}
      <section className="graph-paper relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] bg-signal/20 blur-[120px]" />
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <p className="mb-6 inline-flex items-center gap-2.5 border border-bone/15 bg-ink-2/70 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-bone/70">
            <span className="spark" /> {team} · now building
          </p>
          <h1 className="max-w-4xl text-[2.6rem] font-black leading-[1.02] tracking-tight sm:text-7xl">
            Share your problem.
            <br />
            The community improves it. <span className="text-signal-400">We build it.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-bone/70">
            Write a short PDS (Problem Document Statement) in about 2 minutes. Others add ideas, and the team builds it in a clear weekly slot, so you always know when work starts.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to={start} className="group inline-flex h-14 items-center justify-center gap-2.5 bg-signal px-7 text-base font-bold text-white shadow-glow transition hover:bg-signal-600">
              {!user ? 'Sign up - it is free' : canSharePds(user) ? 'Write a new PDS' : 'Open the admin panel'} <ArrowRight className="size-5 transition group-hover:translate-x-1" />
            </Link>
            {!user && (
              <Link to="/login" className="inline-flex h-14 items-center justify-center gap-2 border border-bone/20 px-7 font-semibold text-bone hover:bg-bone/5">
                I already have an account
              </Link>
            )}
          </div>
          {summary && (
            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-px bg-bone/10 font-mono">
              {[
                ['In development', summary.stats.in_development],
                ['Delivered', summary.stats.delivered],
                ['Community PDS', summary.stats.community],
              ].map(([k, v]) => (
                <div key={k} className="bg-ink px-4 py-3">
                  <dt className="text-[11px] uppercase tracking-wider text-bone/45">{k}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-bone">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-2 text-muted">From QR scan to delivered solution - every step is visible.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [ScanLine, 'Scan & sign up', 'Name, mobile, email and a password. Ready in a minute.'],
              [FileText, 'Write a short PDS', 'Title, type, the problem and what you expect. About 2 minutes.'],
              [MessagesSquare, 'Community adds ideas', 'Public PDS get comments, points and upvotes from other users.'],
              [CalendarRange, 'Pick your slot', 'Once approved, choose a free week on the slot calendar.'],
              [ShieldCheck, 'Track to delivery', 'See progress, answer questions, then confirm and rate.'],
            ].map(([Icon, title, text], i) => (
              <li key={title} style={{ animationDelay: `${i * 60}ms` }} className="relative animate-rise border border-ink/8 bg-white p-5 shadow-card">
                <span className="absolute right-4 top-4 font-mono text-3xl font-semibold text-ink/10">0{i + 1}</span>
                <Icon className="size-6 text-signal" />
                <p className="mt-4 font-bold">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Slot calendar summary (guest view) */}
      <section className="bg-bone text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Development slots</h2>
              <p className="mt-2 max-w-2xl text-muted">
                The team builds {summary?.capacity.parallel_slots ?? 2} PDS at a time ({summary?.capacity.hours_per_week ?? 20} hours a week each). A new one starts only when a running one finishes - so dates are honest.
              </p>
            </div>
            <SlotLegend />
          </div>
          <div className="mt-6 bg-paper p-2 sm:p-4">
            {summary ? (
              <SlotCalendar
                weeks={summary.weeks.map((w) => ({ ...w, free: w.cells.filter((c) => c.status === 'available').map((c) => c.lane), cells: w.cells.map((c) => ({ ...c, pds: null })) }))}
                lanes={summary.weeks[0]?.cells.map((c) => c.lane) ?? []}
                linkBase={null}
              />
            ) : (
              <div className="h-48 animate-pulse bg-bone-2" />
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            <Link to={user ? '/dashboard' : '/signup'} className="font-semibold text-signal-600 hover:underline">
              {user ? 'See the full calendar on your dashboard' : 'Sign up to see which projects are being built'}
            </Link>
          </p>
        </div>
      </section>

      {/* Types */}
      <section className="bg-paper text-ink">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">What can you share?</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {types.map((t) => {
              const Icon = TYPE_ICONS[t.key];
              const s = TYPE_STYLE[t.key];
              return (
                <div key={t.key} className="border border-ink/8 bg-white p-5 shadow-card">
                  <div className={cx('mb-4 grid size-11 place-items-center', s.bg)}>
                    <Icon className={cx('size-5', s.text)} />
                  </div>
                  <p className="font-bold">{t.label}</p>
                  <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Privacy promise */}
      <section className="graph-paper bg-ink text-bone">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <LockKeyhole className="size-8 text-signal-400" />
            <h2 className="mt-4 text-3xl font-black tracking-tight">Your data stays yours</h2>
            <p className="mt-3 text-bone/70">Only your display name is ever shown to other people. Keep any PDS private (team only) with one tap.</p>
          </div>
          <ul className="grid gap-3 text-sm text-bone/80 sm:grid-cols-2">
            {[
              'Passwords stored only as bcrypt hashes - nobody can read them',
              'Mobile number, email and name encrypted (AES-256)',
              'Two-factor login for every team member',
              'Download your data or delete your account any time',
            ].map((t) => (
              <li key={t} className="flex gap-2 border border-bone/10 bg-ink-2/60 p-4">
                <ShieldCheck className="size-4 shrink-0 text-signal-400" /> {t}
              </li>
            ))}
          </ul>
        </div>
        {!user && (
          <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
            <Link to="/signup" className="inline-flex h-14 items-center gap-2.5 bg-signal px-7 font-bold text-white hover:bg-signal-600">
              <UserPlus className="size-5" /> Create your account
            </Link>
          </div>
        )}
      </section>
    </PublicShell>
  );
}
