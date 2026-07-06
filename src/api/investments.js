/**
 * Investments feature endpoints.
 *
 * All routes require the `Investor` role and a bearer token, so every call here
 * goes through `apiFetch` with auth on (the default). Results are scoped to the
 * caller server-side — this module never sees another investor's data.
 */
import { apiFetch } from './client';
import { mapInvestmentDto, mapPortfolioDto, mapPaymentSessionDto } from './adapters';

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
 * POST /investments/{applicationId}/payments — start a hosted payment session
 * for the investment of an approved application.
 *
 * @param {string} applicationId  id of the approved application being paid for.
 * @param {'Stripe'|'BankTransfer'} provider  payment strategy, sent by name.
 * @returns {Promise<{sessionId: string|null, paymentUrl: string|null}>}
 */
export async function createPayment(applicationId, provider, { signal } = {}) {
  const dto = await apiFetch(`/investments/${applicationId}/payments`, {
    method: 'POST',
    body: { provider },
    signal,
  });
  return mapPaymentSessionDto(dto);
}
