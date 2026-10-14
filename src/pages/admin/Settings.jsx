import { useEffect, useState } from 'react';
import { PageHeader } from './Layout.jsx';
import { Alert, Button, Card, DetailSkeleton, Field, Input, Textarea } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth, useConfig } from '../../lib/context.jsx';

export default function Settings() {
  const { reload } = useConfig();
  const { user } = useAuth();
  const superAdmin = user?.role === 'super_admin';
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    api('/admin/settings').then(setS).catch((e) => setMsg({ kind: 'error', text: e.message }));
  }, []);
  if (!s) return msg ? <Alert>{msg.text}</Alert> : <DetailSkeleton />;
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try {
      const { team_name, product_name, review_sla_hours, blocked_words, require_team_2fa } = s;
      const body = { team_name, product_name, review_sla_hours, blocked_words, ...(superAdmin ? { require_team_2fa } : {}) };
      setS({ ...s, ...(await api('/admin/settings', { method: 'PUT', body })) });
      reload();
      setMsg({ kind: 'success', text: 'Saved' });
    } catch (e2) {
      setMsg({ kind: 'error', text: e2.message });
    }
  };
  return (
    <div className="max-w-3xl animate-rise">
      <PageHeader title="Settings" subtitle="Branding, alerts, the comment word filter and two-factor login. Team capacity is on the Schedule page." />
      <form onSubmit={save} className="space-y-6">
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Team name"><Input value={s.team_name} onChange={set('team_name')} /></Field>
          <Field label="Product name"><Input value={s.product_name} onChange={set('product_name')} /></Field>
          <Field label="Review target (hours)" hint="PDS waiting longer show as overdue."><Input type="number" min={1} value={s.review_sla_hours} onChange={set('review_sla_hours')} /></Field>
        </Card>
        <Card className="p-6">
          <Field label="Blocked words (CM-09)" hint="Comma-separated. Comments containing any of these whole words are refused.">
            <Textarea value={s.blocked_words} onChange={set('blocked_words')} className="min-h-28 font-mono text-sm" />
          </Field>
        </Card>
        <Card className="p-6">
          <p className="font-bold">Two-factor login for the team</p>
          <label className="mt-3 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-5 accent-signal"
              checked={s.require_team_2fa !== 'false'}
              disabled={!superAdmin}
              onChange={(e) => setS({ ...s, require_team_2fa: e.target.checked ? 'true' : 'false' })}
            />
            <span>
              <span className="font-semibold">Require two-factor for every team account</span>
              <span className="block text-sm text-muted">
                Recommended. When off, team members can use the admin panel with just their password and can turn two-factor off in their Profile.
                {!superAdmin && ' Only a Super Admin can change this.'}
              </span>
            </span>
          </label>
        </Card>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <Button>Save settings</Button>
      </form>
    </div>
  );
}
