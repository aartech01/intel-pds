import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowBigUp, ArrowLeft, CalendarClock, Check, CircleCheck, FileText, Globe2, Lock, MessageCircleQuestion, Pencil, Send, Star, Trash2, Undo2, XCircle,
} from 'lucide-react';
import { Alert, Button, Card, DetailSkeleton, Field, Modal, RichText, Textarea, cx } from '../../components/ui.jsx';
import { PdsStatus, PdsType, PrivateTag } from '../../components/pds.jsx';
import { Comments } from '../../components/comments.jsx';
import { api } from '../../lib/api.js';
import { fmtBytes, fmtDate, fmtWeekRange, timeAgo, weekName } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function PdsView() {
  const { code } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [flash, setFlash] = useState(loc.state?.justSubmitted ? 'submitted' : '');

  // A 404 after a live refresh means the PDS was deleted: drop the stale copy so the message shows.
  const load = useCallback(() => api(`/pds/${code}`).then(setD).catch((e) => { setErr(e.message); if (e.status === 404) setD(null); }), [code]);
  useEffect(() => { load(); }, [load]);
  useLive([`pds:${code}`, 'slots'], load);
  // Jump to a linked comment once - not again on every live refresh while the reader scrolls.
  const scrolledTo = useRef('');
  const ready = !!d;
  useEffect(() => {
    if (!ready || !loc.hash || scrolledTo.current === loc.hash) return;
    scrolledTo.current = loc.hash;
    const t = setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    return () => clearTimeout(t);
  }, [ready, loc.hash]);

  if (err && !d) return <Card className="p-8 text-center"><p className="font-semibold">{err}</p><Link to="/community" className="mt-3 inline-block text-signal-600 hover:underline">Back to the community board</Link></Card>;
  if (!d) return <DetailSkeleton />;
  const { pds: p, can } = d;
  const mine = p.is_mine;

  const run = async (fn, after) => {
    setErr('');
    try {
      await fn();
      after?.();
      await load();
    } catch (e) {
      setErr(e.message);
    }
  };

  // Instant feedback: flip the vote on screen first, then confirm with the server (undo on failure).
  const upvote = async () => {
    const was = d.upvoted;
    setErr('');
    setD((x) => ({ ...x, upvoted: !was, pds: { ...x.pds, upvotes: x.pds.upvotes + (was ? -1 : 1) } }));
    try {
      const r = await api(`/pds/${code}/upvote`, { method: was ? 'DELETE' : 'POST' });
      setD((x) => ({ ...x, upvoted: r.upvoted, pds: { ...x.pds, upvotes: r.upvotes } }));
    } catch (e) {
      setErr(e.message);
      load();
    }
  };
  const toggleVisibility = () => run(() => api(`/pds/${code}`, { method: 'PATCH', body: { visibility: p.visibility === 'public' ? 'private' : 'public' } }));

  return (
    <div className="animate-rise">
      <Link to={mine ? '/my' : '/community'} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {mine ? 'My PDS' : 'Community'}
      </Link>

      {flash === 'submitted' && (
        <Alert kind="success">
          Submitted! Your PDS ID is <b className="font-mono">{p.code}</b>. The team reviews new PDS within 48 hours - you will get a notification at every step.
        </Alert>
      )}

      <header className="mt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-muted">{p.code}</span>
          <PdsType type={p.type} />
          <PdsStatus status={p.status} booking={d.booking} />
          {p.visibility === 'private' && <PrivateTag />}
          <span className="text-xs font-semibold text-muted">Urgency: {p.urgency}</span>
        </div>
        <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{p.title}</h1>
        <p className="mt-2 text-sm text-muted">
          by <b className="text-ink">{mine ? 'you' : p.author}</b> · {p.submitted_at ? `submitted ${fmtDate(p.submitted_at, false)}` : `created ${timeAgo(p.created_at)}`}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.visibility === 'public' && (
            <Button
              variant={d.upvoted ? 'primary' : 'outline'}
              size="sm"
              onClick={upvote}
              disabled={!can.upvote}
              title={mine ? 'Your own PDS' : 'I have this problem too'}
            >
              <ArrowBigUp className={cx('size-4', d.upvoted && 'fill-current')} /> I have this problem too · {p.upvotes}
            </Button>
          )}
          {can.edit && (
            <Link to={`/pds/${code}/edit`}>
              <Button variant="outline" size="sm"><Pencil className="size-4" /> Edit</Button>
            </Link>
          )}
          {can.submit && (
            <Button size="sm" onClick={() => run(() => api(`/pds/${code}/submit`, { method: 'POST' }), () => setFlash('submitted'))}>
              <Send className="size-4" /> Submit
            </Button>
          )}
          {can.change_visibility && (
            <Button variant="outline" size="sm" onClick={toggleVisibility}>
              {p.visibility === 'public' ? <Lock className="size-4" /> : <Globe2 className="size-4" />} Make {p.visibility === 'public' ? 'private' : 'public'}
            </Button>
          )}
          {can.withdraw && <WithdrawButton code={code} onDone={load} />}
          {can.delete && (
            <Button variant="ghost" size="sm" className="text-problem" onClick={() => window.confirm('Delete this draft?') && run(() => api(`/pds/${code}`, { method: 'DELETE' }), () => nav('/my', { replace: true }))}>
              <Trash2 className="size-4" /> Delete draft
            </Button>
          )}
        </div>
      </header>

      <div className="mt-4"><Alert>{err}</Alert></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <StatusBanner d={d} />

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
              <>
                <h2 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted">Attachments</h2>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {d.attachments.map((a) => (
                    <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="group block border border-ink/10 bg-paper">
                      {a.file_type.startsWith('image/') ? (
                        <img src={a.url} alt={a.file_name} className="aspect-video w-full object-cover" loading="lazy" decoding="async" />
                      ) : (
                        <div className="grid aspect-video place-items-center"><FileText className="size-8 text-muted" /></div>
                      )}
                      <p className="truncate px-2 py-1.5 text-xs font-semibold group-hover:text-signal-600">{a.file_name} <span className="font-normal text-muted">· {fmtBytes(a.size)}</span></p>
                    </a>
                  ))}
                </div>
              </>
            )}
          </Card>

          {d.requirements.length > 0 && (
            <Card className="p-5 sm:p-7">
              <h2 className="text-lg font-black">Requirement list</h2>
              <p className="text-sm text-muted">Points the team added from the comments.</p>
              <ul className="mt-3 space-y-2">
                {d.requirements.map((r) => (
                  <li key={r.id} className="flex gap-2 text-[15px]">
                    <Check className="mt-0.5 size-4 shrink-0 text-automation" /> {r.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5 sm:p-7">
            <Comments code={code} comments={d.comments} onChange={(list) => { setD((x) => ({ ...x, comments: list })); load(); }} onReload={load} can={can} />
          </Card>
        </div>

        <aside className="space-y-4">
          <SlotPanel d={d} />
          {d.progress.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold">Progress</h3>
              <div className="mt-3 h-2 bg-ink/8">
                <div className="h-full bg-signal" style={{ width: `${p.progress}%` }} />
              </div>
              <p className="mt-1 text-sm font-semibold">{p.progress}% done</p>
              <ol className="mt-4 space-y-3 border-l border-ink/10 pl-4">
                {d.progress.map((u, i) => (
                  <li key={i} className="text-sm">
                    <p><b>{u.percent}%</b>{u.note && ` - ${u.note}`}</p>
                    <p className="text-xs text-muted">{timeAgo(u.created_at)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <Card className="p-5">
            <h3 className="font-bold">Timeline</h3>
            <ol className="mt-3 space-y-3 border-l border-ink/10 pl-4">
              {d.timeline.map((t, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 size-2.5 bg-signal" />
                  <p className="font-semibold">{t.label}</p>
                  {t.note && <p className="text-muted">{t.note}</p>}
                  <p className="text-xs text-muted">{fmtDate(t.created_at)}</p>
                </li>
              ))}
              {!d.timeline.length && <li className="text-sm text-muted">Not submitted yet.</li>}
            </ol>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatusBanner({ d }) {
  const { pds: p, can } = d;
  if (p.status === 'need_info' && p.is_mine) {
    return (
      <div className="flex gap-3 border-l-4 border-idea bg-idea/12 p-4">
        <MessageCircleQuestion className="size-5 shrink-0 text-[#a86b00]" />
        <div>
          <p className="font-bold">The team needs more information</p>
          {p.status_reason && <p className="mt-1 text-[15px]">&quot;{p.status_reason}&quot;</p>}
          <a href="#comments" className="mt-1 inline-block text-sm font-semibold text-signal-600 hover:underline">Reply in the comments below</a>
        </div>
      </div>
    );
  }
  if (p.status === 'rejected') {
    return (
      <div className="flex gap-3 border-l-4 border-problem bg-problem/8 p-4">
        <XCircle className="size-5 shrink-0 text-problem" />
        <div>
          <p className="font-bold">This PDS was not taken up</p>
          {p.status_reason && <p className="mt-1 text-[15px]">Reason: {p.status_reason}</p>}
        </div>
      </div>
    );
  }
  if (p.status === 'delivered' && can.confirm) return <ConfirmCard code={p.code} />;
  if (p.status === 'closed' && p.rating) {
    return (
      <div className="flex items-center gap-3 border-l-4 border-automation bg-automation/8 p-4">
        <CircleCheck className="size-5 text-automation" />
        <p className="font-semibold">
          Closed · rated {p.rating}/5 {p.feedback && <span className="font-normal text-muted">- &quot;{p.feedback}&quot;</span>}
        </p>
      </div>
    );
  }
  return null;
}

function ConfirmCard({ code }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await api(`/pds/${code}/confirm`, { method: 'POST', body: { rating, feedback } });
      window.location.reload();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Card className="border-automation/40 p-5">
      <p className="text-lg font-black">Your solution is delivered</p>
      <p className="text-sm text-muted">Check it, then confirm and rate to close this PDS. It closes on its own after 7 days.</p>
      <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} onClick={() => setRating(n)} className="p-1" aria-label={`${n} star${n > 1 ? 's' : ''}`}>
            <Star className={cx('size-8', n <= rating ? 'fill-idea text-idea' : 'text-ink/20')} />
          </button>
        ))}
      </div>
      <Textarea className="mt-3 min-h-20" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Anything to share with the team? (optional)" maxLength={1000} />
      {err && <p className="mt-2 text-sm text-problem">{err}</p>}
      <Button className="mt-3" onClick={submit} loading={busy} disabled={!rating}>
        <Check className="size-4" /> Confirm and close
      </Button>
    </Card>
  );
}

function WithdrawButton({ code, onDone }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async () => {
    setBusy(true);
    try {
      await api(`/pds/${code}/withdraw`, { method: 'POST', body: { reason } });
      setOpen(false);
      onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="ghost" size="sm" className="text-problem" onClick={() => setOpen(true)}>
        <Undo2 className="size-4" /> Withdraw
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Withdraw this PDS?">
        <p className="text-sm text-muted">It will be cancelled and any booked slot is released for the next PDS. This cannot be undone.</p>
        <Field label="Reason (optional)" className="mt-4">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20" maxLength={500} />
        </Field>
        <Alert>{err}</Alert>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Keep it</Button>
          <Button variant="danger" onClick={go} loading={busy}>Withdraw</Button>
        </div>
      </Modal>
    </>
  );
}

/** Slot info for everyone; slot choice / change for the owner of an approved PDS (SL-04, SL-08). */
/** Development dates. The team schedules the work; users just see when it happens. */
function SlotPanel({ d }) {
  const { pds: p, booking, estimate } = d;
  const active = booking && ['booked', 'in_development', 'testing'].includes(booking.status);
  if (!booking && p.status !== 'approved') return null;
  const size = p.size_weeks;
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <CalendarClock className="size-4 text-signal" /> Development dates
      </h3>
      {active ? (
        <>
          <p className="mt-3 text-xl font-black">{fmtWeekRange(booking.start_week, booking.end_week)}</p>
          <p className="text-sm text-muted">
            {booking.status === 'booked' ? `Starts ${weekName(booking.start_week).toLowerCase()}` : 'Being built now'}
            {size ? ` · ${size} week${size > 1 ? 's' : ''}` : ''}
          </p>
          {booking.status === 'booked' && <p className="mt-2 text-xs text-muted">The team set these dates. If the project before yours finishes early or runs late, they move and you are told.</p>}
        </>
      ) : booking?.status === 'completed' ? (
        <p className="mt-2 text-sm">Built {fmtWeekRange(booking.start_week, booking.end_week)}.</p>
      ) : (
        <>
          <p className="mt-2 text-sm">Approved - the team is choosing the dates and will let you know.</p>
          {estimate && <p className="mt-1 text-sm text-muted">Likely from {fmtWeekRange(estimate.start_week, estimate.end_week)}.</p>}
        </>
      )}
    </Card>
  );
}
