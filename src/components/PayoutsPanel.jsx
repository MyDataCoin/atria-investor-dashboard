import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Coins, CheckCircle2, Clock, XCircle, Info } from 'lucide-react';
import { fetchMyPayouts } from '../api/payouts';
import {
  PAYOUT_STATUS_LABELS,
  PAYOUT_KIND_LABELS,
  PAYOUT_METHOD_LABELS,
} from '../api/adapters';
import { formatVal } from '../utils';

const STATUS_STYLE = {
  pending: { icon: Clock, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid: { icon: CheckCircle2, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { icon: XCircle, badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  unknown: { icon: AlertTriangle, badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * What the investor has been paid, and what is still coming.
 *
 * Every number here is computed by the backend against the frozen register the distribution was
 * declared on — the panel divides nothing itself. A distribution nobody has authorised is not shown
 * at all: telling a holder they are owed money that has not been approved is a promise the platform
 * has not made.
 */
export default function PayoutsPanel({ properties = [] }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const nameById = new Map(properties.map((p) => [p.id, p.name]));

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      setPayouts(await fetchMyPayouts({ signal }));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message ?? 'Не удалось загрузить выплаты.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-[#A38D6D]" />
        <span className="text-xs uppercase tracking-widest font-bold">Загрузка выплат…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={28} className="text-rose-500" />
        <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить выплаты</span>
        <span className="text-xs text-gray-500 max-w-md">{error}</span>
      </div>
    );
  }

  const paid = payouts.filter((p) => p.status === 'paid');
  const paidTotal = paid.reduce((sum, p) => sum + p.amount, 0);
  const currency = payouts[0]?.currency ?? 'KGS';

  return (
    <div className="space-y-4 text-left">
      <div className="pb-2 border-b border-gray-100">
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
          Распределения по вашим долям
        </span>
        <h4 className="font-serif text-lg font-bold text-gray-900">Выплаты</h4>
      </div>

      {payouts.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-serif">
          По вашим долям пока не было распределений.
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-xs">
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Выплачено всего</dt>
              <dd className="font-mono text-base text-gray-900">{formatVal(paidTotal, currency)}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Распределений</dt>
              <dd className="font-mono text-base text-gray-900">{payouts.length}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Из них выплачено</dt>
              <dd className="font-mono text-base text-emerald-700">{paid.length}</dd>
            </div>
          </dl>

          <div className="space-y-3">
            {payouts.map((p) => {
              const style = STATUS_STYLE[p.status] ?? STATUS_STYLE.unknown;
              const StatusIcon = style.icon;

              return (
                <article
                  key={p.runId}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
                  id={`payout-${p.runId}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h5 className="font-serif text-base font-bold text-gray-900">
                        {nameById.get(p.propertyId) ?? 'Объект недвижимости'}
                      </h5>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                        {PAYOUT_KIND_LABELS[p.kind] ?? p.kind} · реестр на {formatDateTime(p.snapshotAtUtc)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold ${style.badge}`}
                    >
                      <StatusIcon size={12} />
                      {PAYOUT_STATUS_LABELS[p.status] ?? PAYOUT_STATUS_LABELS.unknown}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Долей в реестре</dt>
                      <dd className="font-mono text-gray-900">{p.tokenCount.toLocaleString('ru-RU')}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Начислено</dt>
                      <dd className="font-mono text-gray-900">{formatVal(p.amount, p.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Способ</dt>
                      <dd className="font-mono text-gray-900">
                        {PAYOUT_METHOD_LABELS[p.method] ?? p.method ?? '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Выплачено</dt>
                      <dd className="font-mono text-gray-900">{formatDateTime(p.paidAtUtc)}</dd>
                    </div>
                  </dl>

                  {p.settlementReference && (
                    <p className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-[11px] text-gray-600">
                      <span className="font-bold">Основание платежа: </span>
                      <span className="font-mono break-all">{p.settlementReference}</span>
                    </p>
                  )}

                  {p.status === 'failed' && (
                    <p className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-[11px] text-rose-700">
                      Перечисление не прошло. Сумма остаётся к выплате — оператор повторит платёж;
                      если реквизиты изменились, сообщите об этом в поддержку.
                    </p>
                  )}

                  {p.status === 'pending' && (
                    <p className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-[11px] text-gray-600">
                      <Coins size={12} className="mt-0.5 shrink-0" />
                      Начисление подтверждено, перечисление ещё не проведено.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <p className="flex items-start gap-2 text-[11px] text-gray-400">
            <Info size={12} className="mt-0.5 shrink-0" />
            Сумма рассчитана по замороженному срезу реестра на указанную дату: доли, купленные или
            проданные позже, в это распределение не входят.
          </p>
        </>
      )}
    </div>
  );
}
