/**
 * Referral attribution helpers.
 *
 * Flow:
 *  - Page loads with `?ref=CODE` → capture and persist as the active attribution.
 *  - When the user signs in, derive their own referral code from their stable id.
 *  - When the user subscribes (Stripe or crypto), pass the captured `ref` so the
 *    backend can credit the referrer. The frontend just exposes the link / code.
 *
 * No PII leaks to the URL; codes are short hashes of the uid.
 */

const ATTRIBUTION_KEY = 'devibe_ref_attribution';
const MY_CODE_KEY = 'devibe_ref_my_code';
const REFERRAL_QUERY = 'ref';

/** Read `?ref=CODE` from the current URL and persist it (first one wins). */
export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get(REFERRAL_QUERY);
    if (!code) return getAttribution();

    const cleaned = code.trim().slice(0, 32).replace(/[^A-Za-z0-9_-]/g, '');
    if (!cleaned) return getAttribution();

    // First touch wins so a re-share doesn't overwrite the original credit.
    if (!localStorage.getItem(ATTRIBUTION_KEY)) {
      localStorage.setItem(ATTRIBUTION_KEY, cleaned);
    }

    // Strip ref from the URL so it doesn't get bookmarked / shared further.
    params.delete(REFERRAL_QUERY);
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', next);

    return cleaned;
  } catch {
    return null;
  }
}

export function getAttribution(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ATTRIBUTION_KEY);
}

export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ATTRIBUTION_KEY);
}

/** Derive a stable 8-char referral code from the user's id. */
export function deriveReferralCode(uid: string): string {
  // Cheap deterministic hash — good enough for short shareable codes.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(8, '0').slice(0, 8);
}

export function getMyReferralCode(uid: string | null | undefined): string | null {
  if (!uid) return null;
  const cached = localStorage.getItem(MY_CODE_KEY);
  if (cached && cached.startsWith(`${uid}:`)) return cached.split(':')[1] ?? null;
  const code = deriveReferralCode(uid);
  localStorage.setItem(MY_CODE_KEY, `${uid}:${code}`);
  return code;
}

export function buildReferralLink(code: string): string {
  if (typeof window === 'undefined') return `?ref=${code}`;
  return `${window.location.origin}/?ref=${code}`;
}

/** Best-effort signup track. Safe to call on every successful sign-in. */
export async function trackReferralSignup(opts: { userId: string }): Promise<void> {
  const ref = getAttribution();
  if (!ref) return;
  try {
    await fetch('/api/referral/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref, userId: opts.userId }),
    });
  } catch {
    // Silent — tracking failures must not block onboarding.
  }
}
