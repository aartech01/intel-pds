import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Download, Plus, Printer, QrCode, Trash2 } from 'lucide-react';
import { PageHeader } from './Layout.jsx';
import { Alert, Button, Card, Empty, Input, Modal, Spinner, Toggle, cx } from '../../components/ui.jsx';
import { api, downloadFile } from '../../lib/api.js';
import { useConfig } from '../../lib/context.jsx';
import { useLive } from '../../lib/live.js';

const img = (id, size = 400) => `/api/admin/qr/${id}/image?size=${size}`;

/** AD-11: QR codes labelled by source. Scanning opens sign up / login, then the PDS form. */
export default function QrCodes() {
  const { config } = useConfig();
  const [rows, setRows] = useState(null);
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');
  const [print, setPrint] = useState(null);
  const [copied, setCopied] = useState('');
  const startLink = `${window.location.origin}/start`;

  const load = useCallback(() => api('/admin/qr').then(setRows).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  useLive(['qr'], load);

  const create = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api('/admin/qr', { method: 'POST', body: { label } });
      setLabel('');
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  };
  const update = async (id, body) => {
    await api(`/admin/qr/${id}`, { method: 'PATCH', body });
    load();
  };
  const remove = async (q) => {
    if (!window.confirm(`Delete "${q.label}"? Printed copies will open the home page instead.`)) return;
    await api(`/admin/qr/${q.id}`, { method: 'DELETE' });
    load();
  };
  const copy = async (text, key) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="animate-rise">
      <PageHeader title="QR codes" subtitle="Scanning opens sign up / login, then the PDS form. Use one code per place to see where people come from." />

      <Card className="mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Sign-up link</p>
          <p className="truncate font-mono text-sm text-muted">{startLink}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => copy(startLink, 'link')}>
            {copied === 'link' ? <Check className="size-4 text-automation" /> : <Copy className="size-4" />} Copy
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Share your problem or idea with Intelligent Squad: ${startLink}`)}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">Share on WhatsApp</Button>
          </a>
        </div>
      </Card>

      <form onSubmit={create} className="mb-6 flex flex-col gap-2 sm:flex-row">
        <Input className="sm:max-w-sm" placeholder='Label, e.g. "College event" or "Shop poster"' value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button disabled={!label.trim()}>
          <Plus className="size-4" /> New QR code
        </Button>
      </form>
      <Alert>{err}</Alert>

      {!rows ? (
        <Spinner />
      ) : !rows.length ? (
        <Card><Empty icon={QrCode} title="No QR codes yet">Create one for each poster, card or event.</Empty></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((q) => (
            <Card key={q.id} className={cx('overflow-hidden', !q.is_active && 'opacity-70')}>
              <div className="relative grid place-items-center bg-paper p-6">
                <img src={img(q.id)} alt={`QR code for ${q.label}`} className={cx('size-44 bg-white p-2 shadow-sm', !q.is_active && 'grayscale')} />
                {!q.is_active && <span className="absolute right-3 top-3 bg-ink px-2.5 py-1 text-xs font-semibold text-bone">Paused</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <input
                    defaultValue={q.label}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== q.label && update(q.id, { label: e.target.value })}
                    className="min-w-0 flex-1 bg-transparent text-lg font-bold focus:bg-paper focus:outline-none"
                    aria-label="QR label"
                  />
                  <Toggle checked={!!q.is_active} onChange={(v) => update(q.id, { is_active: v })} label="Active" />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span><b className="font-mono">{q.scan_count}</b> <span className="text-muted">scans</span></span>
                  <span><b className="font-mono">{q.signups}</b> <span className="text-muted">sign-ups</span></span>
                  {q.scan_count > 0 && <span className="text-muted">{Math.round((q.signups / q.scan_count) * 100)}% sign up</span>}
                </div>
                <p className="mt-2 truncate font-mono text-xs text-muted">{q.url}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadFile(`/admin/qr/${q.id}/image?format=png&download=1`, `${q.slug}.png`)}>
                    <Download className="size-4" /> PNG
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadFile(`/admin/qr/${q.id}/image?format=svg&download=1`, `${q.slug}.svg`)}>SVG</Button>
                  <Button size="sm" variant="outline" onClick={() => setPrint(q)}>
                    <Printer className="size-4" /> Poster / PDF
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copy(q.url, q.id)} aria-label="Copy link">
                    {copied === q.id ? <Check className="size-4 text-automation" /> : <Copy className="size-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-problem" onClick={() => remove(q)} aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!print} onClose={() => setPrint(null)} title="Printable poster" wide>
        {print && <Poster q={print} team={config?.branding.team_name} />}
      </Modal>
    </div>
  );
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** A4 poster preview; "Save as PDF" from the browser print dialog. */
function Poster({ q, team }) {
  const printIt = () => {
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) return;
    const src = new URL(img(q.id, 1200), window.location.origin).href;
    w.document.write(`<!doctype html><html><head><title>${esc(q.label)} - IntelSquad QR</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;800;900&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Archivo,sans-serif;background:#070139;color:#ECEEF6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.p{width:210mm;height:297mm;padding:22mm 20mm;display:flex;flex-direction:column;background-image:linear-gradient(rgba(236,238,246,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(236,238,246,.06) 1px,transparent 1px);background-size:9mm 9mm}
.k{font-family:'IBM Plex Mono',monospace;font-size:11pt;letter-spacing:.2em;text-transform:uppercase;color:#FF5C5C}
h1{font-size:44pt;line-height:1.02;margin:8mm 0 0;font-weight:900}h1 span{color:#FF5C5C}
.s{font-size:15pt;opacity:.7;margin-top:6mm;max-width:150mm}
.q{margin:auto;background:#fff;padding:8mm;box-shadow:0 0 0 2mm #B30405}.q img{width:95mm;height:95mm;display:block}
.f{display:flex;justify-content:space-between;align-items:end;font-size:12pt;opacity:.65}.dot{display:inline-block;width:4mm;height:4mm;background:#B30405;margin-right:2mm}</style></head>
<body><div class="p"><div class="k"><span class="dot"></span>${esc(team ?? 'Intelligent Squad')}</div>
<h1>Got a problem or an idea? <span>We will build it.</span></h1>
<div class="s">Scan, sign up in a minute and write a short PDS. The community adds ideas and you pick your development slot.</div>
<div class="q"><img src="${src}" onload="setTimeout(()=>print(),300)"></div>
<div class="f"><span>Free · Works on any phone · Your data stays private</span><span>IntelSquad · ${esc(q.label)}</span></div></div></body></html>`);
    w.document.close();
  };

  return (
    <div>
      <div className="graph-paper mx-auto aspect-[210/297] w-full max-w-sm bg-ink p-6 text-bone">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal-400">● {team}</p>
        <p className="mt-3 text-2xl font-black leading-tight">
          Got a problem or an idea? <span className="text-signal-400">We will build it.</span>
        </p>
        <p className="mt-2 text-xs text-bone/60">Scan, sign up and write a short PDS.</p>
        <div className="mx-auto mt-6 w-fit bg-white p-3 ring-4 ring-signal">
          <img src={img(q.id)} alt="" className="size-36" />
        </div>
        <p className="mt-6 text-[10px] text-bone/50">IntelSquad · {q.label}</p>
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={printIt}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
      </div>
    </div>
  );
}
