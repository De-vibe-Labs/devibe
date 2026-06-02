import React, { useState } from 'react';
import { CreditCard, Bitcoin, Check, Loader2, Copy, ExternalLink, Wallet } from 'lucide-react';
import { encodeFunctionData, parseAbi } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { getAttribution } from '../lib/referral';

type PlanKey = 'starter' | 'pro' | 'team';

interface Plan {
  key: PlanKey;
  name: string;
  priceUsd: number;
  blurb: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    priceUsd: 20,
    blurb: 'For solo founders shipping their first app.',
    features: ['5 active projects', 'Unlimited prompts', 'Live IDE + Sandpack preview', 'Community support'],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceUsd: 49,
    blurb: 'For builders running multiple products.',
    features: ['Unlimited projects', 'Priority Gemini quota', 'Expo template + Snack preview', 'GitHub export', 'Email support'],
  },
  {
    key: 'team',
    name: 'Team',
    priceUsd: 149,
    blurb: 'Agencies and dev houses on Devibe Marketplace.',
    features: ['Everything in Pro', 'Marketplace job priority', 'Escrow with reduced fees', '24/7 support'],
  },
];

interface CryptoIntent {
  id: string;
  plan: string;
  amountUsd: number;
  amountAtomic: string;
  token: 'USDC';
  chain: string;
  chainId: number;
  chainName: string;
  tokenAddress: string;
  receiver: string;
  status: 'pending' | 'submitted' | 'confirmed';
  txHash?: string;
}

interface Props {
  userId: string | null;
  isPrivyConfigured: boolean;
}

export function BillingPanel({ userId, isPrivyConfigured }: Props) {
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [busyMode, setBusyMode] = useState<'card' | 'crypto' | null>(null);
  const [intent, setIntent] = useState<CryptoIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCard = async (plan: PlanKey) => {
    setBusyPlan(plan); setBusyMode('card'); setError(null);
    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId,
          ref: getAttribution(),
          successUrl: `${window.location.origin}/?subscribed=1`,
          cancelUrl: `${window.location.origin}/?subscribe_cancelled=1`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.assign(data.url);
    } catch (err: any) {
      setError(err.message || 'Card checkout failed');
    } finally {
      setBusyPlan(null); setBusyMode(null);
    }
  };

  const startCrypto = async (plan: PlanKey) => {
    setBusyPlan(plan); setBusyMode('crypto'); setError(null);
    try {
      const resp = await fetch('/api/billing/crypto-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, userId, ref: getAttribution() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Could not create payment intent');
      setIntent(data);
    } catch (err: any) {
      setError(err.message || 'Crypto intent failed');
    } finally {
      setBusyPlan(null); setBusyMode(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div key={plan.key} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{plan.name}</h3>
              <span className="text-[10px] font-mono text-violet-400 uppercase">{plan.key}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">{plan.blurb}</p>
            <div className="text-3xl font-display font-extrabold text-white">
              ${plan.priceUsd}
              <span className="text-[10px] font-mono font-medium text-slate-500"> /mo</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1.5 mt-3 mb-4 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => startCard(plan.key)}
                disabled={busyPlan !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition"
              >
                {busyPlan === plan.key && busyMode === 'card' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5" />
                )}
                Subscribe with card
              </button>
              <button
                onClick={() => startCrypto(plan.key)}
                disabled={busyPlan !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50 transition"
              >
                {busyPlan === plan.key && busyMode === 'crypto' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Bitcoin className="w-3.5 h-3.5 text-amber-400" />
                )}
                Pay with crypto (USDC)
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </p>
      )}

      {intent && (
        <CryptoModal
          intent={intent}
          isPrivyConfigured={isPrivyConfigured}
          onClose={() => setIntent(null)}
          onConfirmed={(confirmed) => setIntent(confirmed)}
        />
      )}
    </div>
  );
}

// ————— Crypto payment modal —————

interface ModalProps {
  intent: CryptoIntent;
  isPrivyConfigured: boolean;
  onClose: () => void;
  onConfirmed: (intent: CryptoIntent) => void;
}

function CryptoModal({ intent, isPrivyConfigured, onClose, onConfirmed }: ModalProps) {
  const [txHash, setTxHash] = useState(intent.txHash ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (hash: string) => {
    setSubmitting(true); setErr(null);
    try {
      const resp = await fetch('/api/billing/crypto-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId: intent.id, txHash: hash }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Confirm failed');
      onConfirmed(data);
    } catch (e: any) {
      setErr(e.message || 'Could not confirm payment');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmed = intent.status === 'confirmed';

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[81] w-[92%] max-w-md bg-[#0F1424] border border-slate-800 rounded-2xl shadow-2xl shadow-violet-950/40 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">USDC subscription</span>
            <h3 className="text-base font-bold text-white mt-0.5">${intent.amountUsd} on {intent.chainName}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Send <span className="font-mono text-amber-200">{intent.amountUsd} USDC</span> on <span className="font-mono">{intent.chainName}</span> to activate the {intent.plan} plan.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none px-2">×</button>
        </div>

        {confirmed ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center">
            <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-emerald-300">Payment recorded</p>
            <p className="text-[10px] text-slate-400 font-mono break-all mt-1">{intent.txHash}</p>
          </div>
        ) : (
          <>
            <CopyRow label="RECEIVER" value={intent.receiver} mono />
            <CopyRow label="AMOUNT (atomic)" value={intent.amountAtomic} mono />
            <CopyRow label="USDC CONTRACT" value={intent.tokenAddress} mono />
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg p-2 mt-2">
              <span className="text-[10px] font-mono text-slate-500 px-1">CHAIN</span>
              <span className="text-xs font-mono text-slate-200">{intent.chainName} (id {intent.chainId})</span>
            </div>

            {isPrivyConfigured && <PrivyAutoPay intent={intent} onSubmitted={submit} />}

            <div className="mt-4">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Transaction hash</label>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value.trim())}
                placeholder="0x…"
                spellCheck={false}
                className="w-full bg-slate-950/60 border border-slate-700 focus:border-violet-500/60 outline-none rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 px-3 py-2"
              />
              <button
                onClick={() => submit(txHash)}
                disabled={submitting || !/^0x[a-fA-F0-9]{64}$/.test(txHash)}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-40 text-white text-xs font-semibold transition"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm payment
              </button>
              {err && <p className="mt-2 text-[11px] text-red-400">{err}</p>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-lg p-2 mt-2">
      <span className="text-[10px] font-mono text-slate-500 px-1 shrink-0">{label}</span>
      <code className={`text-xs ${mono ? 'font-mono' : ''} text-slate-200 truncate flex-1`}>{value}</code>
      <button
        onClick={() => navigator.clipboard.writeText(value)}
        className="px-2 py-0.5 text-[10px] text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded"
      >
        <Copy className="w-3 h-3" />
      </button>
    </div>
  );
}

// ————— Privy wallet auto-pay (only mounted when Privy is configured) —————

function PrivyAutoPay({ intent, onSubmitted }: { intent: CryptoIntent; onSubmitted: (hash: string) => void }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets?.[0];
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    if (!wallet) { setErr('No wallet connected.'); return; }
    setPaying(true); setErr(null);
    try {
      await wallet.switchChain(intent.chainId);
      const data = encodeFunctionData({
        abi: parseAbi(['function transfer(address to, uint256 amount) returns (bool)']),
        functionName: 'transfer',
        args: [intent.receiver as `0x${string}`, BigInt(intent.amountAtomic)],
      });
      const provider = await wallet.getEthereumProvider();
      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: wallet.address, to: intent.tokenAddress, data }],
      }) as string;
      onSubmitted(hash);
    } catch (e: any) {
      setErr(e?.message || 'Wallet transfer failed');
    } finally {
      setPaying(false);
    }
  };

  if (!ready) return null;
  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
      >
        <Wallet className="w-3.5 h-3.5" />
        Connect a wallet with Privy
      </button>
    );
  }

  return (
    <div className="mt-3">
      <button
        onClick={pay}
        disabled={paying || !wallet}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-50 transition"
      >
        {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
        Pay {intent.amountUsd} USDC from {wallet?.walletClientType ?? 'wallet'}
      </button>
      {wallet && (
        <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">From: {wallet.address}</p>
      )}
      {err && <p className="text-[10px] text-red-400 mt-1">{err}</p>}
      <a
        href={`${chainExplorer(intent.chainId)}/address/${intent.receiver}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mt-1"
      >
        View receiver on explorer <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function chainExplorer(chainId: number): string {
  switch (chainId) {
    case 1: return 'https://etherscan.io';
    case 137: return 'https://polygonscan.com';
    case 8453: return 'https://basescan.org';
    default: return 'https://etherscan.io';
  }
}

export default BillingPanel;
