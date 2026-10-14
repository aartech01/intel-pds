import { useCallback, useEffect, useState } from 'react';
import { Ban, KeyRound, LockKeyhole, MessageSquareWarning, Search, ShieldCheck, Trash2, Users as UsersIcon } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Alert, Button, Card, ConfirmModal, Empty, Input, ListSkeleton, Modal, Select, Textarea, cx } from '../../components/ui.jsx';
import { api, apiLatest } from '../../lib/api.js';
import { useAuth, useConfig } from '../../lib/context.jsx';
import { timeAgo } from '../../lib/format.js';
import { useLive } from '../../lib/live.js';

export default function Users() {
  const { user: me } = useAuth();
  const { config } = useConfig();
  const superAdmin = me.role === 'super_admin';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState({ role: '', blocked: '' });
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null); // { kind: block|warn|delete, u }
  // Admins can delete normal users and team members; only a Super Admin can delete another admin.
  const canDelete = (u) => u.id !== me.id && (superAdmin || !['admin', 'super_admin'].includes(u.role));
  const [text, setText] = useState('');
  const [temp, setTemp] = useState(null); // { u, password } - forgotten-password reset

  const load = useCallback(
    (search = q) => {
      const p = new URLSearchParams({ q: search, ...(filter.role ? { role: filter.role } : {}), ...(filter.blocked ? { blocked: '1' } : {}) });
      apiLatest('admin-users', `/admin/users?${p}`).then(setRows).catch((e) => setErr(e.message));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter],
  );
  useEffect(() => { load(); }, [load]);
  useLive(['users', 'logins'], () => load(q));

  const act = async (fn) => {
    setErr('');
    try {
      await fn();
      setModal(null);
      setText('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader title="Users" subtitle="Contact details are visible to admins only. Every view is recorded in the audit log." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Display name, or an exact email / mobile number" className="pl-10" />
        </form>
        <Select value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })} className="sm:w-44" aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(config?.roles ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filter.blocked} onChange={(e) => setFilter({ ...filter, blocked: e.target.value })} className="sm:w-40" aria-label="Blocked">
          <option value="">Everyone</option>
          <option value="1">Blocked only</option>
        </Select>
      </div>
      <div className="mt-3"><Alert>{err}</Alert></div>

      {!rows ? (
        <ListSkeleton title={false} />
      ) : !rows.length ? (
        <Card className="mt-4"><Empty icon={UsersIcon} title="No users found" /></Card>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-ink/8 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-3 py-3 font-semibold">Contact</th>
                <th className="px-3 py-3 font-semibold">Role</th>
                <th className="px-3 py-3 font-semibold">Activity</th>
                <th className="px-3 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {rows.map((u) => (
                <tr key={u.id} className={cx(u.is_blocked && 'bg-problem/5')}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.display_name}</p>
                    <p className="text-xs text-muted">{u.full_name}</p>
                    {u.is_blocked && <p className="text-xs font-semibold text-problem">Blocked: {u.block_reason}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <p>{u.email}</p>
                    <p>{u.phone}</p>
                    {u.must_change_password && <p className="mt-1 font-semibold text-[#a86b00]">Has a temporary password</p>}
                  </td>
                  <td className="px-3 py-3">
                    {superAdmin && u.id !== me.id ? (
                      <Select value={u.role} onChange={(e) => window.confirm(`Change ${u.display_name}'s role to ${config.roles[e.target.value]}? They will be logged out.`) && act(() => api(`/admin/users/${u.id}/role`, { method: 'PATCH', body: { role: e.target.value } }))} className="h-9 w-40 text-sm">
                        {Object.entries(config?.roles ?? {}).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                    ) : (
                      <span className="font-semibold">{config?.roles?.[u.role]}</span>
                    )}
                    {u.role !== 'user' && <p className={cx('mt-1 flex items-center gap-1 text-xs', u.mfa_enabled ? 'text-automation' : 'text-[#a86b00]')}><ShieldCheck className="size-3" /> {u.mfa_enabled ? '2FA on' : '2FA not set up'}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">
                    <p>{u.pds_count} PDS · {u.comment_count} comments</p>
                    <p>Joined {timeAgo(u.created_at)}{u.source && ` via ${u.source}`}</p>
                    <p>Last login {u.last_login_at ? timeAgo(u.last_login_at) : 'never'}</p>
                  </td>
                  <td className="px-3 py-3">
                    {u.id !== me.id && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'warn', u })} title="Send a warning"><MessageSquareWarning className="size-4" /></Button>
                        {(superAdmin || !['admin', 'super_admin'].includes(u.role)) && (
                          <Button size="sm" variant="ghost" title="Forgot password? Give a temporary password" onClick={() => setTemp({ u, password: null })}><LockKeyhole className="size-4" /></Button>
                        )}
                        {superAdmin && u.mfa_enabled && (
                          <Button size="sm" variant="ghost" title="Reset two-factor" onClick={() => window.confirm(`Reset two-factor for ${u.display_name}? They must set it up again.`) && act(() => api(`/admin/users/${u.id}/reset-mfa`, { method: 'POST' }))}><KeyRound className="size-4" /></Button>
                        )}
                        {u.is_blocked ? (
                          <Button size="sm" variant="outline" onClick={() => act(() => api(`/admin/users/${u.id}/block`, { method: 'POST', body: { blocked: false } }))}>Unblock</Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-problem" onClick={() => setModal({ kind: 'block', u })}><Ban className="size-4" /> Block</Button>
                        )}
                        {canDelete(u) && (
                          <Button size="sm" variant="ghost" className="text-problem" title="Delete user" onClick={() => setModal({ kind: 'delete', u })}><Trash2 className="size-4" /> Delete</Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!temp} onClose={() => setTemp(null)} title={`Temporary password for ${temp?.u.display_name}`}>
        {!temp?.password ? (
          <>
            <p className="text-sm text-muted">
              For someone who forgot their password. Their current password stops working and they are logged out everywhere. Give them the temporary password in person, by phone or on WhatsApp - they must choose their own right after logging in.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setTemp(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  setErr('');
                  try {
                    const d = await api(`/admin/users/${temp.u.id}/temp-password`, { method: 'POST' });
                    setTemp({ ...temp, password: d.password });
                    load();
                  } catch (e) {
                    setTemp(null);
                    setErr(e.message);
                  }
                }}
              >
                <LockKeyhole className="size-4" /> Create temporary password
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Give this to {temp.u.display_name}. It is shown only once.</p>
            <p className="mt-3 select-all bg-paper p-4 text-center font-mono text-2xl font-bold tracking-wider">{temp.password}</p>
            <p className="mt-3 text-sm text-muted">They log in with {temp.u.email || 'their email or mobile number'} and this password, then choose a new one.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard?.writeText(temp.password)}>Copy</Button>
              <Button onClick={() => setTemp(null)}>Done</Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal
        open={modal?.kind === 'delete'}
        onClose={() => setModal(null)}
        title={`Delete ${modal?.u.display_name}?`}
        confirmLabel="Delete user"
        onConfirm={async () => {
          await api(`/admin/users/${modal.u.id}`, { method: 'DELETE' });
          setModal(null);
          load();
        }}
      >
        Their name, email, mobile number and password are removed and they can no longer log in. Their drafts and private PDS are deleted, open public PDS are withdrawn, and their public comments stay as &quot;Deleted user&quot;.
      </ConfirmModal>

      <Modal open={!!modal && modal.kind !== 'delete'} onClose={() => setModal(null)} title={modal?.kind === 'block' ? `Block ${modal?.u.display_name}?` : `Warn ${modal?.u.display_name}`}>
        <p className="text-sm text-muted">{modal?.kind === 'block' ? 'They are logged out everywhere and cannot log in until unblocked.' : 'They see this message in the app.'}</p>
        <Textarea className="mt-4 min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder={modal?.kind === 'block' ? 'Reason (kept in the audit log)' : 'e.g. Please keep comments respectful.'} autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button
            variant={modal?.kind === 'block' ? 'danger' : 'primary'}
            disabled={!text.trim()}
            onClick={() => act(() => (modal.kind === 'block' ? api(`/admin/users/${modal.u.id}/block`, { method: 'POST', body: { blocked: true, reason: text } }) : api(`/admin/users/${modal.u.id}/warn`, { method: 'POST', body: { message: text } })))}
          >
            {modal?.kind === 'block' ? 'Block' : 'Send warning'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
