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
    // Адрес зачисления долей. null — кошелёк не привязан, и это НЕ то же самое, что пустая
    // строка в форме: пока его нет, инвестор привязывает первый, а не меняет существующий.
    walletAddress: dto?.walletAddress ?? null,
  };
}

/**
 * PATCH /kyc/wallet — привязать кошелёк ПЕРВЫЙ раз.
 *
 * 409, если кошелёк уже есть: замена идёт через changeWallet, с подтверждением по СМС.
 */
export async function linkWallet(walletAddress) {
  await apiFetch('/kyc/wallet', { method: 'PATCH', body: { walletAddress } });
}

/** POST /kyc/wallet/change/request — выслать код на телефон из аккаунта. */
export async function requestWalletChange() {
  await apiFetch('/kyc/wallet/change/request', { method: 'POST' });
}

/**
 * PATCH /kyc/wallet/change — сменить адрес, подтвердив кодом из СМС.
 *
 * 409, только если список с этим адресом уже ушёл бирже: она вот-вот заминтит по документу,
 * который здесь переписать нельзя. Выпущенные доли смене не мешают — они остаются на своём
 * адресе, и это нормально.
 */
export async function changeWallet(walletAddress, code) {
  await apiFetch('/kyc/wallet/change', { method: 'PATCH', body: { walletAddress, code } });
}
