import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ScrollText, Search, User } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Alert, Button, Card, Empty, Input, ListSkeleton, Select } from '../../components/ui.jsx';
import { apiLatest } from '../../lib/api.js';
import { fmtDate } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

const PAGE_SIZES = [25, 50, 100];

export default function Audit() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = PAGE_SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 50;
  const action = params.get('action') ?? '';
  const actor = params.get('actor') ?? '';
  const [actionInput, setActionInput] = useState(action);
  const [actorInput, setActorInput] = useState(actor);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (action) q.set('action', action);
    if (actor) q.set('actor', actor);
    return apiLatest('admin-audit', `/admin/audit?${q}`).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message));
  }, [page, pageSize, action, actor]);
  useEffect(() => { load(); }, [load]);
  useLive(['audit'], load);

  /** Change one or more URL params; any filter change goes back to page 1. */
  const update = (changes) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) (v ? n.set(k, v) : n.delete(k));
    if (!('page' in changes)) n.delete('page');
    if (n.get('page') === '1') n.delete('page');
    setParams(n);
  };
  const go = (p) => update({ page: String(p) });

  const rows = data?.rows;
  const pages = data?.pages ?? 1;
  const current = data?.page ?? page;
  const first = data && data.total ? (current - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, current * data.pageSize) : 0;
  const filtered = !!(action || actor);

  return (
    <div className="animate-rise">
      <PageHeader title="Audit log" subtitle="Logins, password changes, admin actions and data exports, newest first." />
      <form
        onSubmit={(e) => { e.preventDefault(); update({ action: actionInput.trim(), actor: actorInput.trim() }); }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={actionInput} onChange={(e) => setActionInput(e.target.value)} placeholder="Action, e.g. login, export, slot" className="pl-10" aria-label="Filter by action" />
        </div>
        <div className="relative w-full sm:max-w-[14rem]">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={actorInput} onChange={(e) => setActorInput(e.target.value)} placeholder="Who (display name)" className="pl-10" aria-label="Filter by person" />
        </div>
        <Button type="submit" size="sm">Filter</Button>
        {filtered && (
          <Button type="button" size="sm" variant="ghost" onClick={() => { setActionInput(''); setActorInput(''); update({ action: '', actor: '' }); }}>
            Clear
          </Button>
        )}
      </form>
      <div className="mt-3"><Alert>{err}</Alert></div>
      {!rows ? (
        <ListSkeleton title={false} />
      ) : !rows.length ? (
        <Card className="mt-4"><Empty icon={ScrollText} title={filtered ? 'No entries match this filter' : 'Nothing logged'} /></Card>
      ) : (
        <>
          <Card className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b border-ink/8 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-3 py-3 font-semibold">Who</th>
                  <th className="px-3 py-3 font-semibold">Action</th>
                  <th className="px-3 py-3 font-semibold">Target</th>
                  <th className="px-3 py-3 font-semibold">Details</th>
                  <th className="px-3 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/6">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2.5 font-semibold">{r.actor ?? 'system'}</td>
                    <td className="px-3 py-2.5"><code className="bg-paper px-1.5 py-0.5 font-mono text-xs">{r.action}</code></td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r.target_type ? `${r.target_type}:${r.target_id ?? ''}` : ''}</td>
                    <td className="max-w-xs truncate px-3 py-2.5 text-xs text-muted" title={r.details ?? ''}>{r.details}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">{r.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted tabular-nums">
              Showing {first.toLocaleString()}–{last.toLocaleString()} of {data.total.toLocaleString()} {data.total === 1 ? 'entry' : 'entries'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-muted">
                Per page
                <Select value={String(pageSize)} onChange={(e) => update({ size: e.target.value === '50' ? '' : e.target.value })} aria-label="Entries per page">
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </label>
              {pages > 1 && (
                <nav className="flex items-center gap-1" aria-label="Audit log pages">
                  <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => go(1)} aria-label="First page"><ChevronsLeft className="size-4" /></Button>
                  <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => go(current - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
                  <span className="px-2 text-sm tabular-nums">Page {current} of {pages}</span>
                  <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => go(current + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
                  <Button variant="outline" size="sm" disabled={current >= pages} onClick={() => go(pages)} aria-label="Last page"><ChevronsRight className="size-4" /></Button>
                </nav>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
