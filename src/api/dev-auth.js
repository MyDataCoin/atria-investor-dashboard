/**
 * DEV-ONLY auto-login.
 *
 * So the dashboard is always signed in as a test investor during local dev
 * without pasting a token into localStorage on every reload. Never runs in a
 * production build (`import.meta.env.DEV` is false there).
 *
 * How it works: a long-lived REFRESH token for the test user lives in
 * `.env.local` (VITE_DEV_REFRESH_TOKEN). On boot we exchange it via
 * `POST /auth/refresh` for a fresh access token and store both. The backend
 * rotates the refresh token on each call, so we persist the rotated one in
 * localStorage and prefer it next time — the env value is only the seed.
 *
 * Getting the seed once (test user +996770535395):
 *   BASE=https://atria-api.eaysdev.online/api/v1
 *   curl -sX POST $BASE/auth/register/phone/request-otp \
 *     -H 'Content-Type: application/json' -d '{"phone":"+996770535395"}'
 *   curl -sX POST $BASE/auth/register/phone/verify-otp \
 *     -H 'Content-Type: application/json' \
 *     -d '{"phone":"+996770535395","code":"<из СМС>"}'
 *   # -> возьми refreshToken из ответа в .env.local:
 *   #    VITE_DEV_REFRESH_TOKEN=<refreshToken>
 */

const ACCESS_KEY = 'atria_access_token';
const EXP_KEY = 'atria_access_expires';
const REFRESH_KEY = 'atria_refresh_token';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function accessStillValid() {
  const token = localStorage.getItem(ACCESS_KEY);
  const exp = localStorage.getItem(EXP_KEY);
  if (!token || !exp) return false;
  // 60s safety margin so we don't hand out a token about to expire.
  return new Date(exp).getTime() - Date.now() > 60_000;
}

async function refresh(refreshToken) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error(`refresh failed (${res.status})`);
  return res.json(); // { accessToken, expiresAtUtc, refreshToken }
}

/**
 * Ensure a valid access token before the app renders. Returns quietly on any
 * failure — dev auth must never block the app; you can still paste a token by
 * hand. Await this in dev before mounting React.
 */
export async function ensureDevSession() {
  if (!import.meta.env.DEV) return;

  const seed = import.meta.env.VITE_DEV_REFRESH_TOKEN;
  const stored = localStorage.getItem(REFRESH_KEY);
  const refreshToken = stored || seed;
  if (!refreshToken) return; // no seed configured — leave manual login intact

  if (accessStillValid()) return;

  try {
    const tokens = await refresh(refreshToken);
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    if (tokens.expiresAtUtc) localStorage.setItem(EXP_KEY, tokens.expiresAtUtc);
    if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch (err) {
    // Seed likely expired/rotated away — clear the stale stored one so the env
    // seed is retried on the next reload, and log a hint.
    localStorage.removeItem(REFRESH_KEY);
    console.warn('[dev-auth] auto-login failed:', err.message,
      '\nОбнови VITE_DEV_REFRESH_TOKEN в .env.local (см. src/api/dev-auth.js).');
  }
}
