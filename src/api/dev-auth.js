/**
 * DEV-ONLY auto-login.
 *
 * So the dashboard is always signed in as a test investor during local dev
 * without pasting a token into localStorage on every reload. Never runs in a
 * production build (`import.meta.env.DEV` is false there).
 *
 * How it works: the dev backend accepts a HARDCODED OTP code, so on boot we call
 * verify-otp DIRECTLY with it and store the fresh access token. We never call
 * request-otp, so NO SMS is ever sent. Every reload mints a brand-new token, so
 * nothing can "expire" or get rotated out from under us (unlike stashing a
 * single-use refresh token, which dies the moment localStorage is cleared).
 *
 * Access tokens are short-lived (~15 min), so we re-login whenever the stored one
 * is missing or within 60s of expiry.
 *
 * Config in `.env.local` (all optional — sensible defaults for the test user):
 *   VITE_DEV_PHONE     phone to log in as   (default +996770535395)
 *   VITE_DEV_OTP_CODE  hardcoded dev code   (default 111111)
 *   VITE_DEV_AUTOLOGIN set to 0/false to disable auto-login entirely
 */

const ACCESS_KEY = 'atria_access_token';
const EXP_KEY = 'atria_access_expires';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const PHONE = import.meta.env.VITE_DEV_PHONE ?? '+996770535395';
const OTP_CODE = import.meta.env.VITE_DEV_OTP_CODE ?? '111111';

function disabled() {
  const f = import.meta.env.VITE_DEV_AUTOLOGIN;
  return f === '0' || f === 'false';
}

function accessStillValid() {
  const token = localStorage.getItem(ACCESS_KEY);
  const exp = localStorage.getItem(EXP_KEY);
  if (!token || !exp) return false;
  // 60s safety margin so we don't hand out a token about to expire.
  return new Date(exp).getTime() - Date.now() > 60_000;
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.status === 204 ? null : res.json();
}

/**
 * Ensure a valid access token before the app renders. Returns quietly on any
 * failure — dev auth must never block the app; you can still paste a token by
 * hand. Await this in dev before mounting React.
 */
export async function ensureDevSession() {
  if (!import.meta.env.DEV || disabled()) return;
  if (accessStillValid()) return;

  try {
    // Hardcoded dev OTP — verify directly, NO request-otp, so no SMS is ever sent.
    const tokens = await post('/auth/register/phone/verify-otp', { phone: PHONE, code: OTP_CODE });
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    if (tokens.expiresAtUtc) localStorage.setItem(EXP_KEY, tokens.expiresAtUtc);
  } catch (err) {
    console.warn('[dev-auth] auto-login failed:', err.message,
      '\nПроверь VITE_DEV_PHONE / VITE_DEV_OTP_CODE в .env.local (см. src/api/dev-auth.js).');
  }
}
