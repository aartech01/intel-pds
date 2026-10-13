import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowBigUp, ArrowRight, FolderKanban, MessageSquare, Plus } from 'lucide-react';
import { Card, Empty, Spinner, Tabs } from '../../components/ui.jsx';
import { PdsStatus, PdsType, PrivateTag } from '../../components/pds.jsx';
import { api } from '../../lib/api.js';
import { canSharePds, useAuth, useConfig } from '../../lib/context.jsx';
import { fmtWeekRange, timeAgo } from '../../lib/format.js';
import { actionFor } from './Dashboard.jsx';
import { PageTitle } from './Shell.jsx';
import { useLive } from '../../lib/live.js';

const GROUPS = {
  active: (s) => !['draft', 'closed', 'rejected', 'withdrawn'].includes(s),
  draft: (s) => s === 'draft',
  done: (s) => ['closed', 'rejected', 'withdrawn'].includes(s),
};

export default function MyPds() {
  const { config } = useConfig();
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('active');
  const load = () => api('/dashboard').then((d) => setRows(d.mine));
  useEffect(() => { load(); }, []);
  useLive(['pds'], load);
  if (!rows) return <Spinner />;
  const open = rows.filter((p) => GROUPS.active(p.status)).length;
  const list = rows.filter((p) => GROUPS[tab](p.status));

  return (
    <div className="animate-rise">
      <PageTitle title="My PDS" subtitle={`${open} of ${config?.limits.openPdsPerUser ?? 3} open PDS in use.`}>
        {canSharePds(user) && (
          <Link to="/pds/new" className="inline-flex h-11 items-center gap-2 bg-signal px-5 font-semibold text-white hover:bg-signal-600">
            <Plus className="size-4" /> New PDS
          </Link>
        )}
      </PageTitle>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'active', label: 'Active', count: open },
          { value: 'draft', label: 'Drafts', count: rows.filter((p) => GROUPS.draft(p.status)).length },
          { value: 'done', label: 'Finished', count: rows.filter((p) => GROUPS.done(p.status)).length },
        ]}
      />
      <div className="mt-5 space-y-3">
        {list.map((p) => {
          const a = actionFor(p);
          return (
            <Link key={p.code} to={p.status === 'draft' ? `/pds/${p.code}/edit` : `/pds/${p.code}`} className="block">
              <Card className="p-4 transition hover:border-ink/20 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-muted">{p.code}</span>
                  <PdsType type={p.type} />
                  <PdsStatus status={p.status} booking={p.booking} />
                  {p.visibility === 'private' && <PrivateTag />}
                  <span className="ml-auto text-xs text-muted">updated {timeAgo(p.updated_at)}</span>
                </div>
                <p className="mt-2 text-lg font-bold">{p.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><MessageSquare className="size-4" /> {p.comments}</span>
                  <span className="inline-flex items-center gap-1"><ArrowBigUp className="size-4" /> {p.upvotes}</span>
                  {p.booking && ['booked', 'in_development', 'testing'].includes(p.booking.status) && <span>Development {fmtWeekRange(p.booking.start_week, p.booking.end_week)}</span>}
                  {p.estimate && <span>Estimated start: {fmtWeekRange(p.estimate.start_week)}</span>}
                  {p.status === 'in_development' && <span>{p.progress}% done</span>}
                </div>
                {a && (
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-signal-600">
                    {a.text} <ArrowRight className="size-4" />
                  </p>
                )}
              </Card>
            </Link>
          );
        })}
        {!list.length && (
          <Card>
            <Empty icon={FolderKanban} title={tab === 'draft' ? 'No drafts' : tab === 'done' ? 'Nothing finished yet' : 'No active PDS'}>
              {tab === 'active' && canSharePds(user) && <Link to="/pds/new" className="font-semibold text-signal-600 hover:underline">Write a new PDS</Link>}
            </Empty>
          </Card>
        )}
      </div>
    </div>
  );
}
