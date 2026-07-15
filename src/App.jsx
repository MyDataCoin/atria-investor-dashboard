import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import PropertiesList from './components/PropertiesList';
import ActivitiesTimeline from './components/ActivitiesTimeline';
import AnalyticsDash from './components/AnalyticsDash';
import TaxDocPanel from './components/TaxDocPanel';
import HelpDesk from './components/HelpDesk';
import NewsPanel from './components/NewsPanel';
import SettingsPanel from './components/SettingsPanel';

// Real backend feeds (catalogue + investor portfolio).
import { fetchProperties } from './api/properties';
import { fetchPortfolio } from './api/investments';
import { fetchKycProfile } from './api/kyc';
import { fetchTickets } from './api/tickets';
import {
  applyInvestmentsToProperties,
  derivePortfolioStats,
  buildActivitiesFromInvestments,
  buildActivitiesFromTickets,
  buildAssetAllocation,
} from './api/adapters';

import { Shield, Loader2, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Filled from KYC (/kyc/me) once the backend exposes fullName; neutral until then.
  const [investorName, setInvestorName] = useState('Инвестор');
  // KGS only for now — FX conversion is disabled (backend amounts are in som).
  const [currency, setCurrency] = useState('KGS');

  // Portfolio state, hydrated from the backend on mount.
  const [stats, setStats] = useState(null);
  const [properties, setProperties] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Load the public catalogue and the investor's portfolio in parallel, then
  // merge the holdings into the catalogue and derive the headline stats.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        // The catalogue is public and required. The portfolio needs a bearer
        // token (auth lives on the main site) — treat its absence as "no
        // holdings yet" rather than failing the whole dashboard.
        const catalogue = await fetchProperties({ signal });

        let portfolio = { totalInvested: 0, activeCount: 0, investments: [] };
        try {
          portfolio = await fetchPortfolio({ signal });
        } catch (portfolioErr) {
          if (portfolioErr?.name === 'AbortError') throw portfolioErr;
          // Leave the empty portfolio default; the catalogue still renders.
        }

        setProperties(applyInvestmentsToProperties(catalogue, portfolio.investments));
        setStats(derivePortfolioStats(portfolio));

        const investmentActs = buildActivitiesFromInvestments(portfolio.investments, catalogue);

        // Fold support-ticket events (ticket created / support replied) into the
        // same chronicle. Non-fatal — the timeline still renders without them.
        let ticketActs = [];
        try {
          ticketActs = buildActivitiesFromTickets(await fetchTickets({ signal }));
        } catch (ticketErr) {
          if (ticketErr?.name === 'AbortError') throw ticketErr;
        }

        setActivities(
          [...investmentActs, ...ticketActs].sort((a, b) => b.timestamp - a.timestamp)
        );

        // Pull the investor's name from KYC. Non-fatal: keeps the neutral
        // fallback if unauthenticated, no KYC profile, or the field is absent.
        try {
          const kyc = await fetchKycProfile({ signal });
          if (kyc.fullName) setInvestorName(kyc.fullName);
        } catch (kycErr) {
          if (kycErr?.name === 'AbortError') throw kycErr;
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setLoadError(err?.message ?? 'Не удалось загрузить данные портфеля.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, []);

  // Core callback: Investing / acquiring additional shares from a property card
  const handleInvestInProperty = (propertyId, quantity, cost) => {
    // 1. Update Property holding metrics locally
    const updatedProperties = properties.map((prop) => {
      if (prop.id === propertyId) {
        const extraWeight = (cost / prop.currentValuation) * 100;
        return {
          ...prop,
          ownershipPercentage: prop.ownershipPercentage + extraWeight,
          totalInvested: prop.totalInvested + cost,
          tokensOwned: prop.tokensOwned + quantity
        };
      }
      return prop;
    });
    setProperties(updatedProperties);

    // 2. Synchronize dynamic portfolio overview cards state
    const matchedProp = properties.find(p => p.id === propertyId);
    if (!matchedProp) return;

    const extraYieldAddition = (cost / matchedProp.currentValuation) * matchedProp.monthlyYield;
    const previousTotalInvested = stats.totalInvested;
    const newTotalInvested = stats.totalInvested + cost;

    // Recalculately estimate weighted average portfolio ROI
    const weightedAverageRoi = ((stats.totalInvested * stats.averageRoi) + (cost * matchedProp.roi)) / newTotalInvested;

    setStats((prev) => ({
      ...prev,
      totalInvested: newTotalInvested,
      currentAssetValue: prev.currentAssetValue + cost * 1.05, // simulated value margin
      monthlyIncome: Math.round(prev.monthlyIncome + extraYieldAddition),
      averageRoi: Number(weightedAverageRoi.toFixed(2))
    }));

    // 3. Log active shopping event to activities chronicle timeline
    const newActivity = {
      id: `act-buy-${Date.now()}`,
      type: 'purchase',
      title: `Приобретено долей: ${quantity.toLocaleString()} за ${matchedProp.name}`,
      propertyName: matchedProp.name,
      amount: cost,
      date: 'Только что',
      timestamp: new Date(),
      status: 'completed',
      txHash: '0x' + Math.random().toString(16).substr(2, 6).toUpperCase() + '...SEC'
    };
    setActivities([newActivity, ...activities]);
  };

  // Core callback: Selling / liquidating shares of a property card
  const handleSellProperty = (propertyId, quantity, proceeds) => {
    // 1. Update Property holding metrics locally
    const updatedProperties = properties.map((prop) => {
      if (prop.id === propertyId) {
        // Since we are selling, decrease ownership percentage, total invested (or ownership value), and tokens owned
        const soldPercentage = (quantity / (prop.currentValuation / prop.tokenPrice)) * 100;
        const remainingTokens = Math.max(0, prop.tokensOwned - quantity);
        const remainingPercentage = Math.max(0, prop.ownershipPercentage - soldPercentage);
        const remainingInvested = Math.max(0, prop.totalInvested - proceeds);
        return {
          ...prop,
          ownershipPercentage: remainingPercentage,
          totalInvested: remainingInvested,
          // Investor fully exited this object — mark it as "Продан".
          soldOut: remainingTokens === 0,
          tokensOwned: remainingTokens
        };
      }
      return prop;
    });
    setProperties(updatedProperties);

    // 2. Synchronize dynamic stats
    const matchedProp = properties.find(p => p.id === propertyId);
    if (!matchedProp) return;

    const lostYield = (proceeds / matchedProp.currentValuation) * matchedProp.monthlyYield;
    const newTotalInvested = Math.max(0, stats.totalInvested - proceeds);
    const newAssetValue = Math.max(0, stats.currentAssetValue - proceeds * 1.05);
    const newMonthlyIncome = Math.max(0, Math.round(stats.monthlyIncome - lostYield));

    // Recalculate average ROI safely
    let newRoi = stats.averageRoi;
    if (newTotalInvested > 0) {
      const totalWeightedRoiSum = updatedProperties.reduce((sum, p) => sum + (p.totalInvested * p.roi), 0);
      newRoi = Number((totalWeightedRoiSum / newTotalInvested).toFixed(2));
    }

    setStats((prev) => ({
      ...prev,
      totalInvested: newTotalInvested,
      currentAssetValue: newAssetValue,
      monthlyIncome: newMonthlyIncome,
      averageRoi: newRoi
    }));

    // 3. Log to activities timeline
    const newActivity = {
      id: `act-sell-${Date.now()}`,
      type: 'sale',
      title: `Продано долей: ${quantity.toLocaleString()} за ${matchedProp.name}`,
      propertyName: matchedProp.name,
      amount: proceeds,
      date: 'Только что',
      timestamp: new Date(),
      status: 'completed',
      txHash: '0x' + Math.random().toString(16).substr(2, 6).toUpperCase() + '...SEC'
    };
    setActivities([newActivity, ...activities]);
  };

  // Callback to append custom manual yields broadcast simulator
  const handleAddManualActivity = (customActivity) => {
    setActivities([customActivity, ...activities]);
    
    // If it's a layout payout distribution change, increase cash statistics
    if (customActivity.type === 'payout') {
      setStats((prev) => ({
        ...prev,
        monthlyIncome: prev.monthlyIncome + customActivity.amount,
        cashDistributions: prev.cashDistributions + customActivity.amount
      }));
    }
  };

  // The dashboard shows only assets the investor actually holds — i.e. catalogue
  // entries enriched with an active stake from /investments/portfolio.
  const ownedProperties = properties.filter((p) => p.tokensOwned > 0);

  // Real capital allocation across the investor's holdings.
  const assetAllocation = buildAssetAllocation(ownedProperties);

  const emptyHoldings = (
    <div className="py-16 text-center text-gray-400 font-serif">
      У вас пока нет активов в собственности.
    </div>
  );

  // Section Routing rendering function
  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <div className="space-y-10">
            {/* Overview cards metrics + simulation tools */}
            <Overview stats={stats} currency={currency} />

            {/* Quick Properties highlights on main board */}
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Объекты недвижимости</span>
                  <h4 className="font-serif text-lg font-bold text-gray-900">Мои активы</h4>
                </div>
                <button
                  onClick={() => setCurrentSection('properties')}
                  className="text-xs text-[#A38D6D] hover:underline uppercase tracking-wide font-bold font-mono cursor-pointer"
                >
                  Посмотреть все мои активы →
                </button>
              </div>
              {ownedProperties.length === 0
                ? emptyHoldings
                : <PropertiesList properties={ownedProperties.slice(0, 3)} onInvest={handleInvestInProperty} onSell={handleSellProperty} currency={currency} />}
            </div>

            {/* Micro timelines preview section */}
            <div className="space-y-4 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Синхронизация реестра</span>
                  <h4 className="font-serif text-lg font-bold text-gray-900">Лента хроники операций</h4>
                </div>
                <button 
                  onClick={() => setCurrentSection('activity')}
                  className="text-xs text-[#A38D6D] hover:underline uppercase tracking-wide font-bold font-mono cursor-pointer"
                >
                  Проверить логи реестра →
                </button>
              </div>
              <ActivitiesTimeline activities={activities} onAddManualActivity={handleAddManualActivity} currency={currency} />
            </div>
          </div>
        );
      case 'properties':
        return ownedProperties.length === 0
          ? emptyHoldings
          : <PropertiesList properties={ownedProperties} onInvest={handleInvestInProperty} onSell={handleSellProperty} currency={currency} />;
      case 'activity':
        return <ActivitiesTimeline activities={activities} onAddManualActivity={handleAddManualActivity} currency={currency} />;
      case 'analytics':
        return <AnalyticsDash currency={currency} allocation={assetAllocation} />;
      case 'news':
        // Shared showcase: every published post is visible to all investors, not
        // filtered by portfolio. The property list only drives the scope filter.
        return <NewsPanel properties={properties} />;
      case 'taxdoc':
        return (
          <TaxDocPanel
            investorName={investorName}
            properties={ownedProperties}
            totalInvested={stats?.totalInvested ?? 0}
            currency={currency}
          />
        );
      case 'support':
        return <HelpDesk />;
      case 'settings':
        return <SettingsPanel investorName={investorName} currency={currency} onCurrencyChange={setCurrency} />;
      default:
        return (
          <div className="py-20 text-center font-serif text-lg text-gray-500">
            Загрузка раздела. Пожалуйста, используйте боковую панель навигации.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex font-sans text-gray-800 paper-grain relative select-none">
      
      {/* Sidebar Navigation Drawer */}
      <Sidebar 
        currentSection={currentSection} 
        onSectionChange={setCurrentSection} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main viewport Container */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 transition-all duration-300">
        
        {/* Editorial Top header bar */}
        <Header
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          investorName={investorName}
          portfolioValue={stats?.currentAssetValue ?? 0}
          currency={currency}
        />

        {/* Dynamic content scroll workspace */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-10 overflow-y-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 size={28} className="animate-spin text-[#A38D6D]" />
              <span className="text-xs uppercase tracking-widest font-bold">Синхронизация реестра активов…</span>
            </div>
          ) : loadError ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={28} className="text-rose-500" />
              <span className="text-sm font-serif font-bold text-gray-900">Не удалось загрузить портфель</span>
              <span className="text-xs text-gray-500 max-w-md">{loadError}</span>
            </div>
          ) : (
            renderContent()
          )}

          {/* Persistent global regulator reassurance footer */}
          <footer className="pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-450 text-[10px] font-mono text-left">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#A38D6D]" />
              <span>Институциональная регулируемая песочница реестра активов (v4.22)</span>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}
