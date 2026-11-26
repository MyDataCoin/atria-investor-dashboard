import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, Copy, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createInvoice, fetchInvoice, fetchPaymentMethods, METHOD_LABELS } from '../api/payments';

const POLL_MS = 15_000;

const fmtAmount = (n) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n) || 0
  );

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

function CopyButton({ value }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard unavailable — the value is still visible and selectable */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 hover:border-[#A38D6D] hover:text-[#A38D6D] cursor-pointer"
    >
      {done ? <Check size={11} /> : <Copy size={11} />}
      {done ? 'Скопировано' : 'Копировать'}
    </button>
  );
}

/**
 * Paying a reserved application from the cabinet: pick a method, get an invoice with the exact
 * amount and address, and watch for the transfer. Same flow as the site's purchase modal, so an
 * investor who closed that window can come back and pay here.
 */
export default function PaymentPanel({ investmentId, amount, currency = 'KGS', onPaid }) {
  const [methods, setMethods] = useState(null);
  const [choice, setChoice] = useState(null); // null | 'bank' | method wire name
  const [invoice, setInvoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [qr, setQr] = useState('');
  const pollRef = useRef(null);

  // Methods and any invoice already issued for this application — so reopening resumes it.
  useEffect(() => {
    const controller = new AbortController();
    fetchPaymentMethods({ signal: controller.signal })
      .then((list) => setMethods(Array.isArray(list) ? list : []))
      .catch(() => setMethods([]));
    fetchInvoice(investmentId, { signal: controller.signal })
      .then((inv) => {
        if (inv && (inv.status === 'pending' || inv.status === 'paid')) {
          setInvoice(inv);
          setChoice(inv.method);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [investmentId]);

  useEffect(() => {
    if (!invoice?.payToAddress) return setQr('');
    QRCode.toDataURL(invoice.payToAddress, { margin: 1, width: 360 })
      .then(setQr)
      .catch(() => setQr(''));
  }, [invoice?.payToAddress]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (!invoice || invoice.status !== 'pending') return;
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await fetchInvoice(investmentId);
        if (fresh) {
          setInvoice(fresh);
          if (fresh.status === 'paid') onPaid?.();
        }
      } catch {
        /* network blip — ask again next tick */
      }
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [invoice, investmentId, onPaid]);

  const pick = async (method) => {
    setError('');
    setChoice(method);
    if (method === 'bank') return;
    setBusy(true);
    setInvoice(null);
    try {
      setInvoice(await createInvoice(investmentId, method));
    } catch (err) {
      setError(err?.message || 'Не удалось выставить счёт. Попробуйте ещё раз.');
      setChoice(null);
    } finally {
      setBusy(false);
    }
  };

  const methodBtn = (active) =>
    `flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer disabled:opacity-50 ${
      active ? 'border-[#A38D6D] bg-[#A38D6D]/5' : 'border-gray-200 hover:border-[#A38D6D]/60'
    }`;

  const label = invoice ? METHOD_LABELS[invoice.method] : null;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 space-y-4">
      <p className="text-xs text-gray-600">
        Выберите, как оплатить{' '}
        <b>
          {fmtAmount(amount)} {currency}
        </b>
        .
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Способ оплаты">
        <button
          type="button"
          role="radio"
          aria-checked={choice === 'bank'}
          className={methodBtn(choice === 'bank')}
          onClick={() => pick('bank')}
          disabled={busy}
        >
          <b className="text-sm text-gray-900">Сомы</b>
          <span className="text-[10px] text-gray-500">банковский перевод</span>
        </button>
        {methods === null && (
          <div className="flex items-center gap-2 px-2 text-xs text-gray-400">
            <Loader2 size={12} className="animate-spin" /> способы оплаты…
          </div>
        )}
        {(methods ?? []).map((m) => (
          <button
            key={m.method}
            type="button"
            role="radio"
            aria-checked={choice === m.method}
            className={methodBtn(choice === m.method)}
            onClick={() => pick(m.method)}
            disabled={busy}
          >
            <b className="text-sm text-gray-900">{METHOD_LABELS[m.method]?.title ?? m.token}</b>
            <span className="text-[10px] text-gray-500">{METHOD_LABELS[m.method]?.net ?? m.network}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {choice === 'bank' && (
        <p className="rounded-lg bg-white border border-gray-100 px-3 py-2 text-xs text-gray-600">
          Мы проверим заявку и пришлём реквизиты для перевода в сомах.
        </p>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={12} className="animate-spin" /> Выставляем счёт…
        </div>
      )}

      {invoice?.status === 'paid' && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>
            <b>Оплата получена.</b> {fmtAmount(invoice.payAmount)} {invoice.token} пришли на кошелёк. Мы
            подтвердим заявку, и доли появятся в портфеле.
          </span>
        </div>
      )}

      {invoice?.status === 'pending' && (
        <div className="rounded-lg bg-white border border-gray-100 p-4 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                  Сумма — ровно, до цента
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="font-mono text-lg text-gray-900">
                    {fmtAmount(invoice.payAmount)} {invoice.token}
                  </strong>
                  <CopyButton value={String(invoice.payAmount)} />
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Сеть</div>
                <strong className="text-gray-900">{label?.net ?? invoice.network}</strong>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Адрес</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-[11px] text-gray-900 break-all">{invoice.payToAddress}</code>
                  <CopyButton value={invoice.payToAddress} />
                </div>
              </div>
            </div>
            {qr && (
              <img
                src={qr}
                alt="QR-код адреса"
                width="150"
                height="150"
                className="self-center rounded-md border border-gray-100"
              />
            )}
          </div>
          <ul className="list-disc pl-4 space-y-1 text-gray-600">
            <li>
              Отправьте <b>ровно {fmtAmount(invoice.payAmount)} {invoice.token}</b> — по этой сумме мы узнаём
              вашу заявку. Комиссию сети оплачивает отправитель.
            </li>
            <li>
              Только сеть <b>{invoice.network}</b>. Перевод в другой сети не дойдёт.
            </li>
            {invoice.token === 'USDT' && (
              <li>
                Курс: 1 USDT = {invoice.rateKgs} {currency}, зафиксирован в этом счёте.
              </li>
            )}
            <li>Оплатите до {fmtDate(invoice.expiresAtUtc)}.</li>
          </ul>
          <p className="flex items-center gap-2 text-gray-400">
            <Loader2 size={12} className="animate-spin" /> Ждём перевод — статус обновится сам.
          </p>
        </div>
      )}
    </div>
  );
}
