import React, { useState } from 'react';
import { User, Wallet, Check } from 'lucide-react';

export default function SettingsPanel({ investorName, currency, onCurrencyChange }) {
  const [walletAddress, setWalletAddress] = useState('0x7F2C9A3F3B4E1D8B8D2A4F6E6B1c2D3e4F5a6B7c');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl text-left font-montserrat">
      {/* Editorial Headline Statement */}
      <div className="max-w-4xl border-l-2 border-[#A38D6D] pl-6 py-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">
          Конфигурация платформы
        </span>
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-2 leading-tight">
          Настройки токенизации и параметры безопасности
        </h3>
      </div>

      <div className="bg-white border border-gray-100 p-6 lg:p-8 rounded-sm shadow-xs space-y-8">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Profile non-editable name */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-3 flex items-center gap-2">
              <User size={16} className="text-[#A38D6D]" /> Профиль инвестора
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Имя инвестора</label>
                <div className="w-full text-xs p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-semibold select-none">
                  {investorName}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Валюта оценки</label>
                <div className="w-full text-xs p-3 border border-gray-200 rounded-md bg-gray-50 text-gray-500 font-semibold select-none">
                  KGS (с) — Кыргызский сом
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Address section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-lg font-bold text-[#1A1A1A] pb-1 flex items-center gap-2">
              <Wallet size={16} className="text-[#A38D6D]" /> Адрес кошелька
            </h4>
            
            <p className="text-xs text-gray-500 leading-relaxed font-semibold">
              Укажите адрес вашего публичного смарт-кошелька для привязки долей и автоматического зачисления дивидендов на блокчейне.
            </p>

            <div className="space-y-1.5">
              <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-400">Публичный Ethereum/EVM адрес</label>
              <input 
                type="text" 
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full text-xs font-mono p-3 bg-white border border-gray-250 rounded-md text-gray-900 focus:outline-none focus:border-[#A38D6D]"
              />
            </div>
          </div>

          {/* Submit button for everything */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button 
              type="submit"
              className="bg-[#111111] hover:bg-[#A38D6D] text-white px-6 py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
              id="save-settings-btn"
            >
              {saveSuccess ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span>Успешно сохранено</span>
                </>
              ) : (
                <span>Сохранить настройки</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
