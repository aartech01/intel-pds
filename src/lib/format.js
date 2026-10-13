// Server stores UTC as "YYYY-MM-DD HH:MM:SS".
export const toDate = (s) => (s ? new Date(s.includes('T') ? s : `${s.replace(' ', 'T')}Z`) : null);

export function fmtDate(s, withTime = true) {
  const d = toDate(s);
  if (!d) return '-';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) });
}

export function timeAgo(s) {
  const d = toDate(s);
  if (!d) return '-';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const units = [[60, 'min'], [24, 'h'], [7, 'd'], [4.35, 'w'], [12, 'mo'], [Infinity, 'y']];
  let v = sec / 60;
  for (const [step, unit] of units) {
    if (v < step) return `${Math.floor(v)}${unit} ago`;
    v /= step;
  }
  return fmtDate(s, false);
}

export function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

// ---------- weeks (slot calendar) - weeks are Monday dates "YYYY-MM-DD" in UTC ----------
const wd = (w) => new Date(`${w}T00:00:00Z`);
export const fmtDay = (w) => wd(w).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function fmtWeekRange(start, end = start) {
  const last = new Date(wd(end).getTime() + 6 * 864e5);
  return `${fmtDay(start)} - ${last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`;
}
/** Monday of the current week (UTC), the same week the server's slot calendar starts from. */
export function thisMonday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** "This week", "Next week", "In 3 weeks" - easier to read than week numbers of the year. */
export function weekName(start, current = thisMonday()) {
  const n = Math.round((wd(start) - wd(current)) / (7 * 864e5));
  if (n === 0) return 'This week';
  if (n === 1) return 'Next week';
  if (n === -1) return 'Last week';
  return n > 0 ? `In ${n} weeks` : `${-n} weeks ago`;
}
/** Slot lanes A, B, C are shown to admins as Team 1, Team 2, Team 3. Users only ever see dates. */
export const teamName = (lane) => `Team ${String(lane).charCodeAt(0) - 64}`;
export const weeksCount = (start, end) => Math.round((wd(end) - wd(start)) / (7 * 864e5)) + 1;

export const TYPE_STYLE = {
  software: { bg: 'bg-software/10', text: 'text-software', dot: 'bg-software', hex: '#3a6df0' },
  automation: { bg: 'bg-automation/10', text: 'text-automation', dot: 'bg-automation', hex: '#0e9f86' },
  problem: { bg: 'bg-problem/10', text: 'text-problem', dot: 'bg-problem', hex: '#e5484d' },
  idea: { bg: 'bg-idea/15', text: 'text-[#a86b00]', dot: 'bg-idea', hex: '#f2a000' },
  other: { bg: 'bg-other/10', text: 'text-other', dot: 'bg-other', hex: '#7c5cff' },
};

export const STATUS_STYLE = {
  draft: 'bg-bone-2 text-muted border border-dashed border-ink/20',
  submitted: 'bg-signal text-white',
  under_review: 'bg-software/12 text-software',
  need_info: 'bg-idea/20 text-[#8a5800]',
  approved: 'bg-automation/12 text-automation',
  queued: 'bg-other/12 text-other',
  in_development: 'bg-ink text-bone',
  testing: 'bg-software text-white',
  delivered: 'bg-automation text-white',
  closed: 'bg-ink-4 text-bone',
  rejected: 'bg-problem/12 text-problem',
  withdrawn: 'bg-bone-2 text-muted line-through',
};

/** "Scheduled" once the team has set the dates; "In Queue" if it is approved but not scheduled yet. */
export function statusLabel(config, status, booking) {
  if (status === 'queued') return booking ? 'Scheduled' : 'In Queue';
  return config?.statuses?.[status] ?? status;
}

export const SLOT_STYLE = {
  available: { cell: 'bg-white border-dashed border-automation/50 text-automation', dot: 'bg-automation', label: 'Free' },
  booked: { cell: 'bg-other/10 border-other/30 text-other', dot: 'bg-other', label: 'Booked - starts later' },
  in_development: { cell: 'bg-ink text-bone border-ink', dot: 'bg-ink', label: 'Being built' },
  testing: { cell: 'bg-software/90 text-white border-software', dot: 'bg-software', label: 'Testing' },
  completed: { cell: 'bg-bone-2 text-muted border-ink/10', dot: 'bg-muted', label: 'Done' },
  blocked: { cell: 'bg-[repeating-linear-gradient(135deg,#eceef6_0_6px,#dfe2ef_6px_12px)] text-muted border-ink/10', dot: 'bg-bone-2', label: 'Blocked - no work' },
  closed: { cell: 'bg-paper text-muted/60 border-ink/5', dot: 'bg-paper', label: 'Not in use' },
};

export const COMMENT_STYLE = {
  idea: 'bg-idea/15 text-[#8a5800]',
  point: 'bg-software/10 text-software',
  question: 'bg-other/10 text-other',
  suggestion: 'bg-automation/10 text-automation',
};
