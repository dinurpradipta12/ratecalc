import React, { useState } from 'react';
import { Personnel, TierConfig, BudgetTelemetry } from '../../types';
import { formatIDR, formatPercent } from '../../utils/formatters';
import {
  PdfPreviewModal,
  PdfPreviewTarget,
} from '../PdfPreviewModal';
import { Button } from '../ui/Button';
import {
  Download,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Users,
  User,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface SlipPayoutTabProps {
  personnel: Personnel[];
  tiers: TierConfig[];
  telemetry: BudgetTelemetry;
}

export const SlipPayoutTab: React.FC<SlipPayoutTabProps> = ({
  personnel,
  tiers,
  telemetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [slipViewMode, setSlipViewMode] = useState<'team' | 'person'>('team');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    personnel[0]?.id || ''
  );
  const [pdfPreviewTarget, setPdfPreviewTarget] =
    useState<PdfPreviewTarget | null>(null);

  const selectedPerson =
    personnel.find((p) => p.id === selectedPersonId) || personnel[0];

  // Compute table data
  const payoutRows = personnel.map((person, index) => {
    const tier = tiers.find((t) => t.id === person.tierId) || tiers[2];
    const completedTasks = person.tasks.filter((t) => t.status === 'SELESAI');
    const pendingTasks = person.tasks.filter((t) => t.status === 'PROSES');
    const completedBounty = completedTasks.reduce(
      (sum, t) => sum + t.unitPrice * t.quantity,
      0
    );
    const takeHomePay = person.baseSalary + completedBounty;
    const sharePercent =
      telemetry.grandTotalAllocation > 0
        ? (takeHomePay / telemetry.grandTotalAllocation) * 100
        : 0;

    return {
      person,
      tier,
      index: index + 1,
      id: person.id,
      name: person.name,
      roleTitle: person.roleTitle,
      tierCode: tier.code,
      tierWeight: tier.weight,
      baseSalary: person.baseSalary,
      completedBounty,
      completedTaskCount: completedTasks.length,
      pendingTaskCount: pendingTasks.length,
      takeHomePay,
      sharePercent,
    };
  });

  const grandTakeHome = payoutRows.reduce((sum, r) => sum + r.takeHomePay, 0);
  const grandBase = payoutRows.reduce((sum, r) => sum + r.baseSalary, 0);
  const grandBounty = payoutRows.reduce((sum, r) => sum + r.completedBounty, 0);

  // 1-Click CSV Download
  const handleDownloadCSV = () => {
    const headers = [
      'No',
      'Nama Personel',
      'Role Title',
      'Tier Code',
      'Tier Weight',
      'Gaji Pokok (IDR)',
      'Bounty Selesai (IDR)',
      'Jumlah Task Selesai',
      'Jumlah Task Proses',
      'Total Take-Home Pay (IDR)',
      'Share Alokasi (%)',
    ];

    const rows = payoutRows.map((r) => [
      r.index,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.roleTitle.replace(/"/g, '""')}"`,
      r.tierCode,
      r.tierWeight,
      r.baseSalary,
      r.completedBounty,
      r.completedTaskCount,
      r.pendingTaskCount,
      r.takeHomePay,
      r.sharePercent.toFixed(2),
    ]);

    // Summary row
    rows.push([
      'TOTAL',
      `"${personnel.length} Personel"`,
      '""',
      '""',
      '""',
      grandBase,
      grandBounty,
      personnel.reduce(
        (s, p) => s + p.tasks.filter((t) => t.status === 'SELESAI').length,
        0
      ),
      personnel.reduce(
        (s, p) => s + p.tasks.filter((t) => t.status === 'PROSES').length,
        0
      ),
      grandTakeHome,
      '100.00',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Slip_Payroll_Bounty_Ledger_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Copy Text Report
  const handleCopyReport = () => {
    const lines = [
      `======================================================`,
      `TEAM PAYROLL & TASK BOUNTY LEDGER - LAPORAN AKUNTANSI`,
      `Tanggal Cetak : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
      `Pagu Anggaran : ${formatIDR(telemetry.budgetPool)}`,
      `Total Alokasi : ${formatIDR(telemetry.grandTotalAllocation)}`,
      `Status Saldo  : ${
        telemetry.isDeficit
          ? 'DEFISIT ' + formatIDR(telemetry.surplusDeficit)
          : 'SURPLUS ' + formatIDR(telemetry.surplusDeficit)
      }`,
      `======================================================`,
      ``,
      `RINCIAN PAYOUT PER PERSONEL:`,
      `------------------------------------------------------`,
      ...payoutRows.map(
        (r) =>
          `${r.index.toString().padStart(2, '0')}. ${r.name.padEnd(20, ' ')} | ${
            r.tierCode
          } | Pokok: ${formatIDR(r.baseSalary)} | Bounty: ${formatIDR(
            r.completedBounty
          )} (${r.completedTaskCount} selesai, ${
            r.pendingTaskCount
          } proses) => TAKE HOME: ${formatIDR(r.takeHomePay)} [${r.sharePercent.toFixed(
            1
          )}%]`
      ),
      `------------------------------------------------------`,
      `TOTAL GAJI POKOK     : ${formatIDR(grandBase)}`,
      `TOTAL KOMISI BOUNTY  : ${formatIDR(grandBounty)}`,
      `GRAND TOTAL PAYOUT   : ${formatIDR(grandTakeHome)}`,
      `======================================================`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="space-y-6">
      {/* PDF PREVIEW MODAL (Opens before downloading PDF) */}
      <PdfPreviewModal
        previewTarget={pdfPreviewTarget}
        onClose={() => setPdfPreviewTarget(null)}
        personnel={personnel}
        tiers={tiers}
        telemetry={telemetry}
      />

      {/* SECTION HEADER & ACTIONS */}
      <div className="bg-white border border-carbon p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-brutalist">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-accent">
              PAYOUT // 04
            </span>
            <h2 className="font-display font-extrabold text-lg uppercase tracking-tighter">
              Rekapitulasi Slip Payout, Rincian Tugas & Export PDF
            </h2>
          </div>
          <p className="text-xs text-mutedText font-ui mt-0.5">
            Unduh slip gaji PDF per orang (beserta detail tugasnya) atau slip gabungan 1 tim penuh untuk melihat pembagian dan status penyelesaian tugas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Combined 1-Team PDF Button (Opens Preview Modal first) */}
          <Button
            variant="accent"
            size="md"
            onClick={() => setPdfPreviewTarget({ mode: 'team' })}
            disabled={personnel.length === 0}
            title="Preview & Download PDF Slip Gaji 1 Tim Gabungan beserta rincian tugas tiap personel"
          >
            <FileText className="w-4 h-4 text-white" />
            Export PDF 1 Tim (Gabungan + Tugas)
          </Button>

          {/* Download CSV Button */}
          <Button
            variant="primary"
            size="md"
            onClick={handleDownloadCSV}
            disabled={personnel.length === 0}
            title="Download file spreadsheet CSV"
          >
            <Download className="w-4 h-4 text-white" />
            Download .CSV
          </Button>

          {/* Copy Report Button */}
          <Button
            variant="secondary"
            size="md"
            onClick={handleCopyReport}
            disabled={personnel.length === 0}
            title="Salin teks laporan ke clipboard"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-semantic-emerald" />
                <span className="text-semantic-emerald font-bold">
                  Laporan Disalin!
                </span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-carbon" />
                Salin Teks
              </>
            )}
          </Button>
        </div>
      </div>

      {/* FINAL ACCOUNTING PAYOUT TABLE */}
      <div className="bg-white border border-carbon shadow-brutalist overflow-hidden">
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="payout-table-caption"
          className="table-wrapper overflow-x-auto max-w-full"
        >
          <table className="w-full border-collapse text-left">
            <caption id="payout-table-caption" className="sr-only">
              Tabel rekapitulasi slip payout gaji pokok, komisi tugas, dan aksi unduh PDF per personel
            </caption>
            <thead className="bg-subtle border-b border-carbon sticky top-0 z-10">
              <tr className="divide-x divide-carbon">
                <th
                  scope="col"
                  className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-12 text-center"
                >
                  NO
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon min-w-[200px]"
                >
                  Personel & Role Title
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon w-28 text-center"
                >
                  Tier Code
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon text-right min-w-[135px]"
                >
                  Gaji Pokok (IDR)
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon text-right min-w-[150px]"
                >
                  Bounty Selesai (IDR)
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon text-right min-w-[160px] bg-subtle/80"
                >
                  Total Take-Home Pay
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon text-right w-20"
                >
                  Share %
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-[11px] font-mono font-bold uppercase text-carbon text-center min-w-[175px]"
                >
                  Export Slip Per Orang
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon">
              {payoutRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="font-mono font-bold text-sm text-carbon uppercase">
                        TIDAK ADA DATA PAYOUT (KOSONG)
                      </span>
                      <p className="font-ui text-xs text-mutedText max-w-md">
                        Direktori personel masih kosong. Tambahkan personel di Tab [02] atau muat data demo untuk meninjau kalkulasi slip payout akuntansi.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                payoutRows.map((row) => (
                  <tr
                    key={row.id}
                    className="divide-x divide-carbon hover:bg-subtle/30 transition-colors"
                  >
                    {/* 1. Index */}
                    <td className="px-3 py-3 text-center font-mono text-xs text-mutedText tabular-numbers align-middle">
                      {row.index.toString().padStart(2, '0')}
                    </td>

                    {/* 2. Person & Role */}
                    <td className="px-4 py-3 align-middle">
                      <div className="font-ui font-bold text-xs sm:text-sm text-carbon leading-snug">
                        {row.name}
                      </div>
                      <div className="text-xs text-mutedText font-ui mt-0.5 leading-snug">
                        {row.roleTitle}
                      </div>
                    </td>

                    {/* 3. Tier Code */}
                    <td className="px-3 py-3 text-center align-middle">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-subtle border border-carbon text-carbon">
                        {row.tierCode}
                      </span>
                      <div className="text-[10px] font-mono text-mutedText mt-0.5">
                        {row.tierWeight.toFixed(1)}x bobot
                      </div>
                    </td>

                    {/* 4. Base Salary */}
                    <td className="px-4 py-3 text-right font-mono text-xs sm:text-sm font-semibold text-carbon tabular-numbers align-middle">
                      {formatIDR(row.baseSalary)}
                    </td>

                    {/* 5. Completed Bounty */}
                    <td className="px-4 py-3 text-right font-mono text-xs sm:text-sm font-bold text-semantic-emerald tabular-numbers align-middle">
                      {formatIDR(row.completedBounty)}
                      <div className="text-[10px] font-mono text-mutedText font-normal">
                        {row.completedTaskCount} selesai • {row.pendingTaskCount} proses
                      </div>
                    </td>

                    {/* 6. Total Take-Home Pay */}
                    <td className="px-4 py-3 text-right font-mono text-sm sm:text-base font-extrabold text-carbon tabular-numbers align-middle bg-subtle/40">
                      {formatIDR(row.takeHomePay)}
                    </td>

                    {/* 7. Budget Share % */}
                    <td className="px-3 py-3 text-right font-mono text-xs font-bold text-mutedText tabular-numbers align-middle">
                      {formatPercent(row.sharePercent)}
                    </td>

                    {/* 8. Per-Person PDF Export & Preview Actions */}
                    <td className="px-3 py-2 text-center align-middle">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPdfPreviewTarget({
                              mode: 'person',
                              personId: row.id,
                            })
                          }
                          className="min-h-[38px] px-2.5 py-1.5 bg-carbon hover:bg-accent text-white font-mono font-bold text-[11px] border border-carbon inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={`Preview & Download PDF Slip Gaji & Tugas untuk ${row.name}`}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Slip PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPersonId(row.id);
                            setSlipViewMode('person');
                          }}
                          className={`min-h-[38px] px-2 py-1.5 font-mono font-bold text-[11px] border border-carbon transition-colors cursor-pointer ${
                            slipViewMode === 'person' && selectedPerson?.id === row.id
                              ? 'bg-accent text-white'
                              : 'bg-subtle hover:bg-white text-carbon'
                          }`}
                          title={`Lihat rincian slip ${row.name} di bawah`}
                        >
                          Detail
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* GRAND TOTAL SUMMARY ROW */}
            <tfoot className="bg-carbon text-white border-t-2 border-carbon font-mono">
              <tr className="divide-x divide-gray-700">
                <td
                  colSpan={3}
                  className="px-4 py-3 text-xs uppercase font-extrabold tracking-wider"
                >
                  GRAND TOTAL DISBURSEMENT ({personnel.length} PERSONEL)
                </td>
                <td className="px-4 py-3 text-right text-xs sm:text-sm font-bold tabular-numbers">
                  {formatIDR(grandBase)}
                </td>
                <td className="px-4 py-3 text-right text-xs sm:text-sm font-bold text-emerald-300 tabular-numbers">
                  {formatIDR(grandBounty)}
                </td>
                <td className="px-4 py-3 text-right text-sm sm:text-base font-extrabold text-accent tabular-numbers">
                  {formatIDR(grandTakeHome)}
                </td>
                <td className="px-3 py-3 text-right text-xs font-bold tabular-numbers">
                  100.0%
                </td>
                <td className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => setPdfPreviewTarget({ mode: 'team' })}
                    disabled={personnel.length === 0}
                    className="w-full min-h-[36px] px-2 py-1 bg-accent hover:bg-orange-700 disabled:opacity-40 text-white font-mono font-bold text-[11px] border border-white/30 inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF 1 Tim
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Audit Status Verification Card */}
        <div className="p-4 bg-subtle border-t border-carbon flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            {telemetry.isDeficit ? (
              <div className="flex items-center gap-1.5 text-semantic-crimson font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  OVER-BUDGET: Defisit sebesar{' '}
                  {formatIDR(Math.abs(telemetry.surplusDeficit))} harus
                  disesuaikan sebelum eksekusi transfer.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-semantic-emerald font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  STATUS VERIFIKASI: Alokasi anggaran valid & berada dalam
                  koridor surplus aman ({formatIDR(telemetry.surplusDeficit)}).
                </span>
              </div>
            )}
          </div>
          <div className="text-mutedText">
            Klik <strong>Slip PDF</strong> pada baris personel untuk cetak per individu, atau <strong>Export PDF 1 Tim</strong> untuk laporan gabungan.
          </div>
        </div>
      </div>

      {/* INTERACTIVE SLIP GAJI & RINCIAN TUGAS VIEWER (PER PERSON vs 1 TIM GABUNGAN) */}
      {personnel.length > 0 && (
        <div className="bg-white border border-carbon shadow-brutalist">
          {/* Mode Switcher Bar */}
          <div className="p-4 bg-subtle border-b border-carbon flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-accent uppercase">
                  SLIP PREVIEW & EXPORT //
                </span>
                <h3 className="font-display font-extrabold text-base uppercase tracking-tight">
                  Pratinjau Slip Gaji & Pembagian Tugas
                </h3>
              </div>
              <p className="text-xs text-mutedText font-ui mt-0.5">
                Pilih tampilan <strong>Slip Gabungan 1 Tim</strong> (untuk melihat distribusi tugas seluruh anggota) atau <strong>Slip Per Orang</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSlipViewMode('team')}
                className={`min-h-[44px] px-4 py-2 font-mono text-xs font-bold border border-carbon inline-flex items-center gap-2 cursor-pointer transition-all ${
                  slipViewMode === 'team'
                    ? 'bg-carbon text-white shadow-brutalist-sm'
                    : 'bg-white text-carbon hover:bg-subtle'
                }`}
              >
                <Users className="w-4 h-4 text-accent" />
                Slip 1 Tim Gabungan (Semua Tugas)
              </button>

              <button
                type="button"
                onClick={() => setSlipViewMode('person')}
                className={`min-h-[44px] px-4 py-2 font-mono text-xs font-bold border border-carbon inline-flex items-center gap-2 cursor-pointer transition-all ${
                  slipViewMode === 'person'
                    ? 'bg-carbon text-white shadow-brutalist-sm'
                    : 'bg-white text-carbon hover:bg-subtle'
                }`}
              >
                <User className="w-4 h-4 text-accent" />
                Slip Gaji Per Orang (Individu)
              </button>
            </div>
          </div>

          {/* VIEW A: SLIP 1 TIM GABUNGAN (PEMBAGIAN TUGAS SELURUH TIM) */}
          {slipViewMode === 'team' && (
            <div className="p-4 sm:p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-carbon">
                <div>
                  <h4 className="font-display font-extrabold text-base uppercase text-carbon">
                    Slip Gaji & Pembagian Tugas 1 Tim Gabungan ({personnel.length} Personel)
                  </h4>
                  <p className="text-xs font-ui text-mutedText mt-0.5">
                    Menampilkan rincian gaji pokok, pembagian tugas per orang, serta status tugas yang sudah selesai ([SELESAI]) maupun sedang dikerjakan ([PROSES]).
                  </p>
                </div>
                <Button
                  variant="accent"
                  size="md"
                  onClick={() => setPdfPreviewTarget({ mode: 'team' })}
                >
                  <Download className="w-4 h-4 text-white" />
                  Download PDF 1 Tim Gabungan
                </Button>
              </div>

              {/* Grid of each person's task breakdown in the team */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {payoutRows.map((row) => (
                  <div
                    key={row.id}
                    className="border border-carbon bg-paper flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="p-3 bg-white border-b border-carbon flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-carbon text-white">
                              #{row.index.toString().padStart(2, '0')}
                            </span>
                            <span className="font-ui font-bold text-sm text-carbon">
                              {row.name}
                            </span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-subtle border border-carbon">
                              {row.tierCode}
                            </span>
                          </div>
                          <p className="text-xs text-mutedText font-ui mt-0.5">
                            {row.roleTitle}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPdfPreviewTarget({
                              mode: 'person',
                              personId: row.id,
                            })
                          }
                          className="min-h-[36px] px-2.5 py-1 bg-subtle hover:bg-carbon hover:text-white text-carbon font-mono font-bold text-[11px] border border-carbon inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                          title={`Preview & Export PDF Slip ${row.name}`}
                        >
                          <Download className="w-3 h-3" />
                          PDF Individu
                        </button>
                      </div>

                      {/* Financial Mini Strip */}
                      <div className="grid grid-cols-3 divide-x divide-carbon border-b border-carbon bg-subtle/60 font-mono text-xs">
                        <div className="p-2.5">
                          <span className="block text-[10px] text-mutedText uppercase">
                            Gaji Pokok
                          </span>
                          <strong className="text-carbon font-bold tabular-numbers">
                            {formatIDR(row.baseSalary)}
                          </strong>
                        </div>
                        <div className="p-2.5">
                          <span className="block text-[10px] text-mutedText uppercase">
                            Bounty ({row.completedTaskCount} Selesai)
                          </span>
                          <strong className="text-semantic-emerald font-bold tabular-numbers">
                            +{formatIDR(row.completedBounty)}
                          </strong>
                        </div>
                        <div className="p-2.5 bg-white">
                          <span className="block text-[10px] text-mutedText uppercase">
                            Take-Home Pay
                          </span>
                          <strong className="text-carbon font-extrabold tabular-numbers">
                            {formatIDR(row.takeHomePay)}
                          </strong>
                        </div>
                      </div>

                      {/* Task List for this Person */}
                      <div className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono text-mutedText uppercase pb-1">
                          <span>Daftar Tugas ({row.person.tasks.length})</span>
                          <span>
                            {row.completedTaskCount} Selesai • {row.pendingTaskCount} Proses
                          </span>
                        </div>

                        {row.person.tasks.length === 0 ? (
                          <div className="p-3 bg-white border border-carbon text-xs font-mono text-mutedText text-center">
                            Belum ada tugas untuk personel ini.
                          </div>
                        ) : (
                          <div className="divide-y divide-carbon border border-carbon bg-white">
                            {row.person.tasks.map((t) => {
                              const isDone = t.status === 'SELESAI';
                              return (
                                <div
                                  key={t.id}
                                  className="p-2 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-start gap-2 min-w-0">
                                    <span
                                      className={`mt-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold border shrink-0 inline-flex items-center gap-1 ${
                                        isDone
                                          ? 'bg-emerald-100 text-semantic-emerald border-semantic-emerald'
                                          : 'bg-amber-100 text-semantic-amber border-semantic-amber'
                                      }`}
                                    >
                                      {isDone ? (
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                      ) : (
                                        <Clock className="w-2.5 h-2.5" />
                                      )}
                                      {t.status}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-ui font-medium text-carbon truncate">
                                        {t.title}
                                      </div>
                                      <div className="text-[10px] font-mono text-mutedText">
                                        {t.category} • {formatIDR(t.unitPrice)} × {t.quantity}
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className={`font-mono font-bold text-xs tabular-numbers shrink-0 ${
                                      isDone
                                        ? 'text-semantic-emerald'
                                        : 'text-semantic-amber line-through'
                                    }`}
                                  >
                                    {formatIDR(t.unitPrice * t.quantity)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW B: SLIP GAJI PER ORANG (INDIVIDU SEDERHANA + DETAIL TUGAS) */}
          {slipViewMode === 'person' && selectedPerson && (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Person Selector Strip */}
              <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-carbon">
                <span className="text-xs font-mono font-bold uppercase text-mutedText mr-1">
                  Pilih Personel:
                </span>
                {personnel.map((p) => {
                  const isSelected = p.id === selectedPerson.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPersonId(p.id)}
                      className={`min-h-[38px] px-3 py-1.5 text-xs font-ui font-semibold border border-carbon cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent text-white font-bold shadow-brutalist-sm'
                          : 'bg-subtle hover:bg-white text-carbon'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>

              {/* Simple Individual Slip Card */}
              {(() => {
                const row =
                  payoutRows.find((r) => r.id === selectedPerson.id) ||
                  payoutRows[0];
                const pendingBounty = row.person.tasks
                  .filter((t) => t.status === 'PROSES')
                  .reduce((s, t) => s + t.unitPrice * t.quantity, 0);

                return (
                  <div className="max-w-3xl mx-auto border-2 border-carbon bg-paper p-5 shadow-brutalist space-y-5">
                    {/* Slip Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-carbon">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-carbon text-white">
                          SLIP GAJI & RINCIAN TUGAS INDIVIDU
                        </span>
                        <h4 className="font-display font-extrabold text-xl text-carbon mt-1">
                          {row.name}
                        </h4>
                        <p className="text-xs font-ui text-mutedText">
                          {row.roleTitle} • Tier: <strong>{row.tierCode}</strong> ({row.tierWeight.toFixed(1)}x)
                        </p>
                      </div>

                      <Button
                        variant="accent"
                        size="md"
                        onClick={() =>
                          setPdfPreviewTarget({
                            mode: 'person',
                            personId: row.id,
                          })
                        }
                      >
                        <Download className="w-4 h-4 text-white" />
                        Download PDF Slip {row.name.split(' ')[0]}
                      </Button>
                    </div>

                    {/* Summary Numbers */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                      <div className="p-3 bg-white border border-carbon">
                        <span className="text-[10px] text-mutedText uppercase block">
                          1. Gaji Pokok Tier
                        </span>
                        <span className="text-base font-extrabold text-carbon tabular-numbers">
                          {formatIDR(row.baseSalary)}
                        </span>
                      </div>

                      <div className="p-3 bg-white border border-carbon">
                        <span className="text-[10px] text-mutedText uppercase block">
                          2. Komisi Tugas Selesai ({row.completedTaskCount} Tugas)
                        </span>
                        <span className="text-base font-extrabold text-semantic-emerald tabular-numbers">
                          + {formatIDR(row.completedBounty)}
                        </span>
                      </div>

                      <div className="p-3 bg-carbon text-white border border-carbon">
                        <span className="text-[10px] text-gray-300 uppercase block">
                          3. Total Diterima (Take-Home)
                        </span>
                        <span className="text-base font-extrabold text-accent tabular-numbers">
                          {formatIDR(row.takeHomePay)}
                        </span>
                      </div>
                    </div>

                    {/* Task Breakdown Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-carbon">
                        <span>Rincian Tugas & Bounty ({row.person.tasks.length} Tugas)</span>
                        <span className="text-mutedText">
                          {row.completedTaskCount} Selesai • {row.pendingTaskCount} Proses
                        </span>
                      </div>

                      <div className="border border-carbon bg-white overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-subtle border-b border-carbon font-mono text-[11px] uppercase">
                            <tr className="divide-x divide-carbon">
                              <th className="py-2 px-2.5 text-center w-10">No</th>
                              <th className="py-2 px-3">Judul Tugas / Deliverable</th>
                              <th className="py-2 px-2.5 text-center w-24">Status</th>
                              <th className="py-2 px-2.5 text-right w-28">Harga</th>
                              <th className="py-2 px-2 text-center w-12">Qty</th>
                              <th className="py-2 px-3 text-right w-32">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-carbon">
                            {row.person.tasks.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="p-6 text-center font-mono text-mutedText"
                                >
                                  Tidak ada tugas tercatat untuk {row.name}.
                                </td>
                              </tr>
                            ) : (
                              row.person.tasks.map((task, idx) => {
                                const isDone = task.status === 'SELESAI';
                                return (
                                  <tr
                                    key={task.id}
                                    className="divide-x divide-carbon"
                                  >
                                    <td className="py-2 px-2.5 text-center font-mono text-mutedText">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-ui font-medium text-carbon">
                                      {task.title}
                                      <span className="ml-2 text-[10px] font-mono text-mutedText uppercase">
                                        [{task.category}]
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-center font-mono font-bold">
                                      <span
                                        className={`px-1.5 py-0.5 text-[10px] border ${
                                          isDone
                                            ? 'bg-emerald-100 text-semantic-emerald border-semantic-emerald'
                                            : 'bg-amber-100 text-semantic-amber border-semantic-amber'
                                        }`}
                                      >
                                        {task.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono tabular-numbers">
                                      {formatIDR(task.unitPrice)}
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono tabular-numbers">
                                      {task.quantity}
                                    </td>
                                    <td
                                      className={`py-2 px-3 text-right font-mono font-bold tabular-numbers ${
                                        isDone
                                          ? 'text-semantic-emerald'
                                          : 'text-semantic-amber'
                                      }`}
                                    >
                                      {formatIDR(task.unitPrice * task.quantity)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      {row.pendingTaskCount > 0 && (
                        <p className="text-[11px] font-mono text-semantic-amber">
                          * Catatan: Terdapat {row.pendingTaskCount} tugas berstatus [PROSES] senilai {formatIDR(pendingBounty)} yang belum masuk ke Take-Home Pay sampai statusnya diubah menjadi [SELESAI].
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
