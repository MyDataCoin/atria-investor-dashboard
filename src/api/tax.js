/**
 * Tax statement endpoints.
 *
 * The document is issued and rendered by the server. It used to be assembled in the browser with a
 * random document number, which proved nothing: the number came from the page, and nobody could
 * check afterwards that the figures on the paper were the platform's figures.
 */
import { apiFetch } from './client';

/** POST /tax-statements/{year} — issue (or return) the statement for a year. */
export async function issueTaxStatement(year, { signal } = {}) {
  return apiFetch(`/tax-statements/${year}`, { method: 'POST', signal });
}

/** GET /tax-statements/me — the investor's issued statements, newest year first. */
export async function fetchMyTaxStatements({ signal } = {}) {
  return (await apiFetch('/tax-statements/me', { signal })) ?? [];
}

/**
 * GET /tax-statements/{id}/document — the rendered statement.
 *
 * `raw` keeps the Response so the caller can read it as a blob: a plain <a href> would drop the
 * bearer token and get a 401.
 */
export async function fetchTaxStatementDocument(id, { signal } = {}) {
  return apiFetch(`/tax-statements/${id}/document`, { raw: true, signal });
}
