/**
 * Thin fetch wrapper around the Atria backend.
 *
 * Single place that knows the base URL, attaches the bearer token, and turns
 * RFC-7807 ProblemDetails responses into a normal thrown Error. Every feature
 * module (properties, investments, ...) builds on top of this — keep endpoint
 * specifics out of here.
 */

// In dev an empty base URL is right: requests go same-origin and the Vite proxy forwards them, so
// there is no CORS. A production build must NOT fall back to same-origin, though — that only works
// behind an nginx that proxies /api, and where there is none every call quietly hits the static host
// and the dashboard looks empty. So the deployed default is the real API, which is also same-site
// with app.atria.kg and therefore gets the refresh cookie.
const BASE_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL ?? '')
  : (import.meta.env.VITE_API_BASE_URL || 'https://api.atria.kg').replace(/\/+$/, '');
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
// UTC ms at which the access token stops being accepted. 0 = no session.
let accessExpiresAt = 0;
// Renews the token shortly BEFORE it expires, so ordinary calls stop discovering it as a 401.
let proactiveTimer = null;

// The access token lives ~15 minutes (Jwt:AccessTokenMinutes). Renewing this far ahead of the
// deadline keeps a request that is already in flight from arriving with a token that expired on the
// way, and covers a small clock difference between browser and server.
const EXPIRY_SKEW_MS = 60_000;

// Listeners told when the session is definitively over — the server refused the refresh token —
// as opposed to a refresh that merely could not be made right now (network down, API restarting).
// Only the first is worth sending someone back to the site to sign in for.
const sessionEndedHandlers = new Set();

/** Subscribe to "the session is over". Returns an unsubscribe function. */
export function onSessionEnded(handler) {
  sessionEndedHandlers.add(handler);
  return () => sessionEndedHandlers.delete(handler);
}

function notifySessionEnded() {
  sessionEndedHandlers.forEach((h) => {
    try {
      h();
    } catch {
      /* one broken listener must not stop the others */
    }
  });
}

/**
 * Роль, зашитая в access-токен, в нижнем регистре ('investor', 'admin', 'realtor', ...).
 *
 * Читаем полезную нагрузку без проверки подписи — намеренно: проверять её здесь нечем и незачем,
 * решение всё равно принимает сервер. Клиенту роль нужна ровно для одного — понять, ЧЬЯ это сессия.
 */
function roleOf(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json)?.role || '').toString().toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Кабинет инвестора принимает только сессию инвестора.
 *
 * Refresh-кука выписана на `.atria.kg` и общая для сайта, admin.atria.kg и этого домена — так и
 * задумано, один вход на всю зону. Но вход АДМИНА перезаписывает ту же куку, и тогда этот кабинет
 * восстанавливал из неё чужую сессию: интерфейс инвестора рисовался, имя оставалось заглушкой
 * «Инвестор», портфель — нулём, а `/payouts/me` отвечал 403, потому что роль не та. Со стороны это
 * выглядит как «токен не обновился», хотя токен свежий и полностью рабочий — просто не для этого
 * кабинета. Чужую сессию честнее не принимать вовсе.
 */
const REQUIRED_ROLE = 'investor';

// Слушатели «сессия есть, но она не инвесторская» — им показывают отдельный экран, а не форму входа:
// человек вошёл, просто не туда, и предлагать ему «войдите» бессмысленно.
const foreignSessionHandlers = new Set();

/** Подписка на «сессия принадлежит другой роли». Возвращает функцию отписки. */
/**
 * Subscribes to a session that appeared while this tab was already open — the mirror of
 * {@link onSessionEnded}. Without it the tab knows how to notice a session ending but not one
 * starting, and someone who signs in on the public site keeps looking at the sign-in prompt.
 */
const sessionRestoredHandlers = new Set();

export function onSessionRestored(handler) {
  sessionRestoredHandlers.add(handler);
  return () => sessionRestoredHandlers.delete(handler);
}

function notifySessionRestored() {
  sessionRestoredHandlers.forEach((h) => {
    try {
      h();
    } catch {
      /* один сломанный слушатель не должен ронять остальные */
    }
  });
}

export function onForeignSession(handler) {
  foreignSessionHandlers.add(handler);
  return () => foreignSessionHandlers.delete(handler);
}

// Роль чужой сессии, чтобы экран мог назвать её. Пусто, когда всё в порядке.
let foreignRole = '';

/** Роль чужой сессии ('admin', 'realtor', ...) или '' — сессия своя либо её нет. */
export function getForeignRole() {
  return foreignRole;
}

function notifyForeignSession(role) {
  foreignRole = role;
  foreignSessionHandlers.forEach((h) => {
    try {
      h(role);
    } catch {
      /* один сломанный слушатель не должен ронять остальные */
    }
  });
}

// One rotation per browser rather than per tab: the refresh token rotates on every use, so two tabs
// waking together present the same token twice. The server tolerates that race now, but sharing the
// result is quieter and faster — a tab that hears a fresh token adopts it instead of asking.
const authChannel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('atria-investor-auth');

if (authChannel) {
  authChannel.onmessage = (event) => {
    const msg = event.data;
    if (!msg) return;
    if (msg.type === 'tokens' && msg.accessToken && msg.expiresAt > accessExpiresAt) {
      // Та же проверка роли, что и в setTokens: вкладка-отправитель могла быть открыта под чужой
      // сессией, и принимать её на веру — значит обойти проверку через BroadcastChannel.
      const role = roleOf(msg.accessToken);
      if (role && role !== REQUIRED_ROLE) return;
      applyTokens(msg.accessToken, msg.expiresAt);
    } else if (msg.type === 'ended') {
      clearTokens();
      notifySessionEnded();
    }
  };
}

/** Parses the API's expiry (UTC, sometimes without the trailing Z) into epoch ms. */
function parseExpiry(expiresAtUtc) {
  if (!expiresAtUtc) return 0;
  const iso = /([Zz]|[+-]\d{2}:?\d{2})$/.test(expiresAtUtc) ? expiresAtUtc : `${expiresAtUtc}Z`;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? 0 : at;
}

function applyTokens(token, expiresAt) {
  accessToken = token;
  accessExpiresAt = expiresAt;
  scheduleProactiveRefresh();
}

function clearTokens() {
  accessToken = null;
  accessExpiresAt = 0;
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
}

/**
 * Renews a minute before expiry instead of waiting for a 401.
 *
 * Waiting means that every fifteen minutes the first calls fail and have to be replayed, and any
 * call that cannot be replayed safely pays for it. A dashboard left open on a second monitor is that
 * story repeated all day.
 */
function scheduleProactiveRefresh() {
  if (proactiveTimer) clearTimeout(proactiveTimer);
  proactiveTimer = null;
  if (!accessToken || !accessExpiresAt) return;

  const delay = Math.max(accessExpiresAt - Date.now() - EXPIRY_SKEW_MS, 5_000);
  proactiveTimer = setTimeout(() => {
    restoreSession();
  }, delay);
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  if (token) {
    // No expiry supplied: assume the shortest sensible life so the proactive renewal still happens.
    applyTokens(token, Date.now() + 10 * 60_000);
  } else {
    clearTokens();
  }
}

/** Stores a token pair from any auth response and tells the other tabs about it. */
export function setTokens(tokens) {
  if (!tokens?.accessToken) return false;

  // Сессия чужой роли (см. REQUIRED_ROLE): токен не сохраняем — иначе кабинет выглядит рабочим и
  // ломается запрос за запросом на 403.
  const role = roleOf(tokens.accessToken);
  if (role && role !== REQUIRED_ROLE) {
    clearTokens();
    notifyForeignSession(role);
    return false;
  }

  foreignRole = '';
  applyTokens(tokens.accessToken, parseExpiry(tokens.expiresAtUtc) || Date.now() + 10 * 60_000);
  authChannel?.postMessage({ type: 'tokens', accessToken, expiresAt: accessExpiresAt });
  return true;
}

/** Is there a session, and is its token still comfortably valid? */
export function isAuthenticated() {
  return !!accessToken;
}

function needsRefresh() {
  return !accessToken || Date.now() + EXPIRY_SKEW_MS >= accessExpiresAt;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A refresh that lands during a deploy or a dropped connection is retried before the session is
// written off: one failed attempt is not a fair test of whether the session is alive.
const REFRESH_RETRY_DELAYS_MS = [400, 1200];

// Потолок на ОДНУ попытку обновления и на все попытки вместе.
//
// Обновление стоит в начале очереди: пока оно не закончится, ждут все запросы вкладки. Без потолка
// «сервер задумался» превращался в замерший интерфейс на неопределённое время — со стороны это и
// выглядело как «токены подвисают». Ограничение переводит зависание в обычную ошибку: страница
// оживает, а следующий запрос пробует снова.
const REFRESH_ATTEMPT_TIMEOUT_MS = 8_000;
const REFRESH_TOTAL_BUDGET_MS = 20_000;

/** AbortSignal, срабатывающий через ms. Свой, а не AbortSignal.timeout — тот есть не везде. */
function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * Exchanges the refresh cookie for a fresh access token. Resolves to true when a session was
 * restored, false when there is none.
 *
 * Concurrent callers share one in-flight request: firing several would rotate the token out from
 * under each other. A refusal (401/403) ends the session and notifies listeners; anything else —
 * network error, 5xx — leaves the session in place, because it says nothing about it.
 */
let restoreInFlight = null;

async function doRestore() {
  let transient = false;
  const deadline = Date.now() + REFRESH_TOTAL_BUDGET_MS;

  for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) await sleep(REFRESH_RETRY_DELAYS_MS[attempt - 1]);

    // Бюджет исчерпан — дальше не тянем очередь запросов; сессию при этом не трогаем, повторить
    // попытку есть кому: следующий вызов, возврат во вкладку или восстановление сети.
    if (Date.now() >= deadline) break;

    let res;
    const attemptTimeout = timeoutSignal(
      Math.min(REFRESH_ATTEMPT_TIMEOUT_MS, deadline - Date.now())
    );
    try {
      res = await fetch(`${BASE_URL}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: '{}',
        signal: attemptTimeout.signal,
      });
    } catch {
      transient = true;
      continue;
    } finally {
      attemptTimeout.done();
    }

    if (res.status === 401 || res.status === 403) {
      const had = !!accessToken;
      clearTokens();
      if (had) {
        authChannel?.postMessage({ type: 'ended' });
        notifySessionEnded();
      }
      return false;
    }

    if (!res.ok) {
      transient = true;
      continue;
    }

    const tokens = await res.json().catch(() => null);
    return setTokens(tokens);
  }

  // Out of attempts: keep whatever session we have — the next call, or the next visit to the tab,
  // gets another go.
  void transient;
  return !!accessToken;
}

export function restoreSession() {
  if (!restoreInFlight) {
    restoreInFlight = doRestore().finally(() => {
      restoreInFlight = null;
    });
  }

  return restoreInFlight;
}

// Coming back to a backgrounded tab is the other moment a session looks broken: browsers throttle
// timers in inactive tabs, so the proactive renewal may have fired late or not at all.
//
// A tab with NO session is checked too, and that is not the same case. Signing in happens on the
// public site, in another tab: this one was left showing "sign in required" before the session
// existed, and it has no reason of its own to look again. Telling the person to reload is not an
// answer — they have just signed in and are looking at a page that says they have not.
if (typeof document !== 'undefined') {
  const recheck = () => {
    if (accessToken) {
      if (needsRefresh()) restoreSession();
      return;
    }

    // No token here yet. The refresh cookie is shared across .atria.kg, so a sign-in that happened
    // elsewhere is visible to this tab the moment it asks.
    restoreSession().then((restored) => {
      if (restored) notifySessionRestored();
    });
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') recheck();
  });
  window.addEventListener('online', recheck);
  window.addEventListener('focus', recheck);
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

  // Renew BEFORE sending when the token is at (or past) its expiry, so the call carries a token the
  // server still accepts rather than discovering the problem as a 401 and being replayed.
  if (auth && !_retried && accessToken && needsRefresh()) {
    await restoreSession();
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

/**
 * Ends the session: revokes the refresh token server-side, drops the in-memory access token and
 * tells the other tabs.
 *
 * Clearing only this tab's copy would not be a sign-out at all — the refresh cookie is HttpOnly, so
 * JavaScript cannot delete it, and the very next visit would silently restore the session from it.
 * The server has to be told, and it is the one that expires the cookie. A network failure still
 * signs the person out locally: a sign-out that gets stuck because the API is unreachable is worse
 * than one the server learns about a moment later, when the token expires on its own.
 */
export async function signOut() {
  try {
    await apiFetch('/auth/logout', { method: 'POST', body: {}, auth: false });
  } catch {
    /* сервер недоступен — локальный выход всё равно доводим до конца */
  }

  clearTokens();
  authChannel?.postMessage({ type: 'ended' });
}
