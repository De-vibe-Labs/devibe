import React, { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Wallet, Loader2 } from 'lucide-react';

interface Props {
  /** Called once when Privy reports the user as authenticated. */
  onAuthenticated?: (user: { id: string; email?: string | null }) => void;
  className?: string;
  label?: string;
}

/**
 * Privy sign-in button. Must be rendered inside <PrivyAppProvider>. It calls
 * `onAuthenticated` exactly once per session when login finishes — App.tsx
 * uses that to advance past the login screen, same as the Firebase path.
 */
export function PrivyAuthButton({ onAuthenticated, className, label }: Props) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  useEffect(() => {
    if (authenticated && user && onAuthenticated) {
      const email = user.email?.address ?? user.google?.email ?? null;
      onAuthenticated({ id: user.id, email });
    }
  }, [authenticated, user, onAuthenticated]);

  return (
    <button
      type="button"
      onClick={authenticated ? logout : login}
      disabled={!ready}
      className={
        className ??
        'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-semibold text-sm transition active:scale-95 disabled:opacity-60'
      }
    >
      {!ready ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4 text-violet-400" />
      )}
      <span>{authenticated ? 'Sign out of Privy' : label ?? 'Continue with Privy (wallet / email)'}</span>
    </button>
  );
}
