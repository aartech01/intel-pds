import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarRange, ChevronDown, FolderKanban, Hammer, Plus, ShieldCheck, Users } from 'lucide-react';
import { Card, Empty, Spinner } from '../../components/ui.jsx';
import { PdsCard, PdsStatus, SectionTitle } from '../../components/pds.jsx';
import { SlotCalendar, SlotLegend } from '../../components/slots.jsx';
import { api } from '../../lib/api.js';
import { canSharePds, useAuth } from '../../lib/context.jsx';
import { fmtDay } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

/** What the user has to do next on each of their PDS. */
export function actionFor(p) {
  if (p.status === 'need_info') return { text: 'The team asked you a question', cta: 'Answer' };
  if (p.status === 'delivered') return { text: 'Delivered - please confirm and rate', cta: 'Confirm' };
  if (p.status === 'draft') return { text: 'Draft - not submitted yet', cta: 'Continue' };
  return null;
}

const pdsLink = (p) => (p.status === 'draft' ? `/pds/${p.code}/edit` : `/pds/${p.code}`);

// Simple home page: one main action, what needs you, your PDS, what the team is building, and a few community posts.
export default function Dashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState('');

  const load = () => {
    api('/dashboard').then(setD).catch((e) => setErr(e.message));
    api('/board?sort=newest').then(setBoard).catch(() => {});
  };
  useEffect(load, []);
  useLive(['pds', 'slots', 'notifications'], load);

  if (err) return <p className="text-problem">{err}</p>;
  if (!d) return <Spinner />;
  const todo = d.mine.filter(actionFor);
  const upNext = d.up_next.filter((q) => q.code).slice(0, 3);

  return (
    <div className="animate-rise space-y-10">
      {/* Main action */}
      <Card className="graph-paper flex flex-col gap-4 border-ink bg-ink! p-6 text-bone sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Hi {user.display_name}</h1>
          <p className="mt-1 text-bone/70">{canSharePds(user) ? 'Have a problem or an idea? Tell the team in about 2 minutes.' : 'You review and manage requests from the admin panel.'}</p>
        </div>
        {canSharePds(user) ? (
          <Link to="/pds/new" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-signal px-6 font-bold text-white shadow-glow hover:bg-signal-600">
            <Plus className="size-5" /> Share a problem
          </Link>
        ) : (
          <Link to="/admin" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-signal px-6 font-bold text-white shadow-glow hover:bg-signal-600">
            <ShieldCheck className="size-5" /> Open the admin panel
          </Link>
        )}
      </Card>

      {/* Needs your action */}
      {todo.length > 0 && (
        <section>
          <SectionTitle icon={AlertCircle} title="Needs your action" />
          <div className="space-y-2">
            {todo.map((p) => {
              const a = actionFor(p);
              return (
                <Link key={p.code} to={pdsLink(p)} className="flex items-center gap-3 border-l-4 border-signal bg-white px-4 py-3 shadow-card transition hover:translate-x-0.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.title}</p>
                    <p className="text-sm text-muted">{a.text}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-signal px-3 py-1.5 text-sm font-bold text-white">
                    {a.cta} <ArrowRight className="size-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* My PDS */}
      <section>
        <SectionTitle
          icon={FolderKanban}
          title="My PDS"
          action={d.mine.length > 0 && <Link to="/my" className="inline-flex items-center gap-1 text-sm font-bold text-signal-600 hover:underline">See all <ArrowRight className="size-4" /></Link>}
        />
        {d.mine.length ? (
          <Card className="divide-y divide-ink/6">
            {d.mine.slice(0, 5).map((p) => (
              <Link key={p.code} to={pdsLink(p)} className="flex items-center gap-3 px-4 py-3.5 first:rounded-t-xl last:rounded-b-xl hover:bg-paper">
                <p className="min-w-0 flex-1 truncate font-semibold">{p.title}</p>
                <PdsStatus status={p.status} booking={p.booking} />
              </Link>
            ))}
          </Card>
        ) : (
          <Card>
            <Empty icon={FolderKanban} title="You have not shared anything yet">
              {canSharePds(user) && <><Link to="/pds/new" className="font-semibold text-signal-600 hover:underline">Share your first problem</Link> - it takes about 2 minutes.</>}
            </Empty>
          </Card>
        )}
      </section>

      {/* What the team is building */}
      <section>
        <SectionTitle icon={Hammer} title="What the team is building" />
        <Card className="divide-y divide-ink/6">
          {d.now.map((n) => (
            <div key={`now-${n.lane}`} className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {n.code ? <Link to={`/pds/${n.code}`} className="hover:text-signal-600">{n.title}</Link> : n.title}
                  {n.mine && <span className="ml-2 text-xs font-bold text-signal-600">Yours</span>}
                </p>
                <span className="text-sm font-bold text-signal-600">{n.progress}%</span>
              </div>
              <div className="mt-2 h-2 bg-ink/8">
                <div className="h-full bg-signal transition-all" style={{ width: `${n.progress}%` }} />
              </div>
            </div>
          ))}
          {upNext.map((q) => (
            <div key={`next-${q.code}`} className="flex items-center gap-3 px-4 py-3.5">
              <p className="min-w-0 flex-1 truncate">
                <Link to={`/pds/${q.code}`} className="font-semibold hover:text-signal-600">{q.title}</Link>
                {q.mine && <span className="ml-2 text-xs font-bold text-signal-600">Yours</span>}
              </p>
              <span className="shrink-0 text-sm text-muted">
                Starts {q.kind === 'booked' ? fmtDay(q.start_week) : q.estimate ? `about ${fmtDay(q.estimate.start_week)}` : 'soon'}
              </span>
            </div>
          ))}
          {!d.now.length && !upNext.length && <Empty icon={Hammer} title="Nothing in progress right now" />}
        </Card>
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <CalendarRange className="size-4" /> Show the slot calendar <ChevronDown className="size-4 transition group-open:rotate-180" />
          </summary>
          <Card className="mt-3 p-3 sm:p-4">
            <div className="mb-3"><SlotLegend /></div>
            <SlotCalendar weeks={d.calendar.weeks} lanes={d.calendar.lanes} />
          </Card>
        </details>
      </section>

      {/* Community */}
      <section>
        <SectionTitle
          icon={Users}
          title="From the community"
          action={<Link to="/community" className="inline-flex items-center gap-1 text-sm font-bold text-signal-600 hover:underline">See all <ArrowRight className="size-4" /></Link>}
        />
        {board ? (
          board.rows.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {board.rows.slice(0, 3).map((p) => <PdsCard key={p.code} p={p} />)}
            </div>
          ) : (
            <Card><Empty icon={Users} title="No public PDS yet">Be the first to share one.</Empty></Card>
          )
        ) : (
          <Spinner />
        )}
      </section>
    </div>
  );
}
