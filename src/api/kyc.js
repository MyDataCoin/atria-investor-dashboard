/** KYC feature endpoints. Requires the `Investor` role and a bearer token. */
import { apiFetch } from './client';

/**
 * GET /kyc/me — the caller's own KYC profile.
 *
 * Returns the raw profile. `fullName` is read straight from the backend and is
 * `null` until the API exposes it (the name lives in kyc_profiles server-side).
 * A 404 means the caller has never submitted KYC.
 */
export async function fetchKycProfile({ signal } = {}) {
  const dto = await apiFetch('/kyc/me', { signal });
  return {
    id: dto?.id ?? null,
    status: dto?.status ?? null,
    fullName: dto?.fullName ?? null,
  };
}
