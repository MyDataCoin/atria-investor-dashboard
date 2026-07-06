import React, { useState } from 'react';
import { CH_MONTHLY_INCOME, CH_PORTFOLIO_GROWTH } from '../data';
import { formatVal } from '../utils';

export default function AnalyticsDash({ currency = 'KGS', allocation = [] }) {
  const [hoveredIncome, setHoveredIncome] = useState(null);
  const [hoveredGrowth, setHoveredGrowth] = useState(null);

  // SVG Chart Dimensions & Computations
  const width = 500;
  const height = 180;
  const padding = 34;

  // Compute Income Line Points
  const maxIncome = Math.max(...CH_MONTHLY_INCOME.map(d => d.value)) * 1.1;
  const incomePoints = CH_MONTHLY_INCOME.map((d, i) => {
    const x = padding + (i / (CH_MONTHLY_INCOME.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.value / maxIncome) * (height - padding * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const incomeLinePath = incomePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const incomeAreaPath = `${incomeLinePath} L ${incomePoints[incomePoints.length - 1].x} ${height - padding} L ${incomePoints[0].x} ${height - padding} Z`;

  // Compute Portfolio Growth Line Points
  const maxGrowth = Math.max(...CH_PORTFOLIO_GROWTH.map(d => d.value)) * 1.05;
  const minGrowth = Math.min(...CH_PORTFOLIO_GROWTH.map(d => d.value)) * 0.95;
  const growthPoints = CH_PORTFOLIO_GROWTH.map((d, i) => {
    const x = padding + (i / (CH_PORTFOLIO_GROWTH.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.value - minGrowth) / (maxGrowth - minGrowth)) * (height - padding * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const growthLinePath = growthPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const growthAreaPath = `${growthLinePath} L ${growthPoints[growthPoints.length - 1].x} ${height - padding} L ${growthPoints[0].x} ${height - padding} Z`;

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

      {/* Main Charts Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Monthly passive Income Area Line */}
        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-left mb-4">
            <div>
              <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block">Консолидированный поток пассивного дохода</span>
              <h4 className="text-lg font-bold text-gray-900">Ежемесячные дивиденды</h4>
            </div>
            
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
              Текущие: {formatVal(5120, currency)}/мес
            </span>
          </div>

          {/* SVG canvas container element */}
          <div className="relative w-full h-[200px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A38D6D" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#A38D6D" stopOpacity="0.01" />
                </linearGradient>
              </defs>
              
              {/* Horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = padding + ratio * (height - padding * 2);
                return (
                  <line 
                    key={i} 
                    x1={padding} 
                    y1={y} 
                    x2={width - padding} 
                    y2={y} 
                    className="stroke-gray-100/70 stroke-1" 
                    strokeDasharray="2 3"
                  />
                );
              })}

              {/* Area spline path */}
              <path d={incomeAreaPath} fill="url(#incomeAreaGrad)" />
              
              {/* Line path */}
              <path d={incomeLinePath} fill="none" stroke="#A38D6D" strokeWidth="2" />

              {/* Interactive Vector Nodes */}
              {incomePoints.map((pt, idx) => (
                <g 
                  key={idx}
                  onMouseEnter={() => setHoveredIncome(pt)}
                  onMouseLeave={() => setHoveredIncome(null)}
                  className="cursor-pointer"
                >
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredIncome?.label === pt.label ? 6 : 3.5} 
                    fill={hoveredIncome?.label === pt.label ? '#111111' : '#A38D6D'} 
                    stroke="white" 
                    strokeWidth="1.5"
                    className="transition-all"
                  />
                </g>
              ))}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 uppercase border-t border-gray-50 pt-3">
            {CH_MONTHLY_INCOME.map((d, index) => (
              <span key={index} className="hover:text-gray-900 transition-colors">{d.label}</span>
            ))}
          </div>

          {/* Hover dynamic callout readout bar */}
          <div className="h-6 mt-2 text-center">
            {hoveredIncome ? (
              <span className="text-xs font-semibold text-gray-900 animate-pulse bg-gray-50 px-3 py-1 rounded">
                Выплаты за {hoveredIncome.label}: <strong className="text-amber-800">{formatVal(hoveredIncome.value, currency)}/мес</strong>
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 font-medium italic">Наведите курсор на точки графика для проверки ежемесячного реестра</span>
            )}
          </div>
        </div>

        {/* Portfolio Growth Trend Line Area */}
        <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-left mb-4">
            <div>
              <span className="text-[8px] tracking-widest uppercase text-[#A38D6D] font-bold block">Прирост оценочной стоимости</span>
              <h4 className="text-lg font-bold text-gray-900">Общая стоимость портфеля</h4>
            </div>
            
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
              Прирост: +14.79%
            </span>
          </div>

          {/* SVG Growth rendering */}
          <div className="relative w-full h-[200px]">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="growthAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#111111" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              
              {/* Horizontal guidelines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = padding + ratio * (height - padding * 2);
                return (
                  <line 
                    key={i} 
                    x1={padding} 
                    y1={y} 
                    x2={width - padding} 
                    y2={y} 
                    className="stroke-gray-100/70 stroke-1" 
                    strokeDasharray="2 3"
                  />
                );
              })}

              {/* Area spline */}
              <path d={growthAreaPath} fill="url(#growthAreaGrad)" />
              
              {/* Line spline */}
              <path d={growthLinePath} fill="none" stroke="#111111" strokeWidth="2" />

              {/* Vector Nodes */}
              {growthPoints.map((pt, idx) => (
                <g 
                  key={idx}
                  onMouseEnter={() => setHoveredGrowth(pt)}
                  onMouseLeave={() => setHoveredGrowth(null)}
                  className="cursor-pointer"
                >
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredGrowth?.label === pt.label ? 6 : 3.5} 
                    fill={hoveredGrowth?.label === pt.label ? '#A38D6D' : '#111111'} 
                    stroke="white" 
                    strokeWidth="1.5"
                    className="transition-all"
                  />
                </g>
              ))}
            </svg>
          </div>

          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-2 uppercase border-t border-gray-50 pt-3">
            {CH_PORTFOLIO_GROWTH.map((d, index) => (
              <span key={index}>{d.label}</span>
            ))}
          </div>

          {/* Dynamic hover output */}
          <div className="h-6 mt-2 text-center">
            {hoveredGrowth ? (
              <span className="text-xs font-semibold text-gray-900 animate-pulse bg-gray-50 px-3 py-1 rounded">
                Оценка портфеля за {hoveredGrowth.label}: <strong className="text-[#A38D6D]">{formatVal(hoveredGrowth.value, currency)}</strong>
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 font-medium italic">Наведите курсор на точки графика для отслеживания оценки объектов портфеля</span>
            )}
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
