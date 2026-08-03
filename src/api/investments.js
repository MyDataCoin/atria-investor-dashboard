/**
 * Investments feature endpoints.
 *
 * All routes require the `Investor` role and a bearer token, so every call here
 * goes through `apiFetch` with auth on (the default). Results are scoped to the
 * caller server-side — this module never sees another investor's data.
 */
import { apiFetch } from './client';
import { mapInvestmentDto, mapPortfolioDto, mapChainRecordDto } from './adapters';

/** GET /investments/me — every investment owned by the current investor. */
export async function fetchMyInvestments({ signal } = {}) {
  const dtos = await apiFetch('/investments/me', { signal });
  return (dtos ?? []).map(mapInvestmentDto);
}

/** GET /investments/portfolio — aggregated totals + the underlying investments. */
export async function fetchPortfolio({ signal } = {}) {
  const dto = await apiFetch('/investments/portfolio', { signal });
  return mapPortfolioDto(dto);
}

/** GET /investments/{id} — a single investment (owner or Admin); 404 otherwise. */
export async function fetchInvestment(id, { signal } = {}) {
  const dto = await apiFetch(`/investments/${id}`, { signal });
  return mapInvestmentDto(dto);
}

/**
 * POST /investments/{id}/cancel — withdraw an application while it is still
 * Reserved. The reserved tokens go back to the property's pool.
 *
 * There is no payment on the platform: an application is reserved, then an
 * operator approves or rejects it, or it lapses when the reservation expires.
 */
export async function cancelInvestment(id, { signal } = {}) {
  await apiFetch(`/investments/${id}/cancel`, { method: 'POST', signal });
}

/**
 * GET /investments/{id}/chain — the on-chain record of one investment: the
 * address the shares were issued to, the contract they live in, the issuing
 * transaction and whether it has settled.
 *
 * The point of showing this is that the holder does not have to take the
 * platform's word for it — every field is a coordinate into public data.
 */
export async function fetchInvestmentChainRecord(id, { signal } = {}) {
  const dto = await apiFetch(`/investments/${id}/chain`, { signal });
  return mapChainRecordDto(dto);
}
