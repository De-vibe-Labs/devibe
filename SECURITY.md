# Security & Secrets

This is a public-source repo. Treat any value committed here as world-readable.

## Privy

| Value | Where it lives | Why |
| --- | --- | --- |
| **App ID** (`cmpwjk2rq01ab0clisu41dpl9` shape) | `VITE_PRIVY_APP_ID` — client bundle | Public by design; Privy SDK needs it in the browser. |
| **App Secret** (`privy_app_secret_…`) | **Never in this repo, never `VITE_` prefixed.** | Lets the holder mint sessions and impersonate users. Server-side only, in a secrets manager (Vercel "encrypted" env var, Doppler, AWS SM, etc.). |

If a secret is ever pasted into a chat / commit / log: **rotate immediately** in the Privy dashboard (Settings → API Keys), then update the secret store. Rotation invalidates the leaked value. Don't try to recover it.

## Firebase

The Firebase **Web API key** (`apiKey` in `firebase-applet-config.json`) is *not* a secret — it identifies the project to Google and is meant to ship to the browser. Access is controlled by:

1. The **authorized-domains** allowlist in *Firebase Console → Authentication → Settings*. If sign-in fails with `auth/unauthorized-domain`, add the deployed origin there.
2. Firestore / Storage security rules.

The Firebase **service-account JSON** (used in Admin SDK on the backend) *is* a secret. We don't use it in this repo. If you ever add Admin SDK, the credentials go in a server-only env var.

## GitHub

The PAT used by `/api/github/push-files` is sent client-side at request time and stored in `localStorage` under `devibe_github_token`. Treat it like a session token. If a token leaks, revoke it at https://github.com/settings/tokens.

## Stripe (when added)

`STRIPE_SECRET_KEY` is server-only, never `VITE_` prefixed. The publishable key (`pk_*`) is fine in the client.

## Env-var naming convention

| Prefix | Visibility |
| --- | --- |
| `VITE_*` | **Embedded in the client bundle.** Public — anyone can read it from DevTools. |
| (no prefix) | Server-side only. Only the Node process running `server.ts` ever sees it. |

If you're unsure whether a value should ship in the browser, the safe default is **no prefix** (server-only).
