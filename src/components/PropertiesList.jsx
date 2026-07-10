import React, { useState } from 'react';
import { MapPin, Plus, Shield, CheckCircle, X, Building2, Layers, CalendarDays, FileText, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatVal } from '../utils';

export default function PropertiesList({ properties, onInvest, onSell, currency = 'USD' }) {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [actionMode, setActionMode] = useState('buy');
  const [tokenQuantity, setTokenQuantity] = useState(100);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [detailProperty, setDetailProperty] = useState(null);

  const handleOpenAction = (property, mode = 'buy') => {
    setSelectedProperty(property);
    setActionMode(mode);
    setTokenQuantity(mode === 'buy' ? 100 : (property.tokensOwned || 0));
    setTransactionSuccess(false);
  };

  const calculateCost = (property) => {
    return tokenQuantity * property.tokenPrice;
  };

  const calculateOwnershipYieldGain = (property) => {
    const totalTokens = property.currentValuation / property.tokenPrice;
    const addedPercentage = (tokenQuantity / totalTokens) * 100;
    const addedYield = property.monthlyYield * (addedPercentage / 100);
    return { addedPercentage, addedYield };
  };

  const handleConfirmAction = () => {
    if (!selectedProperty) return;
    const cost = calculateCost(selectedProperty);
    
    if (actionMode === 'buy') {
      onInvest(selectedProperty.id, tokenQuantity, cost);
    } else {
      onSell(selectedProperty.id, tokenQuantity, cost);
    }
    setTransactionSuccess(true);
    
    setTimeout(() => {
      setSelectedProperty(null);
      setTransactionSuccess(false);
    }, 1800);
  };

  return (
    <div className="space-y-8">
      {/* Grid of Custom Styled Property Holdings cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {properties.map((prop, i) => {
          const isInvested = prop.ownershipPercentage > 0;
          // Buying more is only possible while the offering is open on the site.
          // Selling own tokens stays available even after it's sold out (completed).
          const canBuy = prop.status === 'active';
          return (
            <motion.div
              key={prop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="bg-white border border-gray-100 rounded-sm overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              id={`property-card-${prop.id}`}
            >
              {/* Visual section of card */}
              <div
                className="relative h-56 bg-[#1A1A1A] overflow-hidden group cursor-pointer"
                onClick={() => setDetailProperty(prop)}
              >
                <img
                  referrerPolicy="no-referrer"
                  src={prop.image}
                  alt={prop.name}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Status tag badge */}
                <span className={`absolute top-4 left-4 px-3 py-1 font-sans text-[8px] uppercase tracking-widest rounded-md backdrop-blur-md border shadow-xs
                  ${prop.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold' 
                    : prop.status === 'pending' 
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold' 
                    : 'bg-gray-500/10 text-gray-500 border-gray-250/20 font-semibold'
                  }
                `}>
                  {prop.status === 'active' ? 'Активен' : prop.status === 'pending' ? 'Ожидается' : 'Продан'}
                </span>

                {/* Ownership Percentage Badge */}
                {isInvested && (
                  <span className="absolute top-4 right-4 bg-[#111111] text-white border border-[#A38D6D] px-2.5 py-1 font-montserrat font-bold text-[8px] uppercase tracking-widest rounded-md shadow-xs">
                    Доля {prop.ownershipPercentage.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Information body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5 text-left cursor-pointer" onClick={() => setDetailProperty(prop)}>
                  {(prop.address || prop.city) && (
                    <div className="flex items-center gap-1 text-[#A38D6D] text-[10px] uppercase tracking-wider font-bold">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{prop.address || prop.city}</span>
                    </div>
                  )}

                  <h4 className="font-serif text-lg font-bold tracking-tight text-gray-900 leading-snug hover:text-[#A38D6D] transition-colors">
                    {prop.name}
                  </h4>
                </div>

                {/* Real-estate statistics table */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-col text-left">
                    <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold">Общая оценка</span>
                    <span className="text-sm font-montserrat font-bold text-gray-900 mt-0.5">
                      {formatVal(prop.currentValuation, currency)}
                    </span>
                  </div>

                  <div className="flex flex-col text-left">
                    <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold">Ежемесячный доход</span>
                    <span className="text-xs font-montserrat font-semibold text-gray-900 bg-[#A38D6D]/5 px-1.5 py-0.5 rounded w-fit mt-0.5">
                      {formatVal(prop.monthlyYield, currency)} <span className="text-[10px] font-montserrat font-bold text-gray-400">({prop.roi}%)</span>
                    </span>
                  </div>

                  <div className="flex flex-col text-left">
                    <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold">Инвестировано</span>
                    <span className="text-sm font-montserrat font-bold text-gray-900 mt-0.5">
                      {formatVal(prop.totalInvested, currency)}
                    </span>
                  </div>

                  <div className="flex flex-col text-left">
                    <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold">Куплено токенов</span>
                    <span className="text-sm font-montserrat font-bold text-gray-900 mt-0.5">
                      {(prop.tokensOwned || 0).toLocaleString('ru-RU')}
                    </span>
                  </div>
                </div>

                 {/* Call-to-action details */}
                 <div className="pt-2">
                   {isInvested ? (
                     // Owns tokens: can always sell; can buy more only while the offering is open.
                     <div className="flex gap-2">
                       {canBuy && (
                         <button
                           id={`acquire-shares-btn-${prop.id}`}
                           onClick={() => handleOpenAction(prop, 'buy')}
                           className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-[#111111] hover:bg-[#A38D6D] text-white py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-all shadow-xs font-semibold"
                         >
                           <Plus size={10} />
                           <span>Купить</span>
                         </button>
                       )}
                       <button
                         id={`sell-shares-btn-${prop.id}`}
                         onClick={() => handleOpenAction(prop, 'sell')}
                         className={`${canBuy ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 cursor-pointer border border-[#A38D6D] text-[#A38D6D] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-all shadow-xs font-semibold bg-white`}
                       >
                         <span>Продать</span>
                       </button>
                     </div>
                   ) : canBuy ? (
                     <button
                       id={`acquire-shares-btn-${prop.id}`}
                       onClick={() => handleOpenAction(prop, 'buy')}
                       className="w-full flex items-center justify-center gap-1.5 cursor-pointer bg-[#111111] hover:bg-[#A38D6D] text-white py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-all shadow-xs font-semibold"
                     >
                       <Plus size={12} />
                       <span>Приобрести токены (доли)</span>
                     </button>
                   ) : (
                     <button
                       disabled
                       className="w-full bg-gray-50 border border-gray-100 text-gray-400 px-4 py-2 rounded-md text-[10px] uppercase font-bold tracking-widest text-center"
                     >
                       Распродано
                     </button>
                   )}
                 </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security purchase modal */}
      <AnimatePresence>
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setSelectedProperty(null)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-md bg-white border border-gray-100 rounded-sm shadow-2xl p-6 lg:p-8 overflow-hidden z-10"
              id="purchase-token-modal"
            >
              {transactionSuccess ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                  <div className={`w-16 h-16 rounded-full border flex items-center justify-center animate-bounce
                    ${actionMode === 'buy' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-amber-50 border-amber-500 text-amber-600'}
                  `}>
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-gray-900 text-center">
                    {actionMode === 'buy' ? 'Покупка оформлена!' : 'Продажа оформлена!'}
                  </h3>
                  <p className="text-[10px] text-[#A38D6D] uppercase tracking-widest text-center font-bold">
                    {actionMode === 'buy' ? 'Генерация токенизированного сертификата...' : 'Списание токенов собственности...'}
                  </p>
                  <p className="text-xs text-gray-500 text-center max-w-sm leading-relaxed">
                    {actionMode === 'buy' 
                      ? 'Ваша доля в праве собственности на недвижимость успешно обработана. Хэш обновленного документа ожидает подтверждения в реестре швейцарского блокчейна.'
                      : 'Ваши токены успешно списаны и аннулированы. Вырученные за их продажу средства зачислены на ваш инвестиционный баланс.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4 text-left">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-[#A38D6D] font-bold block">
                        {actionMode === 'buy' ? 'Приобретение реального актива (RWA)' : 'Ликвидация / продажа актива (RWA)'}
                      </span>
                      <h3 className="text-xl font-serif font-bold text-gray-900 mt-0.5">
                        {selectedProperty.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Цена: <span className="font-montserrat font-bold text-gray-800">{formatVal(selectedProperty.tokenPrice, currency)}</span>/токен • Код пула: ATR-{selectedProperty.name.substring(0, 3).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Quantity selections */}
                  <div className="space-y-4 text-left">
                    <div>
                      <div className="flex justify-between font-sans text-xs text-gray-600 mb-1 font-bold items-center">
                        <span>{actionMode === 'buy' ? 'КОЛИЧЕСТВО ДЛЯ ПОКУПКИ' : 'КОЛИЧЕСТВО ДЛЯ ПРОДАЖИ'}</span>
                        <div className="flex items-center gap-2">
                          {actionMode === 'sell' && (
                            <button
                              type="button"
                              onClick={() => setTokenQuantity(selectedProperty.tokensOwned || 0)}
                              className="text-[9px] text-[#A38D6D] hover:text-[#7f6f55] font-bold uppercase tracking-wider bg-[#A38D6D]/10 hover:bg-[#A38D6D]/20 px-2 py-0.5 rounded transition-all cursor-pointer"
                              title="Выбрать все доступные токены для полной продажи"
                            >
                              Продать всё
                            </button>
                          )}
                          <span className="text-[#A38D6D] font-montserrat font-bold">{tokenQuantity} ATR-S</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="1" 
                          max={actionMode === 'buy' ? 1000 : (selectedProperty.tokensOwned || 0)} 
                          step="1" 
                          value={tokenQuantity} 
                          onChange={(e) => setTokenQuantity(Math.min(actionMode === 'buy' ? 1000 : (selectedProperty.tokensOwned || 0), Number(e.target.value)))}
                          className="flex-1 accent-[#A38D6D] h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                        />
                        <input
                          type="number"
                          min="1"
                          max={actionMode === 'buy' ? 1000 : (selectedProperty.tokensOwned || 0)}
                          value={tokenQuantity}
                          onChange={(e) => {
                            let val = Number(e.target.value);
                            const maxVal = actionMode === 'buy' ? 1000 : (selectedProperty.tokensOwned || 0);
                            if (val > maxVal) val = maxVal;
                            if (val < 1) val = 1;
                            setTokenQuantity(val);
                          }}
                          className="w-20 p-1.5 border border-gray-200 text-xs rounded-sm text-center text-gray-900 font-montserrat font-semibold focus:outline-none focus:border-[#A38D6D]"
                        />
                      </div>

                      <div className="flex justify-between text-[8px] text-gray-400 font-mono mt-2">
                        {actionMode === 'buy' ? (
                          <>
                            <span>1 токен ({formatVal(selectedProperty.tokenPrice, currency)})</span>
                            <span>1,000 токенов ({formatVal(1000 * selectedProperty.tokenPrice, currency)})</span>
                          </>
                        ) : (
                          <>
                            <span>1 токен ({formatVal(selectedProperty.tokenPrice, currency)})</span>
                            <span>{selectedProperty.tokensOwned?.toLocaleString() || 0} токенов ({formatVal((selectedProperty.tokensOwned || 0) * selectedProperty.tokenPrice, currency)})</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary card */}
                    <div className="bg-[#F8F8F7] p-4 rounded-sm space-y-2 border border-gray-100">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{actionMode === 'buy' ? 'Добавляемая доля:' : 'Высвобождаемая доля:'}</span>
                        <span className="font-montserrat font-bold text-gray-800">
                          {actionMode === 'buy' ? '+' : '-'}{calculateOwnershipYieldGain(selectedProperty).addedPercentage.toFixed(3)}% собственности
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{actionMode === 'buy' ? 'Прирост дохода:' : 'Снижение дохода:'}</span>
                        <span className={actionMode === 'buy' ? 'text-[#4F7942] font-montserrat font-bold' : 'text-rose-700 font-montserrat font-bold'}>
                          {actionMode === 'buy' ? '+' : '-'}{formatVal(calculateOwnershipYieldGain(selectedProperty).addedYield, currency, true)}/мес
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between text-sm font-serif font-bold text-gray-900">
                        <span>{actionMode === 'buy' ? 'Итого инвестиций в капитал:' : 'Вырученные средства:'}</span>
                        <span className={actionMode === 'buy' ? 'text-amber-800 font-montserrat font-bold text-base' : 'text-emerald-700 font-montserrat font-bold text-base'}>
                          {formatVal(calculateCost(selectedProperty), currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 border border-amber-200/50 bg-[#FAF8F3] rounded-sm text-[10px] text-gray-500">
                      <Shield size={16} className="text-[#A38D6D] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-gray-900">Соответствие регуляторным стандартам</strong>
                        <p className="mt-0.5 text-gray-500 font-sans tracking-wide">
                          {actionMode === 'buy'
                            ? 'Дробное владение обеспечено записями первичной ипотеки. Полностью соответствует ст. 973d Швейцарского обязательственного кодекса.'
                            : 'Сделка продажи долей в RWA-активе регистрируется в распределенном реестре в соответствии со ст. 973f Швейцарского обязательственного кодекса.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setSelectedProperty(null)}
                      className="flex-1 bg-[#F3F3F1] hover:bg-gray-200 text-gray-800 rounded-md py-2.5 text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button 
                      onClick={handleConfirmAction}
                      className="flex-1 bg-[#111111] hover:bg-[#A38D6D] text-white rounded-md py-2.5 text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer shadow-sm"
                      id="confirm-acquire-shares-btn"
                    >
                      {actionMode === 'buy' ? 'Авторизовать кошелек' : 'Подтвердить продажу'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right-side property detail panel (investor view — read-only, no admin controls) */}
      <AnimatePresence>
        {detailProperty && (() => {
          const dp = detailProperty;
          const invested = dp.ownershipPercentage > 0;
          const soldPct = dp.totalTokens > 0
            ? ((dp.totalTokens - dp.availableTokens) / dp.totalTokens) * 100
            : 0;
          const canBuy = dp.status === 'active';
          const specs = [
            ['Полный адрес', dp.address],
            ['Тип недвижимости', dp.propertyType],
            ['Город', dp.city],
            ['Год постройки', dp.completionYear],
            ['Застройщик', dp.developer],
            ['Этажей', dp.floors],
          ].filter(([, v]) => v !== null && v !== undefined && v !== '');

          return (
            <div className="fixed inset-0 z-50 flex justify-end">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                onClick={() => setDetailProperty(null)}
              />

              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col font-montserrat"
              >
                {/* Header */}
                <div className="relative h-40 shrink-0 overflow-hidden bg-[#1A1A1A]">
                  <img referrerPolicy="no-referrer" src={dp.image} alt={dp.name} className="w-full h-full object-cover opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <button
                    onClick={() => setDetailProperty(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center cursor-pointer transition-colors"
                    aria-label="Закрыть"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-4 left-6 right-6 text-left">
                    <span className="text-[8px] uppercase tracking-[0.2em] text-white/60 font-bold block">Карточка объекта</span>
                    <h3 className="font-serif text-2xl font-bold text-white leading-tight mt-1">{dp.name}</h3>
                    {(dp.address || dp.city) && (
                      <p className="text-[11px] text-white/70 flex items-center gap-1 mt-1">
                        <MapPin size={11} className="shrink-0" /> {dp.address || dp.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-7 text-left">
                  {dp.description && (
                    <section className="space-y-2">
                      <h4 className="font-serif text-base font-bold text-gray-900">Описание объекта</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{dp.description}</p>
                    </section>
                  )}

                  {/* Tokenization */}
                  <section className="space-y-3">
                    <h4 className="font-serif text-base font-bold text-gray-900">Токенизация</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        ['Цена токена', formatVal(dp.tokenPrice, dp.currency)],
                        ['Доступно', (dp.availableTokens ?? 0).toLocaleString('ru-RU')],
                        ['Всего токенов', (dp.totalTokens ?? 0).toLocaleString('ru-RU')],
                        ['Валюта', dp.currency],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-[#F8F8F7] border border-gray-100 rounded-sm p-3">
                          <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold block">{label}</span>
                          <span className="text-sm font-bold text-gray-900 mt-0.5 block">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">
                        <span>Продано долей</span>
                        <span className="text-gray-700">{soldPct.toFixed(2)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#A38D6D]" style={{ width: `${Math.min(100, soldPct)}%` }} />
                      </div>
                    </div>
                  </section>

                  {/* Investor's own holding */}
                  {invested && (
                    <section className="space-y-3">
                      <h4 className="font-serif text-base font-bold text-gray-900">Ваша доля</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ['Куплено токенов', (dp.tokensOwned || 0).toLocaleString('ru-RU')],
                          ['Инвестировано', formatVal(dp.totalInvested, dp.currency)],
                          ['Доля', `${dp.ownershipPercentage.toFixed(2)}%`],
                        ].map(([label, value]) => (
                          <div key={label} className="bg-[#FAF8F3] border border-[#A38D6D]/20 rounded-sm p-3">
                            <span className="text-[8px] tracking-widest uppercase text-gray-400 font-bold block">{label}</span>
                            <span className="text-sm font-bold text-gray-900 mt-0.5 block">{value}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Characteristics */}
                  {specs.length > 0 && (
                    <section className="space-y-3">
                      <h4 className="font-serif text-base font-bold text-gray-900">Характеристики объекта</h4>
                      <dl className="divide-y divide-gray-100 border-y border-gray-100">
                        {specs.map(([label, value]) => (
                          <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                            <dt className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5 shrink-0">
                              {label === 'Тип недвижимости' && <Building2 size={12} className="text-[#A38D6D]" />}
                              {label === 'Этажей' && <Layers size={12} className="text-[#A38D6D]" />}
                              {label === 'Год постройки' && <CalendarDays size={12} className="text-[#A38D6D]" />}
                              {label}
                            </dt>
                            <dd className="text-xs text-gray-800 text-right">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}

                  {/* Documents */}
                  {dp.documents?.length > 0 && (
                    <section className="space-y-3">
                      <h4 className="font-serif text-base font-bold text-gray-900">Документы</h4>
                      <ul className="space-y-2">
                        {dp.documents.map((doc) => (
                          <li key={doc.id}>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-sm hover:bg-[#FAF8F3] transition-colors group"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="text-[#A38D6D] shrink-0" />
                                <span className="text-xs text-gray-800 truncate">{doc.fileName || 'Документ'}</span>
                              </span>
                              <ExternalLink size={13} className="text-gray-400 group-hover:text-[#A38D6D] shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                {/* Sticky CTA */}
                <div className="shrink-0 border-t border-gray-100 p-4 flex gap-3">
                  {canBuy && (
                    <button
                      onClick={() => { const p = dp; setDetailProperty(null); handleOpenAction(p, 'buy'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 cursor-pointer bg-[#111111] hover:bg-[#A38D6D] text-white py-3 rounded-md text-[9px] uppercase tracking-widest transition-all font-semibold"
                    >
                      <Plus size={12} /> <span>Купить</span>
                    </button>
                  )}
                  {invested && (
                    <button
                      onClick={() => { const p = dp; setDetailProperty(null); handleOpenAction(p, 'sell'); }}
                      className={`${canBuy ? 'flex-1' : 'w-full'} flex items-center justify-center cursor-pointer border border-[#A38D6D] text-[#A38D6D] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 py-3 rounded-md text-[9px] uppercase tracking-widest transition-all font-semibold bg-white`}
                    >
                      Продать
                    </button>
                  )}
                  {!canBuy && !invested && (
                    <button disabled className="w-full bg-gray-50 border border-gray-100 text-gray-400 py-3 rounded-md text-[10px] uppercase font-bold tracking-widest">
                      Распродано
                    </button>
                  )}
                </div>
              </motion.aside>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
