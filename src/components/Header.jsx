import React from 'react';
import { Menu } from 'lucide-react';
import { formatVal } from '../utils';

export default function Header({ onMenuToggle, investorName, portfolioValue, currency = 'USD' }) {
  // Get initials for profile badge
  const getInitials = (name) => {
    if (!name) return 'ИН';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-35 shrink-0">
      {/* Mobile left side: Menu toggle + greeting */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-[#1A1A1A] hover:bg-[#F3F3F1] rounded-lg transition-colors cursor-pointer"
          aria-label="Переключить меню навигации"
          id="mobile-menu-toggle"
        >
          <Menu size={22} />
        </button>
        
        <div className="text-left">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block">
            С возвращением
          </span>
          <h1 className="text-lg font-serif italic text-gray-900 leading-none mt-1">
            {investorName}
          </h1>
        </div>
      </div>

      {/* Right side: Quick Readout, ID Info */}
      <div className="flex items-center gap-6 lg:gap-8">

        {/* Quick Portfolio Live Value Indicator */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5">
            Стоимость портфеля
          </span>
          <div className="text-xl font-montserrat font-bold text-[#1A1A1A]">
            {formatVal(portfolioValue, currency, true)}
          </div>
        </div>

        {/* User Identity Banner */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F3F3F1] border border-gray-100 flex items-center justify-center text-xs font-bold text-[#A38D6D]">
            {getInitials(investorName)}
          </div>
        </div>

      </div>
    </header>
  );
}
