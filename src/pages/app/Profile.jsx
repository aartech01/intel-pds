import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, KeyRound, Laptop, LogOut, Mail, ShieldCheck, Smartphone, Trash2, UserRound } from 'lucide-react';
import { Alert, Button, Card, Field, Input, Modal, OtpInput, PhoneInput, Spinner, fullPhone, phoneProblem } from '../../components/ui.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { useAuth, useConfig } from '../../lib/context.jsx';
import { timeAgo } from '../../lib/format.js';
import { PageTitle } from './Shell.jsx';
import { useLive } from '../../lib/live.js';

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-black">
        <Icon className="size-5 text-signal" /> {title}
      </h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default function Profile() {
  const { user, apply } = useAuth();
  const { config } = useConfig();
  if (!user) return <Spinner />;
  return (
    <div className="mx-auto max-w-3xl animate-rise space-y-6">
      <PageTitle title="Profile & security" subtitle={`Signed in as ${user.display_name} · ${config?.roles?.[user.role] ?? user.role}`} />
      <DisplayName user={user} apply={apply} />
      <Contacts user={user} apply={apply} />
      <Password />
      <MfaSection user={user} apply={apply} />
      <Devices />
      <MyData />
    </div>
  );
}

function DisplayName({ user, apply }) {
  const [name, setName] = useState(user.display_name);
  const [msg, setMsg] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    try {
      apply(await api('/me', { method: 'PATCH', body: { display_name: name } }));
      setMsg({ kind: 'success', text: 'Saved' });
    } catch (e2) {
      setMsg({ kind: 'error', text: e2.message });
    }
  };
  return (
    <Section icon={UserRound} title="Public profile" subtitle="Your display name is the only thing other users see.">
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Display name" className="flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
        </Field>
        <Button disabled={name.trim() === user.display_name}>Save</Button>
      </form>
      <div className="mt-3 grid gap-1 text-sm text-muted">
        <p>Full name (private): <b className="text-ink">{user.full_name}</b></p>
      </div>
      {msg && <div className="mt-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
    </Section>
  );
}

/** Change email or mobile: the current password confirms it is really you. */
function Contacts({ user, apply }) {
  const [edit, setEdit] = useState(null); // 'email' | 'sms'
  const [value, setValue] = useState('');
  const [cc, setCc] = useState('+91');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const close = () => { setEdit(null); setValue(''); setPassword(''); setErr(''); };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (edit === 'sms' && phoneProblem(cc, value)) throw new Error(phoneProblem(cc, value));
      apply(await api('/me/contact', { method: 'POST', body: { channel: edit, value: edit === 'sms' ? fullPhone(cc, value) : value, password } }));
      close();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section icon={Mail} title="Mobile number & email" subtitle="Used to log in. Never shown to other users.">
      <div className="divide-y divide-ink/6 border border-ink/8">
        {[
          ['sms', Smartphone, 'Mobile number', user.phone],
          ['email', Mail, 'Email', user.email],
        ].map(([ch, Icon, label, v]) => (
          <div key={ch} className="flex items-center gap-3 px-4 py-3">
            <Icon className="size-5 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">{label}</p>
              <p className="truncate font-semibold">{v}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEdit(ch)}>Change</Button>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={close} title={`Change ${edit === 'sms' ? 'mobile number' : 'email'}`}>
        <form onSubmit={save} className="space-y-4">
          {edit === 'sms' ? (
            <div>
              <label htmlFor="new-phone" className="mb-1.5 block text-sm font-semibold">New mobile number</label>
              <PhoneInput id="new-phone" cc={cc} onCc={setCc} value={value} onValue={setValue} placeholder={cc === '+91' ? '98765 43210' : 'Mobile number'} invalid={!!(value && phoneProblem(cc, value))} autoFocus />
              {value && phoneProblem(cc, value) && <span className="mt-1 block text-sm text-problem">{phoneProblem(cc, value)}</span>}
            </div>
          ) : (
            <Field label="New email">
              <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="you@example.com" required autoFocus />
            </Field>
          )}
          <Field label="Your current password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Alert>{err}</Alert>
          <Button className="w-full" loading={busy}>Save</Button>
        </form>
      </Modal>
    </Section>
  );
}

function Password() {
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setMsg({ kind: 'error', text: 'New passwords do not match' });
    setBusy(true);
    try {
      await api('/me/password', { method: 'POST', body: { current: f.current, next: f.next } });
      setF({ current: '', next: '', confirm: '' });
      setMsg({ kind: 'success', text: 'Password changed. Other devices were logged out and we sent you an alert.' });
    } catch (e2) {
      setMsg({ kind: 'error', text: e2.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section icon={KeyRound} title="Password" subtitle="Changing it logs out all your other devices.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" className="sm:col-span-2">
          <Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required />
        </Field>
        <Field label="New password">
          <Input type="password" autoComplete="new-password" maxLength={72} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" maxLength={72} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required />
        </Field>
        <div className="sm:col-span-2">
          {msg && <div className="mb-3"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
          <Button loading={busy}>Change password</Button>
        </div>
      </form>
    </Section>
  );
}

/** Two-factor authentication: required for team accounts, optional for users. */
export function MfaSetup({ onEnabled }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setErr('');
    try {
      setSetup(await api('/me/mfa/setup', { method: 'POST' }));
    } catch (e) {
      setErr(e.message);
    }
  };
  const enable = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const d = await api('/me/mfa/enable', { method: 'POST', body: { code } });
      setCodes(d.recovery_codes);
      onEnabled?.(d, false);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  if (codes) {
    return (
      <div>
        <Alert kind="success">Two-factor authentication is on.</Alert>
        <p className="mt-4 font-bold">Save your recovery codes</p>
        <p className="text-sm text-muted">Each code works once if you lose your phone. Keep them somewhere safe - they will not be shown again.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 bg-paper p-4 font-mono text-lg">
          {codes.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>Copy codes</Button>
          <Button onClick={() => onEnabled?.(null, true)}>I saved them</Button>
        </div>
      </div>
    );
  }
  if (!setup) {
    return (
      <div>
        <p className="text-sm text-muted">Use an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.</p>
        <Button className="mt-3" onClick={start}><ShieldCheck className="size-4" /> Set up two-factor authentication</Button>
        {err && <div className="mt-3"><Alert>{err}</Alert></div>}
      </div>
    );
  }
  return (
    <form onSubmit={enable} className="grid gap-5 sm:grid-cols-[220px_1fr]">
      <div>
        <img src={setup.qr} alt="Scan this QR code with your authenticator app" className="size-52 border border-ink/10 bg-white p-2" />
      </div>
      <div className="space-y-3">
        <p className="text-sm"><b>1.</b> Scan the QR code with your authenticator app.</p>
        <p className="text-sm text-muted">Can&apos;t scan? Enter this key: <code className="break-all bg-paper px-1.5 py-0.5 font-mono text-ink">{setup.secret}</code></p>
        <p className="text-sm"><b>2.</b> Enter the 6-digit code it shows.</p>
        <OtpInput value={code} onValue={setCode} />
        <Alert>{err}</Alert>
        <Button loading={busy} disabled={code.length !== 6}>Turn on</Button>
      </div>
    </form>
  );
}

/** Super Admin: stop requiring two-factor for the team (then anyone can log in with just a password). */
export function TeamRuleOff({ onDone }) {
  const { reload } = useConfig();
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/me/team-2fa-rule', { method: 'POST', body: { required: false, password } });
      await reload();
      onDone?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={go} className="space-y-3">
      <Field label="Your password">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </Field>
      <Alert>{err}</Alert>
      <Button variant="outline" className="w-full" loading={busy}>Stop requiring two-factor for the team</Button>
    </form>
  );
}

/** New phone or deleted the app: scan a new QR code. The current app keeps working until the new one is confirmed. */
function NewPhone({ apply }) {
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(e.message);
      if (e.code === 'expired') setSetup(null);
    } finally {
      setBusy(false);
    }
  };
  const start = (e) => {
    e.preventDefault();
    run(async () => {
      setSetup(await api('/me/mfa/new-phone', { method: 'POST', body: { password } }));
      setPassword('');
      setCode('');
    });
  };
  const confirm = (e) => {
    e.preventDefault();
    run(async () => {
      apply(await api('/me/mfa/new-phone/confirm', { method: 'POST', body: { token: setup.token, code } }));
      setSetup(null);
      setDone(true);
    });
  };

  return (
    <div>
      <p className="font-semibold">Connect a new phone</p>
      <p className="text-sm text-muted">New phone, or deleted the authenticator app? Scan a new QR code. Your current app keeps working until you finish.</p>
      {done && <div className="mt-3"><Alert kind="success">Your new phone is connected. The old app no longer works.</Alert></div>}
      {!setup ? (
        <form onSubmit={start} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Your password" className="flex-1">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button variant="outline" loading={busy}>Show a new QR code</Button>
        </form>
      ) : (
        <form onSubmit={confirm} className="mt-3 grid gap-5 sm:grid-cols-[220px_1fr]">
          <img src={setup.qr} alt="Scan this QR code with your authenticator app" className="size-52 border border-ink/10 bg-white p-2" />
          <div className="space-y-3">
            <p className="text-sm"><b>1.</b> Open the authenticator app on your new phone and scan this QR code.</p>
            <p className="text-sm text-muted">Can&apos;t scan? Enter this key: <code className="break-all bg-paper px-1.5 py-0.5 font-mono text-ink">{setup.secret}</code></p>
            <p className="text-sm"><b>2.</b> Enter the 6-digit code it shows.</p>
            <OtpInput value={code} onValue={setCode} />
            <div className="flex gap-2">
              <Button loading={busy} disabled={code.length !== 6}>Connect this phone</Button>
              <Button type="button" variant="ghost" onClick={() => setSetup(null)}>Cancel</Button>
            </div>
          </div>
        </form>
      )}
      {err && <div className="mt-3"><Alert>{err}</Alert></div>}
    </div>
  );
}

function MfaSection({ user, apply }) {
  const { config } = useConfig();
  const required = user.is_staff && config?.team_2fa_required !== false;
  const [password, setPassword] = useState('');
  const [codesPassword, setCodesPassword] = useState('');
  const [codes, setCodes] = useState(null);
  const [err, setErr] = useState('');
  const disable = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      apply(await api('/me/mfa/disable', { method: 'POST', body: { password } }));
    } catch (e2) {
      setErr(e2.message);
    }
  };
  const renewCodes = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      setCodes((await api('/me/mfa/recovery-codes', { method: 'POST', body: { password: codesPassword } })).recovery_codes);
      setCodesPassword('');
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <Section icon={ShieldCheck} title="Two-factor authentication" subtitle={required ? 'Required for team accounts.' : 'Optional extra protection for your account.'}>
      {user.mfa_enabled ? (
        <>
          <Alert kind="success">On - you enter a code from your authenticator app when you log in.</Alert>

          <div className="mt-5">
            <NewPhone apply={apply} />
          </div>

          <div className="mt-6">
            <p className="font-semibold">Recovery codes</p>
            <p className="text-sm text-muted">If you lose your phone, a recovery code logs you in instead. Lost your codes? Get new ones - the old ones stop working.</p>
            {codes ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-2 bg-paper p-4 font-mono text-lg">{codes.map((c) => <span key={c}>{c}</span>)}</div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>Copy codes</Button>
                  <Button onClick={() => setCodes(null)}>I saved them</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={renewCodes} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Field label="Your password" className="flex-1">
                  <Input type="password" value={codesPassword} onChange={(e) => setCodesPassword(e.target.value)} required />
                </Field>
                <Button variant="outline">Get new recovery codes</Button>
              </form>
            )}
          </div>

          {required ? (
            <div className="mt-6">
              <p className="font-semibold">Turn two-factor off</p>
              {user.role === 'super_admin' ? (
                <>
                  <p className="mb-3 text-sm text-muted">
                    Team accounts must use two-factor right now. To log in with just your email or mobile number and password, first stop requiring it for the team
                    (this applies to every team account). Then you can turn yours off here.
                  </p>
                  <TeamRuleOff />
                </>
              ) : (
                <p className="text-sm text-muted">Team accounts must keep two-factor on. Only a Super Admin can change this.</p>
              )}
            </div>
          ) : (
            <form onSubmit={disable} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Password to turn two-factor off" className="flex-1">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
              <Button variant="outline">Turn off</Button>
            </form>
          )}
          {err && <div className="mt-3"><Alert>{err}</Alert></div>}
        </>
      ) : (
        <MfaSetup onEnabled={(d) => d && apply(d)} />
      )}
    </Section>
  );
}

function Devices() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const load = useCallback(() => api('/me/sessions').then(setRows), []);
  useEffect(() => { load(); }, [load]);
  useLive(['me'], load);
  const end = async (s) => {
    await api(`/me/sessions/${s.id}`, { method: 'DELETE' });
    if (s.current) {
      await logout();
      nav('/login');
    } else load();
  };
  const all = async () => {
    if (!window.confirm('Log out from all devices, including this one?')) return;
    await api('/auth/logout-all', { method: 'POST' });
    await logout();
    nav('/login');
  };
  return (
    <Section icon={Laptop} title="Devices" subtitle="Where you are logged in right now.">
      {!rows ? (
        <Spinner className="py-6" />
      ) : (
        <div className="divide-y divide-ink/6 border border-ink/8">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <Laptop className="size-5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{describeDevice(s.device_info)}{s.current && <span className="ml-2 text-xs font-bold text-automation">This device</span>}</p>
                <p className="text-xs text-muted">Active {timeAgo(s.last_used_at)} · signed in {timeAgo(s.created_at)}{s.remember ? ' · remembered' : ''}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => end(s)}>Log out</Button>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" className="mt-4" onClick={all}>
        <LogOut className="size-4" /> Log out from all devices
      </Button>
    </Section>
  );
}

function describeDevice(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'device';
  return `${browser} on ${os}`;
}

function MyData() {
  const nav = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const del = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/me', { method: 'DELETE', body: { password } });
      await logout();
      nav('/', { replace: true });
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section icon={Download} title="Your data" subtitle="Download everything we hold about you, or delete your account.">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => downloadFile('/me/export', 'my-intelsquad-data.json')}>
          <Download className="size-4" /> Download my data
        </Button>
        <Button variant="ghost" className="text-problem" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" /> Delete my account
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <form onSubmit={del} className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Your name, mobile number, email and password are removed.</li>
            <li>Drafts and private PDS are deleted. Open public PDS are withdrawn and their slots released.</li>
            <li>Public PDS and comments stay, shown as &quot;Deleted user&quot;.</li>
          </ul>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label='Type "DELETE" to confirm'>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Alert>{err}</Alert>
          <Button variant="danger" className="w-full" loading={busy} disabled={confirm !== 'DELETE'}>Delete my account forever</Button>
        </form>
      </Modal>
    </Section>
  );
}
