import React, { type ReactNode } from 'react';
import { PrivyProvider as RawPrivyProvider } from '@privy-io/react-auth';

const APP_ID = ((import.meta as unknown as { env: Record<string, string | undefined> }).env
  ?.VITE_PRIVY_APP_ID || '').trim();

/** True only when a real Privy app id is configured at build time. */
export const isPrivyConfigured = (): boolean => Boolean(APP_ID);

/**
 * Wraps children with Privy when an app id is configured. When unconfigured
 * (e.g. local dev with no .env yet) children are rendered as-is so the rest
 * of the app keeps working without Privy.
 */
export function PrivyAppProvider({ children }: { children: ReactNode }) {
  if (!APP_ID) return <>{children}</>;
  return (
    <RawPrivyProvider
      appId={APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet', 'discord', 'twitter'],
        appearance: {
          theme: 'dark',
          accentColor: '#7C3AED',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </RawPrivyProvider>
  );
}
