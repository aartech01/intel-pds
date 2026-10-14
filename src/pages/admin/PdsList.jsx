import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowBigUp, Download, FileStack, Lock, MessageSquare, Search, Trash2 } from 'lucide-react';
import { PageHeader, isAdmin } from './Layout.jsx';
import { Alert, Button, Card, ConfirmModal, Empty, Input, ListSkeleton, Select, cx } from '../../components/ui.jsx';
import { PdsStatus, PdsType } from '../../components/pds.jsx';
import { api, apiLatest, downloadFile } from '../../lib/api.js';
import { useAuth, useConfig } from '../../lib/context.jsx';
import { fmtDate } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

// Same groups as the tiles on the admin home page.
const STATUS_GROUPS = [
  ['', 'All'],
  ['submitted', 'New'],
  ['under_review,need_info', 'In review'],
  ['approved,queued,in_development,testing', 'Being built'],
  ['delivered,closed', 'Done'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
];

export default function PdsList() {
  const { config } = useConfig();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [contacts, setContacts] = useState(false);
  const [del, setDel] = useState(null); // row to delete

  const load = useCallback(() => {
    apiLatest('admin-pds', `/admin/pds?${params}`).then(setData).catch((e) => setErr(e.message));
  }, [params]);
  useEffect(() => { load(); }, [load]);
  useLive(['pds'], load);

  const setParam = (k, v) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n, { replace: true });
  };
  const page = Number(params.get('page') || 1);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const exportCsv = () => {
    const n = new URLSearchParams(params);
    if (contacts) n.set('contacts', '1');
    downloadFile(`/admin/pds-export?${n}`, 'intelsquad-pds.csv').catch((e) => setErr(e.message));
  };

  return (
    <div className="animate-rise">
      <PageHeader title="All requests" subtitle="Click a request to review it.">
        {isAdmin(user) && (
          <>
            {user.role === 'super_admin' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-signal" checked={contacts} onChange={(e) => setContacts(e.target.checked)} /> Include contact details
              </label>
            )}
            <Button variant="outline" onClick={exportCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
          </>
        )}
      </PageHeader>

      {/* Status tabs */}
      <div className="mb-3 flex flex-wrap gap-2">
        {STATUS_GROUPS.map(([v, l]) => (
          <button key={v} onClick={() => setParam('status', v)} className={cx('h-9 border px-4 text-sm font-semibold transition', (params.get('status') ?? '') === v ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white text-ink hover:border-ink/40')}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
        <form onSubmit={(e) => { e.preventDefault(); setParam('q', q.trim()); }} className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, ID or name" className="pl-10" />
        </form>
        <Select value={params.get('type') ?? ''} onChange={(e) => setParam('type', e.target.value)} aria-label="Type">
          <option value="">All types</option>
          {config?.types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </Select>
        <Select value={params.get('assigned') ?? ''} onChange={(e) => setParam('assigned', e.target.value)} aria-label="Assigned to">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="none">Not assigned</option>
        </Select>
        <Select value={params.get('sort') ?? ''} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort">
          <option value="">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="urgency">Urgency</option>
          <option value="upvotes">Most upvoted</option>
          <option value="comments">Most discussed</option>
          <option value="updated">Recently updated</option>
        </Select>
      </div>
      <div className="mt-3"><Alert>{err}</Alert></div>

      {!data ? (
        <ListSkeleton title={false} />
      ) : !data.rows.length ? (
        <Card className="mt-4"><Empty icon={FileStack} title="No requests here" /></Card>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink/8 text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">From</th>
                <th className="px-3 py-3 font-semibold">Votes</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {data.rows.map((p) => (
                <tr key={p.code} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link to={`/admin/pds/${p.code}`} className="block">
                      <span className="block max-w-md truncate font-semibold hover:text-signal-600">{p.title}</span>
                      <span className="mt-1 flex items-center gap-2">
                        <PdsType type={p.type} />
                        {p.visibility === 'private' && <Lock className="size-3.5 text-muted" aria-label="Private" />}
                        {p.urgency === 'High' && <span className="text-xs font-bold text-problem">Urgent</span>}
                        <span className="text-xs text-muted">{p.code}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3"><PdsStatus status={p.status} booking={p.booking} /></td>
                  <td className="px-3 py-3">{p.author}</td>
                  <td className="px-3 py-3 text-muted">
                    <span className="inline-flex items-center gap-1"><ArrowBigUp className="size-4" />{p.upvotes}</span>{' '}
                    <span className="ml-2 inline-flex items-center gap-1"><MessageSquare className="size-3.5" />{p.comments}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{fmtDate(p.submitted_at, false)}</td>
                  <td className="px-3 py-3 text-right">
                    {isAdmin(user) && (
                      <button onClick={() => setDel(p)} className="rounded-lg p-2 text-muted hover:bg-problem/8 hover:text-problem" title="Delete request" aria-label={`Delete ${p.title}`}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {data && pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>Previous</Button>
          <span className="text-sm">Page {page} of {pages} · {data.total} requests</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>Next</Button>
        </div>
      )}
      <ConfirmModal
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete "${del?.title}"?`}
        confirmLabel="Delete request"
        onConfirm={async () => {
          await api(`/admin/pds/${del.code}`, { method: 'DELETE' });
          setDel(null);
          load();
        }}
      >
        The request ({del?.code}) is removed with all its comments, upvotes, files and its slot booking. {del?.author} gets a notification.
        {['in_development', 'testing'].includes(del?.status) && ' Work on it is in progress - it stops now and the next project in the queue takes its slot.'}
      </ConfirmModal>
    </div>
  );
}
