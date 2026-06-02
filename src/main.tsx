import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { captureReferralFromUrl } from './lib/referral.ts';

// Capture `?ref=CODE` before React mounts so the first paint already has it.
captureReferralFromUrl();

const env = ((import.meta as unknown as { env: Record<string, string | undefined> }).env) ?? {};
const PRIVY_APP_ID = (env.VITE_PRIVY_APP_ID || '').trim();

const Identity = ({ children }: { children: ReactNode }) => <>{children}</>;

// Only pull in the Privy SDK (~775 KB gzipped) when a Privy app id is
// configured. Otherwise we render the app immediately with a no-op wrapper.
async function bootstrap() {
  let Wrap: (p: { children: ReactNode }) => ReactNode = Identity;
  if (PRIVY_APP_ID) {
    try {
      const mod = await import('./lib/privy-provider.tsx');
      Wrap = mod.PrivyAppProvider;
    } catch (err) {
      console.warn('Privy provider failed to load; continuing without it.', err);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Wrap>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Wrap>
    </StrictMode>,
  );
}

void bootstrap();
