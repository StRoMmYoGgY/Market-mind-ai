import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { MarketExplorerView } from './components/views/MarketExplorerView';
import { AiResearchView } from './components/views/AiResearchView';
import { OpportunityScannerView } from './components/views/OpportunityScannerView';
import { StrategyLabView } from './components/views/StrategyLabView';
import { RiskManagerView } from './components/views/RiskManagerView';
import { PaperTradingView } from './components/views/PaperTradingView';
import { PortfolioManagerView } from './components/views/PortfolioManagerView';
import { TradingJournalView } from './components/views/TradingJournalView';
import { PerformanceAnalyticsView } from './components/views/PerformanceAnalyticsView';
import { DataSourcesView } from './components/views/DataSourcesView';
import { SettingsView } from './components/views/SettingsView';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Active instrument context for cross-navigation
  const [activeInstrument, setActiveInstrument] = useState<{
    symbol: string;
    market: string;
    size?: number;
    stopLoss?: number;
    takeProfit?: number;
  }>({
    symbol: 'BTC',
    market: 'crypto',
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  const userId = currentUser?.uid || 'guest';

  const handleNavigate = (
    view: string,
    instrument?: { symbol: string; market: string; size?: number; stopLoss?: number; takeProfit?: number }
  ) => {
    if (instrument) {
      setActiveInstrument((prev) => ({ ...prev, ...instrument }));
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onSelectInstrument={(symbol, market) => {
          setActiveInstrument({ symbol, market });
          setActiveView('explorer');
        }}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Layout Container */}
      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-3.75rem)] pb-12">
          {activeView === 'dashboard' && (
            <DashboardView onNavigate={handleNavigate} userId={userId} />
          )}
          {activeView === 'explorer' && (
            <MarketExplorerView
              onNavigate={handleNavigate}
              userId={userId}
              initialInstrument={activeInstrument}
            />
          )}
          {activeView === 'ai-research' && (
            <AiResearchView
              onNavigate={handleNavigate}
              initialInstrument={activeInstrument}
            />
          )}
          {activeView === 'scanner' && (
            <OpportunityScannerView onNavigate={handleNavigate} userId={userId} />
          )}
          {activeView === 'strategy-lab' && (
            <StrategyLabView
              onNavigate={handleNavigate}
              initialInstrument={activeInstrument}
            />
          )}
          {activeView === 'risk-manager' && (
            <RiskManagerView
              onNavigate={handleNavigate}
              userId={userId}
              initialInstrument={activeInstrument}
            />
          )}
          {activeView === 'paper-trading' && (
            <PaperTradingView
              userId={userId}
              initialInstrument={activeInstrument}
            />
          )}
          {activeView === 'portfolio' && (
            <PortfolioManagerView userId={userId} onNavigate={handleNavigate} />
          )}
          {activeView === 'journal' && <TradingJournalView userId={userId} />}
          {activeView === 'analytics' && <PerformanceAnalyticsView userId={userId} />}
          {activeView === 'data-sources' && <DataSourcesView />}
          {activeView === 'settings' && <SettingsView userId={userId} />}
        </main>
      </div>
    </div>
  );
}
