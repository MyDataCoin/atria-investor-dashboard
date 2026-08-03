/**
 * Payout endpoints.
 *
 * Distributions are computed by the backend against a frozen holder register and
 * only become visible once a second person has authorised them, so this module
 * has nothing to compute — it reads what the investor is owed and what was paid.
 */
import { apiFetch } from './client';
import { mapMyPayoutDto } from './adapters';

/** GET /payouts/me — every distribution the current investor has a line in. */
export async function fetchMyPayouts({ signal } = {}) {
  const dtos = await apiFetch('/payouts/me', { signal });
  return (dtos ?? []).map(mapMyPayoutDto);
}
