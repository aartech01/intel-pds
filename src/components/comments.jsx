import { useState } from 'react';
import { CheckCircle2, CornerDownRight, EyeOff, Flag, ListPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar, Button, Counter, RichText, Textarea, cx } from './ui.jsx';
import { api } from '../lib/api.js';
import { useConfig } from '../lib/context.jsx';
import { COMMENT_STYLE, timeAgo } from '../lib/format.js';

/**
 * Comment thread with one level of replies.
 * staff: moderation actions (hide, add to requirements) - used on the admin PDS page.
 */
export function Comments({ code, comments, onChange, can, staff = false, onReload, onRequirement }) {
  const { config } = useConfig();
  const max = config?.limits.comment ?? 1000;
  const total = comments.reduce((n, c) => n + (c.state === 'visible' ? 1 : 0) + c.replies.filter((r) => r.state === 'visible').length, 0);

  return (
    <section id="comments">
      <h2 className="text-xl font-black tracking-tight">
        Comments <span className="font-mono text-base text-muted">{total}</span>
      </h2>
      <p className="mt-0.5 text-sm text-muted">Add an idea, a missing point or a better approach. Only display names are shown.</p>
      {can.comment && <Composer code={code} max={max} types={config?.comment_types ?? []} onPosted={onChange} className="mt-4" />}
      <ol className="mt-6 space-y-5">
        {comments.map((c) => (
          // Long threads: the browser skips layout and paint for comments that are off screen.
          <li key={c.id} className="[contain-intrinsic-size:auto_140px] [content-visibility:auto]">
            <Comment c={c} code={code} max={max} can={can} staff={staff} onChange={onChange} onReload={onReload} onRequirement={onRequirement} types={config?.comment_types ?? []} />
          </li>
        ))}
      </ol>
      {!comments.length && <p className="mt-6 border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-muted">No comments yet. Be the first to add an idea.</p>}
    </section>
  );
}

function Composer({ code, max, types, onPosted, parentId, onCancel, initial = '', editId, className, autoFocus }) {
  const [text, setText] = useState(initial);
  const [type, setType] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const list = editId
        ? await api(`/comments/${editId}`, { method: 'PATCH', body: { text } })
        : await api(`/pds/${code}/comments`, { method: 'POST', body: { text, type: type || undefined, parent_id: parentId } });
      onPosted(list);
      setText('');
      setType('');
      onCancel?.();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className={cx('border border-ink/10 bg-white p-3', className)}>
      {!parentId && !editId && (
        <div className="mb-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Comment type">
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={type === t.key}
              onClick={() => setType(type === t.key ? '' : t.key)}
              className={cx('px-2.5 py-1 text-xs font-semibold transition', type === t.key ? COMMENT_STYLE[t.key] : 'bg-ink/4 text-muted hover:text-ink')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={parentId ? 'Write a reply...' : 'Share an idea, a point to add, a question or a suggestion...'}
        className="min-h-20 border-0 px-1 focus:ring-0"
        maxLength={max + 50}
        autoFocus={autoFocus}
      />
      {err && <p className="px-1 pb-2 text-sm text-problem">{err}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-ink/6 pt-2">
        <span className="px-1 text-xs text-muted">
          Plain text and links only · <Counter value={text} max={max} />
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button size="sm" loading={busy} disabled={!text.trim() || text.length > max}>
            {editId ? 'Save' : parentId ? 'Reply' : 'Post comment'}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Comment({ c, code, max, can, staff, onChange, onReload, onRequirement, types, isReply }) {
  const [mode, setMode] = useState(null); // reply | edit
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState('');
  const typeLabel = types.find((t) => t.key === c.type)?.label;

  const act = async (fn) => {
    setMenu(false);
    try {
      const out = await fn();
      if (Array.isArray(out)) onChange(out);
      else onReload?.();
    } catch (e) {
      setFlash(e.message);
    }
  };
  const report = (reason) =>
    act(async () => {
      await api(`/comments/${c.id}/report`, { method: 'POST', body: { reason } });
      setFlash('Thanks - a moderator will review it.');
      return null;
    });

  if (c.state === 'deleted') {
    return (
      <div className={cx(isReply && 'ml-12')}>
        <p className="border border-dashed border-ink/10 px-4 py-3 text-sm italic text-muted">Comment deleted</p>
        {!!c.replies?.length && <Replies {...{ c, code, max, can, staff, onChange, onReload, onRequirement, types }} />}
      </div>
    );
  }

  return (
    <div id={`c${c.id}`} className={cx('scroll-mt-24', isReply && 'ml-12')}>
      <div className="flex gap-3">
        <Avatar name={c.author} team={c.is_team} className={isReply ? 'size-8' : ''} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <b className="font-bold">{c.is_mine ? 'You' : c.author}</b>
            {c.is_team && <span className="bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Team</span>}
            {c.is_owner && !c.is_team && <span className="bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bone">Owner</span>}
            {typeLabel && <span className={cx('px-1.5 py-0.5 text-[11px] font-semibold', COMMENT_STYLE[c.type])}>{typeLabel}</span>}
            <span className="text-muted">{timeAgo(c.created_at)}</span>
            {c.edited && <span className="text-xs text-muted">(edited)</span>}
            {c.is_useful && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-automation">
                <CheckCircle2 className="size-3.5" /> Useful
              </span>
            )}
            {staff && c.open_reports > 0 && <span className="bg-problem px-1.5 py-0.5 text-[10px] font-bold text-white">{c.open_reports} report{c.open_reports > 1 ? 's' : ''}</span>}
          </div>

          {mode === 'edit' ? (
            <Composer code={code} max={max} types={types} editId={c.id} initial={c.text} onPosted={onChange} onCancel={() => setMode(null)} className="mt-2" autoFocus />
          ) : c.state === 'hidden' && c.text == null ? (
            <p className="mt-1 text-sm italic text-muted">Hidden by a moderator</p>
          ) : (
            <div className={cx('mt-1 text-[15px] leading-relaxed', c.state === 'hidden' && 'border-l-2 border-problem pl-3 opacity-60')}>
              {c.state === 'hidden' && <p className="mb-1 text-xs font-semibold text-problem">Hidden from users</p>}
              <RichText text={c.text} />
            </div>
          )}

          {mode !== 'edit' && (
            <div className="relative mt-1.5 flex flex-wrap items-center gap-1 text-xs font-semibold text-muted">
              {!isReply && can.comment && (
                <button className="px-1.5 py-1 hover:text-ink" onClick={() => setMode(mode === 'reply' ? null : 'reply')}>
                  Reply
                </button>
              )}
              {can.mark_useful && !c.is_mine && c.state === 'visible' && (
                <button className="px-1.5 py-1 hover:text-automation" onClick={() => act(() => api(`/comments/${c.id}/useful`, { method: 'POST', body: { useful: !c.is_useful } }))}>
                  {c.is_useful ? 'Unmark useful' : 'Mark useful'}
                </button>
              )}
              {staff && onRequirement && c.state === 'visible' && (
                <button className="inline-flex items-center gap-1 px-1.5 py-1 hover:text-ink" onClick={() => act(() => onRequirement(c))}>
                  <ListPlus className="size-3.5" /> Add to requirements
                </button>
              )}
              {staff && (
                <button className="inline-flex items-center gap-1 px-1.5 py-1 hover:text-problem" onClick={() => act(() => api(`/admin/comments/${c.id}/hide`, { method: 'POST', body: { hidden: c.state !== 'hidden' } }))}>
                  <EyeOff className="size-3.5" /> {c.state === 'hidden' ? 'Unhide' : 'Hide'}
                </button>
              )}
              {staff && !c.is_mine && (
                <button className="inline-flex items-center gap-1 px-1.5 py-1 text-problem/80 hover:text-problem" onClick={() => window.confirm(`Delete this comment by ${c.author}? This cannot be undone.`) && act(() => api(`/admin/comments/${c.id}`, { method: 'DELETE' }))}>
                  <Trash2 className="size-3.5" /> Delete
                </button>
              )}
              {(c.is_mine || (!c.is_mine && can.comment && !c.reported_by_me)) && (
                <button className="px-1.5 py-1 hover:text-ink" onClick={() => setMenu(!menu)} aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </button>
              )}
              {menu && (
                <div className="absolute left-0 top-8 z-20 w-44 border border-ink/10 bg-white py-1 text-sm font-medium text-ink shadow-card">
                  {c.is_mine ? (
                    <>
                      {c.state === 'visible' && (
                        <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper" onClick={() => { setMenu(false); setMode('edit'); }}>
                          <Pencil className="size-4" /> Edit
                        </button>
                      )}
                      <button className="flex w-full items-center gap-2 px-3 py-2 text-problem hover:bg-paper" onClick={() => window.confirm('Delete this comment?') && act(() => api(`/comments/${c.id}`, { method: 'DELETE' }))}>
                        <Trash2 className="size-4" /> Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper" onClick={() => report('spam')}>
                        <Flag className="size-4" /> Report as spam
                      </button>
                      <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper" onClick={() => report('abusive')}>
                        <Flag className="size-4" /> Report as abusive
                      </button>
                    </>
                  )}
                </div>
              )}
              {c.reported_by_me && <span className="px-1.5 text-muted/70">Reported</span>}
            </div>
          )}
          {flash && <p className="mt-1 text-xs text-muted">{flash}</p>}
          {mode === 'reply' && <Composer code={code} max={max} types={types} parentId={c.id} onPosted={onChange} onCancel={() => setMode(null)} className="mt-2" autoFocus />}
        </div>
      </div>
      {!isReply && !!c.replies?.length && <Replies {...{ c, code, max, can, staff, onChange, onReload, onRequirement, types }} />}
    </div>
  );
}

function Replies({ c, ...rest }) {
  return (
    <ol className="mt-3 space-y-3">
      {c.replies.map((r) => (
        <li key={r.id} className="relative">
          <CornerDownRight className="absolute left-4 top-2 size-4 text-ink/20" />
          <Comment c={r} isReply {...rest} />
        </li>
      ))}
    </ol>
  );
}
