import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarClock, CheckCheck, MessageSquare, ShieldAlert, TrendingUp, UserCheck } from 'lucide-react';
import { Button, Card, Empty, ListSkeleton, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../lib/context.jsx';
import { timeAgo } from '../../lib/format.js';
import { PageTitle } from './Shell.jsx';
import { useLive } from '../../lib/live.js';

const ICONS = { comment: MessageSquare, slot: CalendarClock, security: ShieldAlert, warning: ShieldAlert, progress: TrendingUp, assigned: UserCheck };

export default function Notifications() {
  const { refresh } = useAuth();
  const [rows, setRows] = useState(null);
  const load = () => api('/me/notifications').then(setRows);
  useEffect(() => { load(); }, []);
  useLive(['notifications'], load);
  const readAll = async () => {
    await api('/me/notifications/read', { method: 'POST', body: {} });
    await load();
    refresh();
  };
  const open = (n) => !n.read_at && api('/me/notifications/read', { method: 'POST', body: { ids: [n.id] } }).then(refresh);

  if (!rows) return <ListSkeleton />;
  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageTitle title="Notifications">
        {rows.some((n) => !n.read_at) && (
          <Button variant="outline" size="sm" onClick={readAll}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </PageTitle>
      <Card className="divide-y divide-ink/6">
        {rows.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const body = (
            <div className={cx('flex gap-3 px-4 py-3.5', !n.read_at && 'bg-signal-50/60')}>
              <Icon className={cx('mt-0.5 size-5 shrink-0', n.read_at ? 'text-muted' : 'text-signal')} />
              <div className="min-w-0 flex-1">
                <p className={cx('text-[15px]', !n.read_at && 'font-semibold')}>{n.message}</p>
                <p className="text-xs text-muted">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-2 size-2 shrink-0 bg-signal" aria-label="Unread" />}
            </div>
          );
          return n.link ? (
            <Link key={n.id} to={n.link} onClick={() => open(n)} className="block hover:bg-paper">
              {body}
            </Link>
          ) : (
            <div key={n.id} onClick={() => open(n)}>{body}</div>
          );
        })}
        {!rows.length && <Empty icon={Bell} title="No notifications yet">You will hear from us here when something changes on your PDS.</Empty>}
      </Card>
    </div>
  );
}
