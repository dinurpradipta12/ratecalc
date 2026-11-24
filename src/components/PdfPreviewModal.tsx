import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Personnel, TierConfig, BudgetTelemetry } from '../types';
import { formatIDR, formatPercent } from '../utils/formatters';
import {
  createPersonSlipPDF,
  createTeamCombinedSlipPDF,
} from '../utils/pdfExporter';
import {
  Download,
  X,
  FileText,
  Users,
  User,
  Eye,
  Printer,
} from 'lucide-react';

export interface PdfPreviewTarget {
  mode: 'team' | 'person';
  personId?: string;
}

interface PdfPreviewModalProps {
  previewTarget: PdfPreviewTarget | null;
  onClose: () => void;
  personnel: Personnel[];
  tiers: TierConfig[];
  telemetry: BudgetTelemetry;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  previewTarget,
  onClose,
  personnel,
  tiers,
  telemetry,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [activeMode, setActiveMode] = useState<'team' | 'person'>('team');
  const [activePersonId, setActivePersonId] = useState<string>('');
  const [renderTab, setRenderTab] = useState<'a4_sheet' | 'native_pdf'>('a4_sheet');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // Sync local state when modal opens with a specific target
  useEffect(() => {
    if (previewTarget) {
      setActiveMode(previewTarget.mode);
      setActivePersonId(
        previewTarget.personId || personnel[0]?.id || ''
      );
    }
  }, [previewTarget, personnel]);

  // Open/close native <dialog> via showModal() / close()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (previewTarget) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [previewTarget]);

  // Native close event listener & light-dismiss fallback for browsers without closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback for browsers where <dialog closedby="any"> is not yet supported
    let cleanupPointerListeners: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent, el: HTMLDialogElement) => {
        const r = el.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e, dialog)) {
          dialog.close();
        }
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupPointerListeners = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (cleanupPointerListeners) cleanupPointerListeners();
    };
  }, [onClose]);

  const selectedPerson = useMemo(() => {
    return (
      personnel.find((p) => p.id === activePersonId) || personnel[0] || null
    );
  }, [personnel, activePersonId]);

  const selectedTier = useMemo(() => {
    if (!selectedPerson) return tiers[2];
    return tiers.find((t) => t.id === selectedPerson.tierId) || tiers[2];
  }, [selectedPerson, tiers]);

  // Build jsPDF doc & blob URL whenever activeMode or selectedPerson changes while open
  const pdfArtifact = useMemo(() => {
    if (!previewTarget) return null;
    if (activeMode === 'person' && selectedPerson) {
      return createPersonSlipPDF(
        selectedPerson,
        selectedTier,
        telemetry.grandTotalAllocation
      );
    }
    return createTeamCombinedSlipPDF(personnel, tiers, telemetry);
  }, [
    previewTarget,
    activeMode,
    selectedPerson,
    selectedTier,
    personnel,
    tiers,
    telemetry,
  ]);

  useEffect(() => {
    if (!pdfArtifact) {
      setPdfBlobUrl(null);
      return;
    }
    const blob = pdfArtifact.doc.output('blob');
    const url = URL.createObjectURL(blob);
    setPdfBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [pdfArtifact]);

  const handleConfirmDownload = () => {
    if (!pdfArtifact) return;
    pdfArtifact.doc.save(pdfArtifact.filename);
  };

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const totalCompletedTasks = personnel.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === 'SELESAI').length,
    0
  );
  const totalPendingTasks = personnel.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === 'PROSES').length,
    0
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pdf-preview-dialog-title"
      {...({ closedby: 'any' } as any)}
      className="w-[96vw] max-w-5xl p-0 bg-paper border-2 border-carbon shadow-brutalist text-carbon m-auto"
    >
      {previewTarget && (
        <div className="flex flex-col max-h-[90vh]">
          {/* 1. MODAL TOP BAR */}
          <div className="bg-carbon text-white px-4 py-3 border-b-2 border-carbon flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-accent border border-white flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-accent text-white">
                    PRATINJAU DOKUMEN PDF
                  </span>
                  <span className="text-xs font-mono text-gray-300 truncate max-w-[260px] sm:max-w-md">
                    {pdfArtifact?.filename}
                  </span>
                </div>
                <h2
                  id="pdf-preview-dialog-title"
                  className="font-display font-extrabold text-sm sm:text-base uppercase tracking-tight text-white mt-0.5"
                >
                  {activeMode === 'person' && selectedPerson
                    ? `Preview Slip Gaji Individu: ${selectedPerson.name}`
                    : `Preview Slip Gaji & Tugas 1 Tim Gabungan (${personnel.length} Orang)`}
                </h2>
              </div>
            </div>

            {/* Close button via form method="dialog" */}
            <form method="dialog" className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleConfirmDownload}
                autoFocus
                className="min-h-[42px] px-4 py-2 bg-accent hover:bg-orange-600 text-white font-mono font-bold text-xs border border-white inline-flex items-center gap-2 shadow-brutalist-sm cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .PDF Sekarang
              </button>
              <button
                type="submit"
                value="close"
                aria-label="Tutup pratinjau PDF"
                className="min-h-[42px] min-w-[42px] px-2.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/40 inline-flex items-center justify-center cursor-pointer transition-colors"
                title="Tutup Pratinjau (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 2. TOOLBAR: SWITCH DOCUMENT TYPE, PERSON & VIEWER MODE */}
          <div className="bg-subtle px-4 py-2.5 border-b border-carbon flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
            {/* Left: Switch between Slip Per Orang vs 1 Tim Gabungan */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold uppercase text-mutedText">
                Tipe Slip:
              </span>
              <button
                type="button"
                onClick={() => setActiveMode('person')}
                className={`min-h-[36px] px-3 py-1 font-mono text-xs font-bold border border-carbon inline-flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'person'
                    ? 'bg-carbon text-white'
                    : 'bg-white text-carbon hover:bg-paper'
                }`}
              >
                <User className="w-3.5 h-3.5 text-accent" />
                Slip Per Orang
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('team')}
                className={`min-h-[36px] px-3 py-1 font-mono text-xs font-bold border border-carbon inline-flex items-center gap-1.5 cursor-pointer ${
                  activeMode === 'team'
                    ? 'bg-carbon text-white'
                    : 'bg-white text-carbon hover:bg-paper'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-accent" />
                Slip 1 Tim Gabungan
              </button>

              {/* Person Dropdown when in 'person' mode */}
              {activeMode === 'person' && personnel.length > 0 && (
                <select
                  aria-label="Pilih personel untuk pratinjau slip"
                  value={selectedPerson?.id || ''}
                  onChange={(e) => setActivePersonId(e.target.value)}
                  className="min-h-[36px] px-2.5 py-1 bg-white border border-carbon font-ui font-bold text-xs text-carbon focus:outline-none"
                >
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.roleTitle}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Right: Switch between Interactive A4 Paper Preview & Embedded Native PDF */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-mutedText uppercase mr-1">
                Mode Layar:
              </span>
              <button
                type="button"
                onClick={() => setRenderTab('a4_sheet')}
                className={`min-h-[34px] px-2.5 py-1 font-mono text-[11px] font-bold border border-carbon inline-flex items-center gap-1 cursor-pointer ${
                  renderTab === 'a4_sheet'
                    ? 'bg-accent text-white'
                    : 'bg-white text-carbon hover:bg-paper'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Lembar A4
              </button>
              <button
                type="button"
                onClick={() => setRenderTab('native_pdf')}
                className={`min-h-[34px] px-2.5 py-1 font-mono text-[11px] font-bold border border-carbon inline-flex items-center gap-1 cursor-pointer ${
                  renderTab === 'native_pdf'
                    ? 'bg-accent text-white'
                    : 'bg-white text-carbon hover:bg-paper'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Embed PDF
              </button>
            </div>
          </div>

          {/* 3. MODAL BODY: SCROLLABLE PREVIEW AREA */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#D6D4CC]">
            {renderTab === 'native_pdf' && pdfBlobUrl ? (
              <div className="w-full h-[65vh] bg-white border-2 border-carbon shadow-brutalist overflow-hidden">
                <iframe
                  src={pdfBlobUrl}
                  title="Pratinjau Dokumen PDF"
                  className="w-full h-full border-0"
                />
              </div>
            ) : activeMode === 'person' && selectedPerson ? (
              /* A4 SHEET PREVIEW: INDIVIDUAL PERSON SLIP */
              (() => {
                const completedTasks = selectedPerson.tasks.filter(
                  (t) => t.status === 'SELESAI'
                );
                const pendingTasks = selectedPerson.tasks.filter(
                  (t) => t.status === 'PROSES'
                );
                const completedBounty = completedTasks.reduce(
                  (sum, t) => sum + t.unitPrice * t.quantity,
                  0
                );
                const pendingBounty = pendingTasks.reduce(
                  (sum, t) => sum + t.unitPrice * t.quantity,
                  0
                );
                const takeHomePay = selectedPerson.baseSalary + completedBounty;
                const sharePercent =
                  telemetry.grandTotalAllocation > 0
                    ? (takeHomePay / telemetry.grandTotalAllocation) * 100
                    : 0;

                return (
                  <div className="max-w-[794px] mx-auto bg-white border-2 border-carbon shadow-brutalist p-6 sm:p-8 space-y-6">
                    {/* PDF Banner Header */}
                    <div className="bg-carbon text-white p-4 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-display font-extrabold text-base sm:text-lg uppercase tracking-tight">
                          SLIP GAJI & RINCIAN TUGAS PERSONEL
                        </h3>
                        <p className="text-xs font-mono text-gray-300 mt-0.5">
                          Tanggal Cetak: {dateStr} | ID: {selectedPerson.id}
                        </p>
                      </div>
                      <div className="px-3 py-1.5 bg-accent text-white font-mono font-extrabold text-xs uppercase border border-white shrink-0">
                        {selectedTier.code}
                      </div>
                    </div>

                    {/* Identity & Summary Box */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-paper border border-carbon p-4">
                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-mutedText border-b border-carbon/30 pb-1 mb-2">
                          DATA PERSONEL
                        </div>
                        <div className="font-display font-extrabold text-base text-carbon">
                          {selectedPerson.name}
                        </div>
                        <div className="text-xs font-ui text-mutedText mt-1 space-y-0.5">
                          <div>Role: {selectedPerson.roleTitle}</div>
                          <div>
                            Tier: {selectedTier.code} (
                            {selectedTier.weight.toFixed(1)}x) | Min Floor:{' '}
                            {formatIDR(selectedTier.currentFloor)}
                          </div>
                          <div>
                            Porsi Alokasi Tim: {formatPercent(sharePercent)}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-mono font-bold uppercase text-mutedText border-b border-carbon/30 pb-1 mb-2">
                          RINGKASAN PENERIMAAN (TAKE-HOME PAY)
                        </div>
                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-mutedText">
                              Gaji Pokok Tier:
                            </span>
                            <strong className="text-carbon tabular-numbers">
                              {formatIDR(selectedPerson.baseSalary)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-mutedText">
                              Komisi Tugas Selesai ({completedTasks.length}{' '}
                              tugas):
                            </span>
                            <strong className="text-semantic-emerald tabular-numbers">
                              + {formatIDR(completedBounty)}
                            </strong>
                          </div>
                          <div className="border-t border-carbon pt-1.5 flex items-center justify-between text-sm font-extrabold">
                            <span className="text-carbon">
                              TOTAL TAKE-HOME PAY:
                            </span>
                            <span className="text-accent tabular-numbers">
                              {formatIDR(takeHomePay)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Table */}
                    <div className="space-y-2">
                      <div className="font-display font-extrabold text-xs uppercase text-carbon">
                        DAFTAR RINCIAN TUGAS & BOUNTY ({selectedPerson.tasks.length}{' '}
                        Total Tugas: {completedTasks.length} Selesai,{' '}
                        {pendingTasks.length} Proses)
                      </div>

                      <div className="border border-carbon overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-carbon text-white font-mono text-[11px] uppercase">
                            <tr className="divide-x divide-gray-700">
                              <th className="py-2 px-2.5 text-center w-10">No</th>
                              <th className="py-2 px-3">
                                Judul Tugas / Deliverable
                              </th>
                              <th className="py-2 px-2.5">Kategori</th>
                              <th className="py-2 px-2.5 text-center w-24">
                                Status
                              </th>
                              <th className="py-2 px-2.5 text-right">
                                Harga Satuan
                              </th>
                              <th className="py-2 px-2 text-center w-12">Qty</th>
                              <th className="py-2 px-3 text-right">
                                Total Bounty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-carbon">
                            {selectedPerson.tasks.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="p-6 text-center font-mono text-mutedText"
                                >
                                  Belum ada tugas tercatat untuk personel ini.
                                </td>
                              </tr>
                            ) : (
                              selectedPerson.tasks.map((t, idx) => {
                                const isDone = t.status === 'SELESAI';
                                return (
                                  <tr
                                    key={t.id}
                                    className="divide-x divide-carbon"
                                  >
                                    <td className="py-2 px-2.5 text-center font-mono text-mutedText">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2 px-3 font-ui font-medium text-carbon">
                                      {t.title}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-[10px] text-mutedText">
                                      {t.category}
                                    </td>
                                    <td
                                      className={`py-2 px-2.5 text-center font-mono font-bold text-[10px] ${
                                        isDone
                                          ? 'bg-emerald-100 text-semantic-emerald'
                                          : 'bg-amber-100 text-semantic-amber'
                                      }`}
                                    >
                                      {t.status}
                                    </td>
                                    <td className="py-2 px-2.5 text-right font-mono tabular-numbers">
                                      {formatIDR(t.unitPrice)}
                                    </td>
                                    <td className="py-2 px-2 text-center font-mono tabular-numbers">
                                      {t.quantity}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono font-bold tabular-numbers">
                                      {formatIDR(t.unitPrice * t.quantity)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Box */}
                    <div className="bg-subtle border border-carbon p-3.5 font-mono text-xs space-y-1">
                      <div className="text-mutedText text-[11px]">
                        * Catatan: Hanya tugas berstatus [SELESAI] yang masuk ke
                        dalam pencairan Take-Home Pay.
                      </div>
                      {pendingTasks.length > 0 ? (
                        <div className="text-semantic-amber text-[11px]">
                          * Tugas berstatus [PROSES]: {pendingTasks.length} tugas
                          (Estimasi nilai: {formatIDR(pendingBounty)}) menunggu
                          penyelesaian.
                        </div>
                      ) : (
                        <div className="text-semantic-emerald text-[11px]">
                          * Seluruh tugas personel ini telah berstatus [SELESAI].
                        </div>
                      )}
                      <div className="pt-1 font-extrabold text-sm text-carbon">
                        TOTAL DITERIMA ({selectedPerson.name.toUpperCase()}):{' '}
                        {formatIDR(takeHomePay)}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* A4 SHEET PREVIEW: COMBINED 1-TEAM SLIP */
              <div className="max-w-[794px] mx-auto bg-white border-2 border-carbon shadow-brutalist p-6 sm:p-8 space-y-6">
                {/* Banner Header */}
                <div className="bg-carbon text-white p-4">
                  <h3 className="font-display font-extrabold text-base sm:text-lg uppercase tracking-tight">
                    SLIP PAYOUT TIM GABUNGAN & LAPORAN PEMBAGIAN TUGAS
                  </h3>
                  <p className="text-xs font-mono text-gray-300 mt-0.5">
                    Tanggal Cetak: {dateStr} | Total Personel: {personnel.length}{' '}
                    Orang | Tugas Selesai: {totalCompletedTasks} | Tugas Proses:{' '}
                    {totalPendingTasks}
                  </p>
                </div>

                {/* KPI Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 border border-carbon divide-y sm:divide-y-0 sm:divide-x divide-carbon font-mono text-xs text-center">
                  <div className="p-2.5">
                    <div className="text-[10px] bg-accent text-white font-bold py-0.5 px-1 uppercase mb-1">
                      Pool Anggaran
                    </div>
                    <strong className="tabular-numbers">
                      {formatIDR(telemetry.budgetPool)}
                    </strong>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[10px] bg-accent text-white font-bold py-0.5 px-1 uppercase mb-1">
                      Total Pokok
                    </div>
                    <strong className="tabular-numbers">
                      {formatIDR(telemetry.totalBasePayroll)}
                    </strong>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[10px] bg-accent text-white font-bold py-0.5 px-1 uppercase mb-1">
                      Bounty Selesai
                    </div>
                    <strong className="text-semantic-emerald tabular-numbers">
                      {formatIDR(telemetry.totalCompletedBounties)}
                    </strong>
                  </div>
                  <div className="p-2.5">
                    <div className="text-[10px] bg-accent text-white font-bold py-0.5 px-1 uppercase mb-1">
                      Grand Total
                    </div>
                    <strong className="tabular-numbers">
                      {formatIDR(telemetry.grandTotalAllocation)}
                    </strong>
                  </div>
                  <div className="p-2.5 col-span-2 sm:col-span-1">
                    <div className="text-[10px] bg-accent text-white font-bold py-0.5 px-1 uppercase mb-1">
                      {telemetry.isDeficit ? 'Defisit' : 'Surplus'}
                    </div>
                    <strong
                      className={`tabular-numbers ${
                        telemetry.isDeficit
                          ? 'text-semantic-crimson'
                          : 'text-semantic-emerald'
                      }`}
                    >
                      {formatIDR(telemetry.surplusDeficit)}
                    </strong>
                  </div>
                </div>

                {/* Section I: Rekapitulasi Tabel Tim */}
                <div className="space-y-2">
                  <h4 className="font-display font-extrabold text-xs uppercase text-carbon">
                    I. REKAPITULASI SLIP PAYOUT SELURUH TIM
                  </h4>
                  <div className="border border-carbon overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-carbon text-white font-mono text-[10px] uppercase">
                        <tr className="divide-x divide-gray-700">
                          <th className="py-2 px-2 text-center">No</th>
                          <th className="py-2 px-2.5">Nama & Role</th>
                          <th className="py-2 px-2 text-center">Tier</th>
                          <th className="py-2 px-2.5 text-right">Gaji Pokok</th>
                          <th className="py-2 px-2.5 text-center">
                            Status Tugas
                          </th>
                          <th className="py-2 px-2.5 text-right">
                            Bounty Selesai
                          </th>
                          <th className="py-2 px-2.5 text-right">
                            Take-Home Pay
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-carbon">
                        {personnel.map((p, idx) => {
                          const done = p.tasks.filter(
                            (t) => t.status === 'SELESAI'
                          );
                          const prog = p.tasks.filter(
                            (t) => t.status === 'PROSES'
                          );
                          const bounty = done.reduce(
                            (s, t) => s + t.unitPrice * t.quantity,
                            0
                          );
                          const takeHome = p.baseSalary + bounty;
                          return (
                            <tr key={p.id} className="divide-x divide-carbon">
                              <td className="py-1.5 px-2 text-center font-mono text-mutedText">
                                {idx + 1}
                              </td>
                              <td className="py-1.5 px-2.5">
                                <div className="font-ui font-bold text-carbon">
                                  {p.name}
                                </div>
                                <div className="text-[10px] text-mutedText">
                                  {p.roleTitle}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-center font-mono text-[10px] font-bold">
                                {p.tierId}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono tabular-numbers">
                                {formatIDR(p.baseSalary)}
                              </td>
                              <td className="py-1.5 px-2.5 text-center font-mono text-[10px]">
                                {done.length} Selesai / {prog.length} Proses
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono text-semantic-emerald font-bold tabular-numbers">
                                {formatIDR(bounty)}
                              </td>
                              <td className="py-1.5 px-2.5 text-right font-mono font-extrabold tabular-numbers">
                                {formatIDR(takeHome)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section II: Rincian Tugas Per Personel */}
                <div className="space-y-3">
                  <h4 className="font-display font-extrabold text-xs uppercase text-carbon">
                    II. RINCIAN PEMBAGIAN TUGAS & STATUS SELESAI PER PERSONEL
                  </h4>

                  {personnel.map((p, index) => {
                    const done = p.tasks.filter((t) => t.status === 'SELESAI');
                    const bounty = done.reduce(
                      (s, t) => s + t.unitPrice * t.quantity,
                      0
                    );
                    const takeHome = p.baseSalary + bounty;
                    return (
                      <div key={p.id} className="border border-carbon">
                        <div className="bg-subtle px-3 py-2 border-b border-carbon font-mono text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {index + 1}. {p.name.toUpperCase()} — {p.roleTitle} (
                            {p.tierId})
                          </span>
                          <span>
                            Pokok: {formatIDR(p.baseSalary)} | Bounty:{' '}
                            {formatIDR(bounty)} | Take-Home:{' '}
                            {formatIDR(takeHome)}
                          </span>
                        </div>
                        <table className="w-full border-collapse text-left text-xs">
                          <thead className="bg-carbon/90 text-white font-mono text-[10px] uppercase">
                            <tr className="divide-x divide-gray-700">
                              <th className="py-1.5 px-2 text-center w-10">
                                No
                              </th>
                              <th className="py-1.5 px-2.5">
                                Judul Tugas / Deliverable
                              </th>
                              <th className="py-1.5 px-2 w-24">Kategori</th>
                              <th className="py-1.5 px-2 text-center w-20">
                                Status
                              </th>
                              <th className="py-1.5 px-2 text-right w-24">
                                Harga
                              </th>
                              <th className="py-1.5 px-2 text-center w-10">
                                Qty
                              </th>
                              <th className="py-1.5 px-2.5 text-right w-28">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-carbon">
                            {p.tasks.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="p-3 text-center font-mono text-mutedText"
                                >
                                  Belum ada tugas yang ditugaskan.
                                </td>
                              </tr>
                            ) : (
                              p.tasks.map((t, tIdx) => {
                                const isDone = t.status === 'SELESAI';
                                return (
                                  <tr
                                    key={t.id}
                                    className="divide-x divide-carbon"
                                  >
                                    <td className="py-1.5 px-2 text-center font-mono text-mutedText">
                                      {tIdx + 1}
                                    </td>
                                    <td className="py-1.5 px-2.5 font-ui">
                                      {t.title}
                                    </td>
                                    <td className="py-1.5 px-2 font-mono text-[10px] text-mutedText">
                                      {t.category}
                                    </td>
                                    <td
                                      className={`py-1.5 px-2 text-center font-mono font-bold text-[10px] ${
                                        isDone
                                          ? 'bg-emerald-100 text-semantic-emerald'
                                          : 'bg-amber-100 text-semantic-amber'
                                      }`}
                                    >
                                      {t.status}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-numbers">
                                      {formatIDR(t.unitPrice)}
                                    </td>
                                    <td className="py-1.5 px-2 text-center font-mono tabular-numbers">
                                      {t.quantity}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono font-bold tabular-numbers">
                                      {formatIDR(t.unitPrice * t.quantity)}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 4. MODAL FOOTER BAR */}
          <div className="bg-white px-4 py-3 border-t-2 border-carbon flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-xs font-mono text-mutedText">
              Nama File:{' '}
              <strong className="text-carbon">{pdfArtifact?.filename}</strong> •
              Ukuran A4 Portrait Siap Cetak
            </div>

            <form method="dialog" className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="submit"
                value="cancel"
                className="min-h-[42px] px-4 py-2 bg-subtle hover:bg-gray-200 text-carbon font-mono font-bold text-xs border border-carbon cursor-pointer"
              >
                Batal / Tutup
              </button>
              <button
                type="button"
                onClick={handleConfirmDownload}
                className="min-h-[42px] px-5 py-2 bg-accent hover:bg-orange-600 text-white font-mono font-bold text-xs border border-carbon shadow-brutalist-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download File .PDF Sekarang
              </button>
            </form>
          </div>
        </div>
      )}
    </dialog>
  );
};
