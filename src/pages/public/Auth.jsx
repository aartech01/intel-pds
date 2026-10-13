import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import { AarTechLogo, Alert, Button, Captcha, Field, Input, Logo, PhoneInput, Spinner, fullPhone, phoneProblem } from '../../components/ui.jsx';
import { canSharePds, useAuth, useConfig } from '../../lib/context.jsx';
import { api } from '../../lib/api.js';

const SRC_KEY = 'sd_src';

export function AuthShell({ title, subtitle, children, side }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="graph-paper relative hidden overflow-hidden bg-ink p-12 text-bone lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -bottom-32 -left-32 size-[480px] bg-signal/25 blur-[120px]" />
        <Link to="/" aria-label="Home">
          <Logo dark />
        </Link>
        <div className="relative">
          {side ?? (
            <>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-bone/50">IntelSquad</p>
              <p className="mt-3 max-w-md text-4xl font-black leading-tight">
                Share a problem. Get ideas. <span className="text-signal-400">Get it built.</span>
              </p>
            </>
          )}
        </div>
        <p className="relative flex items-center gap-2 text-sm text-bone/45">
          <ShieldCheck className="size-4" /> Passwords hashed with bcrypt · personal data encrypted
        </p>
      </div>
      <div className="relative flex items-center justify-center bg-paper px-4 py-10">
        <AarTechLogo className="absolute right-4 top-4 h-10 border border-ink/8 sm:right-6 sm:top-6" />
        <div className="w-full max-w-md animate-rise">
          <Link to="/" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

// "Skip for now" on the 2FA setup page lasts until the browser tab is closed (only when ALLOW_2FA_SKIP is on).
const SKIP_2FA_KEY = 'sd_skip_2fa';
export const twoFactorSkipped = () => sessionStorage.getItem(SKIP_2FA_KEY) === '1';
export const skipTwoFactor = () => sessionStorage.setItem(SKIP_2FA_KEY, '1');

/** Team console login: a full-screen navy page, so staff never confuse it with the user login. */
export function TeamAuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="graph-paper relative flex min-h-dvh flex-col overflow-hidden bg-ink text-bone">
      <div className="pointer-events-none absolute left-1/2 top-1/3 size-[560px] -translate-x-1/2 bg-signal/20 blur-[140px]" />
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-8">
        <Link to="/" aria-label="Home" className="flex items-center gap-3">
          <Logo dark compact />
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-bone/50 sm:inline">Team console</span>
        </Link>
        <AarTechLogo className="h-10" />
      </header>
      <main className="relative grid flex-1 place-items-center px-4 py-10">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-7 text-center">
            <div className="mx-auto grid size-16 place-items-center border border-signal-400/40 bg-signal/15">
              <ShieldCheck className="size-8 text-signal-400" />
            </div>
            <p className="mt-5 inline-flex items-center gap-2 border border-signal-400/30 bg-signal/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-signal-400">
              <span className="spark" /> Restricted · team only
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-bone/60">{subtitle}</p>}
          </div>
          <div className="border-t-4 border-signal bg-white p-6 text-ink shadow-glow sm:p-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-bone/60">{footer}</div>}
        </div>
      </main>
      <p className="relative flex items-center justify-center gap-2 px-4 pb-6 text-center text-xs text-bone/40">
        <Lock className="size-3.5 shrink-0" /> Team logins are recorded in the activity log.
      </p>
    </div>
  );
}

/** Where to go after login or sign up. */
function afterAuth(user, from, config) {
  if (user.must_change_password) return '/set-password';
  if (user.is_staff && !user.mfa_enabled && config?.team_2fa_required !== false && !twoFactorSkipped()) return '/admin/setup-2fa';
  return from || '/dashboard';
}

// ---------- QR entry: /start?src=office-poster ----------
export function Start() {
  const [params] = useSearchParams();
  const { user, loading } = useAuth();
  const src = params.get('src');
  if (src) sessionStorage.setItem(SRC_KEY, src);
  if (loading) return <Spinner className="min-h-dvh" />;
  return <Navigate to={!user ? '/signup' : canSharePds(user) ? '/dashboard' : '/admin'} replace />;
}

// ---------- sign up (PRD §7.1) ----------
export function Signup() {
  const { config } = useConfig();
  const { user, apply } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [f, setF] = useState({ full_name: '', display_name: '', cc: '+91', phone: '', email: '', password: '', confirm_password: '', accept_terms: false, remember: true });
  const [displayTouched, setDisplayTouched] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t) => setCaptcha(t), []);

  if (user) return <Navigate to={afterAuth(user, next, config)} replace />;
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [k]: v, ...(k === 'full_name' && !displayTouched ? { display_name: v.trim().split(/\s+/)[0] ?? '' } : {}) }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    const local = {};
    const phoneErr = phoneProblem(f.cc, f.phone);
    if (phoneErr) local.phone = phoneErr;
    if (f.password !== f.confirm_password) local.confirm_password = 'Passwords do not match';
    if (!f.accept_terms) local.accept_terms = 'Please accept the terms and privacy policy';
    if (Object.keys(local).length) return setErrors(local);
    setBusy(true);
    setErr('');
    try {
      const { cc, ...rest } = f;
      const d = await api('/auth/signup', { method: 'POST', body: { ...rest, phone: fullPhone(cc, f.phone), captcha, src: sessionStorage.getItem(SRC_KEY) || undefined } });
      apply(d);
      nav(afterAuth(d.user, next, config), { replace: true });
    } catch (e2) {
      setErrors(e2.fields ?? {});
      setErr(e2.message);
      window.turnstile?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Full name" required error={errors.full_name}>
          <Input autoComplete="name" value={f.full_name} onChange={set('full_name')} maxLength={60} required autoFocus invalid={!!errors.full_name} />
        </Field>
        <Field label="Display name" required hint="Shown publicly on the community board instead of your full name." error={errors.display_name}>
          <Input value={f.display_name} onChange={(e) => { setDisplayTouched(true); set('display_name')(e); }} maxLength={30} required invalid={!!errors.display_name} />
        </Field>
        {/* Not inside <Field>: its <label> would send clicks to the country picker instead of the number. */}
        <div>
          <label htmlFor="signup-phone" className="mb-1.5 block text-sm font-semibold text-ink">
            Mobile number <span className="text-signal">*</span>
          </label>
          <PhoneInput
            id="signup-phone"
            cc={f.cc}
            onCc={(cc) => { setF((s) => ({ ...s, cc })); setErrors((x) => ({ ...x, phone: undefined })); }}
            value={f.phone}
            onValue={(phone) => { setF((s) => ({ ...s, phone })); setErrors((x) => ({ ...x, phone: undefined })); }}
            onBlur={() => f.phone && setErrors((x) => ({ ...x, phone: phoneProblem(f.cc, f.phone) ?? undefined }))}
            placeholder={f.cc === '+91' ? '98765 43210' : 'Mobile number'}
            invalid={!!errors.phone}
            required
          />
          {errors.phone ? (
            <span data-error className="mt-1 block text-sm text-problem">{errors.phone}</span>
          ) : (
            <span className="mt-1 block text-xs text-muted">Never shown to other users.</span>
          )}
        </div>
        <Field label="Email" required error={errors.email}>
          <Input type="email" autoComplete="email" value={f.email} onChange={set('email')} required invalid={!!errors.email} />
        </Field>
        <Field label="Password" required error={errors.password}>
          <Input type="password" autoComplete="new-password" value={f.password} onChange={set('password')} maxLength={72} required invalid={!!errors.password} />
        </Field>
        <Field label="Confirm password" required error={errors.confirm_password}>
          <Input type="password" autoComplete="new-password" value={f.confirm_password} onChange={set('confirm_password')} maxLength={72} required invalid={!!errors.confirm_password} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 accent-signal" checked={f.accept_terms} onChange={set('accept_terms')} />
          <span>
            I accept the{' '}
            <Link to="/terms" target="_blank" className="font-semibold text-signal-600 underline">terms</Link> and{' '}
            <Link to="/privacy" target="_blank" className="font-semibold text-signal-600 underline">privacy policy</Link>.
            {errors.accept_terms && <span className="block text-problem">{errors.accept_terms}</span>}
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-signal" checked={f.remember} onChange={set('remember')} /> Keep me logged in on this device for 30 days
        </label>
        <Captcha siteKey={config?.captcha_site_key} onToken={onToken} />
        <Alert>{err}</Alert>
        <Button className="w-full" size="lg" loading={busy}>
          Create account
        </Button>
        <p className="text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to={`/login${params.toString() ? `?${params}` : ''}`} className="font-semibold text-signal-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

// ---------- login (AC-03, AC-06, AC-07) ----------
/** User login (users only), or the team login at /admin/is/login (team accounts only) when `team` is set. */
export function Login({ team = false }) {
  const { config } = useConfig();
  const { user, apply } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [params] = useSearchParams();
  const from = loc.state?.from || params.get('next') || (team ? '/admin' : null);
  const Shell = team ? TeamAuthShell : AuthShell;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [captchaNeeded, setCaptchaNeeded] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState('');
  const [lost, setLost] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const onToken = useCallback((t) => setCaptcha(t), []);

  if (user && !mfa) return <Navigate to={team && !user.is_staff ? '/dashboard' : afterAuth(user, from, config)} replace />;

  // The server only lets each account type in through its own door, so a successful login is always the right kind.
  function finish(d, to) {
    apply(d);
    nav(to, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api(team ? '/auth/team-login' : '/auth/login', { method: 'POST', body: { identifier, password, remember, captcha } });
      if (d.mfa_required) {
        setMfa(d.mfa_token);
      } else {
        finish(d, afterAuth(d.user, from, config));
      }
    } catch (e2) {
      setErr(e2.message);
      if (e2.data?.captcha_required || e2.code === 'captcha_required') setCaptchaNeeded(true);
      window.turnstile?.reset();
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api('/auth/mfa', { method: 'POST', body: { mfa_token: mfa, code: code.trim() } });
      finish(d, from || (d.user.is_staff ? '/admin' : '/dashboard'));
    } catch (e2) {
      setErr(e2.message);
      if (e2.code === 'mfa_expired') setMfa(null);
    } finally {
      setBusy(false);
    }
  }

  if (mfa) {
    return (
      <Shell title="Two-factor check" subtitle="Open your authenticator app and enter the 6-digit code for IntelSquad.">
        <form onSubmit={submitMfa} className="space-y-4">
          <Field label="Authentication code" hint="Lost your phone? Enter one of your recovery codes (like ABCD-EFGH).">
            <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode="text" className="h-14 text-center font-mono text-2xl tracking-[0.3em]" autoFocus />
          </Field>
          <Alert>{err}</Alert>
          <Button className="w-full" size="lg" loading={busy} disabled={code.trim().length < 6}>
            <KeyRound className="size-4" /> Verify and log in
          </Button>
          <button type="button" onClick={() => { setMfa(null); setCode(''); setLost(false); }} className="w-full text-center text-sm font-semibold text-muted hover:text-ink">
            Back
          </button>
        </form>

        <div className="mt-6 border-t border-ink/8 pt-5">
          {!lost ? (
            <button type="button" onClick={() => setLost(true)} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-signal-600 hover:underline">
              <Smartphone className="size-4" /> Lost your phone or removed the app?
            </button>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-bold">1. Use a recovery code</p>
                <p className="text-muted">When you turned on two-factor you got 8 recovery codes (like ABCD-EFGH). Type one in the box above - each works once.</p>
              </div>
              <div>
                <p className="font-bold">2. Ask a Super Admin</p>
                <p className="text-muted">They can reset your two-factor from the Users page. Then you log in with just your password and scan a new QR code.</p>
              </div>
              <p className="text-xs text-muted">You are the only Super Admin? Whoever runs the server can turn it off with <code className="bg-paper px-1 font-mono">npm run reset-2fa</code>.</p>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={team ? 'Team console' : 'Welcome back'}
      subtitle={team ? 'Log in to manage requests, slots and users.' : 'Log in with your mobile number or email.'}
      footer={
        team && (
          <>
            Not on the team?{' '}
            <Link to="/login" className="font-semibold text-signal-400 hover:underline">
              User login
            </Link>
          </>
        )
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={team ? 'Team email or mobile number' : 'Mobile number or email'}>
          <Input autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder={team ? 'you@aartechsolonics.com' : '+91 98765 43210 or you@example.com'} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-signal" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <Link to="/forgot" className="font-semibold text-signal-600 hover:underline">
            Forgot password?
          </Link>
        </div>
        {captchaNeeded && <Captcha siteKey={config?.captcha_site_key} onToken={onToken} />}
        <Alert>{err}</Alert>
        <Button className="w-full" size="lg" loading={busy}>
          {team ? <ShieldCheck className="size-4" /> : <Lock className="size-4" />} {team ? 'Log in to team console' : 'Log in'}
        </Button>
        {!team && (
          <>
            <p className="text-center text-sm text-muted">
              New here?{' '}
              <Link to={`/signup${params.toString() ? `?${params}` : ''}`} className="font-semibold text-signal-600 hover:underline">
                Create an account
              </Link>
            </p>
          </>
        )}
      </form>
    </Shell>
  );
}

// ---------- forgotten password: the team gives a temporary password (no email / SMS) ----------
export function Forgot() {
  return (
    <AuthShell title="Forgot your password?" subtitle="IntelSquad does not send emails or text messages, so the team resets it for you.">
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center bg-ink font-bold text-bone">1</span>
          <span>Contact the team (in person, by phone or on WhatsApp) and tell them the email or mobile number you log in with.</span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center bg-ink font-bold text-bone">2</span>
          <span>An admin gives you a <b>temporary password</b>.</span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center bg-ink font-bold text-bone">3</span>
          <span>Log in with it. You will be asked to choose your own new password straight away.</span>
        </li>
      </ol>
      <p className="mt-6 border-t border-ink/8 pt-4 text-xs text-muted">
        Admins: ask a Super Admin. If nobody can, whoever runs the server can create one with <code className="bg-bone px-1 font-mono">npm run reset-password -- your@email</code>.
      </p>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-signal-600 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}

/** After logging in with a temporary password: choose your own before doing anything else. */
export function SetPassword() {
  const { config } = useConfig();
  const { user, loading, apply } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <Spinner className="min-h-dvh" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.must_change_password) return <Navigate to={afterAuth(user, null, config)} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setErr('The new passwords do not match');
    setBusy(true);
    setErr('');
    try {
      await api('/me/password', { method: 'POST', body: { current: f.current, next: f.next } });
      const d = await api('/auth/me');
      apply(d);
      nav(afterAuth(d.user, d.user.is_staff ? '/admin' : null, config), { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Choose a new password" subtitle="You logged in with a temporary password from the team. Choose your own to continue.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Temporary password">
          <Input type="password" autoComplete="current-password" value={f.current} onChange={set('current')} required autoFocus />
        </Field>
        <Field label="New password">
          <Input type="password" autoComplete="new-password" maxLength={72} value={f.next} onChange={set('next')} required />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" maxLength={72} value={f.confirm} onChange={set('confirm')} required />
        </Field>
        <Alert>{err}</Alert>
        <Button className="w-full" size="lg" loading={busy}>
          <KeyRound className="size-4" /> Save and continue
        </Button>
      </form>
    </AuthShell>
  );
}
