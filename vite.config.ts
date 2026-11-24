import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

const DEFAULT_SPREADSHEET_ID = '1T2Z02j95WM6eQqKsZslkNf7PsKDipWa-5EHGuW14KTc';

function buildGSheetsBatchPayload(state: any, spreadsheetId: string) {
  const tiers = Array.isArray(state.tiers) ? state.tiers : [];
  const personnel = Array.isArray(state.personnel) ? state.personnel : [];
  const budgetPool = typeof state.budgetPool === 'number' ? state.budgetPool : 0;

  const tier1 = tiers.find((t: any) => t.id === 'TIER_01') || { currentFloor: 12000000, weight: 2.2 };
  const tier2 = tiers.find((t: any) => t.id === 'TIER_02') || { currentFloor: 7500000, weight: 1.5 };
  const tier3 = tiers.find((t: any) => t.id === 'TIER_03') || { currentFloor: 4500000, weight: 1.0 };

  const startRow = 15;
  const endRow = startRow + Math.max(0, personnel.length - 1);
  const totalRowIdx = startRow + personnel.length;

  const summaryRows: any[][] = [
    ['TEAM PAYROLL, MULTI-TIER GUARDRAIL & TASK BOUNTY LEDGER', '', '', '', '', '', '', '', '', '', ''],
    ['Spreadsheet ID:', spreadsheetId, 'Status Koneksi:', 'CONNECTED LIVE', 'Update Terakhir:', new Date().toISOString().split('T')[0], '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['PARAMETER ANGGARAN & TIER GUARDRAIL', 'NILAI (IDR)', 'PROPORSI / BOBOT', 'STATUS / KETERANGAN', '', '', '', '', '', '', ''],
    ['Pool Anggaran Bulanan', budgetPool, '100.0%', 'Pagu Anggaran Maksimal Bulanan', '', '', '', '', '', '', ''],
    ['Total Gaji Pokok Tier', personnel.length > 0 ? `=SUM(G${startRow}:G${endRow})` : 0, '=IF(B5>0; ROUND(B6/B5*100; 1)&"%"; "0.0%")', 'Total Gaji Pokok Seluruh Personel', '', '', '', '', '', '', ''],
    ['Total Komisi Bounty Selesai', personnel.length > 0 ? `=SUM(I${startRow}:I${endRow})` : 0, '=IF(B5>0; ROUND(B7/B5*100; 1)&"%"; "0.0%")', 'Total Bounty dari Task Berstatus SELESAI', '', '', '', '', '', '', ''],
    ['Grand Total Alokasi', '=B6+B7', '=IF(B5>0; ROUND(B8/B5*100; 1)&"%"; "0.0%")', 'Gaji Pokok + Bounty Selesai', '', '', '', '', '', '', ''],
    ['Sisa Saldo / Defisit', '=B5-B8', '=IF(B5>0; ROUND(B9/B5*100; 1)&"%"; "0.0%")', '=IF(B9<0; "OVER BUDGET (DEFISIT)"; "SURPLUS SAFE")', '', '', '', '', '', '', ''],
    ['TIER_01 Floor (Lead / Manager)', tier1.currentFloor, `${tier1.weight}x`, 'Batas Bawah Minimal TIER_01 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['TIER_02 Floor (Senior / Specialist)', tier2.currentFloor, `${tier2.weight}x`, 'Batas Bawah Minimal TIER_02 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['TIER_03 Floor (Core Team / Associate)', tier3.currentFloor, `${tier3.weight}x`, 'Batas Bawah Minimal TIER_03 (Min Rp 100.000)', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''],
    ['NO', 'PERSON_ID', 'NAMA PERSONEL', 'ROLE TITLE', 'TIER_CODE', 'LOCK_STATUS', 'GAJI POKOK (IDR)', 'TASK SELESAI', 'BOUNTY SELESAI (IDR)', 'TOTAL TAKE-HOME PAY (IDR)', 'SHARE ALOKASI (%)'],
  ];

  personnel.forEach((p: any, idx: number) => {
    const r = startRow + idx;
    summaryRows.push([
      idx + 1,
      p.id,
      p.name,
      p.roleTitle,
      p.tierId,
      p.isLocked ? 'LOCKED' : 'UNLOCKED',
      p.baseSalary,
      `=COUNTIFS(LEDGER_TASK!$C$5:$C$200; B${r}; LEDGER_TASK!$K$5:$K$200; "SELESAI")`,
      `=SUMIFS(LEDGER_TASK!$J$5:$J$200; LEDGER_TASK!$C$5:$C$200; B${r}; LEDGER_TASK!$K$5:$K$200; "SELESAI")`,
      `=G${r}+I${r}`,
      `=IF($J$${totalRowIdx}>0; ROUND(J${r}/$J$${totalRowIdx}*100; 1)&"%"; "0.0%")`,
    ]);
  });

  summaryRows.push([
    'TOTAL',
    '',
    `${personnel.length} PERSONEL AKTIF`,
    '',
    '',
    '',
    personnel.length > 0 ? `=SUM(G${startRow}:G${endRow})` : 0,
    personnel.length > 0 ? `=SUM(H${startRow}:H${endRow})` : 0,
    personnel.length > 0 ? `=SUM(I${startRow}:I${endRow})` : 0,
    personnel.length > 0 ? `=SUM(J${startRow}:J${endRow})` : 0,
    '100.0%',
  ]);

  const taskRows: any[][] = [
    ['LEDGER TASK & BOUNTY - RINCIAN DELIVERABLES PERSONEL', '', '', '', '', '', '', '', '', '', '', ''],
    ['Total Task Selesai:', '=COUNTIF(K5:K200; "SELESAI")', 'Total Bounty Selesai (IDR):', '=SUMIF(K5:K200; "SELESAI"; J5:J200)', 'Total Pending Proses (IDR):', '=SUMIF(K5:K200; "PROSES"; J5:J200)', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
    ['NO', 'TASK_ID', 'PERSON_ID', 'NAMA PERSONEL', 'ROLE TITLE', 'JUDUL TASK / DELIVERABLE', 'KATEGORI', 'HARGA SATUAN (IDR)', 'QTY', 'TOTAL BARIS (IDR)', 'STATUS', 'TANGGAL'],
  ];

  let taskCounter = 1;
  personnel.forEach((p: any) => {
    const tasks = Array.isArray(p.tasks) ? p.tasks : [];
    tasks.forEach((t: any) => {
      const r = 4 + taskCounter;
      taskRows.push([
        taskCounter,
        t.id,
        p.id,
        p.name,
        p.roleTitle,
        t.title,
        t.category,
        t.unitPrice,
        t.quantity,
        `=H${r}*I${r}`,
        t.status,
        t.createdAt,
      ]);
      taskCounter++;
    });
  });

  const appStateRows = [
    ['KEY', 'VALUE'],
    ['UPDATED_AT', new Date().toISOString()],
    ['SPREADSHEET_ID', spreadsheetId],
    ['RAW_STATE_JSON', JSON.stringify(state)],
  ];

  return [
    { op: 'clear', range: 'RINGKASAN_PAYROLL!A1:K100' },
    { op: 'write', range: 'RINGKASAN_PAYROLL!A1', data: summaryRows },
    { op: 'clear', range: 'LEDGER_TASK!A1:L200' },
    { op: 'write', range: 'LEDGER_TASK!A1', data: taskRows },
    { op: 'clear', range: 'APP_STATE_JSON!A1:B10' },
    { op: 'write', range: 'APP_STATE_JSON!A1', data: appStateRows },
  ];
}

function ledgerDiskPersistencePlugin(): Plugin {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dataFile = path.join(dataDir, 'ledger-state.json');
  const batchFile = path.join(dataDir, 'gsheets-batch.json');

  const attachMiddleware = (middlewares: any) => {
    // 1. Local disk state endpoint
    middlewares.use('/api/ledger-state', (req: any, res: any, next: any) => {
      if (req.method === 'GET') {
        try {
          if (fs.existsSync(dataFile)) {
            const raw = fs.readFileSync(dataFile, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(raw);
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ exists: false }));
          return;
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read state' }));
          return;
        }
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            const parsed = JSON.parse(body);
            fs.writeFileSync(dataFile, JSON.stringify(parsed, null, 2), 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
          }
        });
        return;
      }

      next();
    });

    // 2. Google Sheets Push Sync endpoint
    middlewares.use('/api/gsheets-push', (req: any, res: any, next: any) => {
      if (req.method !== 'POST') {
        next();
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          const parsed = JSON.parse(body);
          const spreadsheetId = parsed.spreadsheetId || DEFAULT_SPREADSHEET_ID;
          const batchPayload = buildGSheetsBatchPayload(parsed, spreadsheetId);
          fs.writeFileSync(batchFile, JSON.stringify(batchPayload, null, 2), 'utf-8');

          const env = {
            ...process.env,
            PATH: `/Users/dinurm.pradipta/.gemini/antigravity/bin:${process.env.PATH || ''}`,
          };

          execFile(
            'gsheets',
            ['mutate', 'batch', spreadsheetId, '-f', batchFile],
            { env, timeout: 25000 },
            (error, stdout, stderr) => {
              res.setHeader('Content-Type', 'application/json');
              if (error) {
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    ok: false,
                    error: stderr || error.message,
                  })
                );
                return;
              }
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  ok: true,
                  syncedAt: new Date().toISOString(),
                  output: stdout,
                })
              );
            }
          );
        } catch (err: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: err?.message || 'Invalid request' }));
        }
      });
    });
  };

  return {
    name: 'ledger-disk-persistence',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), ledgerDiskPersistencePlugin()],
});
