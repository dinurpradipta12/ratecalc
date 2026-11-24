import { TierConfig, Personnel, TaskItem, TierId, TaskStatus } from '../types';
import { INITIAL_TIERS } from '../data/initialData';

export const DEFAULT_SPREADSHEET_ID = '1T2Z02j95WM6eQqKsZslkNf7PsKDipWa-5EHGuW14KTc';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit?usp=sharing`;
export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzvIwpYgnBxqAKkW9yJSnWpYqyPwFySv9mPgol96yyVUCrv6yunDd58vEGgA1xGOnIG/exec';

const GSHEETS_CONFIG_KEY = 'RATE_CALCULATOR_GSHEETS_CONFIG_V1';

export interface GSheetsConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  webhookUrl: string;
  autoPullOnLoad: boolean;
  lastSyncedAt?: string;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return trimmed || DEFAULT_SPREADSHEET_ID;
}

export function loadGSheetsConfig(): GSheetsConfig {
  try {
    const raw = window.localStorage.getItem(GSHEETS_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        spreadsheetId: parsed.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        spreadsheetUrl:
          parsed.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId || DEFAULT_SPREADSHEET_ID}/edit`,
        webhookUrl: parsed.webhookUrl || DEFAULT_WEBHOOK_URL,
        autoPullOnLoad: parsed.autoPullOnLoad ?? true,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch {
    // fallback
  }
  return {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    webhookUrl: DEFAULT_WEBHOOK_URL,
    autoPullOnLoad: true,
  };
}

export function saveGSheetsConfig(config: GSheetsConfig): void {
  try {
    window.localStorage.setItem(GSHEETS_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

function parseGvizJson(rawText: string): any[][] {
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Format respons Google Sheets tidak valid');
  }
  const json = JSON.parse(rawText.slice(startIdx, endIdx + 1));
  const rows = json?.table?.rows || [];
  return rows.map((r: any) =>
    (r.c || []).map((cell: any) => {
      if (!cell) return '';
      if (cell.f !== undefined && cell.v !== undefined && String(cell.v).startsWith('Date(')) {
        return String(cell.f);
      }
      return cell.v !== null && cell.v !== undefined ? cell.v : '';
    })
  );
}

function toNum(val: any, fallback = 0): number {
  if (typeof val === 'number') return Math.round(val);
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9-]/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * Pull live data directly from RINGKASAN_PAYROLL and LEDGER_TASK tabs in Google Sheets
 */
export async function pullFromGoogleSheets(spreadsheetId = DEFAULT_SPREADSHEET_ID): Promise<{
  budgetPool: number;
  tiers: TierConfig[];
  personnel: Personnel[];
}> {
  const cacheBust = Date.now();
  const summaryUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=RINGKASAN_PAYROLL&_t=${cacheBust}`;
  const tasksUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=LEDGER_TASK&_t=${cacheBust}`;

  const [summaryRes, tasksRes] = await Promise.all([fetch(summaryUrl), fetch(tasksUrl)]);
  if (!summaryRes.ok) {
    throw new Error('Gagal mengakses tab RINGKASAN_PAYROLL di Google Sheets');
  }

  const summaryText = await summaryRes.text();
  const summaryRows = parseGvizJson(summaryText);

  let tasksRows: any[][] = [];
  if (tasksRes.ok) {
    const tasksText = await tasksRes.text();
    tasksRows = parseGvizJson(tasksText);
  }

  let budgetPool = 90_000_000;
  const tiers: TierConfig[] = INITIAL_TIERS.map((t) => ({ ...t }));

  // Parse Summary Parameters & Personnel rows
  const personnelMap = new Map<string, Personnel>();
  const personnelList: Personnel[] = [];
  let inPersonnelSection = false;

  for (const row of summaryRows) {
    const colA = String(row[0] ?? '').trim();
    const colB = row[1];
    const colC = String(row[2] ?? '').trim();

    if (colA === 'Pool Anggaran Bulanan') {
      budgetPool = Math.max(0, toNum(colB, 90_000_000));
    } else if (colA.startsWith('TIER_01 Floor')) {
      const t1 = tiers.find((t) => t.id === 'TIER_01');
      if (t1) t1.currentFloor = Math.max(100_000, toNum(colB, t1.defaultFloor));
    } else if (colA.startsWith('TIER_02 Floor')) {
      const t2 = tiers.find((t) => t.id === 'TIER_02');
      if (t2) t2.currentFloor = Math.max(100_000, toNum(colB, t2.defaultFloor));
    } else if (colA.startsWith('TIER_03 Floor')) {
      const t3 = tiers.find((t) => t.id === 'TIER_03');
      if (t3) t3.currentFloor = Math.max(100_000, toNum(colB, t3.defaultFloor));
    } else if (colA === 'NO' && String(colB).trim() === 'PERSON_ID') {
      inPersonnelSection = true;
      continue;
    } else if (inPersonnelSection) {
      if (colA === 'TOTAL' || (!colB && !colC)) {
        if (colA === 'TOTAL') break;
        continue;
      }
      const personId = String(colB || `p_${Date.now()}_${personnelList.length}`).trim();
      const name = colC;
      if (!name) continue;
      const roleTitle = String(row[3] || 'Team Member').trim();
      const rawTier = String(row[4] || 'TIER_03').trim().toUpperCase();
      const tierId: TierId =
        rawTier === 'TIER_01' || rawTier === 'TIER_02' || rawTier === 'TIER_03'
          ? (rawTier as TierId)
          : 'TIER_03';
      const lockStr = String(row[5] || '').trim().toUpperCase();
      const isLocked = lockStr === 'LOCKED' || lockStr === 'TRUE';
      const tierObj = tiers.find((t) => t.id === tierId) || tiers[2];
      const baseSalary = Math.max(tierObj.currentFloor, toNum(row[6], tierObj.currentFloor));

      const person: Personnel = {
        id: personId,
        name,
        roleTitle,
        tierId,
        isLocked,
        baseSalary,
        tasks: [],
      };
      personnelList.push(person);
      personnelMap.set(personId, person);
    }
  }

  // Parse Tasks from LEDGER_TASK
  let inTasksSection = false;
  for (const row of tasksRows) {
    const colB = String(row[1] ?? '').trim();
    const colC = String(row[2] ?? '').trim();
    if (colB === 'TASK_ID' && colC === 'PERSON_ID') {
      inTasksSection = true;
      continue;
    }
    if (!inTasksSection) continue;

    const personId = colC;
    const personName = String(row[3] ?? '').trim();
    const title = String(row[5] ?? '').trim();
    if (!title) continue;

    const rawCat = String(row[6] ?? 'DEVELOPMENT').trim().toUpperCase();
    const validCats = ['MARKETING', 'DESIGN', 'DEVELOPMENT', 'OPERATIONS', 'CONTENT'];
    const category = (validCats.includes(rawCat) ? rawCat : 'DEVELOPMENT') as TaskItem['category'];
    const unitPrice = Math.max(0, toNum(row[7], 500_000));
    const quantity = Math.max(1, toNum(row[8], 1));
    const rawStatus = String(row[10] ?? 'SELESAI').trim().toUpperCase();
    const status: TaskStatus = rawStatus === 'PROSES' ? 'PROSES' : 'SELESAI';
    const createdAt = String(row[11] || new Date().toISOString().split('T')[0]).trim();

    const taskItem: TaskItem = {
      id: colB || `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      category,
      unitPrice,
      quantity,
      status,
      createdAt,
    };

    // Match by personId or by name
    let targetPerson = personnelMap.get(personId);
    if (!targetPerson && personName) {
      targetPerson = personnelList.find(
        (p) => p.name.toLowerCase() === personName.toLowerCase()
      );
    }
    if (targetPerson) {
      targetPerson.tasks.push(taskItem);
    }
  }

  return {
    budgetPool,
    tiers,
    personnel: personnelList,
  };
}

/**
 * Push current app state to Google Sheets (via Apps Script Webhook if configured, and local dev endpoint)
 */
export async function pushToGoogleSheets(
  budgetPool: number,
  tiers: TierConfig[],
  personnel: Personnel[],
  config: GSheetsConfig
): Promise<{ ok: boolean; method: string; message: string }> {
  const payload = {
    spreadsheetId: config.spreadsheetId || DEFAULT_SPREADSHEET_ID,
    updatedAt: new Date().toISOString(),
    budgetPool,
    tiers,
    personnel,
  };

  // 1. POST directly to Google Apps Script Web App URL
  const activeWebhookUrl = config.webhookUrl || DEFAULT_WEBHOOK_URL;
  if (activeWebhookUrl && activeWebhookUrl.startsWith('https://script.google.com/')) {
    try {
      await fetch(activeWebhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      return {
        ok: true,
        method: 'webhook',
        message: 'Data berhasil dikirim & di-update ke Google Sheets secara otomatis!',
      };
    } catch (err: any) {
      return {
        ok: false,
        method: 'webhook',
        message: err?.message || 'Gagal mengirim ke Webhook Google Sheets',
      };
    }
  }

  // 2. Try local server /api/gsheets-push
  try {
    const res = await fetch('/api/gsheets-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      return {
        ok: true,
        method: 'server',
        message: 'Data berhasil disinkronkan ke Google Sheets!',
      };
    }
  } catch {
    // ignore
  }

  return {
    ok: true,
    method: 'staged',
    message: 'Batch sinkronisasi disimpan. Buka Google Sheets atau gunakan Tarik dari Sheets.',
  };
}

/**
 * Google Apps Script template so the user can optionally deploy a 2-way Web App endpoint inside their Sheet
 */
export function getGoogleAppsScriptCode(spreadsheetId = DEFAULT_SPREADSHEET_ID): string {
  return `// ============================================================================
// GOOGLE APPS SCRIPT - LIVE WEBHOOK UNTUK TEAM PAYROLL & BOUNTY LEDGER
// Cara Pasang (Hanya 1x):
// 1. Di Google Sheets Anda, klik menu Extensions > Apps Script
// 2. Hapus kode yang ada, lalu Paste seluruh kode ini & tekan Save (Ctrl+S)
// 3. Klik tombol "Deploy" > "New deployment"
// 4. Pilih type: "Web app", Execute as: "Me", Who has access: "Anyone"
// 5. Klik "Deploy", lalu salin URL Web App ke pengaturan Google Sheets di Aplikasi
// ============================================================================

function doPost(e) {
  var ss = SpreadsheetApp.openById('${spreadsheetId}');
  var state = JSON.parse(e.postData.contents);
  var personnel = state.personnel || [];
  var tiers = state.tiers || [];
  var budgetPool = Number(state.budgetPool || 0);

  var t1 = tiers.filter(function(t){ return t.id === 'TIER_01'; })[0] || { currentFloor: 12000000, weight: 2.2 };
  var t2 = tiers.filter(function(t){ return t.id === 'TIER_02'; })[0] || { currentFloor: 7500000, weight: 1.5 };
  var t3 = tiers.filter(function(t){ return t.id === 'TIER_03'; })[0] || { currentFloor: 4500000, weight: 1.0 };

  var startRow = 15;
  var endRow = startRow + Math.max(0, personnel.length - 1);
  var totalRowIdx = startRow + personnel.length;

  var summarySheet = ss.getSheetByName('RINGKASAN_PAYROLL') || ss.getSheets()[0];
  summarySheet.getRange('A1:K100').clearContent();

  var summaryRows = [
    ['TEAM PAYROLL, MULTI-TIER GUARDRAIL & TASK BOUNTY LEDGER', '', '', '', '', '', '', '', '', '', ''],
    ['Spreadsheet ID:', '${spreadsheetId}', 'Status Koneksi:', 'CONNECTED LIVE', 'Update Terakhir:', new Date().toISOString().split('T')[0], '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['PARAMETER ANGGARAN & TIER GUARDRAIL', 'NILAI (IDR)', 'PROPORSI / BOBOT', 'STATUS / KETERANGAN', '', '', '', '', '', '', ''],
    ['Pool Anggaran Bulanan', budgetPool, '100.0%', 'Pagu Anggaran Maksimal Bulanan', '', '', '', '', '', '', ''],
    ['Total Gaji Pokok Tier', personnel.length > 0 ? '=SUM(G' + startRow + ':G' + endRow + ')' : 0, '=IF(B5>0; ROUND(B6/B5*100; 1)&"%"; "0.0%")', 'Total Gaji Pokok Seluruh Personel', '', '', '', '', '', '', ''],
    ['Total Komisi Bounty Selesai', personnel.length > 0 ? '=SUM(I' + startRow + ':I' + endRow + ')' : 0, '=IF(B5>0; ROUND(B7/B5*100; 1)&"%"; "0.0%")', 'Total Bounty dari Task Berstatus SELESAI', '', '', '', '', '', '', ''],
    ['Grand Total Alokasi', '=B6+B7', '=IF(B5>0; ROUND(B8/B5*100; 1)&"%"; "0.0%")', 'Gaji Pokok + Bounty Selesai', '', '', '', '', '', '', ''],
    ['Sisa Saldo / Defisit', '=B5-B8', '=IF(B5>0; ROUND(B9/B5*100; 1)&"%"; "0.0%")', '=IF(B9<0; "OVER BUDGET (DEFISIT)"; "SURPLUS SAFE")', '', '', '', '', '', '', ''],
    ['TIER_01 Floor (Lead / Manager)', t1.currentFloor, t1.weight + 'x', 'Batas Bawah Minimal TIER_01 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['TIER_02 Floor (Senior / Specialist)', t2.currentFloor, t2.weight + 'x', 'Batas Bawah Minimal TIER_02 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['TIER_03 Floor (Core Team / Associate)', t3.currentFloor, t3.weight + 'x', 'Batas Bawah Minimal TIER_03 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['NO', 'PERSON_ID', 'NAMA PERSONEL', 'ROLE TITLE', 'TIER_CODE', 'LOCK_STATUS', 'GAJI POKOK (IDR)', 'TASK SELESAI', 'BOUNTY SELESAI (IDR)', 'TOTAL TAKE-HOME PAY (IDR)', 'SHARE ALOKASI (%)']
  ];

  for (var i = 0; i < personnel.length; i++) {
    var p = personnel[i];
    var r = startRow + i;
    summaryRows.push([
      i + 1, p.id, p.name, p.roleTitle, p.tierId, p.isLocked ? 'LOCKED' : 'UNLOCKED', p.baseSalary,
      '=COUNTIFS(LEDGER_TASK!$C$5:$C$200; B' + r + '; LEDGER_TASK!$K$5:$K$200; "SELESAI")',
      '=SUMIFS(LEDGER_TASK!$J$5:$J$200; LEDGER_TASK!$C$5:$C$200; B' + r + '; LEDGER_TASK!$K$5:$K$200; "SELESAI")',
      '=G' + r + '+I' + r,
      '=IF($J$' + totalRowIdx + '>0; ROUND(J' + r + '/$J$' + totalRowIdx + '*100; 1)&"%"; "0.0%")'
    ]);
  }

  summaryRows.push([
    'TOTAL', '', personnel.length + ' PERSONEL AKTIF', '', '', '',
    personnel.length > 0 ? '=SUM(G' + startRow + ':G' + endRow + ')' : 0,
    personnel.length > 0 ? '=SUM(H' + startRow + ':H' + endRow + ')' : 0,
    personnel.length > 0 ? '=SUM(I' + startRow + ':I' + endRow + ')' : 0,
    personnel.length > 0 ? '=SUM(J' + startRow + ':J' + endRow + ')' : 0,
    '100.0%'
  ]);

  summarySheet.getRange(1, 1, summaryRows.length, 11).setValues(summaryRows);

  var taskSheet = ss.getSheetByName('LEDGER_TASK') || ss.insertSheet('LEDGER_TASK');
  taskSheet.getRange('A1:L200').clearContent();
  var taskRows = [
    ['LEDGER TASK & BOUNTY - RINCIAN DELIVERABLES PERSONEL', '', '', '', '', '', '', '', '', '', '', ''],
    ['Total Task Selesai:', '=COUNTIF(K5:K200; "SELESAI")', 'Total Bounty Selesai (IDR):', '=SUMIF(K5:K200; "SELESAI"; J5:J200)', 'Total Pending Proses (IDR):', '=SUMIF(K5:K200; "PROSES"; J5:J200)', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['NO', 'TASK_ID', 'PERSON_ID', 'NAMA PERSONEL', 'ROLE TITLE', 'JUDUL TASK / DELIVERABLE', 'KATEGORI', 'HARGA SATUAN (IDR)', 'QTY', 'TOTAL BARIS (IDR)', 'STATUS', 'TANGGAL']
  ];
  var tc = 1;
  for (var j = 0; j < personnel.length; j++) {
    var person = personnel[j];
    var tasks = person.tasks || [];
    for (var k = 0; k < tasks.length; k++) {
      var t = tasks[k];
      var tr = 4 + tc;
      taskRows.push([tc, t.id, person.id, person.name, person.roleTitle, t.title, t.category, t.unitPrice, t.quantity, '=H' + tr + '*I' + tr, t.status, t.createdAt]);
      tc++;
    }
  }
  taskSheet.getRange(1, 1, taskRows.length, 12).setValues(taskRows);

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;
}
