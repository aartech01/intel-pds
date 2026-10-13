import { useCallback, useEffect, useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Alert, Card, Empty, Input, Spinner } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { fmtDate } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function Audit() {
  const [rows, setRows] = useState(null);
  const [action, setAction] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback((a = '') => api(`/admin/audit${a ? `?action=${encodeURIComponent(a)}` : ''}`).then(setRows).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useLive(['audit'], () => load(action));

  return (
    <div className="animate-rise">
      <PageHeader title="Audit log" subtitle="Logins, password changes, admin actions and data exports. Latest 300." />
      <form onSubmit={(e) => { e.preventDefault(); load(action.trim()); }} className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action, e.g. login, export, slot" className="pl-10" />
      </form>
      <div className="mt-3"><Alert>{err}</Alert></div>
      {!rows ? (
        <Spinner />
      ) : !rows.length ? (
        <Card className="mt-4"><Empty icon={ScrollText} title="Nothing logged" /></Card>
      ) : (
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
      )}
    </div>
  );
}
