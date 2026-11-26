/**
 * Crypto payment of an application: USDT (BEP-20 / TRC-20) and KGST.
 *
 * The invoice amount is unique to the cent (e.g. 114.67 USDT): it is how the server tells whose
 * application a transfer pays, since the transfer itself says nothing about the person. So the
 * amount has to be sent exactly, without rounding.
 */
import { apiFetch } from './client';

/** Enabled methods with their rate: [{ method, token, network, rateKgs }]. */
export function fetchPaymentMethods({ signal } = {}) {
  return apiFetch('/payments/methods', { auth: false, signal });
}

/** Issue (or return the already issued) invoice for an application in the chosen method. */
export function createInvoice(investmentId, method) {
  return apiFetch(`/payments/investments/${investmentId}/invoice`, {
    method: 'POST',
    body: { method },
  });
}

/** The application's current invoice; null when none has been issued yet. */
export async function fetchInvoice(investmentId, { signal } = {}) {
  try {
    return await apiFetch(`/payments/investments/${investmentId}/invoice`, { signal });
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export const METHOD_LABELS = {
  usdt_trc20: { title: 'USDT', net: 'TRC-20 · TRON' },
  usdt_bep20: { title: 'USDT', net: 'BEP-20 · BNB Chain' },
  kgst_bep20: { title: 'KGST', net: 'BEP-20 · BNB Chain' },
};
