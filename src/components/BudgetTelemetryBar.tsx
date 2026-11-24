import React from 'react';
import { BudgetTelemetry } from '../types';
import { formatIDR, formatPercent } from '../utils/formatters';
import { Badge } from './ui/Badge';
import { 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Wallet, 
  Trash2, 
  RotateCcw, 
  Save, 
  Check, 
  Share2,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

interface BudgetTelemetryBarProps {
  telemetry: BudgetTelemetry;
  activeTab: string;
  onResetToEmpty: () => void;
  onLoadDemoData: () => void;
  onSaveData: () => void;
  onCopyShareLink: () => void;
  onOpenSheetsModal: () => void;
  onQuickPullSheets: () => void;
  isSyncingSheets: boolean;
  lastSavedTime: string;
  feedbackBadge: string | null;
  personnelCount: number;
}

export const BudgetTelemetryBar: React.FC<BudgetTelemetryBarProps> = ({
  telemetry,
  activeTab,
  onResetToEmpty,
  onLoadDemoData,
  onSaveData,
  onCopyShareLink,
  onOpenSheetsModal,
  onQuickPullSheets,
  isSyncingSheets,
  lastSavedTime,
  feedbackBadge,
  personnelCount,
}) => {
  const isDeficit = telemetry.isDeficit;

  return (
    <header className="sticky top-0 z-40 w-full bg-paper border-b border-carbon select-none">
      {/* Top micro status ticker */}
      <div className="w-full bg-carbon text-white text-[11px] font-mono px-4 sm:px-6 lg:px-8 py-1 flex items-center justify-between border-b border-carbon tracking-tight">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-accent">
            <span className="w-2 h-2 rounded-none bg-accent inline-block animate-pulse"></span>
            SYS:ACTIVE
          </span>
          <span className="hidden sm:inline text-gray-400">|</span>
          <span className="hidden sm:inline text-emerald-400 font-semibold">
            AUTO-SYNC STORAGE & GOOGLE SHEETS CONNECTED ({lastSavedTime})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-300">ACTIVE TAB: <strong className="text-white">[{activeTab.toUpperCase()}]</strong></span>
          <span className="hidden md:inline text-gray-400">|</span>
          <span className="hidden md:inline text-gray-400">CURRENCY: IDR (RP)</span>
        </div>
      </div>

      {/* Main Telemetry Strip - Maximized Full Width */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Brand & System Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-carbon text-white flex items-center justify-center font-display font-extrabold text-lg border border-carbon shadow-brutalist-sm shrink-0">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-base sm:text-lg tracking-tighter uppercase leading-none">
                  Team Payroll & Bounty Ledger
                </h1>
                <Badge variant="accent" size="sm">V2.4 GUARDRAIL</Badge>
              </div>
              <p className="text-[11px] text-mutedText font-ui mt-0.5">
                Multi-Tier Salary Clamp & Task Bounty Governance System
              </p>
            </div>
          </div>

          {/* Right Telemetry & Inline Action Buttons Side-by-Side */}
          <div className="flex flex-wrap lg:flex-nowrap items-stretch gap-2">
            {/* Compact Telemetry Counters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 bg-white px-3 py-1.5 border border-carbon shadow-brutalist-sm">
              {/* Metric: Total Budget Pool */}
              <div className="px-2 py-0.5 border-r border-carbon/20">
                <span className="block text-[10px] font-mono text-mutedText uppercase">Pool Anggaran</span>
                <span className="font-mono font-bold text-sm text-carbon tabular-numbers whitespace-nowrap">
                  {formatIDR(telemetry.budgetPool)}
                </span>
              </div>

              {/* Metric: Grand Total Allocation */}
              <div className="px-2 py-0.5 border-r border-carbon/20">
                <span className="block text-[10px] font-mono text-mutedText uppercase">Total Alokasi</span>
                <span className="font-mono font-bold text-sm text-carbon tabular-numbers whitespace-nowrap">
                  {formatIDR(telemetry.grandTotalAllocation)}
                </span>
              </div>

              {/* Metric: Burn Rate */}
              <div className="px-2 py-0.5 border-r border-carbon/20 hidden sm:block">
                <span className="block text-[10px] font-mono text-mutedText uppercase">Burn Rate</span>
                <div className="flex items-center gap-1 font-mono font-bold text-sm text-carbon tabular-numbers whitespace-nowrap">
                  <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
                  {formatPercent(telemetry.burnRatePercentage)}
                </div>
              </div>

              {/* Metric: Balance / Deficit with semantic badge */}
              <div className="pl-1 flex items-center gap-2">
                <div>
                  <span className="block text-[10px] font-mono text-mutedText uppercase">
                    {isDeficit ? 'Defisit Anggaran' : 'Sisa Cadangan'}
                  </span>
                  <span className={`font-mono font-bold text-sm tabular-numbers whitespace-nowrap ${isDeficit ? 'text-semantic-crimson' : 'text-semantic-emerald'}`}>
                    {formatIDR(telemetry.surplusDeficit)}
                  </span>
                </div>
                {isDeficit ? (
                  <div className="flex items-center gap-1 bg-red-100 text-semantic-crimson border border-semantic-crimson px-2 py-1 text-xs font-mono font-bold whitespace-nowrap">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    OVER BUDGET
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-emerald-100 text-semantic-emerald border border-semantic-emerald px-2 py-1 text-xs font-mono font-bold whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    SURPLUS SAFE
                  </div>
                )}
              </div>
            </div>

            {/* Inline Side Action Buttons (Google Sheets, Simpan Data, Link, Reset Kosong) */}
            <div className="flex items-stretch gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Google Sheets Hub Button */}
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-bold bg-emerald-50 hover:bg-emerald-100 text-semantic-emerald border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                title="Buka panel sinkronisasi Google Sheets (Tarik & Update Data)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-semantic-emerald shrink-0" />
                <span>Google Sheets</span>
              </button>

              {/* 1-Click Quick Pull from Sheets */}
              <button
                type="button"
                onClick={onQuickPullSheets}
                disabled={isSyncingSheets}
                className="min-h-[44px] px-2.5 py-1.5 text-xs font-mono font-bold bg-white hover:bg-subtle text-carbon border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap disabled:opacity-50"
                title="Tarik data terbaru langsung dari Google Sheets Anda"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-semantic-emerald shrink-0 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span>{feedbackBadge === 'PULLED_SHEETS' ? 'Sheets Loaded!' : 'Tarik Sheets'}</span>
              </button>

              {/* Save Data Button */}
              <button
                type="button"
                onClick={onSaveData}
                className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-subtle text-carbon border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                title="Simpan permanen semua data (Browser + Disk Server + URL)"
              >
                {feedbackBadge === 'SAVED' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-semantic-emerald shrink-0" />
                    <span className="text-semantic-emerald">Tersimpan!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>Simpan Data</span>
                  </>
                )}
              </button>

              {/* Copy Portable Share Link Button */}
              <button
                type="button"
                onClick={onCopyShareLink}
                className="min-h-[44px] px-2.5 py-1.5 text-xs font-mono font-bold bg-white hover:bg-subtle text-carbon border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                title="Salin link berisi data ini agar bisa dibuka di perangkat/browser manapun tanpa hilang"
              >
                {feedbackBadge === 'COPIED_LINK' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-semantic-emerald shrink-0" />
                    <span className="text-semantic-emerald">Link Disalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>Link</span>
                  </>
                )}
              </button>

              {/* Reset Kosong Button */}
              <button
                type="button"
                onClick={onResetToEmpty}
                className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-bold bg-white hover:bg-red-50 text-semantic-crimson hover:text-red-700 border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                title="Kosongkan seluruh angka, personel, task, dan anggaran menjadi 0"
              >
                <Trash2 className="w-3.5 h-3.5 text-semantic-crimson shrink-0" />
                <span>Reset Kosong (0)</span>
              </button>

              {(personnelCount === 0 || telemetry.budgetPool === 0) && (
                <button
                  type="button"
                  onClick={onLoadDemoData}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-mono font-bold bg-subtle hover:bg-white text-carbon border border-carbon shadow-brutalist-sm active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer select-none whitespace-nowrap"
                  title="Kembalikan contoh data demo awal"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Muat Demo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Micro Progress Strip */}
        <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-mutedText">
          <span className="uppercase text-[9px] font-bold text-carbon">Alokasi:</span>
          <div className="flex-1 h-2 bg-subtle border border-carbon flex overflow-hidden">
            {/* Base Payroll Bar */}
            <div
              className="bg-carbon h-full transition-all duration-300"
              style={{ width: `${Math.min(100, telemetry.basePayrollPercentage)}%` }}
              title={`Gaji Pokok: ${formatPercent(telemetry.basePayrollPercentage)}`}
            />
            {/* Completed Bounty Bar */}
            <div
              className="bg-accent h-full transition-all duration-300"
              style={{ width: `${Math.min(100 - telemetry.basePayrollPercentage, telemetry.bountyPercentage)}%` }}
              title={`Bounty Selesai: ${formatPercent(telemetry.bountyPercentage)}`}
            />
            {/* Deficit Bar if applicable */}
            {isDeficit && (
              <div
                className="bg-semantic-crimson h-full transition-all duration-300"
                style={{ width: '100%' }}
                title="Defisit Anggaran"
              />
            )}
          </div>
          <span className="tabular-numbers">
            {telemetry.isDeficit ? '100%+ (OVER)' : `${(telemetry.basePayrollPercentage + telemetry.bountyPercentage).toFixed(0)}%`}
          </span>
        </div>
      </div>
    </header>
  );
};
