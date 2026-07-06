import React, { useRef, useState } from 'react';
import { FileText, Download, QrCode, Loader2 } from 'lucide-react';
import { formatVal } from '../utils';

// jspdf, qrcode and html2canvas are heavy, so they are imported dynamically
// inside generatePdf — they stay out of the initial dashboard bundle and load
// only when the investor actually generates a document.
//
// The PDF is produced by rendering a hidden, inline-styled certificate node with
// html2canvas (not jsPDF's own text): this gives correct Cyrillic and lets us
// embed the ATRIA logo (SVG). Inline hex colors are used on purpose — Tailwind v4
// emits oklch(), which html2canvas cannot parse.

/** ATRIA brand mark, matching the sidebar logo. */
function AtriaMark({ size = 44 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="#A38D6D" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 24 44 L 50 18 L 76 44" strokeWidth="4.5" />
      <path d="M 50 18 L 50 82" strokeWidth="4" />
      <path d="M 36 82 L 36 50 A 14 14 0 0 1 64 50 L 64 82" strokeWidth="4" />
      <line x1="20" y1="82" x2="80" y2="82" strokeWidth="4.5" />
    </svg>
  );
}

export default function TaxDocPanel({ investorName, properties = [], totalInvested = 0, totalEarned = 0, currency = 'KGS' }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [generating, setGenerating] = useState(false);
  const [doc, setDoc] = useState(null); // { docId, generatedAt, qrUrl }
  const certRef = useRef(null);

  const holdings = properties.filter((p) => p.totalInvested > 0);
  const hasData = holdings.length > 0;
  const earningsKnown = totalEarned > 0;

  const generatePdf = async () => {
    setGenerating(true);
    try {
      const [{ jsPDF }, QRCode, html2canvas] = await Promise.all([
        import('jspdf'),
        import('qrcode').then((m) => m.default ?? m),
        import('html2canvas').then((m) => m.default ?? m),
      ]);

      const docId = `ATRIA-${year}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const generatedAt = new Date();

      // QR payload — self-contained verification info (→ swap for a verify URL later).
      const qrPayload = [
        'ATRIA INCOME STATEMENT',
        `ID: ${docId}`,
        `Investor: ${investorName}`,
        `Earned: ${formatVal(totalEarned, currency)}`,
        `Invested: ${formatVal(totalInvested, currency)}`,
        `Period: ${year}`,
        `Generated: ${generatedAt.toISOString()}`,
      ].join('\n');
      const qrUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 240 });

      // Render the hidden certificate with this run's data, then rasterize it.
      setDoc({ docId, generatedAt, qrUrl });
      await new Promise((r) => setTimeout(r, 60));

      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgH = canvas.height * (pageW / canvas.width);
      pdf.addImage(img, 'PNG', 0, 0, pageW, imgH);
      pdf.save(`${docId}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  // Values shown in the hidden certificate (fall back before first generate).
  const c = doc ?? { docId: '—', generatedAt: new Date(), qrUrl: '' };

  return (
    <div className="space-y-8 max-w-4xl text-left font-montserrat">
      {/* Headline */}
      <div className="max-w-4xl border-l-2 border-[#A38D6D] pl-6 py-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">
          Налоговая отчётность
        </span>
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">
          Справка о доходе от инвестиций
        </h3>
      </div>

      <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs space-y-6">
        <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
          <FileText size={18} className="text-[#A38D6D] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500 leading-relaxed font-semibold">
            Сформируйте PDF-справку, подтверждающую доход, полученный от ваших инвестиций на платформе
            ATRIA, для предоставления в налоговую. Документ содержит логотип, ваше имя из KYC, сумму
            дохода и QR-код для проверки подлинности.
          </p>
        </div>

        {/* Period + investor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Отчётный период (год)</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full text-xs p-2.5 border border-gray-250 rounded-md bg-white text-gray-900 focus:outline-none focus:border-[#A38D6D]"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Инвестор</label>
            <div className="w-full text-xs p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-semibold select-none">
              {investorName || '—'}
            </div>
          </div>
        </div>

        {/* Summary preview */}
        <div className="bg-[#F8F8F7] p-4 rounded-sm border border-gray-100 space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Доход за период:</span>
            <span className="font-bold text-gray-900">{formatVal(totalEarned, currency)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Итого вложено:</span>
            <span className="font-bold text-gray-900">{formatVal(totalInvested, currency)}</span>
          </div>
          {!earningsKnown && (
            <p className="text-[10px] text-amber-600 pt-1">
              Источник данных о доходе ещё не подключён — в справке доход будет указан как 0 до появления выплат в API.
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 pt-1">
            <QrCode size={12} className="text-[#A38D6D]" />
            <span>В документ встраивается QR-код для верификации.</span>
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            onClick={generatePdf}
            disabled={!hasData || generating}
            className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2 font-bold"
            id="generate-tax-pdf-btn"
          >
            {generating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Формирование…</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Сформировать PDF</span>
              </>
            )}
          </button>
        </div>

        {!hasData && (
          <p className="text-[10px] text-amber-600 text-right -mt-2">
            Нет активов в собственности — документ формировать не из чего.
          </p>
        )}
      </div>

      {/* Hidden certificate rendered off-screen and rasterized on generate.
          Inline hex styles only (html2canvas cannot parse Tailwind's oklch). */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }} aria-hidden="true">
        <div
          ref={certRef}
          style={{
            width: '794px',
            minHeight: '1123px',
            boxSizing: 'border-box',
            padding: '56px 56px 40px',
            background: '#ffffff',
            color: '#1a1a1a',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <AtriaMark size={48} />
              <div>
                <div style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '4px' }}>ATRIA</div>
                <div style={{ fontSize: '11px', color: '#8a8a8a' }}>Платформа токенизации недвижимости</div>
              </div>
            </div>
            {c.qrUrl ? <img src={c.qrUrl} alt="QR" width={96} height={96} /> : null}
          </div>

          <div style={{ height: '1px', background: '#e5e5e5', margin: '28px 0' }} />

          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '18px' }}>
            Справка о доходе от инвестиций
          </div>

          {/* Confirmation statement */}
          <p style={{ fontSize: '13px', lineHeight: 1.7, color: '#333333', marginBottom: '24px' }}>
            Настоящим подтверждается, что <b>{investorName || '—'}</b> за отчётный период <b>{year} год</b>{' '}
            получил(а) доход от инвестиций в токенизированные объекты недвижимости на платформе ATRIA в
            размере <b>{formatVal(totalEarned, currency)}</b>. Инвестор является держателем долей в объектах,
            перечисленных ниже.
          </p>

          {/* Meta */}
          <div style={{ fontSize: '12px', color: '#333', marginBottom: '24px', lineHeight: 1.8 }}>
            <div><span style={{ color: '#8a8a8a' }}>Документ №: </span>{c.docId}</div>
            <div><span style={{ color: '#8a8a8a' }}>Дата формирования: </span>{c.generatedAt.toLocaleString('ru-RU')}</div>
            <div><span style={{ color: '#8a8a8a' }}>Отчётный период: </span>{year} год</div>
          </div>

          {/* Holdings table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1a1a1a', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px' }}>Объект</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Токены</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Доля</th>
                <th style={{ padding: '8px 4px', textAlign: 'right' }}>Вложено</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eeeeee' }}>
                  <td style={{ padding: '8px 4px' }}>{p.name}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{p.tokensOwned ?? 0}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{(p.ownershipPercentage ?? 0).toFixed(2)}%</td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>{formatVal(p.totalInvested, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ marginTop: '16px', borderTop: '2px solid #1a1a1a', paddingTop: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#555' }}>Итого вложено</span>
              <b>{formatVal(totalInvested, currency)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Итого доход за период</span>
              <b style={{ color: '#2f7d4f' }}>{formatVal(totalEarned, currency)}</b>
            </div>
          </div>

          {!earningsKnown && (
            <p style={{ fontSize: '10px', color: '#999', marginTop: '18px', fontStyle: 'italic' }}>
              Примечание: на момент формирования данные о выплаченном доходе не подключены к системе,
              поэтому доход указан как 0. После подключения источника выплат сумма будет отражена автоматически.
            </p>
          )}

          {/* Footer */}
          <div style={{ marginTop: '40px', borderTop: '1px solid #e5e5e5', paddingTop: '12px', fontSize: '9px', color: '#aaaaaa' }}>
            Документ сформирован автоматически платформой ATRIA · {c.docId} · Подлинность проверяется по QR-коду.
          </div>
        </div>
      </div>
    </div>
  );
}
