import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Info, ListOrdered, Settings2 } from 'lucide-react';
import { PageHeader, isAdmin } from './Layout.jsx';
import { Alert, Button, Card, Field, Input, Modal, Select, Spinner, Textarea } from '../../components/ui.jsx';
import { SlotCalendar, SlotLegend } from '../../components/slots.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/context.jsx';
import { fmtDate, fmtWeekRange, teamName, weekName } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

const addWeeks = (w, n) => {
  const d = new Date(`${w}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return d.toISOString().slice(0, 10);
};

export default function Slots() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [from, setFrom] = useState(null);
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [cell, setCell] = useState(null);
  const [cap, setCap] = useState(null);
  const [boost, setBoost] = useState(null);

  const load = useCallback(() => {
    api(`/admin/slots?weeks=8${from ? `&from=${from}` : ''}`)
      .then((x) => {
        setD(x);
        setCap((c) => c ?? { parallel_slots: x.capacity.parallel_slots, hours_per_week: x.capacity.hours_per_week });
      })
      .catch((e) => setErr(e.message));
  }, [from]);
  useEffect(() => { load(); }, [load]);
  useLive(['slots', 'pds'], load);

  if (!d) return err ? <Alert>{err}</Alert> : <Spinner />;
  const start = from ?? d.current_week;

  const act = async (fn) => {
    setErr('');
    try {
      await fn();
      setCell(null);
      setBoost(null);
      load();
    } catch (e) {
      setErr(e.message);
    }
  };
  const saveCapacity = (e) => {
    e.preventDefault();
    act(() => api('/admin/slots/capacity', { method: 'PUT', body: cap }));
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title="Schedule"
        subtitle={`The team builds ${d.capacity.parallel_slots} project${d.capacity.parallel_slots > 1 ? 's' : ''} at the same time, ${d.capacity.hours_per_week} hours a week on each.`}
      />
      <Alert>{err}</Alert>

      <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-3 sm:p-5">
          <div className="mb-4 flex gap-3 border border-software/20 bg-software/5 p-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-software" />
            <div className="space-y-1">
              <p><b>Each row is one week</b> (Monday to Sunday).</p>
              <p>
                <b>Each column is one team.</b> A team builds one project at a time, so {d.lanes.length} team{d.lanes.length > 1 ? 's' : ''} = {d.lanes.length} project{d.lanes.length > 1 ? 's' : ''} side by side. A project takes as many weeks as its size, then that team starts the next one.
              </p>
              {admin && <p className="text-muted">Click a free box to start a project there or block the week. Click a booked project to move, swap or cancel it.</p>}
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setFrom(addWeeks(start, -4))} disabled={start <= d.current_week} aria-label="Earlier weeks">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFrom(null)}>This week</Button>
              <Button variant="outline" size="sm" onClick={() => setFrom(addWeeks(start, 4))} aria-label="Later weeks">
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <SlotLegend statuses={['available', 'booked', 'in_development', 'testing', 'completed', 'blocked']} />
          </div>
          <SlotCalendar weeks={d.weeks} lanes={d.lanes} currentWeek={d.current_week} onCell={admin ? (c, w) => setCell({ ...c, week: w.week_start, week_no: w.week_no }) : undefined} linkBase="/admin/pds/" />
        </Card>

        <div className="space-y-4">
          {admin && cap && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-bold"><Settings2 className="size-4 text-signal" /> Team capacity</h3>
              <p className="text-xs text-muted">Changing the number of teams adds or removes columns in the schedule.</p>
              <form onSubmit={saveCapacity} className="mt-3 grid grid-cols-2 gap-3">
                <Field label="Teams (projects at the same time)">
                  <Input type="number" min={1} max={10} value={cap.parallel_slots} onChange={(e) => setCap({ ...cap, parallel_slots: Number(e.target.value) })} />
                </Field>
                <Field label="Hours a week on each">
                  <Input type="number" min={1} max={80} value={cap.hours_per_week} onChange={(e) => setCap({ ...cap, hours_per_week: Number(e.target.value) })} />
                </Field>
                <Button className="col-span-2" variant="outline" disabled={cap.parallel_slots === d.capacity.parallel_slots && cap.hours_per_week === d.capacity.hours_per_week}>
                  Save capacity
                </Button>
              </form>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="flex items-center gap-2 font-bold"><ListOrdered className="size-4 text-signal" /> Approved - waiting for a slot</h3>
            <p className="text-xs text-muted">Approved before scheduling was done at approval. Click a free box to schedule one; use the arrow to move an urgent one up (you will be asked why).</p>
            <ol className="mt-3 divide-y divide-ink/6">
              {d.queue.waiting.map((q) => (
                <li key={q.code ?? q.position} className="py-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 font-mono text-lg font-semibold text-ink/30">{q.position}</span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/admin/pds/${q.code}`} className="block truncate font-semibold hover:text-signal-600">{q.title}</Link>
                      <p className="text-xs text-muted">
                        {q.size_weeks ? `${q.size_weeks} week${q.size_weeks > 1 ? 's' : ''}` : 'size not set'} · approved {fmtDate(q.approved_at, false)}
                      </p>
                      {q.estimate && <p className="text-xs font-semibold text-other">Likely {teamName(q.estimate.lane)}, {weekName(q.estimate.start_week, d.current_week).toLowerCase()} ({fmtWeekRange(q.estimate.start_week, q.estimate.end_week)})</p>}
                      {q.priority_boost > 0 && <p className="text-xs font-semibold text-signal-600">Priority +{q.priority_boost}: {q.priority_reason}</p>}
                    </div>
                    {admin && (
                      <div className="flex flex-col">
                        <button onClick={() => setBoost({ ...q, next: Math.min((q.priority_boost ?? 0) + 1, 10) })} className="p-1 text-muted hover:text-ink" aria-label="Raise priority"><ArrowUp className="size-4" /></button>
                        <button disabled={!q.priority_boost} onClick={() => act(() => api(`/admin/queue/${q.code}/priority`, { method: 'POST', body: { boost: 0 } }))} className="p-1 text-muted hover:text-ink disabled:opacity-30" aria-label="Reset priority"><ArrowDown className="size-4" /></button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {!d.queue.waiting.length && <li className="py-3 text-sm text-muted">No approved PDS are waiting.</li>}
            </ol>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold">Booked - starts later</h3>
            <ul className="mt-2 divide-y divide-ink/6">
              {d.queue.booked.map((b) => (
                <li key={b.booking_id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="whitespace-nowrap bg-other/10 px-1.5 py-0.5 text-xs font-bold text-other">{teamName(b.lane)}</span>
                  <Link to={`/admin/pds/${b.code}`} className="min-w-0 flex-1 truncate font-semibold hover:text-signal-600">{b.title}</Link>
                  <span className="text-xs text-muted">{fmtWeekRange(b.start_week, b.end_week)}</span>
                </li>
              ))}
              {!d.queue.booked.length && <li className="py-2.5 text-sm text-muted">No bookings waiting.</li>}
            </ul>
          </Card>
        </div>
      </div>

      <CellModal cell={cell} d={d} onClose={() => setCell(null)} act={act} />
      <ReasonModal
        open={!!boost}
        title={`Raise priority to +${boost?.next ?? 1}`}
        label="Why is this urgent? (recorded in the audit log)"
        onClose={() => setBoost(null)}
        onSubmit={(reason) => act(() => api(`/admin/queue/${boost.code}/priority`, { method: 'POST', body: { boost: boost.next, reason } }))}
      />
    </div>
  );
}

function ReasonModal({ open, title, label, onClose, onSubmit, button = 'Save' }) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Field label={label}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-20" autoFocus maxLength={300} />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(text.trim())} disabled={!text.trim()}>{button}</Button>
      </div>
    </Modal>
  );
}

/** Actions for one lane-week cell (SL-09). */
function CellModal({ cell, d, onClose, act }) {
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState('');
  useEffect(() => { setMode(null); setReason(''); setTarget(''); }, [cell]);
  if (!cell) return null;

  const weekOptions = Array.from({ length: 16 }, (_, i) => addWeeks(d.current_week, i));
  const bookedOthers = d.queue.booked.filter((b) => b.booking_id !== cell.booking_id);
  const assignable = d.queue.waiting.filter((q) => q.code && q.size_weeks);
  const title = `${teamName(cell.lane)} · ${weekName(cell.week, d.current_week)} (${fmtWeekRange(cell.week)})`;

  return (
    <Modal open onClose={onClose} title={title}>
      {cell.status === 'available' && (
        <div className="space-y-4">
          {assignable.length > 0 && (
            <div>
              <Field label="Start an approved PDS here">
                <div className="flex gap-2">
                  <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">Choose...</option>
                    {assignable.map((q) => <option key={q.code} value={q.code}>{q.title} ({q.size_weeks} wk)</option>)}
                  </Select>
                  <Button disabled={!target} onClick={() => act(() => api('/admin/slots/assign', { method: 'POST', body: { code: target, lane: cell.lane, start_week: cell.week } }))}>Assign</Button>
                </div>
              </Field>
            </div>
          )}
          <Field label="Or block this week (holiday, maintenance, leave)" hint="Bookings waiting in this slot are moved later and their owners are told why.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. Diwali holiday" maxLength={300} />
          </Field>
          <div className="flex justify-end">
            <Button variant="dark" disabled={!reason.trim()} onClick={() => act(() => api('/admin/slots/block', { method: 'POST', body: { lane: cell.lane, week_start: cell.week, reason } }))}>Block week</Button>
          </div>
        </div>
      )}

      {cell.status === 'blocked' && (
        <div>
          <p className="text-sm">Blocked: <b>{cell.reason}</b></p>
          <Button className="mt-4" variant="outline" onClick={() => act(() => api(`/admin/slots/block/${cell.id}`, { method: 'DELETE' }))}>Unblock</Button>
        </div>
      )}

      {cell.status === 'booked' && (
        <div className="space-y-4">
          <p className="text-sm">
            Booked for <Link to={`/admin/pds/${cell.pds?.code}`} className="font-semibold text-signal-600 hover:underline">{cell.pds?.title}</Link>
          </p>
          {!mode && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setMode('move')}>Move</Button>
              {bookedOthers.length > 0 && <Button variant="outline" onClick={() => setMode('swap')}>Swap with another</Button>}
              <Button variant="ghost" className="text-problem" onClick={() => setMode('cancel')}>Cancel booking</Button>
            </div>
          )}
          {mode === 'move' && (
            <Field label="New slot and start week">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose...</option>
                {d.lanes.flatMap((l) => weekOptions.map((w) => <option key={`${l}|${w}`} value={`${l}|${w}`}>{teamName(l)} · {fmtWeekRange(w)}</option>))}
              </Select>
            </Field>
          )}
          {mode === 'swap' && (
            <Field label="Swap places with">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="">Choose...</option>
                {bookedOthers.map((b) => <option key={b.booking_id} value={b.booking_id}>{b.title} · {teamName(b.lane)}, {fmtWeekRange(b.start_week)}</option>)}
              </Select>
            </Field>
          )}
          {mode && (
            <>
              <Field label="Reason (sent to the affected users)">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setMode(null)}>Back</Button>
                <Button
                  variant={mode === 'cancel' ? 'danger' : 'primary'}
                  disabled={!reason.trim() || (mode !== 'cancel' && !target)}
                  onClick={() =>
                    act(() => {
                      if (mode === 'cancel') return api('/admin/slots/cancel', { method: 'POST', body: { code: cell.pds.code, reason } });
                      if (mode === 'swap') return api('/admin/slots/swap', { method: 'POST', body: { a: cell.booking_id, b: Number(target), reason } });
                      const [lane, start_week] = target.split('|');
                      return api('/admin/slots/move', { method: 'POST', body: { booking_id: cell.booking_id, lane, start_week, reason } });
                    })
                  }
                >
                  {mode === 'cancel' ? 'Cancel booking' : mode === 'swap' ? 'Swap' : 'Move'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {['in_development', 'testing', 'completed'].includes(cell.status) && (
        <p className="text-sm">
          {cell.status === 'completed' ? 'Finished:' : 'Being built now:'}{' '}
          <Link to={`/admin/pds/${cell.pds?.code}`} className="font-semibold text-signal-600 hover:underline">{cell.pds?.title}</Link>.
          {cell.status !== 'completed' && ' Open it to update progress, move it to testing or mark it delivered - the slot frees up when it is delivered.'}
        </p>
      )}
    </Modal>
  );
}
