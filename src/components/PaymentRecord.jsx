import React, { useEffect, useState } from 'react';
import { fetchInvoice } from '../api/payments';

const num = (value) => Number(value).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

/**
 * What the investor actually paid for an approved application. The application amount is the
 * price of the shares; the payment is what arrived on the wallet, which can differ — a sender's
 * fee, for instance. A shortfall the platform accepted is shown as written off, so the investor
 * sees it is settled and owes nothing.
 */
export default function PaymentRecord({ investmentId }) {
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchInvoice(investmentId, { signal: controller.signal })
      .then(setInvoice)
      .catch(() => setInvoice(null));
    return () => controller.abort();
  }, [investmentId]);

  // A bank transfer has no invoice; nothing to show beyond the amount on the card.
  if (!invoice || invoice.status !== 'paid') return null;

  const shortfall = Number(invoice.shortfallKgs ?? 0);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
      <span>
        <span className="font-bold text-gray-800">Оплачено: </span>
        <span className="font-mono">{num(invoice.receivedAmount ?? invoice.payAmount)} {invoice.token}</span>
        {invoice.paidAtUtc && (
          <span className="text-gray-400">
            {' · '}
            {new Date(invoice.paidAtUtc).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )}
        {invoice.transactionUrl && (
          <>
            {' · '}
            <a href={invoice.transactionUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#A38D6D]">
              транзакция
            </a>
          </>
        )}
      </span>
      {shortfall > 0 && (
        <span className="text-[#A38D6D]">
          Недоплата {num(shortfall)} с списана — доплачивать не нужно
        </span>
      )}
    </div>
  );
}
