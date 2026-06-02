import React, { useState } from 'react';
import { CreditCard, Building2, Upload, Check, Loader2, ExternalLink, X } from 'lucide-react';

type Method = 'stripe' | 'open-banking' | 'screenshot';

export interface FundingResult {
  jobId: string;
  method: Method;
  status: 'pending' | 'verifying' | 'funded' | 'rejected';
  amountUsd: number;
  evidence?: { kind: string; ref: string };
  redirectUrl?: string;
  url?: string;
  queuedForReview?: boolean;
}

interface Props {
  jobId: string;
  amountUsd: number;
  userId: string | null;
  onClose: () => void;
  onFunded: (result: FundingResult) => void;
}

const METHODS: { key: Method; label: string; blurb: string; icon: typeof CreditCard; verifyTime: string }[] = [
  { key: 'stripe', label: 'Card via Stripe', blurb: 'Instant. Card or Apple Pay through Stripe Checkout.', icon: CreditCard, verifyTime: 'Funds escrowed instantly' },
  { key: 'open-banking', label: 'Open Banking', blurb: 'Pay directly from your bank — no card fees.', icon: Building2, verifyTime: 'Verifies in ~30 seconds' },
  { key: 'screenshot', label: 'Bank transfer + screenshot', blurb: 'Wire / SEPA / ACH manually, then upload the confirmation.', icon: Upload, verifyTime: 'Manual review (under 24h)' },
];

export function JobFundingModal({ jobId, amountUsd, userId, onClose, onFunded }: Props) {
  const [method, setMethod] = useState<Method>('stripe');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      if (method === 'screenshot') {
        // Screenshot path is handled inline (file input).
        setBusy(false);
        return;
      }
      const path = method === 'stripe' ? 'stripe' : 'open-banking';
      const resp = await fetch(`/api/billing/job-escrow/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId, amountUsd, userId,
          successUrl: `${window.location.origin}/?escrow_funded=${jobId}`,
          cancelUrl: `${window.location.origin}/?escrow_cancelled=${jobId}`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Funding failed');
      onFunded(data);
      if (data.url) window.location.assign(data.url);
      else if (data.redirectUrl) {
        // For open-banking we don't navigate (placeholder); just close + report.
        onClose();
      }
    } catch (e: any) {
      setErr(e.message || 'Funding failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[94%] max-w-lg bg-[#0F1424] border border-slate-800 rounded-2xl shadow-2xl shadow-violet-950/40 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] font-mono text-violet-400 uppercase tracking-wider">Fund escrow</span>
            <h3 className="text-base font-bold text-white mt-0.5">${amountUsd} USD → escrow for job {jobId}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Funds are held until the founder validates the job. Pick how to pay.</p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-white text-xl leading-none px-2 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg border transition ${
                  active
                    ? 'bg-violet-600/15 border-violet-500/50'
                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-violet-300' : 'text-slate-400'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.blurb}</div>
                  <div className="text-[9px] font-mono text-emerald-400 mt-0.5">{m.verifyTime}</div>
                </div>
              </button>
            );
          })}
        </div>

        {method === 'screenshot' ? (
          <ScreenshotUpload jobId={jobId} amountUsd={amountUsd} userId={userId} onClose={onClose} onFunded={onFunded} />
        ) : method === 'open-banking' ? (
          <OpenBankingPanel busy={busy} onSubmit={submit} />
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            <span>Continue to Stripe — ${amountUsd}</span>
          </button>
        )}

        {err && <p className="mt-3 text-[11px] text-red-400">{err}</p>}
      </div>
    </>
  );
}

function OpenBankingPanel({ busy, onSubmit }: { busy: boolean; onSubmit: () => void }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-slate-400 bg-slate-950/60 border border-slate-800 rounded p-2">
        We'll send you to your bank to approve the transfer. The funds land in escrow as soon as the bank confirms (usually under a minute).
        Provider integration is pending — this button currently records a verifying intent.
      </p>
      <button
        onClick={onSubmit}
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
        <span>Connect bank & pay</span>
      </button>
    </div>
  );
}

function ScreenshotUpload({ jobId, amountUsd, userId, onClose, onFunded }: {
  jobId: string; amountUsd: number; userId: string | null;
  onClose: () => void; onFunded: (r: FundingResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onPick = (f: File | null) => {
    if (!f) { setFile(null); setPreview(null); return; }
    if (f.size > 4 * 1024 * 1024) { setErr('Image too large (max 4MB)'); return; }
    setErr(null); setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    if (!preview) { setErr('Select a screenshot first.'); return; }
    setBusy(true); setErr(null);
    try {
      const resp = await fetch('/api/billing/job-escrow/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, amountUsd, userId, screenshotDataUrl: preview, note }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Upload failed');
      onFunded(data);
      onClose();
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-slate-950/60 border border-slate-800 rounded p-2 text-[10px] text-slate-400 leading-relaxed">
        Send <span className="font-mono text-amber-200">${amountUsd}</span> via wire / SEPA / ACH, then attach the bank confirmation screenshot. We'll release the funds to escrow once a reviewer verifies it (typically within 24 hours).
      </div>
      <label className="block">
        <div className="bg-slate-900 border border-dashed border-slate-700 hover:border-violet-500/50 rounded-lg p-4 text-center cursor-pointer transition">
          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <div className="text-xs text-slate-300">{file ? file.name : 'Click to upload screenshot (PNG / JPG)'}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Max 4MB</div>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {preview && (
        <img src={preview} alt="Receipt preview" className="max-h-40 mx-auto rounded border border-slate-700" />
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional: reference / memo / bank name"
        className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500/60 outline-none rounded-lg text-xs text-slate-100 placeholder-slate-500 px-3 py-2 resize-none"
      />
      <button
        onClick={submit}
        disabled={busy || !preview}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Submit for review
      </button>
      {err && <p className="text-[11px] text-red-400">{err}</p>}
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300"
      >
        Bank details for transfer <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

export default JobFundingModal;
