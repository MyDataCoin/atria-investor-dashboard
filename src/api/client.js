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
 * Where the JWT lives.
 *
 * Auth happens on the main Atria site; this dashboard is a future subdomain,
 * so we do NOT run our own login. We only read whatever access token the main
 * site has already issued. Swap the body of this function when the real
 * shared-token mechanism (cookie / shared storage) is finalized.
 */
export function getAccessToken() {
  try {
    return localStorage.getItem('atria_access_token');
  } catch {
    return null;
  }
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
 * @param {object} [opts] { method, body, headers, auth, signal }
 *                        - body: plain object → JSON; FormData → sent as-is.
 *                        - auth: false to skip the bearer token (public routes).
 * @returns parsed JSON, or null for 204 No Content.
 */
export async function apiFetch(path, opts = {}) {
  const { method = 'GET', body, headers = {}, auth = true, signal } = opts;

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
    });
  } catch (networkErr) {
    if (networkErr?.name === 'AbortError') throw networkErr;
    throw new ApiError('Не удалось связаться с сервером Atria.', { status: 0 });
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
