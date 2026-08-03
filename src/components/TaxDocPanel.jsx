import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { formatVal } from '../utils';
import { issueTaxStatement, fetchMyTaxStatements, fetchTaxStatementDocument } from '../api/tax';

// The statement is issued and rendered by the server. It used to be assembled here with jsPDF and a
// random document number — which proved nothing: the number came from this page, and nobody could
// check afterwards that the figures on the paper were the platform's figures. Now the browser only
// asks for the document and saves what it is given.

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** The investor's income statements: issue one per year, download it, quote its verification code. */
export default function TaxDocPanel({ investorName, currency = 'KGS' }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      setStatements(await fetchMyTaxStatements({ signal }));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err?.message ?? 'Не удалось загрузить справки.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const issue = async () => {
    setError(null);
    setBusy('issue');
    try {
      await issueTaxStatement(year);
      await load();
    } catch (err) {
      setError(err?.message ?? 'Не удалось сформировать справку.');
    } finally {
      setBusy(null);
    }
  };

  const download = async (statement) => {
    setError(null);
    setBusy(statement.id);
    try {
      const response = await fetchTaxStatementDocument(statement.id);
      const blob = await response.blob();

      const disposition = response.headers.get('content-disposition') ?? '';
      const match = /filename="?([^"';]+)"?/i.exec(disposition);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = match?.[1] ?? `${statement.number}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message ?? 'Не удалось скачать справку.');
    } finally {
      setBusy(null);
    }
  };

  const alreadyIssued = statements.some((s) => s.year === year);

  return (
    <div className="space-y-8 max-w-4xl text-left">
      <div className="max-w-4xl border-l-2 border-[#A38D6D] pl-6 py-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">
          Налоговая отчётность
        </span>
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">
          Справка о доходе от инвестиций
        </h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs space-y-6">
        <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
          <FileText size={18} className="text-[#A38D6D] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Справка формируется на сервере ATRIA по вашим записям в реестре и содержит номер документа
            и код проверки: получатель — налоговая, банк — может проверить её подлинность, не обращаясь
            к вам. Справка выдаётся один раз на отчётный год.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">
              Отчётный период (год)
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              id="tax-year"
              className="w-full text-xs p-2.5 border border-gray-250 rounded-md bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">
              Инвестор
            </label>
            <div className="w-full text-xs p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-semibold select-none">
              {investorName || '—'}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={issue}
            disabled={busy === 'issue' || alreadyIssued}
            id="issue-tax-statement-btn"
            className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2 font-bold"
          >
            {busy === 'issue' ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Формирование…</span>
              </>
            ) : (
              <>
                <FileText size={13} />
                <span>Сформировать справку</span>
              </>
            )}
          </button>
        </div>

        {alreadyIssued && (
          <p className="text-[10px] text-gray-400 text-right -mt-2">
            Справка за {year} год уже выдана — скачайте её ниже.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="font-serif text-lg font-bold text-gray-900">Выданные справки</h4>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin text-[#A38D6D]" />
            <span className="text-xs uppercase tracking-widest font-bold">Загрузка…</span>
          </div>
        ) : statements.length === 0 ? (
          <div className="py-12 text-center text-gray-400 font-serif">
            Справок пока нет. Сформируйте первую за нужный год.
          </div>
        ) : (
          statements.map((s) => (
            <article
              key={s.id}
              id={`tax-statement-${s.id}`}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h5 className="font-serif text-base font-bold text-gray-900">
                    Справка за {s.year} год
                  </h5>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    № {s.number} · выдана {formatDate(s.issuedAtUtc)}
                  </p>
                </div>
                <button
                  onClick={() => download(s)}
                  disabled={busy === s.id}
                  id={`download-tax-statement-${s.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-600 transition-colors hover:border-[#A38D6D] hover:text-[#A38D6D] disabled:opacity-50 cursor-pointer"
                >
                  {busy === s.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Скачать
                </button>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Вложено</dt>
                  <dd className="font-mono text-gray-900">{formatVal(s.totalInvested, currency)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Доход</dt>
                  <dd className="font-mono text-gray-900">{formatVal(s.totalIncome, currency)}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Код проверки</dt>
                  <dd className="font-mono text-gray-900 break-all">{s.verificationCode}</dd>
                </div>
              </dl>

              <p className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <ShieldCheck size={12} className="text-[#A38D6D]" />
                Подлинность проверяется по коду — получателю справки не нужно обращаться к вам.
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
