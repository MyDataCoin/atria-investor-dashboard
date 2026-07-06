import React from 'react';
import {
  LayoutDashboard,
  Building,
  Activity,
  LineChart,
  Settings,
  FileText,
  LifeBuoy,
  X,
  Award,
  ArrowLeft
} from 'lucide-react';

// Where the "back to home" button points (main Atria site).
const HOME_URL = 'https://atria-pearl.vercel.app/';

export default function Sidebar({ currentSection, onSectionChange, isOpen, onClose }) {
  const menuItems = [
    { id: 'dashboard', label: 'Панель управления', icon: LayoutDashboard },
    { id: 'properties', label: 'Активы', icon: Building },
    { id: 'activity', label: 'История операций', icon: Activity },
    { id: 'analytics', label: 'Аналитика и тренды', icon: LineChart },
    { id: 'taxdoc', label: 'Налоговый документ', icon: FileText },
    { id: 'support', label: 'Поддержка', icon: LifeBuoy },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <>
      {/* Mobile background backdrop overlays */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300" 
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 bg-[#111111] z-50 w-72 transform lg:transform-none transition-transform duration-300 ease-in-out flex flex-col justify-between py-8 px-6 text-white
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col gap-10">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-10 h-10" fill="none" stroke="#A38D6D" strokeLinecap="round" strokeLinejoin="round">
                  {/* Roof (Chevron) */}
                  <path d="M 24 44 L 50 18 L 76 44" strokeWidth="4.5" />
                  {/* Center Stem */}
                  <path d="M 50 18 L 50 82" strokeWidth="4" />
                  {/* Arch / Portal */}
                  <path d="M 36 82 L 36 50 A 14 14 0 0 1 64 50 L 64 82" strokeWidth="4" />
                  {/* Baseline */}
                  <line x1="20" y1="82" x2="80" y2="82" strokeWidth="4.5" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="font-serif text-2xl tracking-widest text-white uppercase font-semibold leading-none">
                  ATRIA
                </h1>
              </div>
            </div>

            {/* Mobile close trigger */}
            <button 
              onClick={onClose}
              className="lg:hidden p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded"
              id="sidebar-close-btn"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" id="sidebar-navbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => {
                    onSectionChange(item.id);
                    onClose();
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-sans font-semibold uppercase tracking-widest rounded-lg transition-all duration-200 text-left cursor-pointer group
                    ${isActive 
                      ? 'bg-white/10 text-white shadow-md' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon 
                    size={16} 
                    className={`transition-colors duration-200 
                      ${isActive ? 'text-[#A38D6D]' : 'text-white/30 group-hover:text-[#A38D6D]'}
                    `} 
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#A38D6D] ml-auto animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Brand footer inside Sidebar */}
        <div className="border-t border-white/10 pt-6 text-left">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-center gap-2">
            <Award size={14} className="text-[#A38D6D]" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#A38D6D] font-bold">
              Подтвержденный аккаунт
            </span>
          </div>

          {/* Back to the main Atria site */}
          <a
            href={HOME_URL}
            className="group mt-3 flex items-center justify-center gap-2 border border-white/10 hover:border-[#A38D6D] bg-white/5 hover:bg-[#A38D6D]/10 text-white/60 hover:text-white px-4 py-3 rounded-xl text-[10px] uppercase tracking-widest font-bold font-mono transition-all cursor-pointer"
            id="back-to-home-btn"
          >
            <ArrowLeft size={14} className="text-[#A38D6D] transition-transform group-hover:-translate-x-0.5" />
            <span>На главную</span>
          </a>

          <p className="font-mono text-[9px] text-white/30 mt-4 text-center">
            © 2026 ATRIA
          </p>
        </div>
      </aside>
    </>
  );
}
