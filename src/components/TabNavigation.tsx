import React from 'react';
import { LayoutDashboard, Users, CheckSquare, FileSpreadsheet } from 'lucide-react';

export type TabId = 'summary' | 'roster' | 'ledger' | 'payout';

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  personnelCount: number;
  completedTasksCount: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  personnelCount,
  completedTasksCount,
}) => {
  const tabs = [
    {
      id: 'summary' as TabId,
      code: '01',
      title: 'RINGKASAN & TIER GUARDRAIL',
      shortTitle: 'Ringkasan & Tier',
      icon: LayoutDashboard,
      badge: 'GOVERNANCE',
    },
    {
      id: 'roster' as TabId,
      code: '02',
      title: 'DIREKTORI PERSONEL & GAJI POKOK',
      shortTitle: 'Direktori Personel',
      icon: Users,
      badge: `${personnelCount} ORANG`,
    },
    {
      id: 'ledger' as TabId,
      code: '03',
      title: 'LEDGER TASK & BOUNTY',
      shortTitle: 'Ledger Bounty',
      icon: CheckSquare,
      badge: `${completedTasksCount} TASK`,
    },
    {
      id: 'payout' as TabId,
      code: '04',
      title: 'SLIP PAYOUT & EXPORT CSV',
      shortTitle: 'Slip Payout & CSV',
      icon: FileSpreadsheet,
      badge: 'FINANCIAL',
    },
  ];

  return (
    <nav className="w-full px-4 sm:px-6 lg:px-8 pt-4">
      <div className="w-full grid grid-cols-2 md:grid-cols-4 border border-carbon bg-subtle divide-x divide-y md:divide-y-0 divide-carbon shadow-brutalist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[52px] sm:min-h-[58px] p-3 text-left transition-colors flex flex-col justify-between cursor-pointer select-none group relative ${
                isActive
                  ? 'bg-white text-carbon'
                  : 'bg-subtle text-mutedText hover:bg-paper hover:text-carbon'
              }`}
            >
              {/* Active top orange indicator bar */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              )}
              <div className="flex items-center justify-between gap-1 w-full">
                <span className={`text-[11px] font-mono font-bold tracking-wider ${isActive ? 'text-accent' : 'text-mutedText'}`}>
                  TAB [{tab.code}]
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 border border-carbon tabular-numbers ${
                  isActive ? 'bg-carbon text-white' : 'bg-white text-carbon'
                }`}>
                  {tab.badge}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent' : 'text-carbon'}`} />
                <span className="font-display font-extrabold text-xs sm:text-sm tracking-tighter uppercase leading-tight truncate">
                  {tab.shortTitle}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
