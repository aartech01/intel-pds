import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, CheckCircle2, ChevronDown, Clock, Flag, Hammer, Inbox, ScanLine, SearchCheck, Star, Users } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Card, Spinner, cx } from '../../components/ui.jsx';
import { PdsStatus } from '../../components/pds.jsx';
import { api } from '../../lib/api.js';
import { timeAgo } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

// Admin home: four counts, what needs attention, the latest requests. Detailed numbers are folded away.
export default function Overview() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/admin/overview').then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  useLive(['pds', 'slots', 'moderation', 'users'], load);
  if (err) return <p className="text-problem">{err}</p>;
  if (!d) return <Spinner />;
  const { cards, slots, metrics } = d;

  const tiles = [
    { label: 'New requests', value: cards.new, icon: Inbox, to: '/admin/pds?status=submitted', color: 'text-signal bg-signal-50' },
    { label: 'In review', value: cards.in_review, icon: SearchCheck, to: '/admin/pds?status=under_review,need_info', color: 'text-idea bg-idea/10' },
    { label: 'Being built', value: cards.in_development + cards.approved + cards.in_queue, icon: Hammer, to: '/admin/pds?status=approved,queued,in_development,testing', color: 'text-other bg-other/10' },
    { label: 'Done', value: cards.delivered, icon: CheckCircle2, to: '/admin/pds?status=delivered,closed', color: 'text-automation bg-automation/10' },
  ];

  const stats = [
    { label: 'Average time to review', value: metrics.avg_review_hours != null ? `${metrics.avg_review_hours} hours` : '-', note: `Goal: under ${metrics.sla_hours} hours`, bad: metrics.avg_review_hours > metrics.sla_hours, icon: Clock },
    { label: 'Public requests with comments', value: metrics.community_input_pct != null ? `${metrics.community_input_pct}%` : '-', note: 'Goal: over 40%', bad: metrics.community_input_pct != null && metrics.community_input_pct < 40, icon: Users },
    { label: 'Users', value: metrics.users, note: `${metrics.users_from_qr} joined from a QR code`, icon: ScanLine },
    { label: 'Average rating', value: metrics.avg_rating != null ? `${metrics.avg_rating} / 5` : '-', note: 'From finished requests', icon: Star },
  ];
  const attention = d.overdue.length + (metrics.open_reports > 0 ? 1 : 0);

  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Home" subtitle="What needs you today." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to}>
            <Card className="h-full p-5 transition hover:border-signal/40">
              <span className={cx('grid size-10 place-items-center rounded-lg', t.color)}>
                <t.icon className="size-5" />
              </span>
              <p className="mt-3 text-3xl font-extrabold tracking-tight">{t.value}</p>
              <p className="text-sm font-medium text-muted">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="flex items-center gap-2 font-bold">
            <AlertTriangle className={cx('size-4', attention ? 'text-problem' : 'text-automation')} /> Needs attention
          </p>
          {attention ? (
            <ul className="mt-3 space-y-2">
              {metrics.open_reports > 0 && (
                <li>
                  <Link to="/admin/moderation" className="flex items-center gap-2 rounded-lg bg-problem/8 px-3 py-2.5 text-sm font-semibold text-problem hover:bg-problem/12">
                    <Flag className="size-4" /> {metrics.open_reports} reported comment{metrics.open_reports > 1 ? 's' : ''} to check
                  </Link>
                </li>
              )}
              {d.overdue.map((p) => (
                <li key={p.pds_code}>
                  <Link to={`/admin/pds/${p.pds_code}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-paper">
                    <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-problem">waiting {timeAgo(p.submitted_at).replace(' ago', '')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">All caught up. Nothing is waiting too long.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="font-bold">Latest requests</p>
            <Link to="/admin/pds" className="text-sm font-semibold text-signal-600 hover:underline">See all</Link>
          </div>
          <ul className="mt-3 space-y-1">
            {d.recent.map((p) => (
              <li key={p.code}>
                <Link to={`/admin/pds/${p.code}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-paper">
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.title}</span>
                  <PdsStatus status={p.status} booking={p.booking} />
                </Link>
              </li>
            ))}
            {!d.recent.length && <li className="py-3 text-sm text-muted">No requests yet.</li>}
          </ul>
        </Card>
      </div>

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <BarChart3 className="size-4" /> Show statistics <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4">
            <p className="text-xs font-semibold text-muted">Slots used this week</p>
            <p className="mt-1 text-2xl font-extrabold">{slots.busy} / {slots.capacity}</p>
            <p className="text-xs text-muted">{slots.free} free · {slots.blocked} blocked</p>
          </Card>
          {stats.map((s) => (
            <Card key={s.label} className="p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><s.icon className="size-3.5" /> {s.label}</p>
              <p className={cx('mt-1 text-2xl font-extrabold', s.bad && 'text-problem')}>{s.value}</p>
              <p className="text-xs text-muted">{s.note}</p>
            </Card>
          ))}
        </div>
      </details>
    </div>
  );
}
