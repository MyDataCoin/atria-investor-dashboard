import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ExternalLink, Copy, Check, Link2, Hourglass, ShieldCheck, XCircle } from 'lucide-react';
import { fetchInvestmentChainRecord } from '../api/investments';
import { ON_CHAIN_STATUS_LABELS } from '../api/adapters';

// One treatment per on-chain state. `none` is deliberately quiet rather than
// alarming: an approved application whose shares have not been written yet is
// normal, not broken.
const STATUS_STYLE = {
  none: { icon: Hourglass, badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  pending: { icon: Loader2, badge: 'bg-amber-50 text-amber-700 border-amber-200', spin: true },
  confirmed: { icon: ShieldCheck, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { icon: XCircle, badge: 'bg-rose-50 text-rose-700 border-rose-200' },
  unknown: { icon: AlertTriangle, badge: 'bg-gray-100 text-gray-600 border-gray-200' },
};

/** Middle-elided address or hash. The full value is what gets copied. */
function elide(value) {
  if (!value) return '—';
  return value.length <= 20 ? value : `${value.slice(0, 10)}…${value.slice(-8)}`;
}

/**
 * One address or hash: shortened for reading, copyable in full, and linked to
 * the explorer when the network has one configured.
 */
function ChainValue({ label, value, url, id }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the value is on screen either way.
    }
  };

  return (
    <div>
      <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{label}</dt>
      <dd className="flex items-center gap-1.5 mt-0.5">
        <span className="font-mono text-[11px] text-gray-900 break-all">{elide(value)}</span>
        {value && (
          <button
            onClick={copy}
            id={`copy-${id}`}
            title="Скопировать полностью"
            className="text-gray-400 transition-colors hover:text-[#A38D6D] cursor-pointer"
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            id={`explorer-${id}`}
            title="Открыть в обозревателе сети"
            className="text-gray-400 transition-colors hover:text-[#A38D6D]"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </dd>
    </div>
  );
}

/**
 * The on-chain record of one investment (draft Decree, §21).
 *
 * The holder should not have to take our word for what they own: with the
 * contract address and their own address anyone can read the balance straight
 * off the chain, and with the transaction hash they can read the issuance
 * itself. The explorer links are a convenience over that, not the source of
 * truth — which is why the addresses are shown and copyable even on a network
 * with no explorer configured.
 *
 * Loaded on demand rather than with the application list: it is one request per
 * investment, and most of the time the holder is looking at something else.
 */
export default function ChainRecord({ investmentId }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);
      try {
        setRecord(await fetchInvestmentChainRecord(investmentId, { signal }));
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err?.message ?? 'Не удалось загрузить запись в сети.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [investmentId],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-[11px] text-gray-400">
        <Loader2 size={12} className="animate-spin" />
        Загрузка записи в сети…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
        <AlertTriangle size={12} />
        {error}
      </div>
    );
  }

  if (!record) return null;

  const style = STATUS_STYLE[record.status] ?? STATUS_STYLE.unknown;
  const StatusIcon = style.icon;

  return (
    <section
      className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3"
      id={`chain-record-${investmentId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-400 font-bold">
          <Link2 size={11} />
          Запись в блокчейне
          {record.chainTag && (
            <span className="font-mono normal-case tracking-normal text-gray-400">
              · {record.chainTag}
              {record.chainId ? ` (chain id ${record.chainId})` : ''}
            </span>
          )}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${style.badge}`}
        >
          <StatusIcon size={11} className={style.spin ? 'animate-spin' : undefined} />
          {ON_CHAIN_STATUS_LABELS[record.status] ?? ON_CHAIN_STATUS_LABELS.unknown}
        </span>
      </div>

      {record.status === 'none' ? (
        <p className="text-[11px] text-gray-500">
          Доли ещё не выпущены в сети. Как только выпуск пройдёт, здесь появятся адрес кошелька,
          адрес контракта и хеш транзакции — их можно будет проверить самостоятельно.
        </p>
      ) : (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ChainValue
            label="Ваш адрес"
            value={record.walletAddress}
            url={record.walletUrl}
            id={`wallet-${investmentId}`}
          />
          <ChainValue
            label="Контракт объекта"
            value={record.tokenContractAddress}
            url={record.contractUrl}
            id={`contract-${investmentId}`}
          />
          <div className="sm:col-span-2">
            <ChainValue
              label="Транзакция выпуска"
              value={record.transactionHash}
              url={record.transactionUrl}
              id={`tx-${investmentId}`}
            />
          </div>
        </dl>
      )}

      {record.status === 'pending' && (
        <p className="text-[11px] text-gray-500">
          Транзакция отправлена в сеть. Выпуск считается окончательным после{' '}
          {record.confirmationsRequired} подтверждений — до этого момента сеть теоретически может
          его откатить.
        </p>
      )}

      {record.status === 'failed' && (
        <p className="text-[11px] text-rose-700">
          Транзакция выпуска не прошла. Ваши доли закреплены за вами в реестре платформы; выпуск в
          сети будет повторён оператором.
        </p>
      )}
    </section>
  );
}
