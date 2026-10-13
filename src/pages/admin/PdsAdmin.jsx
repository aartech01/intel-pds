import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarCheck, Check, ExternalLink, FileText, Hammer, ListChecks, Lock, Mail, MessageCircleQuestion, PackageCheck, Phone, Plus, SearchCheck, StickyNote, ThumbsUp, Trash2, TrendingUp, XCircle,
} from 'lucide-react';
import { Alert, Button, Card, ConfirmModal, Field, Input, Modal, RichText, Select, Spinner, Textarea, cx } from '../../components/ui.jsx';
import { PdsStatus, PdsType, PrivateTag } from '../../components/pds.jsx';
import { Comments } from '../../components/comments.jsx';
import { api } from '../../lib/api.js';
import { useConfig } from '../../lib/context.jsx';
import { fmtBytes, fmtDate, fmtWeekRange, teamName, timeAgo, weekName } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function PdsAdmin() {
  const { code } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const [modal, setModal] = useState(null); // approve | ask | reject | cancel | delete
  const load = useCallback(() => api(`/admin/pds/${code}`).then((x) => { setD(x); setErr(''); }).catch((e) => { setErr(e.message); if (e.status === 404) setD(null); }), [code]);
  useEffect(() => { load(); }, [load]);
  useLive([`pds:${code}`, 'slots'], load);

  if (!d) return err ? <Alert>{err}</Alert> : <Spinner />;
  const { pds: p, owner, can } = d;

  const run = async (fn) => {
    setErr('');
    try {
      await fn();
      setModal(null);
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };
  const setStatus = (status, note) => run(() => api(`/admin/pds/${code}/status`, { method: 'POST', body: { status, note } }));
  const addRequirement = (c) => api(`/admin/pds/${code}/requirements`, { method: 'POST', body: { comment_id: c.id } }).then(load);

  return (
    <div className="animate-rise">
      <Link to="/admin/pds" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All requests
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-muted">{p.code}</span>
        <PdsType type={p.type} />
        <PdsStatus status={p.status} booking={d.booking} />
        {p.visibility === 'private' && <PrivateTag />}
        <span className={cx('text-xs font-semibold', p.urgency === 'High' ? 'text-problem' : 'text-muted')}>Urgency: {p.urgency}</span>
        {p.visibility === 'public' && (
          <Link to={`/pds/${p.code}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-signal-600 hover:underline">
            Public view <ExternalLink className="size-3.5" />
          </Link>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight">{p.title}</h1>
      <p className="mt-1 text-sm text-muted">
        Submitted {fmtDate(p.submitted_at)} · {p.upvotes} upvotes · {p.comments} comments
      </p>
      <div className="mt-3"><Alert>{err}</Alert></div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Card className="p-5 sm:p-7">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Problem statement</h2>
            <RichText text={p.problem_statement} className="mt-2 text-[15px] leading-relaxed" />
            {p.expected_result && (
              <>
                <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted">Expected result</h2>
                <RichText text={p.expected_result} className="mt-2 text-[15px] leading-relaxed" />
              </>
            )}
            {d.attachments.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {d.attachments.map((a) => (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-ink/10 bg-paper px-3 py-2 text-sm font-semibold hover:border-ink/30">
                    <FileText className="size-4 text-muted" /> {a.file_name} <span className="font-normal text-muted">{fmtBytes(a.size)}</span>
                  </a>
                ))}
              </div>
            )}
            {p.status_reason && <p className="mt-6 border-l-2 border-idea bg-idea/10 px-3 py-2 text-sm"><b>Last note to user:</b> {p.status_reason}</p>}
            {p.rating && <p className="mt-4 text-sm"><b>Rating:</b> {p.rating}/5 {p.feedback && `- "${p.feedback}"`}</p>}
          </Card>

          <Requirements d={d} code={code} reload={load} />

          <Card className="p-5 sm:p-7">
            <Comments code={code} comments={d.comments} onChange={() => load()} onReload={load} staff={can.admin} onRequirement={can.admin ? addRequirement : null} can={{ comment: true, mark_useful: false }} />
          </Card>
        </div>

        <aside className="space-y-4">
          {/* Review actions (AD-05) */}
          <Card className="p-5">
            <h3 className="font-bold">Actions</h3>
            <div className="mt-3 grid gap-2">
              {can.admin && p.status === 'submitted' && (
                <Button variant="dark" onClick={() => setStatus('under_review')}><SearchCheck className="size-4" /> Start review</Button>
              )}
              {can.admin && ['submitted', 'under_review', 'need_info'].includes(p.status) && (
                <>
                  <Button onClick={() => setModal('approve')}><ThumbsUp className="size-4" /> Approve</Button>
                  <Button variant="outline" onClick={() => setModal('ask')}><MessageCircleQuestion className="size-4" /> Ask the user a question</Button>
                  <Button variant="ghost" className="text-problem" onClick={() => setModal('reject')}><XCircle className="size-4" /> Reject</Button>
                </>
              )}
              {can.admin && ['approved', 'queued'].includes(p.status) && d.booking?.status === 'booked' && (
                <>
                  <Button variant="dark" onClick={() => setStatus('in_development')}><Hammer className="size-4" /> Start development now</Button>
                  <Button variant="ghost" className="text-problem" onClick={() => setModal('cancel')}>Cancel booking</Button>
                </>
              )}
              {p.status === 'in_development' && (can.admin || can.progress) && (
                <Button variant="dark" onClick={() => setStatus('testing')}><SearchCheck className="size-4" /> Move to testing</Button>
              )}
              {can.admin && ['in_development', 'testing'].includes(p.status) && (
                <Button onClick={() => setStatus('delivered')}><PackageCheck className="size-4" /> Mark delivered</Button>
              )}
              {p.status === 'delivered' && <p className="text-sm text-muted">Waiting for the user to confirm and rate. Closes automatically after 7 days.</p>}
              {['closed', 'rejected', 'withdrawn'].includes(p.status) && <p className="text-sm text-muted">This PDS is finished.</p>}
              {can.admin && (
                <Button variant="ghost" className="mt-2 border-t border-ink/8 text-problem" onClick={() => setModal('delete')}><Trash2 className="size-4" /> Delete this PDS</Button>
              )}
            </div>
          </Card>

          {/* Slot */}
          {(p.size_weeks || d.booking) && <SlotCard d={d} code={code} reload={load} setErr={setErr} />}

          {/* Assignment + size (AD-04) */}
          {can.admin && <AssignCard d={d} code={code} reload={load} setErr={setErr} />}

          {['in_development', 'testing'].includes(p.status) && can.progress && <ProgressCard code={code} current={p.progress} reload={load} progress={d.progress} />}

          {/* Owner (AD-09: contact details only for admins) */}
          <Card className="p-5">
            <h3 className="font-bold">Submitted by</h3>
            <p className="mt-2 font-semibold">{owner.display_name}{owner.full_name && <span className="font-normal text-muted"> · {owner.full_name}</span>}</p>
            {owner.email && <p className="mt-1 flex items-center gap-2 text-sm"><Mail className="size-4 text-muted" /> <a href={`mailto:${owner.email}`} className="hover:underline">{owner.email}</a></p>}
            {owner.phone && <p className="mt-1 flex items-center gap-2 text-sm"><Phone className="size-4 text-muted" /> <a href={`tel:${owner.phone}`} className="hover:underline">{owner.phone}</a></p>}
            {!owner.email && !owner.full_name && <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Lock className="size-3" /> Contact details are shown to admins only</p>}
            <p className="mt-2 text-xs text-muted">{owner.open_pds} open PDS{owner.is_blocked && ' · BLOCKED'}</p>
          </Card>

          <NotesCard notes={d.notes} code={code} reload={load} />

          <Card className="p-5">
            <h3 className="font-bold">History</h3>
            <ol className="mt-3 space-y-2.5 border-l border-ink/10 pl-4">
              {d.timeline.map((t, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 bg-signal" />
                  <p className="font-semibold">{t.label}</p>
                  {t.note && <p className="text-muted">{t.note}</p>}
                  <p className="text-xs text-muted">{fmtDate(t.created_at)} · {t.by_name ?? t.actor}</p>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>

      <ApproveModal open={modal === 'approve'} onClose={() => setModal(null)} onSubmit={(size, note, lane, start_week) => run(() => api(`/admin/pds/${code}/approve`, { method: 'POST', body: { size_weeks: size, lane, start_week, note } }))} />
      <TextModal open={modal === 'ask'} onClose={() => setModal(null)} title="Ask the user a question" label="Question" hint="Posted as a Team comment and sent to the user. Status becomes Need More Info." button="Send question" onSubmit={(t) => setStatus('need_info', t)} />
      <TextModal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject this PDS" label="Reason (shown to the user)" button="Reject" danger onSubmit={(t) => setStatus('rejected', t)} />
      <ConfirmModal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        title={`Delete ${p.code}?`}
        confirmLabel="Delete PDS"
        onConfirm={async () => {
          await api(`/admin/pds/${code}`, { method: 'DELETE' });
          nav('/admin/pds', { replace: true });
        }}
      >
        &quot;{p.title}&quot; will be removed with all its comments, upvotes, files and its slot booking. {owner.display_name} gets a notification.
        {['in_development', 'testing'].includes(p.status) && ' Work on it is in progress - it stops now and the next project in the queue takes its slot.'}
      </ConfirmModal>
      <TextModal open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancel the booking" label="Reason (sent to the user)" button="Cancel booking" danger onSubmit={(t) => run(() => api('/admin/slots/cancel', { method: 'POST', body: { code, reason: t } }))} />
    </div>
  );
}

function ApproveModal({ open, onClose, onSubmit }) {
  const { config } = useConfig();
  const [size, setSize] = useState('2');
  const [note, setNote] = useState('');
  const [opts, setOpts] = useState(null);
  const [pick, setPick] = useState('');
  const n = Number(size);
  // Free start weeks for this size; the earliest is pre-selected.
  useEffect(() => {
    if (!open || !(n >= 1)) return;
    let live = true;
    setOpts(null);
    api(`/admin/slots/options?size=${n}`)
      .then((d) => {
        if (!live) return;
        setOpts(d.options);
        setPick(d.options[0] ? `${d.options[0].lane}|${d.options[0].start_week}` : '');
      })
      .catch(() => live && setOpts([]));
    return () => { live = false; };
  }, [open, n]);
  const [lane, start] = pick.split('|');
  return (
    <Modal open={open} onClose={onClose} title="Approve and schedule">
      <p className="text-sm text-muted">Set the size and when the team starts. The user sees the dates straight away.</p>
      <Field label="Size in weeks" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 6, 8].map((n) => (
            <button key={n} type="button" onClick={() => setSize(String(n))} className={cx('h-11 min-w-12 border px-3 font-semibold', size === String(n) ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white')}>
              {n}
            </button>
          ))}
          <Input type="number" min={1} max={config?.limits.maxSizeWeeks ?? 12} value={size} onChange={(e) => setSize(e.target.value)} className="w-24" aria-label="Custom size" />
        </div>
      </Field>
      <Field label="When does the team start?" hint="The earliest free start is selected. Each team builds one project at a time." className="mt-4">
        {!opts ? (
          <Spinner className="py-3" />
        ) : !opts.length ? (
          <p className="text-sm text-problem">No free start in the next 12 weeks for this size. Free up the Schedule first.</p>
        ) : (
          <Select value={pick} onChange={(e) => setPick(e.target.value)}>
            {opts.map((o) => (
              <option key={`${o.lane}|${o.start_week}`} value={`${o.lane}|${o.start_week}`}>
                {weekName(o.start_week)} · {fmtWeekRange(o.start_week, o.end_week)} · {teamName(o.lane)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Note to the user (optional)" className="mt-4">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSubmit(n, note, lane, start)} disabled={!(n >= 1) || !pick}><ThumbsUp className="size-4" /> Approve and schedule</Button>
      </div>
    </Modal>
  );
}

function TextModal({ open, onClose, title, label, hint, button, danger, onSubmit }) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <Field label={label} hint={hint}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-28" autoFocus maxLength={1000} />
      </Field>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Back</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => onSubmit(text.trim())} disabled={!text.trim()}>{button}</Button>
      </div>
    </Modal>
  );
}

function SlotCard({ d, code, reload, setErr }) {
  const { pds: p, booking, options, estimate, can } = d;
  const [pick, setPick] = useState('');
  const active = booking && ['booked', 'in_development', 'testing'].includes(booking.status);
  const assign = async () => {
    const [lane, start_week] = pick.split('|');
    try {
      await api('/admin/slots/assign', { method: 'POST', body: { code, lane, start_week } });
      setPick('');
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold"><CalendarCheck className="size-4 text-signal" /> Development slot</h3>
      <p className="mt-1 text-sm text-muted">Size: <b className="text-ink">{p.size_weeks ?? '-'} week{p.size_weeks > 1 ? 's' : ''}</b></p>
      {active ? (
        <div className="mt-3 bg-paper p-3">
          <p className="font-bold">{teamName(booking.lane)} · {fmtWeekRange(booking.start_week, booking.end_week)}</p>
          <p className="text-xs text-muted">{booking.status === 'booked' ? 'Starts' : 'Started'} {weekName(booking.start_week).toLowerCase()} · {booking.status.replace('_', ' ')} · booked by {booking.booked_by}</p>
        </div>
      ) : booking?.status === 'completed' ? (
        <p className="mt-2 text-sm">Completed by {teamName(booking.lane)} ({fmtWeekRange(booking.start_week, booking.end_week)}).</p>
      ) : p.status === 'approved' ? (
        <>
          <p className="mt-2 text-sm">Not scheduled yet - pick when the team starts.</p>
          {estimate && <p className="text-xs text-muted">Next free: {teamName(estimate.lane)}, {fmtWeekRange(estimate.start_week, estimate.end_week)}</p>}
        </>
      ) : null}
      {can.admin && options.length > 0 && (
        <div className="mt-3 flex gap-2">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Assign a slot">
            <option value="">Assign a slot...</option>
            {options.map((o) => (
              <option key={`${o.lane}|${o.start_week}`} value={`${o.lane}|${o.start_week}`}>
                {teamName(o.lane)} · {fmtWeekRange(o.start_week, o.end_week)}
              </option>
            ))}
          </Select>
          <Button onClick={assign} disabled={!pick}>Assign</Button>
        </div>
      )}
      <Link to="/admin/slots" className="mt-3 inline-block text-sm font-semibold text-signal-600 hover:underline">Open slot manager</Link>
    </Card>
  );
}

function AssignCard({ d, code, reload, setErr }) {
  const { pds: p, team, booking } = d;
  const [size, setSize] = useState(p.size_weeks ?? '');
  const patch = async (body) => {
    try {
      await api(`/admin/pds/${code}`, { method: 'PATCH', body });
      reload();
    } catch (e) {
      setErr(e.message);
    }
  };
  return (
    <Card className="space-y-4 p-5">
      <Field label="Assigned team member">
        <Select value={p.assigned_to ?? ''} onChange={(e) => patch({ assigned_to: e.target.value || null })}>
          <option value="">Nobody</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </Select>
      </Field>
      {p.size_weeks && !['booked', 'in_development', 'testing'].includes(booking?.status) && (
        <Field label="Size in weeks">
          <div className="flex gap-2">
            <Input type="number" min={1} max={12} value={size} onChange={(e) => setSize(e.target.value)} />
            <Button variant="outline" onClick={() => patch({ size_weeks: Number(size) })} disabled={Number(size) === p.size_weeks}>Save</Button>
          </div>
        </Field>
      )}
    </Card>
  );
}

function ProgressCard({ code, current, reload, progress }) {
  const [percent, setPercent] = useState(current);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/pds/${code}/progress`, { method: 'POST', body: { percent, note } });
      setNote('');
      reload();
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold"><TrendingUp className="size-4 text-signal" /> Progress update</h3>
      <form onSubmit={save} className="mt-3 space-y-3">
        <div className="flex items-center gap-3">
          <input type="range" min={0} max={100} step={5} value={percent} onChange={(e) => setPercent(Number(e.target.value))} className="flex-1 accent-signal" aria-label="Percent done" />
          <span className="w-12 text-right font-mono font-semibold">{percent}%</span>
        </div>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Short note, e.g. Report layout done" maxLength={300} />
        {err && <p className="text-sm text-problem">{err}</p>}
        <Button size="sm">Post update (user is notified)</Button>
      </form>
      {progress.length > 0 && <p className="mt-3 text-xs text-muted">Last: {progress[0].percent}% {timeAgo(progress[0].created_at)}</p>}
    </Card>
  );
}

function NotesCard({ notes, code, reload }) {
  const [text, setText] = useState('');
  const add = async (e) => {
    e.preventDefault();
    await api(`/admin/pds/${code}/notes`, { method: 'POST', body: { text } });
    setText('');
    reload();
  };
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold"><StickyNote className="size-4 text-idea" /> Internal notes</h3>
      <p className="text-xs text-muted">Team only - never shown to users.</p>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a note" maxLength={2000} />
        <Button size="sm" className="h-11" disabled={!text.trim()}><Plus className="size-4" /></Button>
      </form>
      <ul className="mt-3 space-y-2.5">
        {notes.map((n) => (
          <li key={n.id} className="bg-idea/8 px-3 py-2 text-sm">
            <RichText text={n.text} />
            <p className="mt-1 text-xs text-muted">{n.by_name} · {timeAgo(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Requirements({ d, code, reload }) {
  const [text, setText] = useState('');
  const add = async (e) => {
    e.preventDefault();
    await api(`/admin/pds/${code}/requirements`, { method: 'POST', body: { text } });
    setText('');
    reload();
  };
  const remove = async (id) => {
    await api(`/admin/requirements/${id}`, { method: 'DELETE' });
    reload();
  };
  return (
    <Card className="p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-lg font-black"><ListChecks className="size-5 text-signal" /> Requirement list</h2>
      <p className="text-sm text-muted">Collected from useful comments (use &quot;Add to requirements&quot; on a comment) or added here. Visible to the user.</p>
      <ul className="mt-3 space-y-1.5">
        {d.requirements.map((r) => (
          <li key={r.id} className="group flex items-start gap-2 text-[15px]">
            <Check className="mt-1 size-4 shrink-0 text-automation" />
            <span className="flex-1">{r.text}{r.comment_id && <a href={`#c${r.comment_id}`} className="ml-2 text-xs text-muted hover:underline">from comment</a>}</span>
            {d.can.admin && (
              <button onClick={() => remove(r.id)} className="p-1 text-muted opacity-0 hover:text-problem group-hover:opacity-100" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
        {!d.requirements.length && <li className="text-sm text-muted">Nothing yet.</li>}
      </ul>
      {d.can.admin && (
        <form onSubmit={add} className="mt-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a requirement" maxLength={1000} />
          <Button variant="outline" className="h-11" disabled={!text.trim()}>Add</Button>
        </form>
      )}
    </Card>
  );
}
