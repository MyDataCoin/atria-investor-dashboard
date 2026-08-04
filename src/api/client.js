/**
 * Thin fetch wrapper around the Atria backend.
 *
 * Single place that knows the base URL, attaches the bearer token, and turns
 * RFC-7807 ProblemDetails responses into a normal thrown Error. Every feature
 * module (properties, investments, ...) builds on top of this — keep endpoint
 * specifics out of here.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_PREFIX = '/api/v1';

/**
 * Where the access token lives: in memory, for the life of the tab.
 *
 * Auth happens on the main Atria site; this dashboard is a future subdomain, so we do not run our
 * own login — we obtain a token by exchanging the session the main site already established.
 *
 * That exchange is the HttpOnly refresh cookie the API sets on /api/v1/auth. Reading the token out
 * of localStorage, as this used to, meant the credential sat where any script on the origin could
 * take it; and since the same key was shared with the admin dashboard, a compromise on one origin
 * reached the other. The cookie is not readable by script at all, so restoring a session is a call
 * to the server rather than a read from storage.
 */
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token ?? null;
}

/**
 * Exchanges the refresh cookie for a fresh access token. Resolves to true when a session was
 * restored. Concurrent callers share one in-flight request: firing several would rotate the token
 * out from under each other, and the server reads a replayed refresh token as a leak and revokes
 * the whole session.
 */
let restoreInFlight = null;

export function restoreSession() {
  if (!restoreInFlight) {
    restoreInFlight = fetch(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          return false;
        }

        const tokens = await res.json();
        accessToken = tokens.accessToken ?? null;
        return !!accessToken;
      })
      .catch(() => false)
      .finally(() => {
        restoreInFlight = null;
      });
  }

  return restoreInFlight;
}

/** Error carrying the parsed ProblemDetails so callers can branch on status. */
export class ApiError extends Error {
  constructor(message, { status, problem } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

async function parseBody(res) {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return res.json();
  if (contentType.includes('application/problem+json')) return res.json();
  return res.text();
}

/**
 * Perform a request against `/api/v1{path}`.
 *
 * @param {string} path   e.g. '/properties' or `/properties/${id}`
 * @param {object} [opts] { method, body, headers, auth, signal, raw }
 *                        - body: plain object → JSON; FormData → sent as-is.
 *                        - auth: false to skip the bearer token (public routes).
 *                        - raw: true to get the Response back (file downloads, where the caller
 *                          reads a blob; an <a href> would drop the bearer token).
 * @returns parsed JSON, null for 204 No Content, or the Response when `raw`.
 */
export async function apiFetch(path, opts = {}) {
  const { method = 'GET', body, headers = {}, auth = true, signal, raw = false, _retried } = opts;

  const finalHeaders = { Accept: 'application/json', ...headers };
  let finalBody = body;

  if (body != null && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  if (auth) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal,
      // Carries the HttpOnly refresh cookie, which is scoped to /api/v1/auth and so is not attached
      // to ordinary calls.
      credentials: 'include',
    });
  } catch (networkErr) {
    if (networkErr?.name === 'AbortError') throw networkErr;
    throw new ApiError('Не удалось связаться с сервером Atria.', { status: 0 });
  }

  // The access token lives in memory, so it is gone after a page reload while the session itself
  // continues in the refresh cookie. One transparent exchange turns that 401 into a working call
  // instead of an unnecessary trip back to the login screen.
  if (res.status === 401 && auth && !_retried && (await restoreSession())) {
    return apiFetch(path, { ...opts, _retried: true });
  }

  if (raw) {
    if (!res.ok) {
      const problem = await parseBody(res);
      throw new ApiError(
        problem?.detail || problem?.title || `Ошибка запроса (${res.status})`,
        { status: res.status, problem: typeof problem === 'object' ? problem : null }
      );
    }
    return res;
  }

  if (res.status === 204) return null;

  const payload = await parseBody(res);

  if (!res.ok) {
    const problem = typeof payload === 'object' ? payload : null;
    const message = problem?.detail || problem?.title || `Ошибка запроса (${res.status})`;
    throw new ApiError(message, { status: res.status, problem });
  }

  return payload;
}
