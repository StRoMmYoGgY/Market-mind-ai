import React, { useState, useEffect } from 'react';
import {
  Search,
  Activity,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  LogIn,
  Zap,
  Menu,
  X,
  Database,
  ExternalLink,
} from 'lucide-react';
import { auth, loginWithGoogle, loginAsGuest, logout } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { searchInstruments } from '../services/marketApi';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onSelectInstrument?: (symbol: string, market: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onSelectInstrument,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length > 0) {
      setIsSearching(true);
      try {
        const res = await searchInstruments(q);
        setSearchResults(res);
        setShowSearchResults(true);
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectResult = (item: any) => {
    setShowSearchResults(false);
    setSearchQuery('');
    if (onSelectInstrument) {
      onSelectInstrument(item.symbol, item.market);
    }
    setActiveView('explorer');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0a0f1d]/90 backdrop-blur-md">
      <div className="flex h-15 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div
            onClick={() => setActiveView('dashboard')}
            className="flex cursor-pointer items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white">
                MARKETMIND<span className="text-emerald-400 ml-1 text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">AI</span>
              </span>
              <p className="hidden text-[10px] text-slate-400 font-mono tracking-wider uppercase sm:block">
                Institutional Quant Engine
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Instrument Search */}
        <div className="relative hidden max-w-md flex-1 px-4 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              placeholder="Search ticker, coin or forex (e.g. BTC, NVDA, EUR/USD)..."
              className="w-full rounded-lg border border-slate-700/60 bg-slate-900/80 py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 transition focus:border-emerald-500/50 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono"
            />
          </div>

          {/* Search Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-10 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-[#0f172a] p-1.5 shadow-2xl">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Matching Instruments
              </div>
              {searchResults.map((item) => (
                <button
                  key={`${item.market}-${item.symbol}`}
                  onClick={() => handleSelectResult(item)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-emerald-400">{item.symbol}</span>
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-400 font-mono">
                    {item.market}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Data Feed Indicator & Auth */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Real-time Data Freshness Badge */}
          <button
            onClick={() => setActiveView('data-sources')}
            title="Data Sources Status"
            className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-900/50"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline font-mono">LIVE FEED</span>
          </button>

          {/* User Sign-In / Account Dropdown */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="h-5 w-5 rounded-full" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-slate-200 font-mono sm:inline">
                  {user.displayName || user.email?.split('@')[0] || 'Trader'}
                </span>
                <button
                  onClick={() => logout()}
                  title="Sign out"
                  className="text-slate-400 transition hover:text-rose-400"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => loginWithGoogle()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
              >
                <LogIn size={13} className="text-emerald-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
              <button
                onClick={() => loginAsGuest()}
                className="hidden rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 transition hover:text-slate-200 sm:inline"
              >
                Guest Demo
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
