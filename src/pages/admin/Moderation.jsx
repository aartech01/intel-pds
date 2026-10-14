import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Check, EyeOff, Flag, Trash2 } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Alert, Button, Card, Empty, Input, ListSkeleton, Modal, RichText } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { timeAgo } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function Moderation() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [block, setBlock] = useState(null);
  const [reason, setReason] = useState('');
  const load = useCallback(() => api('/admin/moderation').then(setD).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useLive(['moderation'], load);

  const act = async (fn) => {
    setErr('');
    try {
      await fn();
      setBlock(null);
      setReason('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };
  if (!d) return err ? <Alert>{err}</Alert> : <ListSkeleton />;

  return (
    <div className="animate-rise">
      <PageHeader title="Moderation" subtitle="Reported comments. Hide or delete them, warn or block the author." />
      <Alert>{err}</Alert>
      <div className="mt-4 space-y-3">
        {d.reported.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 bg-problem px-2 py-0.5 text-xs font-bold text-white"><Flag className="size-3" /> {c.reports} report{c.reports > 1 ? 's' : ''}</span>
              <span className="text-xs font-semibold text-problem">{c.reasons}</span>
              <span className="text-muted">by <b className="text-ink">{c.author ?? 'Deleted user'}</b> on</span>
              <Link to={`/admin/pds/${c.pds_code}#c${c.id}`} className="font-semibold hover:text-signal-600">{c.pds_code} · {c.title}</Link>
              <span className="ml-auto text-xs text-muted">{timeAgo(c.created_at)}</span>
            </div>
            <div className="mt-3 border-l-2 border-ink/15 pl-3">
              <RichText text={c.text} className="text-[15px]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="dark" onClick={() => act(() => api(`/admin/comments/${c.id}/hide`, { method: 'POST', body: { hidden: true } }))}><EyeOff className="size-4" /> Hide</Button>
              <Button size="sm" variant="outline" onClick={() => window.confirm('Delete this comment for everyone?') && act(() => api(`/admin/comments/${c.id}`, { method: 'DELETE' }))}><Trash2 className="size-4" /> Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => act(() => api(`/admin/comments/${c.id}/dismiss`, { method: 'POST' }))}><Check className="size-4" /> Keep (dismiss reports)</Button>
              {c.user_id && !c.author_blocked && (
                <Button size="sm" variant="ghost" className="ml-auto text-problem" onClick={() => setBlock(c)}><Ban className="size-4" /> Block author</Button>
              )}
            </div>
          </Card>
        ))}
        {!d.reported.length && <Card><Empty icon={Flag} title="No open reports">Reported comments will show up here.</Empty></Card>}
      </div>

      {d.hidden.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-black">Recently hidden</h2>
          <Card className="mt-3 divide-y divide-ink/6">
            {d.hidden.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-muted">&quot;{c.text}&quot; - {c.author}</span>
                <Link to={`/admin/pds/${c.pds_code}#c${c.id}`} className="font-mono text-xs hover:text-signal-600">{c.pds_code}</Link>
                <Button size="sm" variant="ghost" onClick={() => act(() => api(`/admin/comments/${c.id}/hide`, { method: 'POST', body: { hidden: false } }))}>Unhide</Button>
              </div>
            ))}
          </Card>
        </>
      )}

      <Modal open={!!block} onClose={() => setBlock(null)} title={`Block ${block?.author}?`}>
        <p className="text-sm text-muted">They are logged out everywhere and cannot log in until unblocked (Users page).</p>
        <Input className="mt-4" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (kept in the audit log)" />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setBlock(null)}>Cancel</Button>
          <Button variant="danger" disabled={!reason.trim()} onClick={() => act(() => api(`/admin/users/${block.user_id}/block`, { method: 'POST', body: { blocked: true, reason } }))}>Block</Button>
        </div>
      </Modal>
    </div>
  );
}
