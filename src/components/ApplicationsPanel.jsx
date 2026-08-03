import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Clock, XCircle, CheckCircle2, Ban, Hourglass } from 'lucide-react';
import { fetchMyInvestments, cancelInvestment } from '../api/investments';
import { INVESTMENT_STATUS_LABELS } from '../api/adapters';
import { formatVal } from '../utils';

// One visual treatment per application state. There is no payment step: an
// application is reserved, then an operator approves or rejects it, the investor
// cancels it, or the reservation lapses on its own.
const STATUS_STYLE = {
  reserved: { icon: Clock, badge: 'bg-amber-500 text-white border-amber-600/40' },
  active: { icon: CheckCircle2, badge: 'bg-emerald-600 text-white border-emerald-700/40' },
  rejected: { icon: XCircle, badge: 'bg-rose-600 text-white border-rose-700/40' },
  cancelled: { icon: Ban, badge: 'bg-gray-500 text-white border-gray-600/40' },
  expired: { icon: Hourglass, badge: 'bg-gray-400 text-white border-gray-500/40' },
  unknown: { icon: AlertTriangle, badge: 'bg-gray-300 text-gray-800 border-gray-400/40' },
};

/** Time left on a reservation, as a short human phrase; null once it has lapsed. */
function timeLeft(reservedUntilUtc) {
  if (!reservedUntilUtc) return null;
  const ms = new Date(reservedUntilUtc).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}`;
  }
  if (hours >= 1) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
  return `${Math.max(1, Math.floor(ms / 60_000))} мин`;
}

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
 * The investor's applications: state, how long the reservation is held, the
 * reason when an operator declined, and cancellation while still reserved.
 */
export default function ApplicationsPanel({ properties = [], currency = 'KGS' }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const nameById = new Map(properties.map((p) => [p.id, p.name]));

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      setApplications(await fetchMyInvestments({ signal }));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setLoadError(err?.message ?? 'Не удалось загрузить заявки.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleCancel = async (id) => {
    setActionError(null);
    setCancellingId(id);
    try {
      await cancelInvestment(id);
      // Re-read rather than patch locally: the backend also returns the reserved
      // tokens to the pool, and the list must reflect what it actually recorded.
      await load();
    } catch (err) {
      setActionError(err?.message ?? 'Не удалось отменить заявку.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-[#A38D6D]" />
        <span className="text-xs uppercase tracking-widest font-bold">Загрузка заявок…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={28} className="text-rose-500" />
        <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить заявки</span>
        <span className="text-xs text-gray-500 max-w-md">{loadError}</span>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 font-serif">
        У вас пока нет заявок на приобретение долей.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="pb-2 border-b border-gray-100">
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">
          Заявки на приобретение долей
        </span>
        <h4 className="font-serif text-lg font-bold text-gray-900">Мои заявки</h4>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{actionError}</span>
        </div>
      )}

      <div className="space-y-3">
        {applications.map((app) => {
          const style = STATUS_STYLE[app.status] ?? STATUS_STYLE.unknown;
          const StatusIcon = style.icon;
          const remaining = app.status === 'reserved' ? timeLeft(app.reservedUntilUtc) : null;

          return (
            <article
              key={app.id}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
              id={`application-${app.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h5 className="font-serif text-base font-bold text-gray-900">
                    {nameById.get(app.propertyId) ?? 'Объект недвижимости'}
                  </h5>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    Подана {formatDateTime(app.createdAtUtc)}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
                >
                  <StatusIcon size={12} />
                  {INVESTMENT_STATUS_LABELS[app.status] ?? INVESTMENT_STATUS_LABELS.unknown}
                </span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Долей</dt>
                  <dd className="font-mono text-gray-900">{app.tokenCount.toLocaleString('ru-RU')}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Сумма</dt>
                  <dd className="font-mono text-gray-900">{formatVal(app.amount, currency)}</dd>
                </div>
                {app.status === 'reserved' && (
                  <div>
                    <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">
                      Резерв держится до
                    </dt>
                    <dd className="font-mono text-gray-900">
                      {formatDateTime(app.reservedUntilUtc)}
                      {remaining && <span className="text-amber-600"> · осталось {remaining}</span>}
                    </dd>
                  </div>
                )}
              </dl>

              {app.status === 'rejected' && (
                <p className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                  <span className="font-bold">Причина отклонения: </span>
                  {app.rejectionReason ?? 'не указана'}
                </p>
              )}

              {app.status === 'expired' && (
                <p className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                  Срок резерва истёк до подтверждения, доли вернулись в пул объекта.
                </p>
              )}

              {app.status === 'reserved' && (
                <div className="pt-1">
                  <button
                    onClick={() => handleCancel(app.id)}
                    disabled={cancellingId === app.id}
                    id={`cancel-application-${app.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-colors hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    {cancellingId === app.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Ban size={12} />
                    )}
                    Отменить заявку
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
