import React from 'react';
import { TrendingUp, LineChart } from 'lucide-react';
import { formatVal } from '../utils';

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/**
 * Paid dividends by month over the last 12 months, oldest first. Only money that actually reached
 * the investor: dividend lines marked paid, dated by the payment. A capital return is the
 * investor's own money and is not income.
 */
function monthlyDividends(payouts, now = new Date()) {
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], year: d.getFullYear(), amount: 0 });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payouts ?? []) {
    if (p.kind !== 'Dividend' || p.status !== 'paid' || !p.paidAtUtc) continue;
    const d = new Date(p.paidAtUtc);
    const slot = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (slot) slot.amount += Number(p.amount || 0);
  }
  return months;
}

export default function AnalyticsDash({ currency = 'KGS', allocation = [], payouts = [] }) {
  const months = monthlyDividends(payouts);
  const maxMonth = Math.max(0, ...months.map((m) => m.amount));
  const yearTotal = months.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-8 font-montserrat">
      {/* Editorial Headline Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-b border-gray-100 pb-6 text-left">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold block">
            Доход и структура вложений
          </span>
          <h3 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight text-gray-900 mt-2 leading-tight">
            Аналитика портфеля
          </h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md font-medium">
          Сколько дохода вы фактически получили по своим долям и как вложения распределены по объектам. Здесь только реальные выплаты и покупки — без прогнозов и оценок.
        </p>
      </div>

      {/* Доход — из фактических выплат (/payouts/me). Кривой роста нет: истории переоценки
          объектов система не ведёт, а нарисованная кривая была бы обещанием, которого никто не давал. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs">
          <div className="text-left mb-4">
            <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block">
              Консолидированный поток пассивного дохода
            </span>
            <h4 className="text-lg font-bold text-gray-900">Ежемесячные дивиденды</h4>
          </div>
          {yearTotal === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-center gap-2 text-gray-400">
              <TrendingUp size={22} className="text-gray-300" />
              <p className="text-xs max-w-xs">
                За последние 12 месяцев выплат по вашим долям не было. График появится после первой
                выплаты.
              </p>
            </div>
          ) : (
            <div>
              <div className="h-[170px] flex items-end gap-1.5" role="img" aria-label="Выплаты дохода по месяцам">
                {months.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[9px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                      {m.amount > 0 ? formatVal(m.amount, currency, true) : ''}
                    </span>
                    <div
                      className={`w-full rounded-t-sm ${m.amount > 0 ? 'bg-[#A38D6D]' : 'bg-gray-100'}`}
                      style={{ height: m.amount > 0 ? `${Math.max(4, (m.amount / maxMonth) * 100)}%` : '2px' }}
                      title={`${m.label} ${m.year}: ${formatVal(m.amount, currency, true)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {months.map((m) => (
                  <span key={m.key} className="flex-1 text-center text-[9px] uppercase text-gray-400 font-bold">{m.label}</span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                За 12 месяцев получено <span className="font-bold text-gray-900">{formatVal(yearTotal, currency, true)}</span>
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs">
          <div className="text-left mb-4">
            <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block">
              Динамика стоимости портфеля
            </span>
            <h4 className="text-lg font-bold text-gray-900">Рост портфеля</h4>
          </div>
          <div className="h-[200px] flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <LineChart size={22} className="text-gray-300" />
            <p className="text-xs max-w-xs">
              История переоценки объектов пока не ведётся, поэтому кривую роста построить не из чего.
            </p>
          </div>
        </div>
      </div>

      {/* Secondary allocations - Now taking full span since trends are deleted */}
      <div className="grid grid-cols-1 gap-8 text-left">
        
        {/* Asset allocations list comparative dashboard */}
        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block mb-1">Пул распределения активов</span>
            <h4 className="text-lg font-bold text-gray-900">Распределение капитала</h4>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
              Распределение инвестированного капитала по отдельным физическим объектам. Цвета соответствуют долям вложенного капитала.
            </p>

            {/* List comparative bars - Render as beautiful grid */}
            {allocation.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm mt-4">
                Нет вложений для распределения капитала.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mt-6">
                {allocation.map((item, idx) => {
                  return (
                    <div key={idx} className="space-y-1.5" id={`analytics-alloc-item-${idx}`}>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="text-gray-600 font-bold">
                          {formatVal(item.value, currency)} ({item.percentage}%)
                        </span>
                      </div>
                      {/* Proportional bar */}
                      <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
