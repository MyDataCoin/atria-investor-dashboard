import React, { useState } from 'react';
import { ShoppingBag, ArrowDownLeft, CheckCircle2, Clock, LifeBuoy, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { formatVal } from '../utils';

export default function ActivitiesTimeline({ activities, currency = 'USD' }) {
  const [filterType, setFilterType] = useState('all');

  // Filter out 'valuation' and 'document' types entirely, and match with active filter
  const filteredActs = activities.filter((act) => {
    if (act.type === 'valuation' || act.type === 'document') return false;
    if (filterType === 'all') return true;
    // 'tx' is not an activity type but a cross-cutting view: anything that
    // carries an on-chain transaction hash.
    if (filterType === 'tx') return Boolean(act.txHash);
    // 'support' groups both ticket creation and support replies.
    if (filterType === 'support') return act.type === 'ticket' || act.type === 'ticket-reply';
    return act.type === filterType;
  });

  const getIconProps = (type) => {
    switch (type) {
      case 'purchase':
        return { icon: ShoppingBag, bg: 'bg-[#A38D6D]/10 border-[#A38D6D]/20 text-[#A38D6D]' };
      case 'payout':
        return { icon: ArrowDownLeft, bg: 'bg-emerald-50 border-emerald-150 text-emerald-600' };
      case 'ticket':
        return { icon: LifeBuoy, bg: 'bg-sky-50 border-sky-150 text-sky-600' };
      case 'ticket-reply':
        return { icon: MessageSquare, bg: 'bg-indigo-50 border-indigo-150 text-indigo-600' };
      default:
        return { icon: Clock, bg: 'bg-gray-50 border-gray-200 text-gray-500' };
    }
  };

  const activityFilters = [
    { label: 'Все хроники', value: 'all' },
    { label: 'Выплаты', value: 'payout' },
    { label: 'Покупка долей', value: 'purchase' },
    { label: 'Обращения', value: 'support' },
    { label: 'Транзакции', value: 'tx' }
  ];

  return (
    <div className="w-full">
      {/* Timeline List */}
      <div className="bg-white p-6 lg:p-8 rounded-sm border border-gray-100 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div className="text-left">
            <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">
              Аудируемые хроники транзакций
            </span>
            <h3 className="font-serif text-xl lg:text-2xl font-bold tracking-tight text-gray-900 mt-1">
              Баланс реестра смарт-аренды
            </h3>
          </div>

          {/* Filtration button tabs */}
          <div className="flex flex-wrap gap-1.5" id="timeline-filters">
            {activityFilters.map((flt) => (
              <button
                key={flt.value}
                onClick={() => setFilterType(flt.value)}
                className={`px-2.5 py-1 text-[9px] uppercase font-sans font-bold tracking-widest rounded-md cursor-pointer transition-colors
                  ${filterType === flt.value
                    ? 'bg-[#111111] text-white'
                    : 'bg-gray-100/70 text-gray-500 hover:bg-gray-200 hover:text-gray-900'
                  }
                `}
              >
                {flt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical thin thread node list */}
        <div className="relative pl-6 lg:pl-8 space-y-8 before:absolute before:inset-y-2 before:left-[11px] lg:before:left-[13px] before:w-[1px] before:bg-gray-100">
          {filteredActs.map((act) => {
            const { icon: Icon, bg } = getIconProps(act.type);
            return (
              <motion.div 
                key={act.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative group text-left"
                id={`activity-item-${act.id}`}
              >
                {/* Flow Node Icon */}
                <div className={`absolute -left-[27px] lg:-left-[35px] top-1.5 w-6 h-6 lg:w-7 lg:h-7 rounded-sm border flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110 ${bg}`}>
                  <Icon size={12} />
                </div>

                {/* Information Card */}
                <div className="bg-[#FAF8F3]/60 border border-gray-100 hover:border-gray-200 rounded-sm p-4 transition-all space-y-2 font-montserrat">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[10px] font-medium text-gray-400">{act.date}</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-sans text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      <CheckCircle2 size={10} /> завершено
                    </span>
                  </div>

                  <h5 className="font-serif text-sm font-semibold text-gray-900 leading-snug">
                    {act.title}
                  </h5>

                  {act.propertyName && (
                    <p className="text-xs text-gray-500 font-sans flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#A38D6D] rounded-full" />
                      Объект: {act.propertyName}
                    </p>
                  )}

                  {act.amount && (
                    <div className="text-xs font-sans text-gray-600 font-semibold">
                      Движение средств:{' '}
                      <span className={act.type === 'payout' ? 'text-emerald-700 font-bold' : 'text-amber-800 font-bold'}>
                        {act.type === 'payout' ? '+' : ''}{formatVal(act.amount, currency)}
                      </span>
                    </div>
                  )}

                  {act.txHash && (
                    <div className="pt-2 border-t border-gray-100/60 flex items-center justify-between font-mono text-[8px] text-gray-400">
                      <span>Хэш транзакции: {act.txHash}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
