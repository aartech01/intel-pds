import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ChevronDown, Eye, FileText, Globe2, ImageIcon, Lightbulb, Lock, Paperclip, Send, Trash2, X } from 'lucide-react';
import { Alert, Button, Card, Counter, Field, Input, Spinner, Textarea, TYPE_ICONS, cx } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { canSharePds, useAuth, useConfig } from '../../lib/context.jsx';
import { TYPE_STYLE, fmtBytes } from '../../lib/format.js';
import { PageTitle } from './Shell.jsx';

const LOCAL_KEY = 'sd_pds_draft';
const EMPTY = { title: '', type: '', problem_statement: '', expected_result: '', urgency: '', visibility: 'public' };
const ACCEPT = 'image/jpeg,image/png,application/pdf';

export default function PdsForm() {
  const { code } = useParams();
  const editing = !!code;
  const { config } = useConfig();
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState(() => {
    if (editing) return EMPTY;
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') }; } catch { return EMPTY; }
  });
  const [loaded, setLoaded] = useState(editing ? null : true);
  const [status, setStatus] = useState('draft');
  const [files, setFiles] = useState([]); // new File objects (create) or uploaded attachments (edit)
  const [errors, setErrors] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [similar, setSimilar] = useState([]);
  const fileInput = useRef(null);
  const L = config?.limits ?? { title: 100, problem: 1500, expected: 500, filesPerPds: 3, fileBytes: 5 * 1024 * 1024 };

  // Load for edit.
  useEffect(() => {
    if (!editing) return;
    api(`/pds/${code}`)
      .then((d) => {
        if (!d.can.edit) return setLoaded('locked');
        const p = d.pds;
        setF({ title: p.title, type: p.type, problem_statement: p.problem_statement, expected_result: p.expected_result ?? '', urgency: p.urgency, visibility: p.visibility });
        setStatus(p.status);
        setFiles(d.attachments);
        setLoaded(true);
      })
      .catch((e) => setErr(e.message));
  }, [code, editing]);

  // Local safety net for a new PDS (in case the tab closes).
  useEffect(() => {
    if (!editing) localStorage.setItem(LOCAL_KEY, JSON.stringify(f));
  }, [f, editing]);

  // Similar public PDS while typing (so people can comment there instead).
  useEffect(() => {
    const text = `${f.title} ${f.problem_statement}`.trim();
    if (editing || text.length < 12) return setSimilar([]);
    const t = setTimeout(() => api(`/pds-similar?q=${encodeURIComponent(text.slice(0, 300))}`).then(setSimilar).catch(() => {}), 600);
    return () => clearTimeout(t);
  }, [f.title, f.problem_statement, editing]);

  const set = (k) => (v) => {
    setF((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!f.title.trim()) e.title = 'Give your PDS a one-line title';
    else if (f.title.length > L.title) e.title = `Keep the title under ${L.title} characters`;
    if (!f.type) e.type = 'Choose a type';
    if (!f.problem_statement.trim()) e.problem_statement = 'Describe the problem';
    else if (f.problem_statement.length > L.problem) e.problem_statement = `Keep it under ${L.problem} characters`;
    if (f.expected_result.length > L.expected) e.expected_result = `Keep it under ${L.expected} characters`;
    if (!f.urgency) e.urgency = 'Choose the urgency';
    setErrors(e);
    if (Object.keys(e).length) setTimeout(() => document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
    return !Object.keys(e).length;
  };

  async function save(action) {
    setErr('');
    if (action === 'submit' && !validate()) return;
    if (action === 'draft' && !f.title.trim()) return setErrors({ title: 'A draft needs at least a title' });
    setBusy(action);
    try {
      let target = code;
      if (!editing) {
        const form = new FormData();
        for (const [k, v] of Object.entries(f)) form.append(k, v);
        form.append('action', action);
        for (const file of files) form.append('files', file);
        const r = await api('/pds', { method: 'POST', form });
        target = r.code;
        localStorage.removeItem(LOCAL_KEY);
      } else {
        await api(`/pds/${code}`, { method: 'PATCH', body: f });
        if (action === 'submit' && status === 'draft') await api(`/pds/${code}/submit`, { method: 'POST' });
      }
      nav(action === 'draft' ? '/my' : `/pds/${target}`, { replace: true, state: { justSubmitted: action === 'submit' && status === 'draft' } });
    } catch (e) {
      setErrors(e.fields ?? {});
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  const addFiles = async (list) => {
    setErr('');
    const picked = [...list];
    const bad = picked.find((x) => !ACCEPT.split(',').includes(x.type));
    if (bad) return setErr(`"${bad.name}" is not a JPG, PNG or PDF file`);
    const big = picked.find((x) => x.size > L.fileBytes);
    if (big) return setErr(`"${big.name}" is larger than ${fmtBytes(L.fileBytes)}`);
    if (files.length + picked.length > L.filesPerPds) return setErr(`You can attach up to ${L.filesPerPds} files`);
    if (!editing) return setFiles((s) => [...s, ...picked]);
    const form = new FormData();
    for (const x of picked) form.append('files', x);
    try {
      setFiles(await api(`/pds/${code}/attachments`, { method: 'POST', form }));
    } catch (e) {
      setErr(e.message);
    }
  };
  const removeFile = async (i) => {
    if (!editing) return setFiles((s) => s.filter((_, j) => j !== i));
    try {
      setFiles(await api(`/pds/${code}/attachments/${files[i].id}`, { method: 'DELETE' }));
    } catch (e) {
      setErr(e.message);
    }
  };

  const required = useMemo(() => [f.title.trim(), f.type, f.problem_statement.trim(), f.urgency].filter(Boolean).length, [f]);

  if (!editing && !canSharePds(user)) return <Navigate to="/admin" replace />;
  if (loaded === 'locked') return <Navigate to={`/pds/${code}`} replace />;
  if (!loaded) return err ? <Alert>{err}</Alert> : <Spinner />;

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <PageTitle
        back={
          <Link to={editing ? `/pds/${code}` : '/dashboard'} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Back
          </Link>
        }
        title={editing ? `Edit ${code}` : 'Share a problem'}
        subtitle="Answer 5 short questions. It takes about 2 minutes."
      />

      <div className="space-y-6">
        <Card className="space-y-6 p-5 sm:p-7">
          <Field label="1. In one line, what do you need?" required error={errors.title}>
            <Input value={f.title} onChange={(e) => set('title')(e.target.value)} maxLength={L.title + 20} placeholder="e.g. Automate daily sales report" invalid={!!errors.title} autoFocus={!editing} />
            <span className="mt-1 flex justify-between gap-2 text-xs text-muted">
              <span>This is the title people will see.</span>
              <Counter value={f.title} max={L.title} />
            </span>
          </Field>

          <div data-error={errors.type ? '' : undefined}>
            <p className="mb-2 text-sm font-semibold">
              2. What kind of request is it? <span className="text-signal">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Type">
              {(config?.types ?? []).map((t) => {
                const Icon = TYPE_ICONS[t.key];
                const on = f.type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('type')(t.key)}
                    className={cx('flex flex-col items-start gap-2 border p-3 text-left transition', on ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white hover:border-ink/40')}
                  >
                    <Icon className={cx('size-5', on ? 'text-signal' : TYPE_STYLE[t.key].text)} />
                    <span className="text-sm font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
            {errors.type && <p className="mt-1 text-sm text-problem">{errors.type}</p>}
          </div>

          <Field label="3. Describe the problem" required error={errors.problem_statement}>
            <Textarea
              value={f.problem_statement}
              onChange={(e) => set('problem_statement')(e.target.value)}
              className="min-h-40"
              placeholder="What is the problem and who faces it? e.g. Every evening our 3 shop staff copy sales from the billing app into Excel and WhatsApp it to the owner. It takes an hour and has mistakes."
              invalid={!!errors.problem_statement}
            />
            <span className="mt-1 flex justify-between gap-2 text-xs text-muted">
              <span>Plain words are fine. Say who faces it and how often.</span>
              <Counter value={f.problem_statement} max={L.problem} />
            </span>
          </Field>

          <div data-error={errors.urgency ? '' : undefined}>
            <p className="mb-2 text-sm font-semibold">
              4. How urgent is it? <span className="text-signal">*</span>
            </p>
            <div className="flex gap-2" role="radiogroup" aria-label="Urgency">
              {(config?.urgency ?? ['Low', 'Medium', 'High']).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={f.urgency === u}
                  onClick={() => set('urgency')(u)}
                  className={cx('h-11 flex-1 border text-sm font-semibold transition', f.urgency === u ? 'border-ink bg-ink text-bone' : 'border-ink/12 bg-white hover:border-ink/40')}
                >
                  {u}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">High = it blocks your work today. Low = nice to have.</p>
            {errors.urgency && <p className="mt-1 text-sm text-problem">{errors.urgency}</p>}
          </div>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="mb-3 text-sm font-semibold">
            5. Who can see it? <span className="text-signal">*</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Visibility">
            {[
              ['public', Globe2, 'Everyone', 'Shown to the community. Others can comment and add ideas.'],
              ['private', Lock, 'Only the team', 'Only you and the Intelligent Squad team can see it.'],
            ].map(([v, Icon, title, text]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={f.visibility === v}
                onClick={() => set('visibility')(v)}
                className={cx('flex gap-3 border p-4 text-left transition', f.visibility === v ? 'border-signal bg-signal-50' : 'border-ink/12 bg-white hover:border-ink/40')}
              >
                <Icon className={cx('mt-0.5 size-5 shrink-0', f.visibility === v ? 'text-signal' : 'text-muted')} />
                <span>
                  <span className="block font-bold">{title}</span>
                  <span className="text-sm text-muted">{text}</span>
                </span>
              </button>
            ))}
          </div>
          {f.visibility === 'public' && (
            <p className="mt-3 flex gap-2 text-sm text-[#8a5800]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> Do not write passwords, bank details or phone numbers here - everyone can read it.
            </p>
          )}
        </Card>

        {/* Optional extras, folded away so the form stays short. */}
        <Card className="p-0">
          <details className="group" open={!!(f.expected_result || files.length || errors.expected_result)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 sm:px-7">
              <span>
                <span className="block font-semibold">Add more details</span>
                <span className="text-sm text-muted">Optional: the result you expect, screenshots or a PDF</span>
              </span>
              <ChevronDown className="size-5 text-muted transition group-open:rotate-180" />
            </summary>
            <div className="space-y-6 border-t border-ink/8 p-5 sm:p-7">
          <Field label="What should the solution do?" error={errors.expected_result}>
            <Textarea value={f.expected_result} onChange={(e) => set('expected_result')(e.target.value)} className="min-h-24" placeholder="e.g. A report that builds itself and reaches the owner at 9 pm." />
            <span className="mt-1 flex justify-end gap-2 text-xs text-muted">
              <Counter value={f.expected_result} max={L.expected} />
            </span>
          </Field>

          <div>
            <p className="mb-2 text-sm font-semibold">Screenshots or PDF</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="border border-dashed border-ink/20 bg-paper p-4"
            >
              {files.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {files.map((x, i) => (
                    <li key={x.id ?? `${x.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                      {(x.type || x.file_type)?.startsWith('image/') ? <ImageIcon className="size-4 text-muted" /> : <FileText className="size-4 text-muted" />}
                      <span className="min-w-0 flex-1 truncate">{x.name ?? x.file_name}</span>
                      <span className="text-xs text-muted">{fmtBytes(x.size)}</span>
                      {x.url && (
                        <a href={x.url} target="_blank" rel="noreferrer" className="p-1 text-muted hover:text-ink" aria-label="Preview">
                          <Eye className="size-4" />
                        </a>
                      )}
                      <button type="button" onClick={() => removeFile(i)} className="p-1 text-muted hover:text-problem" aria-label={`Remove ${x.name ?? x.file_name}`}>
                        {editing ? <Trash2 className="size-4" /> : <X className="size-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
              <button type="button" disabled={files.length >= L.filesPerPds} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 text-sm font-semibold text-signal-600 disabled:text-muted">
                <Paperclip className="size-4" /> {files.length ? 'Add another file' : 'Add a screenshot or PDF'}
              </button>
              <p className="mt-1 text-xs text-muted">Up to {L.filesPerPds} files · JPG, PNG or PDF · max {fmtBytes(L.fileBytes)} each.</p>
            </div>
          </div>
            </div>
          </details>
        </Card>

        {similar.length > 0 && (
          <Card className="border-software/30 bg-software/5 p-5">
            <p className="flex items-center gap-2 font-bold text-software">
              <Lightbulb className="size-4" /> Someone may have shared this already
            </p>
            <p className="mt-1 text-sm text-muted">If one is the same, upvote or comment there instead.</p>
            <ul className="mt-3 space-y-1.5">
              {similar.map((s) => (
                <li key={s.code}>
                  <Link to={`/pds/${s.code}`} target="_blank" className="text-sm font-semibold hover:text-signal-600 hover:underline">
                    {s.title}
                  </Link>{' '}
                  <span className="text-xs text-muted">
                    · {s.upvotes} upvotes · {s.comments} comments
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Alert>{err}</Alert>

        <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-xl border border-ink/8 bg-white/95 p-3 shadow-card backdrop-blur sm:flex-row sm:items-center lg:bottom-4">
          <p className="text-sm text-muted sm:mr-auto">
            <b className="text-ink">{required} of 4</b> required answers done
          </p>
          {status === 'draft' && (
            <Button variant="outline" onClick={() => save('draft')} loading={busy === 'draft'} disabled={!!busy}>
              Save draft
            </Button>
          )}
          <Button onClick={() => save('submit')} loading={busy === 'submit'} disabled={!!busy}>
            <Send className="size-4" /> {status === 'draft' ? 'Send to the team' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
