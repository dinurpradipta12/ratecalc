import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Personnel, TierConfig, BudgetTelemetry } from '../types';
import { formatIDR, formatPercent } from './formatters';

/**
 * Build Individual Payslip jsPDF instance & filename (Slip Gaji Per Orang + Detail Tugas)
 */
export function createPersonSlipPDF(
  person: Personnel,
  tier: TierConfig,
  grandTotalAllocation: number
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const isoDate = new Date().toISOString().split('T')[0];

  const completedTasks = person.tasks.filter((t) => t.status === 'SELESAI');
  const pendingTasks = person.tasks.filter((t) => t.status === 'PROSES');
  const completedBounty = completedTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
  const pendingBounty = pendingTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
  const takeHomePay = person.baseSalary + completedBounty;
  const sharePercent =
    grandTotalAllocation > 0 ? (takeHomePay / grandTotalAllocation) * 100 : 0;

  // 1. Header Banner
  doc.setFillColor(17, 17, 16); // #111110
  doc.rect(14, 14, 182, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SLIP GAJI & RINCIAN TUGAS PERSONEL', 20, 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 220, 220);
  doc.text(`Tanggal Cetak: ${dateStr}  |  ID: ${person.id}`, 20, 29);

  // Orange accent badge on right of header
  doc.setFillColor(234, 88, 12); // #EA580C
  doc.rect(156, 18, 36, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(tier.code, 174, 25.5, { align: 'center' });

  // 2. Personnel Identity & Summary Box
  doc.setDrawColor(17, 17, 16);
  doc.setLineWidth(0.4);
  doc.setFillColor(246, 245, 240); // #F6F5F0
  doc.rect(14, 38, 182, 34, 'FD');

  doc.setTextColor(87, 86, 82);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DATA PERSONEL', 20, 44);
  doc.text('RINGKASAN PENERIMAAN (TAKE-HOME PAY)', 112, 44);

  doc.setDrawColor(200, 198, 190);
  doc.line(20, 46, 102, 46);
  doc.line(112, 46, 190, 46);

  // Left column details
  doc.setTextColor(17, 17, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(person.name, 20, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(87, 86, 82);
  doc.text(`Role: ${person.roleTitle}`, 20, 58);
  doc.text(
    `Tier: ${tier.code} (${tier.weight.toFixed(1)}x) | Min Floor: ${formatIDR(tier.currentFloor)}`,
    20,
    63.5
  );
  doc.text(`Porsi Alokasi Tim: ${formatPercent(sharePercent)}`, 20, 69);

  // Right column financial summary
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(17, 17, 16);
  doc.text('Gaji Pokok Tier:', 112, 52);
  doc.text(formatIDR(person.baseSalary), 190, 52, { align: 'right' });

  doc.text(`Komisi Tugas Selesai (${completedTasks.length} tugas):`, 112, 58);
  doc.setTextColor(21, 128, 61); // Emerald
  doc.setFont('helvetica', 'bold');
  doc.text(`+ ${formatIDR(completedBounty)}`, 190, 58, { align: 'right' });

  doc.setDrawColor(17, 17, 16);
  doc.line(112, 61.5, 190, 61.5);

  doc.setTextColor(17, 17, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('TOTAL TAKE-HOME PAY:', 112, 68);
  doc.text(formatIDR(takeHomePay), 190, 68, { align: 'right' });

  // 3. Tasks Detail Table
  doc.setTextColor(17, 17, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    `DAFTAR RINCIAN TUGAS & BOUNTY (${person.tasks.length} Total Tugas: ${completedTasks.length} Selesai, ${pendingTasks.length} Proses)`,
    14,
    80
  );

  const taskTableRows =
    person.tasks.length > 0
      ? person.tasks.map((t, idx) => [
          (idx + 1).toString(),
          t.title,
          t.category,
          t.status === 'SELESAI' ? 'SELESAI' : 'PROSES',
          formatIDR(t.unitPrice),
          t.quantity.toString(),
          formatIDR(t.unitPrice * t.quantity),
        ])
      : [['-', 'Belum ada tugas tercatat untuk personel ini', '-', '-', 'Rp 0', '0', 'Rp 0']];

  autoTable(doc, {
    startY: 83,
    head: [['No', 'Judul Tugas / Deliverable', 'Kategori', 'Status', 'Harga Satuan', 'Qty', 'Total Bounty']],
    body: taskTableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [17, 17, 16],
      lineColor: [17, 17, 16],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [17, 17, 16],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 25 },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = String(data.cell.raw);
        if (val === 'SELESAI') {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fillColor = [220, 252, 231];
        } else if (val === 'PROSES') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fillColor = [254, 243, 199];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 120;

  // 4. Bottom Calculation Box
  const boxY = Math.min(finalY + 6, 245);
  doc.setDrawColor(17, 17, 16);
  doc.setLineWidth(0.3);
  doc.setFillColor(236, 234, 226); // #ECEAE2
  doc.rect(14, boxY, 182, 26, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(87, 86, 82);
  doc.text(
    '* Catatan: Hanya tugas berstatus [SELESAI] yang masuk ke dalam pencairan Take-Home Pay.',
    18,
    boxY + 7
  );
  if (pendingTasks.length > 0) {
    doc.text(
      `* Tugas berstatus [PROSES]: ${pendingTasks.length} tugas (Estimasi nilai: ${formatIDR(pendingBounty)}) menunggu penyelesaian.`,
      18,
      boxY + 13
    );
  } else {
    doc.text('* Seluruh tugas personel ini telah berstatus [SELESAI].', 18, boxY + 13);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 17, 16);
  doc.text(
    `TOTAL DITERIMA (${person.name.toUpperCase()}): ${formatIDR(takeHomePay)}`,
    18,
    boxY + 21
  );

  const safeName = person.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Slip_Gaji_${safeName}_${isoDate}.pdf`;
  return { doc, filename };
}

/**
 * Generate & Download Individual Payslip PDF (Slip Gaji Per Orang + Detail Tugas)
 */
export function exportPersonSlipPDF(
  person: Personnel,
  tier: TierConfig,
  grandTotalAllocation: number
): void {
  const { doc, filename } = createPersonSlipPDF(person, tier, grandTotalAllocation);
  doc.save(filename);
}

/**
 * Build Combined Team Payslip & Full Task Breakdown jsPDF instance & filename (1 Tim Gabungan)
 */
export function createTeamCombinedSlipPDF(
  personnel: Personnel[],
  tiers: TierConfig[],
  telemetry: BudgetTelemetry
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const isoDate = new Date().toISOString().split('T')[0];

  const totalCompletedTasks = personnel.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === 'SELESAI').length,
    0
  );
  const totalPendingTasks = personnel.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === 'PROSES').length,
    0
  );

  // 1. Top Header Banner
  doc.setFillColor(17, 17, 16);
  doc.rect(14, 12, 182, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SLIP PAYOUT TIM GABUNGAN & LAPORAN PEMBAGIAN TUGAS', 19, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(210, 210, 210);
  doc.text(
    `Tanggal Cetak: ${dateStr}  |  Total Personel: ${personnel.length} Orang  |  Tugas Selesai: ${totalCompletedTasks}  |  Tugas Proses: ${totalPendingTasks}`,
    19,
    26
  );

  // 2. KPI Summary Table (Anggaran Tim)
  autoTable(doc, {
    startY: 33,
    head: [
      [
        'Pool Anggaran Awal',
        'Total Gaji Pokok',
        'Total Bounty Selesai',
        'Grand Total Alokasi',
        telemetry.isDeficit ? 'Defisit Anggaran' : 'Sisa Saldo (Surplus)',
      ],
    ],
    body: [
      [
        formatIDR(telemetry.budgetPool),
        `${formatIDR(telemetry.totalBasePayroll)} (${formatPercent(telemetry.basePayrollPercentage)})`,
        `${formatIDR(telemetry.totalCompletedBounties)} (${formatPercent(telemetry.bountyPercentage)})`,
        `${formatIDR(telemetry.grandTotalAllocation)} (${formatPercent(telemetry.burnRatePercentage)})`,
        formatIDR(telemetry.surplusDeficit),
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: 'center',
      fontStyle: 'bold',
      textColor: [17, 17, 16],
      lineColor: [17, 17, 16],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: [234, 88, 12], // #EA580C
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
  });

  // 3. Rekapitulasi Slip Gaji Seluruh Tim
  let currentY = ((doc as any).lastAutoTable?.finalY || 50) + 6;
  doc.setTextColor(17, 17, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. REKAPITULASI SLIP PAYOUT SELURUH TIM', 14, currentY);

  const summaryRows = personnel.map((p, idx) => {
    const doneTasks = p.tasks.filter((t) => t.status === 'SELESAI');
    const progTasks = p.tasks.filter((t) => t.status === 'PROSES');
    const bounty = doneTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
    const takeHome = p.baseSalary + bounty;
    const share =
      telemetry.grandTotalAllocation > 0
        ? (takeHome / telemetry.grandTotalAllocation) * 100
        : 0;

    return [
      (idx + 1).toString(),
      `${p.name}\n(${p.roleTitle})`,
      p.tierId,
      formatIDR(p.baseSalary),
      `${doneTasks.length} Selesai / ${progTasks.length} Proses`,
      formatIDR(bounty),
      formatIDR(takeHome),
      formatPercent(share),
    ];
  });

  summaryRows.push([
    'TOTAL',
    `${personnel.length} PERSONEL`,
    '-',
    formatIDR(telemetry.totalBasePayroll),
    `${totalCompletedTasks} Selesai / ${totalPendingTasks} Proses`,
    formatIDR(telemetry.totalCompletedBounties),
    formatIDR(telemetry.grandTotalAllocation),
    '100.0%',
  ]);

  autoTable(doc, {
    startY: currentY + 2.5,
    head: [
      [
        'No',
        'Nama Personel & Role',
        'Tier',
        'Gaji Pokok',
        'Status Tugas',
        'Bounty Selesai',
        'Take-Home Pay',
        'Share %',
      ],
    ],
    body: summaryRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [17, 17, 16],
      lineColor: [17, 17, 16],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [17, 17, 16],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 27, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 14, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index === summaryRows.length - 1) {
        data.cell.styles.fillColor = [236, 234, 226];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // 4. Section II: Detail Pembagian Tugas per Personel (Gabungan Seluruh Tim)
  currentY = ((doc as any).lastAutoTable?.finalY || 120) + 8;
  if (currentY > 250) {
    doc.addPage();
    currentY = 18;
  }

  doc.setTextColor(17, 17, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. RINCIAN PEMBAGIAN TUGAS & STATUS SELESAI PER PERSONEL', 14, currentY);
  currentY += 3;

  personnel.forEach((person, index) => {
    const tier = tiers.find((t) => t.id === person.tierId) || tiers[2];
    const doneTasks = person.tasks.filter((t) => t.status === 'SELESAI');
    const bounty = doneTasks.reduce((sum, t) => sum + t.unitPrice * t.quantity, 0);
    const takeHome = person.baseSalary + bounty;

    const personHeaderTitle = `${index + 1}. ${person.name.toUpperCase()} — ${person.roleTitle} (${tier.code})   |   Pokok: ${formatIDR(person.baseSalary)}   |   Bounty Selesai: ${formatIDR(bounty)}   |   Take-Home: ${formatIDR(takeHome)}`;

    const taskBody =
      person.tasks.length > 0
        ? person.tasks.map((t, tIdx) => [
            (tIdx + 1).toString(),
            t.title,
            t.category,
            t.status,
            formatIDR(t.unitPrice),
            t.quantity.toString(),
            formatIDR(t.unitPrice * t.quantity),
          ])
        : [['-', 'Belum ada tugas yang ditugaskan', '-', '-', 'Rp 0', '0', 'Rp 0']];

    autoTable(doc, {
      startY: currentY,
      head: [
        [{ content: personHeaderTitle, colSpan: 7, styles: { fillColor: [236, 234, 226], textColor: [17, 17, 16], fontStyle: 'bold', halign: 'left' } }],
        ['No', 'Judul Tugas / Deliverable', 'Kategori', 'Status', 'Harga Satuan', 'Qty', 'Subtotal'],
      ],
      body: taskBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        textColor: [17, 17, 16],
        lineColor: [17, 17, 16],
        lineWidth: 0.18,
      },
      headStyles: {
        fillColor: [50, 50, 48],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 72 },
        2: { cellWidth: 24 },
        3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 10, halign: 'center' },
        6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw);
          if (val === 'SELESAI') {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fillColor = [220, 252, 231];
          } else if (val === 'PROSES') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [254, 243, 199];
          }
        }
      },
    });

    currentY = ((doc as any).lastAutoTable?.finalY || currentY + 20) + 4;
  });

  const filename = `Slip_Gaji_Tim_Gabungan_${isoDate}.pdf`;
  return { doc, filename };
}

/**
 * Generate & Download Combined Team Payslip & Full Task Breakdown PDF (1 Tim Gabungan)
 */
export function exportTeamCombinedSlipPDF(
  personnel: Personnel[],
  tiers: TierConfig[],
  telemetry: BudgetTelemetry
): void {
  const { doc, filename } = createTeamCombinedSlipPDF(personnel, tiers, telemetry);
  doc.save(filename);
}
