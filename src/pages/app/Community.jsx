import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users, X } from 'lucide-react';
import { Alert, Button, Card, Empty, Input, Select, Spinner, cx } from '../../components/ui.jsx';
import { PdsCard } from '../../components/pds.jsx';
import { api } from '../../lib/api.js';
import { useAuth, useConfig } from '../../lib/context.jsx';
import { PageTitle } from './Shell.jsx';
import { useLive } from '../../lib/live.js';

const BOARD_STATUSES = ['submitted', 'under_review', 'need_info', 'approved', 'queued', 'in_development', 'testing', 'delivered', 'closed'];

export default function Community() {
  const { config } = useConfig();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const page = Number(params.get('page') || 1);

  const load = useCallback(() => {
    setErr('');
    api(`/board?${params}`).then(setData).catch((e) => setErr(e.message));
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

  const upvote = async (p) => {
    try {
      const r = await api(`/pds/${p.code}/upvote`, { method: p.upvoted ? 'DELETE' : 'POST' });
      setData((d) => ({ ...d, rows: d.rows.map((x) => (x.code === p.code ? { ...x, upvotes: r.upvotes, upvoted: r.upvoted } : x)) }));
    } catch (e) {
      setErr(e.message);
    }
  };

  const type = params.get('type') ?? '';
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="animate-rise">
      <PageTitle title="Community PDS" subtitle="Public problems and ideas from everyone. Upvote 'I have this problem too' and add your ideas." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam('q', q.trim());
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by keyword or PDS ID" className="pl-10" aria-label="Search" />
          {q && (
            <button type="button" onClick={() => { setQ(''); setParam('q', ''); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink" aria-label="Clear search">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={params.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)} className="sm:w-52" aria-label="Status">
          <option value="">All statuses</option>
          {BOARD_STATUSES.map((s) => (
            <option key={s} value={s}>{config?.statuses[s]}</option>
          ))}
        </Select>
        <Select value={params.get('sort') ?? 'newest'} onChange={(e) => setParam('sort', e.target.value === 'newest' ? '' : e.target.value)} className="sm:w-48" aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="upvoted">Most upvoted</option>
          <option value="discussed">Most discussed</option>
        </Select>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {[{ key: '', label: 'All types' }, ...(config?.types ?? [])].map((t) => (
          <button
            key={t.key}
            onClick={() => setParam('type', t.key)}
            className={cx('h-9 border px-3.5 text-sm font-semibold transition', type === t.key ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white hover:border-ink/40')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <Alert>{err}</Alert>
      </div>

      {!data ? (
        <Spinner />
      ) : !data.rows.length ? (
        <Card className="mt-6">
          <Empty icon={Users} title="No PDS match">Try a different keyword or filter.</Empty>
        </Card>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">{data.total} PDS</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.rows.map((p) => (
              <PdsCard key={p.code} p={p} onUpvote={upvote} />
            ))}
          </div>
          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
                Previous
              </Button>
              <span className="font-mono text-sm">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
