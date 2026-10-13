import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Loader2, X, Code2, Workflow, LifeBuoy, Lightbulb, Sparkles } from 'lucide-react';
import { STATUS_STYLE, TYPE_STYLE } from '../lib/format.js';

export const cx = (...c) => c.filter(Boolean).join(' ');

export const TYPE_ICONS = { software: Code2, automation: Workflow, problem: LifeBuoy, idea: Lightbulb, other: Sparkles };

/**
 * IntelSquad logo: a blocky "iS" monogram on a notched square. The dot of the i is a red spark that drops in
 * on load and hops on hover; "Squad" leans forward with a hard sticker shadow. Motion is off for reduced-motion users.
 */
/** compact: true = icon only below 640px; 'xs' = icon only on very small phones (under 360px). */
export function Logo({ dark = false, compact = false, className = '' }) {
  const plate = dark ? '#ECEEF6' : '#070139';
  const ink = dark ? '#070139' : '#ECEEF6';
  return (
    <span className={cx('group inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 64 64" className="size-9 shrink-0 overflow-visible" aria-hidden>
        <path d="M0 0H50L64 14V64H0Z" fill={plate} />
        <rect x="10" y="27" width="10" height="26" fill={ink} />
        <rect x="10" y="11" width="10" height="10" fill={dark ? '#FF5C5C' : '#B30405'} className="motion-safe:animate-logo-drop motion-safe:group-hover:animate-logo-hop" />
        <path d="M27 11H53V19H35V28H53V53H27V45H45V36H27Z" fill={ink} transform="skewX(-8) translate(7 0)" className="transition-transform duration-300 motion-safe:group-hover:translate-x-0.5" />
      </svg>
      <span className={cx('whitespace-nowrap text-[1.35rem] font-black leading-none tracking-[-0.04em]', compact === 'xs' ? 'max-[359px]:hidden' : compact && 'hidden sm:inline')}>
        Intel
        <span
          className={cx(
            'ml-0.5 inline-block -skew-x-12 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5',
            dark ? 'text-signal-400 [text-shadow:2px_2px_0_#B30405]' : 'text-signal [text-shadow:2px_2px_0_rgb(7_1_57_/_0.22)]',
          )}
        >
          Squad
        </span>
      </span>
    </span>
  );
}

/** AarTech Solonics logo. The artwork has a white background, so it sits on a white plate. */
export function AarTechLogo({ className = '' }) {
  return (
    <span className={cx('inline-flex shrink-0 bg-white p-1', className)}>
      <img src="/aartech-logo.webp" alt="AarTech Solonics" width="242" height="144" className="h-full w-auto" />
    </span>
  );
}

const BTN = {
  primary: 'bg-signal text-white hover:bg-signal-600 shadow-[0_8px_20px_-8px_rgb(179_4_5/0.6)]',
  dark: 'bg-ink text-bone hover:bg-ink-3',
  outline: 'border border-ink/15 bg-white text-ink hover:border-ink/40',
  ghost: 'text-ink hover:bg-ink/5',
  danger: 'bg-problem text-white hover:brightness-95',
  light: 'bg-bone text-ink hover:bg-white',
};

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...props }) {
  const sizes = { sm: 'h-8 px-3 text-sm gap-1.5', md: 'h-11 px-5 text-[15px] gap-2', lg: 'h-14 px-7 text-base gap-2.5' };
  return (
    <button
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        BTN[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-ink">
          {label} {required && <span className="text-signal">*</span>}
        </span>
      )}
      {children}
      {error ? <span data-error className="mt-1 block text-sm text-problem">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  'w-full border border-ink/12 bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-signal focus:outline-none focus:ring-4 focus:ring-signal/15';

export const Input = ({ className, invalid, ...p }) => <input className={cx(inputBase, 'h-11', invalid && 'border-problem', className)} {...p} />;
export const Textarea = ({ className, invalid, ...p }) => <textarea className={cx(inputBase, 'min-h-28 py-2.5', invalid && 'border-problem', className)} {...p} />;
export const Select = ({ className, children, ...p }) => (
  <select className={cx(inputBase, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27%236b665d%27%3E%3Cpath d=%27M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z%27/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_10px_center] bg-no-repeat pr-9', className)} {...p}>
    {children}
  </select>
);

/** Large tappable pill choices - friendlier than selects on phones. */
export function Chips({ options, value, onChange, multi = false }) {
  const selected = multi ? value ?? [] : [value];
  const toggle = (o) => {
    if (!multi) return onChange(o === value ? '' : o);
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => toggle(o)}
            aria-pressed={on}
            className={cx(
              'min-h-10 border px-4 text-sm font-medium transition',
              on ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white text-ink hover:border-ink/40',
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ className, children, ...p }) {
  return (
    <div className={cx('border border-ink/8 bg-white shadow-card', className)} {...p}>
      {children}
    </div>
  );
}

export function StatusBadge({ status, label, className }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLE[status], className)}>{label}</span>;
}

export function TypeBadge({ type, label }) {
  const s = TYPE_STYLE[type] ?? TYPE_STYLE.other;
  const Icon = TYPE_ICONS[type] ?? Sparkles;
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold', s.bg, s.text)}>
      <Icon className="size-3.5" />
      {label ?? type}
    </span>
  );
}

export function Spinner({ className }) {
  return (
    <div className={cx('flex items-center justify-center py-16 text-muted', className)}>
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-3 grid size-12 place-items-center bg-bone">
          <Icon className="size-6 text-muted" />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const s = { error: 'border-problem/30 bg-problem/8 text-problem', info: 'border-software/30 bg-software/8 text-software', success: 'border-automation/30 bg-automation/8 text-automation' };
  return <div role="alert" className={cx('border px-4 py-3 text-sm', s[kind])}>{children}</div>;
}

/**
 * Popup rendered straight into <body>: an animated or blurred parent (page fade-in, sticky header)
 * would otherwise become the box `fixed` is measured from, pushing the popup off-centre.
 */
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx('max-h-[calc(100dvh-2rem)] w-full overflow-auto bg-white p-6 shadow-2xl animate-rise', wide ? 'max-w-2xl' : 'max-w-md')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-bone" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** "Are you sure?" popup for anything that cannot be undone. onConfirm may be async; its error is shown in the popup. */
export function ConfirmModal({ open, onClose, title, children, confirmLabel = 'Delete', onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (open) setErr(''); }, [open]);
  const go = async () => {
    setBusy(true);
    setErr('');
    try {
      await onConfirm();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm text-muted">{children}</div>
      <p className="mt-3 text-sm font-semibold text-problem">This cannot be undone.</p>
      {err && <div className="mt-3"><Alert>{err}</Alert></div>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" loading={busy} onClick={go}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/** Cloudflare Turnstile widget. Renders nothing when the server has no CAPTCHA key. */
let turnstileLoad;
export function Captcha({ siteKey, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!siteKey) return;
    turnstileLoad ??= new Promise((resolve, reject) => {
      const s = Object.assign(document.createElement('script'), { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    let id;
    turnstileLoad
      .then(() => {
        if (ref.current && window.turnstile) id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(''), theme: 'light' });
      })
      .catch(() => onToken(''));
    return () => id && window.turnstile?.remove(id);
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

// ---------- mobile number ----------
export const COUNTRY_CODES = [
  { code: '+91', label: 'India', len: [10, 10] },
  { code: '+1', label: 'USA / Canada', len: [10, 10] },
  { code: '+44', label: 'UK', len: [10, 10] },
  { code: '+971', label: 'UAE', len: [8, 9] },
  { code: '+966', label: 'Saudi Arabia', len: [9, 9] },
  { code: '+65', label: 'Singapore', len: [8, 8] },
  { code: '+61', label: 'Australia', len: [9, 9] },
  { code: '+977', label: 'Nepal', len: [10, 10] },
  { code: '+880', label: 'Bangladesh', len: [10, 10] },
  { code: '+94', label: 'Sri Lanka', len: [9, 9] },
];

/** Local digits: drops spaces/dashes, a leading 0, and the country code if typed again. */
export function phoneDigits(cc, value) {
  let d = String(value ?? '').replace(/\D/g, '').replace(/^0+/, '');
  const ccd = cc.replace('+', '');
  const max = COUNTRY_CODES.find((c) => c.code === cc)?.len[1] ?? 12;
  if (d.startsWith(ccd) && d.length > max) d = d.slice(ccd.length);
  return d;
}

/** Full international number, e.g. "+919876543210". */
export const fullPhone = (cc, value) => `${cc}${phoneDigits(cc, value)}`;

/** Returns an error message, or null when the number looks right for the country. */
export function phoneProblem(cc, value) {
  const d = phoneDigits(cc, value);
  if (!d) return 'Enter your mobile number';
  const [min, max] = COUNTRY_CODES.find((c) => c.code === cc)?.len ?? [6, 12];
  if (d.length < min || d.length > max) return min === max ? `Enter a ${min}-digit mobile number` : `Enter a ${min} to ${max} digit mobile number`;
  if (cc === '+91' && !/^[6-9]/.test(d)) return 'Indian mobile numbers start with 6, 7, 8 or 9';
  return null;
}

/** Country code + number in one box. Formats Indian numbers as "98765 43210" while typing. */
export function PhoneInput({ cc, onCc, value, onValue, invalid, id, ...p }) {
  const show = (v) => {
    const d = String(v).replace(/[^\d\s+-]/g, '');
    return cc === '+91' && /^\d{6,10}$/.test(d) ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
  };
  return (
    <div className={cx('flex h-11 border bg-white transition focus-within:border-signal focus-within:ring-4 focus-within:ring-signal/15', invalid ? 'border-problem' : 'border-ink/12')}>
      {/* Visible part shows only the code; the real <select> sits on top, invisible, so the list shows country names. */}
      <div className="relative flex h-full shrink-0 items-center gap-1 border-r border-ink/12 bg-paper pl-3 pr-2 text-[15px] font-semibold text-ink">
        {cc}
        <ChevronDown className="size-4 text-muted" />
        <select value={cc} onChange={(e) => onCc(e.target.value)} aria-label="Country code" className="absolute inset-0 cursor-pointer opacity-0">
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.label}
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={show(value)}
        onChange={(e) => onValue(e.target.value.replace(/\s/g, ''))}
        maxLength={18}
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 font-mono text-[15px] tracking-wide text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-muted/70 focus:outline-none"
        {...p}
      />
    </div>
  );
}

export const OtpInput =({ className, value, onValue, ...p }) => (
  <input
    inputMode="numeric"
    autoComplete="one-time-code"
    maxLength={6}
    placeholder="••••••"
    className={cx(inputBase, 'h-14 text-center font-mono text-2xl tracking-[0.5em]', className)}
    value={value}
    onChange={(e) => onValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
    {...p}
  />
);

/** CM-10: user text is shown as plain text; only http(s) links become clickable (never HTML). */
export function RichText({ text, className }) {
  if (!text) return null;
  const parts = String(text).split(/(https?:\/\/[^\s<>"']+)/g);
  return (
    <p className={cx('whitespace-pre-wrap break-words', className)}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow ugc" className="text-signal-600 underline underline-offset-2">
            {p.length > 60 ? `${p.slice(0, 57)}...` : p}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  );
}

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto border-b border-ink/10', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition', value === t.value ? 'border-signal text-ink' : 'border-transparent text-muted hover:text-ink')}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 bg-ink/6 px-1.5 py-0.5 font-mono text-xs">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name = '?', team, className }) {
  return (
    <span className={cx('grid size-9 shrink-0 place-items-center text-sm font-bold', team ? 'bg-signal text-white' : 'bg-ink text-bone', className)} aria-hidden>
      {(name.trim()[0] || '?').toUpperCase()}
    </span>
  );
}

export const Counter = ({ value = '', max }) => (
  <span className={cx('font-mono text-xs', value.length > max ? 'text-problem' : value.length > max * 0.9 ? 'text-[#a86b00]' : 'text-muted')}>
    {value.length}/{max}
  </span>
);

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-11 shrink-0 transition', checked ? 'bg-automation' : 'bg-ink/20')}
    >
      <span className={cx('absolute top-0.5 size-5 bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}
