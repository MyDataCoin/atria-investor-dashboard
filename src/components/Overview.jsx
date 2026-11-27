import React from 'react';
import { DollarSign, Wallet, Percent, Sparkles, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatVal } from '../utils';

export default function Overview({ stats, currency = 'USD' }) {
  const cards = [
    {
      id: 'total-invested',
      label: 'Всего инвестировано',
      value: formatVal(stats.totalInvested, currency),
      icon: Wallet,
      desc: 'Размещенный капитал в недвижимости',
    },
    {
      id: 'asset-value',
      label: 'Стоимость активов',
      value: formatVal(stats.currentAssetValue, currency),
      icon: DollarSign,
      desc: 'По цене покупки долей',
    },
    {
      id: 'monthly-income',
      label: 'Ежемесячный доход',
      value: formatVal(stats.monthlyIncome, currency),
      icon: Sparkles,
      desc: 'В среднем за последние 12 месяцев',
    },
    {
      id: 'average-roi',
      label: 'Доходность портфеля',
      value: `${stats.averageRoi.toFixed(2)}%`,
      icon: Percent,
      desc: 'Выплаты за 12 месяцев к вложенному',
    }
  ];

  return (
    <div className="space-y-8 text-left font-montserrat">
      
      {/* Main Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              id={`overview-card-${card.id}`}
              className="bg-white p-6 rounded-sm border border-gray-100 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-[0.15em] text-gray-400 font-bold">
                  {card.label}
                </span>
                <div className="text-gray-400 group-hover:text-[#A38D6D] transition-colors font-bold">
                  <Icon size={16} />
                </div>
              </div>

              <div className="mt-4">
                <span className="text-2xl font-bold text-[#1A1A1A] block">
                  {card.value}
                </span>
                <p className="text-[11px] text-gray-400 mt-1 font-medium">
                  {card.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Secondary Detailed Performance */}
      <div className="grid grid-cols-1 gap-8">
        
        {/* Detailed Metrics List - Spanning full-width since simulation is deleted */}
        <div className="bg-white border border-gray-100 rounded-sm p-6 lg:p-8 shadow-sm">
          <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-gray-500 border-b border-gray-100 pb-4">
            <span>Подробные показатели портфеля</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 mt-6">
            <div id="metric-unrealized" className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Нереализованный прирост</span>
                <p className="font-bold text-lg text-[#1A1A1A] mt-1">
                  +{formatVal(stats.unrealizedGains, currency, true)}
                </p>
              </div>

            </div>

            <div id="metric-distributions" className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Выплаченный доход</span>
                <p className="font-bold text-lg text-[#1A1A1A] mt-1">
                  {formatVal(stats.cashDistributions, currency, true)}
                </p>
              </div>
              {stats.pendingIncome > 0 && (
                <span
                  className="text-[10px] font-bold text-[#A38D6D] bg-[#A38D6D]/5 px-2.5 py-1 rounded"
                  title="Распределение утверждено, перечисление ещё не отмечено"
                >
                  +{formatVal(stats.pendingIncome, currency, true)} в пути
                </span>
              )}
            </div>

            <div id="metric-yield" className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Доходность за 12 мес.</span>
                <p className="font-bold text-lg text-[#1A1A1A] mt-1">
                  {stats.averageRoi.toFixed(2)}%
                </p>
              </div>

            </div>

            <div id="metric-return" className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Совокупный доход</span>
                <p className="font-bold text-lg text-[#1A1A1A] mt-1">
                  +{formatVal((stats.unrealizedGains || 0) + (stats.cashDistributions || 0), currency, true)}
                </p>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
