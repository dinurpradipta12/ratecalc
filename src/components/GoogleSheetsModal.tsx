import React, { useState } from 'react';
import { 
  GSheetsConfig, 
  extractSpreadsheetId, 
  getGoogleAppsScriptCode 
} from '../utils/googleSheets';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Copy, 
  Check, 
  X, 
  Code2 
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GSheetsConfig;
  onUpdateConfig: (newConfig: GSheetsConfig) => void;
  onPullFromSheets: () => Promise<void>;
  onPushToSheets: () => Promise<void>;
  isSyncing: boolean;
  syncStatusMessage: string | null;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onPullFromSheets,
  onPushToSheets,
  isSyncing,
  syncStatusMessage,
}) => {
  const [urlInput, setUrlInput] = useState(config.spreadsheetUrl);
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl);
  const [autoPull, setAutoPull] = useState(config.autoPullOnLoad);
  const [showAppsScript, setShowAppsScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractSpreadsheetId(urlInput);
    onUpdateConfig({
      ...config,
      spreadsheetId: extractedId,
      spreadsheetUrl: urlInput.trim() || `https://docs.google.com/spreadsheets/d/${extractedId}/edit`,
      webhookUrl: webhookInput.trim(),
      autoPullOnLoad: autoPull,
    });
  };

  const handleCopyScript = () => {
    const code = getGoogleAppsScriptCode(extractSpreadsheetId(urlInput));
    navigator.clipboard.writeText(code).then(() => {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-carbon/60 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-carbon shadow-brutalist w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-carbon text-white px-5 py-3.5 flex items-center justify-between border-b border-carbon">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display font-extrabold text-sm sm:text-base uppercase tracking-tight">
                Koneksi Live Google Sheets
              </h2>
              <p className="text-[11px] font-mono text-gray-300">
                ID: {config.spreadsheetId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center border border-gray-600 text-white hover:bg-gray-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Status Banner */}
          <div className="bg-emerald-50 border border-semantic-emerald p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="emerald" size="sm">CONNECTED</Badge>
                <span className="font-mono font-bold text-xs text-carbon">
                  3 Sheet Aktif: RINGKASAN_PAYROLL • LEDGER_TASK • APP_STATE_JSON
                </span>
              </div>
              <p className="text-xs font-ui text-mutedText mt-1">
                Spreadsheet Anda sudah terisi otomatis dengan rumus live. Anda dapat mengedit angka di Google Sheets lalu klik <strong>"Tarik Data dari Sheets"</strong>, atau sebaliknya.
              </p>
            </div>
            <a
              href={`https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3.5 py-2 bg-white hover:bg-subtle text-carbon border border-carbon shadow-brutalist-sm font-mono font-bold text-xs inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Buka Spreadsheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-accent" />
            </a>
          </div>

          {/* Primary Sync Actions (2-Way Sync) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pull from Google Sheets */}
            <div className="p-4 bg-subtle border border-carbon flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-semantic-emerald">
                    PULL // DARI GOOGLE SHEETS
                  </span>
                  <DownloadCloud className="w-4 h-4 text-semantic-emerald" />
                </div>
                <h3 className="font-display font-extrabold text-sm uppercase mt-1">
                  Tarik Data dari Google Sheets
                </h3>
                <p className="text-xs text-mutedText font-ui mt-0.5">
                  Membaca langsung tabel <code>RINGKASAN_PAYROLL</code> & <code>LEDGER_TASK</code> dari Google Sheets ke aplikasi ini.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isSyncing}
                onClick={onPullFromSheets}
                className="w-full"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Menarik Data...' : 'Tarik Data dari Sheets Sekarang'}</span>
              </Button>
            </div>

            {/* Push to Google Sheets */}
            <div className="p-4 bg-subtle border border-carbon flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-accent">
                    PUSH // KE GOOGLE SHEETS
                  </span>
                  <UploadCloud className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-display font-extrabold text-sm uppercase mt-1">
                  Kirim Perubahan ke Google Sheets
                </h3>
                <p className="text-xs text-mutedText font-ui mt-0.5">
                  Memperbarui tabel & rumus di Google Sheets sesuai data yang sedang aktif di aplikasi ini.
                </p>
              </div>
              <Button
                type="button"
                variant="accent"
                size="md"
                disabled={isSyncing}
                onClick={onPushToSheets}
                className="w-full"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>{isSyncing ? 'Sedang Mengirim...' : 'Update ke Google Sheets'}</span>
              </Button>
            </div>
          </div>

          {syncStatusMessage && (
            <div className="p-3 bg-paper border border-carbon font-mono text-xs font-bold text-carbon flex items-center justify-between">
              <span>{syncStatusMessage}</span>
              {config.lastSyncedAt && (
                <span className="text-[10px] text-mutedText">
                  Sync: {new Date(config.lastSyncedAt).toLocaleTimeString('id-ID')}
                </span>
              )}
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSaveSettings} className="space-y-4 pt-3 border-t border-carbon">
            <div>
              <label className="block text-xs font-mono font-bold uppercase text-carbon mb-1">
                Link / URL Google Spreadsheet
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-3 py-2 bg-subtle border border-carbon text-xs font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="autoPullCheckbox"
                type="checkbox"
                checked={autoPull}
                onChange={(e) => setAutoPull(e.target.checked)}
                className="w-4 h-4 accent-carbon cursor-pointer"
              />
              <label htmlFor="autoPullCheckbox" className="text-xs font-ui font-medium text-carbon cursor-pointer">
                Otomatis tarik data terbaru dari Google Sheets setiap kali halaman di-refresh / dibuka
              </label>
            </div>

            {/* Optional Apps Script Webhook for Direct Browser-to-Sheet Push */}
            <div className="pt-2 border-t border-carbon/20">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono font-bold uppercase text-carbon">
                  Apps Script Webhook URL (Opsional - Untuk Push Langsung dari Browser Manapun)
                </label>
                <button
                  type="button"
                  onClick={() => setShowAppsScript(!showAppsScript)}
                  className="text-[11px] font-mono font-bold text-accent underline cursor-pointer flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  {showAppsScript ? 'Sembunyikan Kode Script' : 'Lihat Kode Apps Script'}
                </button>
              </div>
              <input
                type="text"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec (Kosongkan jika menggunakan sync standar)"
                className="w-full px-3 py-2 bg-subtle border border-carbon text-xs font-mono focus:bg-white focus:outline-none"
              />

              {showAppsScript && (
                <div className="mt-3 p-3 bg-carbon text-white border border-carbon space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-300">
                      Paste di Google Sheets: Extensions &gt; Apps Script &gt; Deploy as Web App (Anyone)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="px-2.5 py-1 bg-accent text-white text-[11px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedScript ? 'Tersalin!' : 'Salin Kode'}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-40 p-2 bg-black/50 border border-gray-700">
                    {getGoogleAppsScriptCode(extractSpreadsheetId(urlInput))}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="md" onClick={onClose}>
                Tutup
              </Button>
              <Button type="submit" variant="primary" size="md">
                Simpan Pengaturan Sheets
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
