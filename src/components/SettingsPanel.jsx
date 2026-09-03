import React, { useEffect, useState } from 'react';
import { User, Wallet, Check, ShieldAlert } from 'lucide-react';
import { fetchKycProfile, linkWallet, requestWalletChange, changeWallet } from '../api/kyc';

/** Тот же формат, что принимает бэкенд: 0x + 40 hex. */
const isEvmAddress = (v) => /^0x[a-fA-F0-9]{40}$/.test((v || '').trim());

export default function SettingsPanel({ investorName, currency, onCurrencyChange }) {
  // null — ещё не загрузили; '' — кошелька в базе нет. Разные состояния: пока не знаем,
  // показывать пустое поле нельзя, иначе привязанный адрес мигнёт пустотой.
  const [linked, setLinked] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Смена привязанного адреса — через код из СМС. 'idle' -> 'code'.
  const [changeStep, setChangeStep] = useState('idle');
  const [code, setCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchKycProfile()
      .then((p) => {
        if (cancelled) return;
        // Пусто в базе — пусто в поле. Никаких подставленных адресов.
        setLinked(p.walletAddress || '');
        setWalletAddress(p.walletAddress || '');
      })
      .catch(() => { if (!cancelled) setLinked(''); });
    return () => { cancelled = true; };
  }, []);

  const flashSaved = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const readableError = (err) => {
    const code = err?.problem?.code || err?.problem?.title;
    if (code === 'Kyc.WalletHasShares')
      return 'По текущему кошельку уже выпущены доли — смену делает поддержка.';
    if (code === 'Kyc.WalletAlreadyLinked')
      return 'Кошелёк уже привязан. Используйте смену адреса.';
    return err?.problem?.detail || err?.message || 'Не удалось сохранить.';
  };

  // Первая привязка: кошелька в базе ещё нет.
  const handleLink = async (e) => {
    e.preventDefault();
    if (!isEvmAddress(walletAddress)) {
      setError('Адрес должен начинаться с 0x и содержать 40 символов.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await linkWallet(walletAddress.trim());
      setLinked(walletAddress.trim());
      flashSaved();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  // Шаг 1 смены: код уходит на телефон из аккаунта, а не на введённый в форме.
  const handleRequestChange = async () => {
    if (!isEvmAddress(walletAddress)) {
      setError('Адрес должен начинаться с 0x и содержать 40 символов.');
      return;
    }
    if (walletAddress.trim().toLowerCase() === (linked || '').toLowerCase()) {
      setError('Это тот же адрес, что привязан сейчас.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestWalletChange();
      setChangeStep('code');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  // Шаг 2: подтверждение кодом.
  const handleConfirmChange = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await changeWallet(walletAddress.trim(), code.trim());
      setLinked(walletAddress.trim());
      setChangeStep('idle');
      setCode('');
      flashSaved();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = (e) => {
    if (linked) {
      e.preventDefault();
      handleRequestChange();
      return;
    }
    handleLink(e);
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
                onChange={(e) => { setWalletAddress(e.target.value); setError(''); }}
                placeholder={linked === null ? 'Загрузка…' : '0x...'}
                disabled={linked === null || busy || changeStep === 'code'}
                className="w-full text-xs font-mono p-3 bg-white border border-gray-250 rounded-md text-gray-900 focus:outline-none focus:border-[#A38D6D] disabled:bg-gray-50 disabled:text-gray-400"
              />
              {linked ? (
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Кошелёк привязан. Смена адреса подтверждается кодом из СМС и невозможна, если по
                  нему уже выпущены доли — выпущенные доли на новый адрес не переезжают.
                </p>
              ) : (
                linked === '' && (
                  <p className="text-[10px] text-gray-400">
                    Кошелёк ещё не привязан. Проверьте адрес: доли уйдут именно на него.
                  </p>
                )
              )}
            </div>

            {/* Шаг подтверждения: код уходит на телефон из аккаунта, а не на введённый номер. */}
            {changeStep === 'code' && (
              <div className="space-y-1.5 p-3 border border-[#A38D6D]/30 bg-[#A38D6D]/5 rounded-md">
                <label className="block text-[8px] tracking-widest uppercase font-bold text-gray-500">
                  Код из СМС
                </label>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Мы отправили код на номер, привязанный к аккаунту. Он подтверждает смену адреса
                  зачисления долей.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setError(''); }}
                    placeholder="0000"
                    className="w-32 text-xs font-mono p-2.5 bg-white border border-gray-250 rounded-md text-gray-900 focus:outline-none focus:border-[#A38D6D]"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmChange}
                    disabled={busy || !code.trim()}
                    className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-50 text-white px-4 py-2.5 rounded-md text-[9px] uppercase tracking-widest font-bold cursor-pointer transition-colors"
                  >
                    {busy ? 'Проверяем…' : 'Подтвердить смену'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setChangeStep('idle'); setCode(''); setError(''); setWalletAddress(linked || ''); }}
                    className="px-3 py-2.5 text-[9px] uppercase tracking-widest font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="flex items-start gap-1.5 text-[11px] text-rose-600 font-semibold">
                <ShieldAlert size={13} className="shrink-0 mt-px" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Submit button for everything */}
          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={linked === null || busy || changeStep === 'code'}
              className="bg-[#111111] hover:bg-[#A38D6D] disabled:opacity-50 text-white px-6 py-2.5 rounded-md text-[9px] uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
              id="save-settings-btn"
            >
              {saveSuccess ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span>Успешно сохранено</span>
                </>
              ) : (
                <span>{linked ? 'Сменить кошелёк' : 'Сохранить настройки'}</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
