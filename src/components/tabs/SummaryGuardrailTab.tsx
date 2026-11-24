import React from 'react';
import { TierConfig, BudgetTelemetry, Personnel } from '../../types';
import { BUDGET_PRESETS } from '../../data/initialData';
import { formatIDR, formatPercent } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  ShieldCheck, 
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';

interface SummaryGuardrailTabProps {
  budgetPool: number;
  onBudgetPoolChange: (newBudget: number) => void;
  telemetry: BudgetTelemetry;
  tiers: TierConfig[];
  onUpdateTierFloor: (tierId: TierConfig['id'], newFloor: number) => void;
  personnel: Personnel[];
}

export const SummaryGuardrailTab: React.FC<SummaryGuardrailTabProps> = ({
  budgetPool,
  onBudgetPoolChange,
  telemetry,
  tiers,
  onUpdateTierFloor,
  personnel,
}) => {
  return (
    <div className="space-y-6">
      {/* SECTION: BUDGET POOL CONTROLLER */}
      <div className="bg-white border border-carbon p-5 shadow-brutalist">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-carbon">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-accent">PARAM // 01</span>
              <h2 className="font-display font-extrabold text-lg uppercase tracking-tighter">
                Alokasi Anggaran Bulanan (Monthly Pool)
              </h2>
            </div>
            <p className="text-xs text-mutedText font-ui mt-0.5">
              Tentukan batas total dana operasional tim. Alokasi akan dibagi untuk Gaji Pokok Tier dan Komisi Bounty Task Selesai.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">Preset Cepat:</span>
            {BUDGET_PRESETS.map((preset) => {
              const isSelected = budgetPool === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => onBudgetPoolChange(preset.value)}
                  className={`min-h-[44px] px-3.5 py-1.5 text-xs font-mono font-bold border border-carbon transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-accent text-white shadow-brutalist-sm translate-x-[1px] translate-y-[1px]'
                      : 'bg-subtle text-carbon hover:bg-white hover:border-carbon'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Numeric input & Stepper */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none font-mono font-bold text-sm text-carbon">
              Rp
            </span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Input Jumlah Anggaran Bulanan"
              value={new Intl.NumberFormat('id-ID').format(budgetPool)}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                const num = parseInt(raw, 10);
                if (!isNaN(num)) onBudgetPoolChange(num);
                else onBudgetPoolChange(0);
              }}
              className="w-full pl-12 pr-4 py-2.5 bg-subtle border border-carbon text-lg sm:text-xl font-mono font-bold text-carbon tabular-numbers focus:bg-white focus:outline-none focus:ring-1 focus:ring-carbon"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => onBudgetPoolChange(0)}
              title="Set Anggaran ke Rp 0"
            >
              <span className="font-mono text-xs font-bold text-semantic-crimson">Rp 0</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onBudgetPoolChange(Math.max(0, budgetPool - 5_000_000))}
              title="Kurang 5 Juta"
            >
              <Minus className="w-4 h-4 text-carbon" />
              <span className="font-mono text-xs font-bold">-5 Jt</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onBudgetPoolChange(budgetPool + 5_000_000)}
              title="Tambah 5 Juta"
            >
              <Plus className="w-4 h-4 text-carbon" />
              <span className="font-mono text-xs font-bold">+5 Jt</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onBudgetPoolChange(budgetPool + 10_000_000)}
              title="Tambah 10 Juta"
            >
              <Plus className="w-4 h-4 text-carbon" />
              <span className="font-mono text-xs font-bold">+10 Jt</span>
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION: 5-COLUMN TABULAR KPI SUMMARY STRIP */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-carbon uppercase">TELEMETRI KEUANGAN REAL-TIME</span>
            <Badge variant="neutral" size="sm">5-KPI MATRIX</Badge>
          </div>
          <span className="text-[11px] font-mono text-mutedText">Semua nominal berbasis IDR (Rp)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border border-carbon bg-subtle divide-y sm:divide-y-0 sm:divide-x divide-carbon shadow-brutalist">
          {/* 1. Anggaran Awal */}
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">1. Anggaran Awal</span>
              <Badge variant="neutral" size="sm">POOL</Badge>
            </div>
            <div className="mt-2 text-xl font-mono font-extrabold text-carbon tabular-numbers">
              {formatIDR(telemetry.budgetPool)}
            </div>
            <p className="mt-1 text-[11px] font-ui text-mutedText">
              Pagu anggaran maksimal bulan berjalan
            </p>
          </div>

          {/* 2. Total Gaji Pokok Tier */}
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">2. Gaji Pokok Tier</span>
              <span className="text-[10px] font-mono bg-subtle px-1 border border-carbon tabular-numbers">
                {formatPercent(telemetry.basePayrollPercentage)}
              </span>
            </div>
            <div className="mt-2 text-xl font-mono font-extrabold text-carbon tabular-numbers">
              {formatIDR(telemetry.totalBasePayroll)}
            </div>
            <p className="mt-1 text-[11px] font-ui text-mutedText">
              Total {personnel.length} personel terkunci & terjamin
            </p>
          </div>

          {/* 3. Komisi Task Selesai */}
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">3. Bounty Selesai</span>
              <span className="text-[10px] font-mono bg-emerald-50 text-semantic-emerald px-1 border border-semantic-emerald tabular-numbers">
                {formatPercent(telemetry.bountyPercentage)}
              </span>
            </div>
            <div className="mt-2 text-xl font-mono font-extrabold text-semantic-emerald tabular-numbers">
              {formatIDR(telemetry.totalCompletedBounties)}
            </div>
            <p className="mt-1 text-[11px] font-ui text-mutedText">
              Bounty dari seluruh task status [SELESAI]
            </p>
          </div>

          {/* 4. Grand Total Alokasi */}
          <div className="bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">4. Total Alokasi</span>
              <Badge variant="accent" size="sm">GROSS</Badge>
            </div>
            <div className="mt-2 text-xl font-mono font-extrabold text-carbon tabular-numbers">
              {formatIDR(telemetry.grandTotalAllocation)}
            </div>
            <p className="mt-1 text-[11px] font-ui text-mutedText">
              Gaji Pokok + Komisi Bounty Selesai
            </p>
          </div>

          {/* 5. Sisa Saldo / Defisit with semantic status badge */}
          <div className={`p-4 ${telemetry.isDeficit ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-mutedText uppercase font-semibold">5. Sisa Saldo / Defisit</span>
              {telemetry.isDeficit ? (
                <Badge variant="crimson" size="sm">DEFISIT</Badge>
              ) : (
                <Badge variant="emerald" size="sm">SURPLUS</Badge>
              )}
            </div>
            <div className={`mt-2 text-xl font-mono font-extrabold tabular-numbers ${
              telemetry.isDeficit ? 'text-semantic-crimson' : 'text-semantic-emerald'
            }`}>
              {formatIDR(telemetry.surplusDeficit)}
            </div>
            <p className="mt-1 text-[11px] font-ui text-mutedText font-medium">
              {telemetry.isDeficit
                ? 'Peringatan: Alokasi melebihi pagu anggaran!'
                : `Cadangan aman tersisa (${formatPercent(telemetry.surplusPercentage)})`}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: STACKED HORIZONTAL PROGRESS BAR */}
      <div className="bg-white border border-carbon p-5 shadow-brutalist">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display font-extrabold text-sm uppercase tracking-tighter">
              Visualisasi Distribusi Alokasi Anggaran
            </h3>
            <p className="text-xs text-mutedText font-ui">
              Perbandingan proporsional Gaji Pokok Tier vs Komisi Task Selesai vs Cadangan Bebas
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-carbon inline-block border border-carbon" />
              <span>Gaji Pokok ({formatPercent(telemetry.basePayrollPercentage)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-accent inline-block border border-carbon" />
              <span>Bounty Selesai ({formatPercent(telemetry.bountyPercentage)})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-3 h-3 inline-block border border-carbon ${telemetry.isDeficit ? 'bg-semantic-crimson' : 'bg-subtle'}`} />
              <span>{telemetry.isDeficit ? 'Defisit' : 'Cadangan Bebas'} ({formatPercent(Math.abs(telemetry.surplusPercentage))})</span>
            </div>
          </div>
        </div>

        {/* The Stacked Bar */}
        <div className="h-6 w-full bg-subtle border border-carbon flex overflow-hidden p-0.5">
          <div
            className="bg-carbon h-full transition-all duration-300 relative group"
            style={{ width: `${Math.min(100, telemetry.basePayrollPercentage)}%` }}
          >
            {telemetry.basePayrollPercentage > 12 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white select-none">
                {telemetry.basePayrollPercentage.toFixed(0)}% POKOK
              </span>
            )}
          </div>
          <div
            className="bg-accent h-full transition-all duration-300 relative group"
            style={{ width: `${Math.min(100 - telemetry.basePayrollPercentage, telemetry.bountyPercentage)}%` }}
          >
            {telemetry.bountyPercentage > 8 && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white select-none">
                {telemetry.bountyPercentage.toFixed(0)}% BOUNTY
              </span>
            )}
          </div>
          {telemetry.isDeficit ? (
            <div
              className="bg-semantic-crimson h-full transition-all duration-300 relative"
              style={{ width: '100%' }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white uppercase animate-pulse select-none">
                DEFISIT ANGGARAN
              </span>
            </div>
          ) : (
            <div
              className="bg-emerald-100 h-full transition-all duration-300 relative"
              style={{ width: `${Math.max(0, telemetry.surplusPercentage)}%` }}
            >
              {telemetry.surplusPercentage > 10 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-semantic-emerald select-none">
                  {telemetry.surplusPercentage.toFixed(0)}% SURPLUS
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION: 3-COLUMN HORIZONTAL TIER GUARDRAIL GRID */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-accent">GUARDRAIL // 02</span>
              <h3 className="font-display font-extrabold text-base uppercase tracking-tighter">
                Matriks Tier Minimum Floor & Auto-Clamp Rules
              </h3>
            </div>
            <p className="text-xs text-mutedText font-ui mt-0.5">
              Menaikkan floor tier akan secara otomatis mengerek (clamp) seluruh personel di tier tersebut yang berada di bawah floor.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-mutedText">
              Total Personel: <strong className="text-carbon">{personnel.length}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const members = personnel.filter((p) => p.tierId === tier.id);
            const totalTierSalary = members.reduce((sum, p) => sum + p.baseSalary, 0);
            const clampedMembers = members.filter((p) => p.baseSalary === tier.currentFloor);

            return (
              <div
                key={tier.id}
                className="bg-white border border-carbon p-4 flex flex-col justify-between shadow-brutalist relative"
              >
                {/* Header card */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-carbon">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-carbon border border-carbon" />
                      <span className="font-mono font-bold text-xs text-carbon">{tier.code}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="neutral" size="sm">
                        BOBOT: {tier.weight.toFixed(1)}x
                      </Badge>
                      <Badge variant="accent" size="sm">
                        {tier.badgeLabel}
                      </Badge>
                    </div>
                  </div>

                  {/* Title & Scope */}
                  <div className="mt-3">
                    <h4 className="font-display font-extrabold text-sm uppercase text-carbon tracking-tight">
                      {tier.name}
                    </h4>
                    <p className="text-[11px] font-ui text-mutedText mt-0.5 leading-tight">
                      {tier.roleScope}
                    </p>
                  </div>

                  {/* Current Floor Display & Direct Input (Min 100rb) */}
                  <div className="mt-4 p-3 bg-subtle border border-carbon">
                    <div className="flex items-center justify-between text-[11px] font-mono text-mutedText uppercase">
                      <span>Batas Bawah Floor (Min Rp 100.000):</span>
                      {tier.currentFloor !== tier.defaultFloor && (
                        <span className="text-accent font-bold">MODIFIKASI AKTIF</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none font-mono font-bold text-xs text-carbon">
                          Rp
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`Input Batas Bawah Floor ${tier.name}`}
                          value={new Intl.NumberFormat('id-ID').format(tier.currentFloor)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseInt(raw, 10);
                            if (!isNaN(num)) {
                              onUpdateTierFloor(tier.id, Math.max(100_000, num));
                            } else {
                              onUpdateTierFloor(tier.id, 100_000);
                            }
                          }}
                          className="w-full pl-8 pr-2 py-1.5 bg-white border border-carbon text-base font-mono font-extrabold text-carbon tabular-numbers focus:outline-none focus:ring-1 focus:ring-carbon"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[9px] font-mono text-mutedText uppercase">Default</span>
                        <span className="text-[10px] font-mono font-semibold text-carbon tabular-numbers">
                          {formatIDR(tier.defaultFloor)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Floor Adjustment Slider & Quick Steppers (Min 100rb) */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-mutedText">Sesuaikan Floor (Min 100Rb):</span>
                      <span className="font-bold tabular-numbers">{formatIDR(tier.currentFloor)}</span>
                    </div>

                    <input
                      type="range"
                      min={100_000}
                      max={tier.defaultFloor * 2.5}
                      step={100_000}
                      value={tier.currentFloor}
                      onChange={(e) => onUpdateTierFloor(tier.id, Math.max(100_000, parseInt(e.target.value, 10)))}
                      className="w-full"
                      aria-label={`Sesuaikan Batas Bawah Floor untuk ${tier.name}`}
                    />

                    <div className="grid grid-cols-6 gap-1 pt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-mono text-[11px] px-1"
                        onClick={() => onUpdateTierFloor(tier.id, 100_000)}
                        title="Set ke Minimal Floor Rp 100.000"
                      >
                        100Rb
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-mono text-[11px] px-1"
                        disabled={tier.currentFloor <= 100_000}
                        onClick={() => onUpdateTierFloor(tier.id, Math.max(100_000, tier.currentFloor - 500_000))}
                      >
                        -500Rb
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-mono text-[11px] px-1"
                        disabled={tier.currentFloor <= 100_000}
                        onClick={() => onUpdateTierFloor(tier.id, Math.max(100_000, tier.currentFloor - 100_000))}
                      >
                        -100Rb
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-mono text-[11px] px-1"
                        onClick={() => onUpdateTierFloor(tier.id, tier.currentFloor + 100_000)}
                      >
                        +100Rb
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-mono text-[11px] px-1"
                        onClick={() => onUpdateTierFloor(tier.id, tier.currentFloor + 500_000)}
                      >
                        +500Rb
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="px-1"
                        onClick={() => onUpdateTierFloor(tier.id, tier.defaultFloor)}
                        title="Reset ke Default Floor"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-mutedText" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Footer card info: Members & Subtotal */}
                <div className="mt-5 pt-3 border-t border-carbon text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-mutedText">Anggota Aktif:</span>
                    <strong className="text-carbon tabular-numbers">{members.length} Orang</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-mutedText">Subtotal Pokok:</span>
                    <strong className="text-carbon tabular-numbers">{formatIDR(totalTierSalary)}</strong>
                  </div>
                  {clampedMembers.length > 0 && (
                    <div className="mt-2 p-1.5 bg-amber-50 border border-semantic-amber text-[10px] text-semantic-amber flex items-center gap-1.5 leading-tight">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{clampedMembers.length} personel di-clamp tepat pada floor ini.</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
