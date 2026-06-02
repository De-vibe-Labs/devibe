import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { PrivyAppProvider } from './lib/privy-provider.tsx';
import { captureReferralFromUrl } from './lib/referral.ts';

// Capture `?ref=CODE` before React mounts so the first paint already has it.
captureReferralFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyAppProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PrivyAppProvider>
  </StrictMode>,
);
