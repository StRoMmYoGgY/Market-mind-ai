import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Cpu,
  Radar,
  FlaskConical,
  ShieldAlert,
  WalletCards,
  Briefcase,
  BookOpenText,
  LineChart,
  Database,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  category: 'core' | 'intelligence' | 'execution' | 'system';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'core' },
  { id: 'explorer', label: 'Market Explorer', icon: Compass, category: 'core' },
  { id: 'ai-research', label: 'AI Research Desk', icon: Cpu, badge: 'Gemini', category: 'intelligence' },
  { id: 'scanner', label: 'Opportunity Scanner', icon: Radar, category: 'intelligence' },
  { id: 'strategy-lab', label: 'Strategy Lab', icon: FlaskConical, category: 'intelligence' },
  { id: 'risk-manager', label: 'Risk Manager', icon: ShieldAlert, category: 'execution' },
  { id: 'paper-trading', label: 'Paper Trading', icon: WalletCards, category: 'execution' },
  { id: 'portfolio', label: 'Portfolio Manager', icon: Briefcase, category: 'execution' },
  { id: 'journal', label: 'Trading Journal', icon: BookOpenText, category: 'execution' },
  { id: 'analytics', label: 'Performance Analytics', icon: LineChart, category: 'execution' },
  { id: 'data-sources', label: 'Data Sources', icon: Database, badge: 'Real APIs', category: 'system' },
  { id: 'settings', label: 'Settings', icon: Settings, category: 'system' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const handleSelect = (id: string) => {
    setActiveView(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-[#080d1a] pt-16 transition-transform duration-300 ease-in-out lg:static lg:w-60 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4">
          <div className="space-y-6">
            {/* Core Section */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Market Terminal
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.filter((i) => i.category === 'core').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intelligence & Quantitative */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Quantitative Intelligence
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.filter((i) => i.category === 'intelligence').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Execution & Risk */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Execution & Governance
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.filter((i) => i.category === 'execution').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'} />
                        <span>{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* System */}
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                System & Infrastructure
              </div>
              <div className="space-y-1">
                {NAV_ITEMS.filter((i) => i.category === 'system').map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400 font-mono">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Card */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 font-mono">Paper Account</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
                $10,000 USD
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">
              Real-time calculations enabled. Zero-capital risk sandbox.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
