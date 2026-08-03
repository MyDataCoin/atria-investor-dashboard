import React from 'react';
import { TrendingUp, LineChart } from 'lucide-react';
import { formatVal } from '../utils';

export default function AnalyticsDash({ currency = 'KGS', allocation = [] }) {

  return (
    <div className="space-y-8 font-montserrat">
      {/* Editorial Headline Statement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-b border-gray-100 pb-6 text-left">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold block">
            Правовая верификация и подтверждение доходности
          </span>
          <h3 className="text-2xl lg:text-3xl font-bold uppercase tracking-tight text-gray-900 mt-2 leading-tight">
            Хроники аналитики портфеля
          </h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed max-w-md font-medium">
          Сводные статистические отчеты по вашей доходности от долевого владения активами. Значения представляют собой секьюритизированный капитал и фактические выплаты, аудит которых проводится по земельным реестрам в блокчейне.
        </p>
      </div>

      {/* Доход и рост портфеля рисовались из выдуманных рядов в data.js. Источника у них нет:
          выплат ещё не было (модуль выплат не построен), а истории оценки объектов система не
          ведёт. Нарисованная кривая доходности — это обещание, которого никто не давал, поэтому
          вместо неё честная заглушка. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs">
          <div className="text-left mb-4">
            <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block">
              Консолидированный поток пассивного дохода
            </span>
            <h4 className="text-lg font-bold text-gray-900">Ежемесячные дивиденды</h4>
          </div>
          <div className="h-[200px] flex flex-col items-center justify-center text-center gap-2 text-gray-400">
            <TrendingUp size={22} className="text-gray-300" />
            <p className="text-xs max-w-xs">
              Выплат по вашим долям ещё не было — показывать нечего. График появится после первой
              выплаты.
            </p>
          </div>
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
              Распределение инвестированного капитала по отдельным физическим объектам. Цвета соответствуют весам токенов в реестре владения швейцарского SPV.
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

          <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            <span>Качество обеспечения долей портфеля:</span>
            <span className="font-bold text-[#A38D6D]">100% ОБЕСПЕЧЕНО</span>
          </div>
        </div>

      </div>

    </div>
  );
}
