import { Link } from 'react-router-dom';
import { ArrowBigUp, CalendarClock, Lock, MessageSquare } from 'lucide-react';
import { StatusBadge, TypeBadge, cx } from './ui.jsx';
import { useConfig } from '../lib/context.jsx';
import { fmtWeekRange, statusLabel, timeAgo } from '../lib/format.js';

export function PdsStatus({ status, booking, className }) {
  const { config } = useConfig();
  return <StatusBadge status={status} label={statusLabel(config, status, booking)} className={className} />;
}

export function PdsType({ type }) {
  const { config } = useConfig();
  return <TypeBadge type={type} label={config?.types.find((t) => t.key === type)?.label} />;
}

export const PrivateTag = () => (
  <span className="inline-flex items-center gap-1 bg-ink/6 px-2 py-0.5 text-xs font-semibold text-muted">
    <Lock className="size-3" /> Private
  </span>
);

/** Community board card (CD-01): title, type, short problem, display name, date, status, comments, upvotes. */
export function PdsCard({ p, onUpvote, to = `/pds/${p.code}` }) {
  return (
    <article className="group flex h-full flex-col border border-ink/8 bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-ink/20">
      <div className="flex flex-wrap items-center gap-2">
        <PdsType type={p.type} />
        <PdsStatus status={p.status} booking={p.booking} />
        {p.visibility === 'private' && <PrivateTag />}
      </div>
      <Link to={to} className="mt-3 block">
        <h3 className="text-lg font-bold leading-snug group-hover:text-signal-600">{p.title}</h3>
        <p className="mt-1.5 line-clamp-3 text-sm text-muted">{p.problem_short}</p>
      </Link>
      {p.status === 'in_development' && p.progress > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-ink/8">
            <div className="h-full bg-signal" style={{ width: `${p.progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">{p.progress}% done</p>
        </div>
      )}
      {p.booking && ['booked', 'in_development', 'testing'].includes(p.booking.status) && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-other">
          <CalendarClock className="size-3.5" /> {fmtWeekRange(p.booking.start_week, p.booking.end_week)}
        </p>
      )}
      <div className="mt-auto flex items-center gap-3 pt-4 text-sm text-muted">
        <span className="min-w-0 flex-1 truncate">
          <b className="font-semibold text-ink">{p.is_mine ? 'You' : p.author}</b> · {timeAgo(p.submitted_at || p.created_at)}
        </span>
        <span className="inline-flex items-center gap-1" title="Comments">
          <MessageSquare className="size-4" /> {p.comments}
        </span>
        {onUpvote ? (
          <button
            onClick={() => onUpvote(p)}
            disabled={p.is_mine}
            aria-pressed={!!p.upvoted}
            title={p.is_mine ? 'Your own PDS' : 'I have this problem too'}
            className={cx('inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 font-semibold transition disabled:opacity-50', p.upvoted ? 'border-signal bg-signal-50 text-signal-600' : 'border-ink/10 hover:border-ink/30')}
          >
            <ArrowBigUp className={cx('size-4', p.upvoted && 'fill-current')} /> {p.upvotes}
          </button>
        ) : (
          <span className="inline-flex items-center gap-0.5" title="Upvotes">
            <ArrowBigUp className="size-4" /> {p.upvotes}
          </span>
        )}
      </div>
    </article>
  );
}

export function SectionTitle({ icon: Icon, title, subtitle, action, className }) {
  return (
    <div className={cx('mb-4 flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="flex items-center gap-2 text-xl font-black tracking-tight">
          {Icon && <Icon className="size-5 text-signal" />} {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
