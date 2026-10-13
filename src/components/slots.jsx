import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';
import { cx } from './ui.jsx';
import { SLOT_STYLE, fmtWeekRange, teamName, weekName, weeksCount } from '../lib/format.js';

export function SlotLegend({ statuses = ['available', 'booked', 'in_development', 'testing', 'blocked'], dark }) {
  return (
    <div className={cx('flex flex-wrap gap-x-4 gap-y-1.5 text-xs', dark ? 'text-bone/60' : 'text-muted')}>
      {statuses.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className={cx('size-3 border', SLOT_STYLE[s].cell)} />
          {SLOT_STYLE[s].label}
        </span>
      ))}
    </div>
  );
}

// Weeks of one booking are drawn as a single block, so a 3-week project shows once instead of three times.
const blockKey = (c) => (c?.from && c?.to && !['available', 'blocked', 'closed'].includes(c.status) ? `${c.from}|${c.to}|${c.status}` : null);

function rowSpans(weeks, laneCount) {
  const span = weeks.map(() => Array(laneCount).fill(1));
  for (let li = 0; li < laneCount; li++) {
    let start = 0;
    for (let wi = 1; wi < weeks.length; wi++) {
      const k = blockKey(weeks[wi].cells[li]);
      if (k && k === blockKey(weeks[start].cells[li])) {
        span[start][li]++;
        span[wi][li] = 0;
      } else start = wi;
    }
  }
  return span;
}

/**
 * Weekly slot calendar (PRD §10.2): one row per week, one column per slot. The team builds one project
 * per slot at a time, so the columns are the projects running side by side.
 * `linkBase` makes project names clickable; `onCell` turns boxes into buttons (admin schedule).
 */
export function SlotCalendar({ weeks, lanes, linkBase = '/pds/', onCell, selected, compact, currentWeek, dark }) {
  const now = currentWeek ?? weeks[0]?.week_start;
  const span = rowSpans(weeks, lanes.length);
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-separate border-spacing-1 text-left text-sm" style={{ minWidth: 104 + lanes.length * 104 }}>
        <thead>
          <tr className={cx('text-xs font-semibold uppercase tracking-wide', dark ? 'text-bone/50' : 'text-muted')}>
            <th className="w-[104px] px-2 py-1 font-semibold sm:w-36">Week</th>
            {lanes.map((l) => (
              <th key={l} className="px-2 py-1 font-semibold">{teamName(l)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, wi) => {
            const isNow = w.week_start === now;
            return (
              <tr key={w.week_start}>
                <td className={cx('px-2 py-2 align-top', dark ? 'text-bone' : '')}>
                  <p className={cx('font-bold', isNow && 'text-signal')}>{weekName(w.week_start, now)}</p>
                  <p className={cx('text-xs', dark ? 'text-bone/50' : 'text-muted')}>{fmtWeekRange(w.week_start)}</p>
                </td>
                {w.cells.map((c, li) => {
                  const rows = span[wi][li];
                  if (!rows) return null;
                  const st = SLOT_STYLE[c.status] ?? SLOT_STYLE.available;
                  const isSel = selected && selected.lane === c.lane && selected.week === w.week_start;
                  const size = c.from && c.to ? weeksCount(c.from, c.to) : null;
                  const body = c.pds || blockKey(c) ? (
                    <>
                      {c.pds && (
                        <p className="line-clamp-2 font-semibold leading-snug">
                          {c.pds.code && linkBase && !onCell ? (
                            <Link to={`${linkBase}${c.pds.code}`} className="hover:underline">
                              {c.pds.title}
                            </Link>
                          ) : (
                            c.pds.title
                          )}
                        </p>
                      )}
                      <p className={cx('text-[11px] opacity-80', c.pds ? 'mt-0.5' : 'font-semibold')}>
                        {st.label}
                        {c.pds?.mine ? ' · yours' : ''}
                      </p>
                      {size && (
                        <p className="text-[11px] opacity-80">
                          {fmtWeekRange(c.from, c.to)} · {size} week{size > 1 ? 's' : ''}
                        </p>
                      )}
                      {c.progress != null && (
                        <>
                          <span className="mt-1.5 block h-1 bg-bone/20">
                            <span className="block h-full bg-signal-400" style={{ width: `${c.progress}%` }} />
                          </span>
                          <p className="mt-0.5 text-[11px] opacity-80">{c.progress}% done</p>
                        </>
                      )}
                    </>
                  ) : c.status === 'blocked' ? (
                    <p className="flex items-center gap-1 text-xs font-semibold">
                      <Ban className="size-3.5 shrink-0" /> {c.reason || 'Blocked'}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold">
                      {st.label}
                      {onCell && c.status === 'available' && <span className="hidden font-normal opacity-0 transition group-hover:opacity-70 sm:block">Click to assign or block</span>}
                    </p>
                  );
                  const cls = cx('group flex h-full min-h-14 w-full flex-col items-stretch justify-start border px-2.5 py-2 text-left transition', st.cell, isSel && 'outline-2 outline-offset-1 outline-signal', compact && 'min-h-9 py-1.5');
                  return (
                    <td key={c.lane} rowSpan={rows} className="h-px p-0 align-top">
                      {onCell ? (
                        <button type="button" onClick={() => onCell(c, w)} className={cx(cls, 'hover:brightness-95 focus-visible:outline-2')}>
                          {body}
                        </button>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
