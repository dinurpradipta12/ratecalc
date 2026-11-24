import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TierConfig, 
  Personnel, 
  BudgetTelemetry, 
  TierId 
} from './types';
import { 
  INITIAL_TIERS, 
  INITIAL_PERSONNEL 
} from './data/initialData';
import {
  loadInitialLocalState,
  fetchDiskState,
  saveFullLedgerState,
  generateShareableUrl,
  exportLedgerJsonFile,
  parseImportedJsonFile,
} from './utils/storage';
import {
  GSheetsConfig,
  loadGSheetsConfig,
  saveGSheetsConfig,
  pullFromGoogleSheets,
  pushToGoogleSheets,
} from './utils/googleSheets';
import { BudgetTelemetryBar } from './components/BudgetTelemetryBar';
import { TabNavigation, TabId } from './components/TabNavigation';
import { SummaryGuardrailTab } from './components/tabs/SummaryGuardrailTab';
import { PersonnelRosterTab } from './components/tabs/PersonnelRosterTab';
import { TaskBountyLedgerTab } from './components/tabs/TaskBountyLedgerTab';
import { SlipPayoutTab } from './components/tabs/SlipPayoutTab';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { 
  RotateCcw, 
  Terminal, 
  Trash2, 
  Download, 
  Upload, 
  Save,
  FileSpreadsheet
} from 'lucide-react';

export function App() {
  // Load synchronous initial state from URL hash or localStorage if available
  const initialSaved = useMemo(() => loadInitialLocalState(), []);

  const [budgetPool, setBudgetPool] = useState<number>(
    initialSaved ? initialSaved.budgetPool : 90_000_000
  );
  const [tiers, setTiers] = useState<TierConfig[]>(
    initialSaved ? initialSaved.tiers : INITIAL_TIERS
  );
  const [personnel, setPersonnel] = useState<Personnel[]>(
    initialSaved ? initialSaved.personnel : INITIAL_PERSONNEL
  );
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  const [activePersonId, setActivePersonId] = useState<string>(
    initialSaved
      ? initialSaved.personnel[0]?.id || ''
      : INITIAL_PERSONNEL[0].id
  );

  // Google Sheets integration state
  const [gsheetsConfig, setGsheetsConfig] = useState<GSheetsConfig>(() => loadGSheetsConfig());
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    if (initialSaved?.updatedAt) {
      return new Date(initialSaved.updatedAt).toLocaleTimeString('id-ID');
    }
    return new Date().toLocaleTimeString('id-ID');
  });
  const [feedbackBadge, setFeedbackBadge] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pull from Google Sheets handler
  const handlePullFromSheets = async () => {
    setIsSyncingSheets(true);
    setSyncStatusMessage('Menarik data live dari Google Sheets...');
    try {
      const pulled = await pullFromGoogleSheets(gsheetsConfig.spreadsheetId);
      setBudgetPool(pulled.budgetPool);
      setTiers(pulled.tiers);
      setPersonnel(pulled.personnel);
      setActivePersonId(pulled.personnel[0]?.id || '');

      const updatedCfg: GSheetsConfig = {
        ...gsheetsConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      setGsheetsConfig(updatedCfg);
      saveGSheetsConfig(updatedCfg);

      setSyncStatusMessage(
        `Berhasil menarik ${pulled.personnel.length} personel & seluruh task dari Google Sheets!`
      );
      setFeedbackBadge('PULLED_SHEETS');
      setTimeout(() => setFeedbackBadge(null), 2500);
    } catch (err: any) {
      setSyncStatusMessage(err?.message || 'Gagal menarik data dari Google Sheets');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  // Push to Google Sheets handler
  const handlePushToSheets = async () => {
    setIsSyncingSheets(true);
    setSyncStatusMessage('Mengirim pembaruan ke Google Sheets...');
    try {
      const res = await pushToGoogleSheets(budgetPool, tiers, personnel, gsheetsConfig);
      const updatedCfg: GSheetsConfig = {
        ...gsheetsConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      setGsheetsConfig(updatedCfg);
      saveGSheetsConfig(updatedCfg);
      setSyncStatusMessage(res.message);
      setFeedbackBadge('SAVED');
      setTimeout(() => setFeedbackBadge(null), 2500);
    } catch (err: any) {
      setSyncStatusMessage(err?.message || 'Gagal mengirim ke Google Sheets');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleUpdateGSheetsConfig = (newCfg: GSheetsConfig) => {
    setGsheetsConfig(newCfg);
    saveGSheetsConfig(newCfg);
    setSyncStatusMessage('Pengaturan Google Sheets berhasil disimpan.');
  };

  // On mount, check disk state or auto-pull from Google Sheets if enabled
  useEffect(() => {
    let mounted = true;
    const hasUrlHash = window.location.hash.startsWith('#ledger=');

    if (gsheetsConfig.autoPullOnLoad && !hasUrlHash) {
      pullFromGoogleSheets(gsheetsConfig.spreadsheetId)
        .then((pulled) => {
          if (!mounted) return;
          setBudgetPool(pulled.budgetPool);
          setTiers(pulled.tiers);
          setPersonnel(pulled.personnel);
          setActivePersonId(pulled.personnel[0]?.id || '');
        })
        .catch(() => {
          // fallback to disk state
        });
      return () => {
        mounted = false;
      };
    }

    fetchDiskState().then((diskState) => {
      if (!mounted) return;
      if (diskState && !hasUrlHash) {
        const localTime = initialSaved?.updatedAt
          ? new Date(initialSaved.updatedAt).getTime()
          : 0;
        const diskTime = diskState.updatedAt
          ? new Date(diskState.updatedAt).getTime()
          : 0;

        if (!initialSaved || diskTime >= localTime) {
          setBudgetPool(diskState.budgetPool);
          setTiers(diskState.tiers);
          setPersonnel(diskState.personnel);
          setActivePersonId(diskState.personnel[0]?.id || '');
          setLastSavedTime(new Date(diskState.updatedAt).toLocaleTimeString('id-ID'));
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [initialSaved, gsheetsConfig.autoPullOnLoad, gsheetsConfig.spreadsheetId]);

  // Auto-save whenever budgetPool, tiers, or personnel changes + Auto-push to Google Sheets
  useEffect(() => {
    saveFullLedgerState(budgetPool, tiers, personnel).then((saved) => {
      setLastSavedTime(new Date(saved.updatedAt).toLocaleTimeString('id-ID'));
    });

    const timer = setTimeout(() => {
      pushToGoogleSheets(budgetPool, tiers, personnel, gsheetsConfig).catch(() => {});
    }, 800);

    return () => clearTimeout(timer);
  }, [budgetPool, tiers, personnel, gsheetsConfig]);

  // Explicit Manual Save (LocalStorage + Server Disk + URL Hash + Push to Sheets)
  const handleManualSave = () => {
    saveFullLedgerState(budgetPool, tiers, personnel).then((saved) => {
      generateShareableUrl(budgetPool, tiers, personnel);
      pushToGoogleSheets(budgetPool, tiers, personnel, gsheetsConfig).catch(() => {});
      setLastSavedTime(new Date(saved.updatedAt).toLocaleTimeString('id-ID'));
      setFeedbackBadge('SAVED');
      setTimeout(() => setFeedbackBadge(null), 2200);
    });
  };

  // Copy portable Share Link (URL with encoded state)
  const handleCopyShareLink = () => {
    const shareUrl = generateShareableUrl(budgetPool, tiers, personnel);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setFeedbackBadge('COPIED_LINK');
        setTimeout(() => setFeedbackBadge(null), 2200);
      });
    }
  };

  // Handle JSON file import
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const imported = parseImportedJsonFile(content);
        if (imported) {
          setBudgetPool(imported.budgetPool);
          setTiers(imported.tiers);
          setPersonnel(imported.personnel);
          setActivePersonId(imported.personnel[0]?.id || '');
          setFeedbackBadge('SAVED');
          setTimeout(() => setFeedbackBadge(null), 2200);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Auto-clamp when tier floor changes
  const handleUpdateTierFloor = (tierId: TierId, newFloor: number) => {
    setTiers((prevTiers) =>
      prevTiers.map((t) => (t.id === tierId ? { ...t, currentFloor: newFloor } : t))
    );

    setPersonnel((prevPersonnel) =>
      prevPersonnel.map((person) => {
        if (person.tierId === tierId && person.baseSalary < newFloor) {
          return {
            ...person,
            baseSalary: newFloor,
          };
        }
        return person;
      })
    );
  };

  // Update a single person
  const handleUpdatePerson = (updatedPerson: Personnel) => {
    setPersonnel((prev) =>
      prev.map((p) => (p.id === updatedPerson.id ? updatedPerson : p))
    );
  };

  // Add a new person
  const handleAddPerson = (newPerson: Personnel) => {
    setPersonnel((prev) => [newPerson, ...prev]);
    setActivePersonId(newPerson.id);
  };

  // Delete a person
  const handleDeletePerson = (personId: string) => {
    setPersonnel((prev) => prev.filter((p) => p.id !== personId));
    if (activePersonId === personId) {
      const remaining = personnel.filter((p) => p.id !== personId);
      if (remaining.length > 0) {
        setActivePersonId(remaining[0].id);
      } else {
        setActivePersonId('');
      }
    }
  };

  // Jump from Roster Task Counter to Tab 3 filtered to that person
  const handleJumpToTaskLedger = (personId: string) => {
    setActivePersonId(personId);
    setActiveTab('ledger');
  };

  // Reset ALL data to completely empty (0 numbers & 0 personnel immediately)
  const handleResetToEmpty = () => {
    setPersonnel([]);
    setBudgetPool(0);
    setActivePersonId('');
    setTiers(
      INITIAL_TIERS.map((t) => ({
        ...t,
        currentFloor: 100_000,
      }))
    );
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Load / restore initial sample demo data
  const handleLoadDemoData = () => {
    setBudgetPool(90_000_000);
    setTiers(INITIAL_TIERS);
    setPersonnel(INITIAL_PERSONNEL);
    setActivePersonId(INITIAL_PERSONNEL[0].id);
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Telemetry computations
  const telemetry = useMemo<BudgetTelemetry>(() => {
    const totalBasePayroll = personnel.reduce((sum, p) => sum + p.baseSalary, 0);

    let totalCompletedBounties = 0;
    let totalPendingBounties = 0;

    personnel.forEach((p) => {
      p.tasks.forEach((t) => {
        const lineTotal = t.unitPrice * t.quantity;
        if (t.status === 'SELESAI') {
          totalCompletedBounties += lineTotal;
        } else {
          totalPendingBounties += lineTotal;
        }
      });
    });

    const grandTotalAllocation = totalBasePayroll + totalCompletedBounties;
    const surplusDeficit = budgetPool - grandTotalAllocation;
    const isDeficit = surplusDeficit < 0;

    const burnRatePercentage = budgetPool > 0 ? (grandTotalAllocation / budgetPool) * 100 : 0;
    const basePayrollPercentage = budgetPool > 0 ? (totalBasePayroll / budgetPool) * 100 : 0;
    const bountyPercentage = budgetPool > 0 ? (totalCompletedBounties / budgetPool) * 100 : 0;
    const surplusPercentage = budgetPool > 0 ? (surplusDeficit / budgetPool) * 100 : 0;

    return {
      budgetPool,
      totalBasePayroll,
      totalCompletedBounties,
      totalPendingBounties,
      grandTotalAllocation,
      surplusDeficit,
      burnRatePercentage,
      isDeficit,
      basePayrollPercentage,
      bountyPercentage,
      surplusPercentage,
    };
  }, [budgetPool, personnel]);

  // Aggregate counts
  const completedTasksCount = useMemo(() => {
    return personnel.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === 'SELESAI').length,
      0
    );
  }, [personnel]);

  return (
    <div className="min-h-screen bg-paper flex flex-col font-ui text-carbon selection:bg-accent selection:text-white">
      {/* Hidden File Input for JSON Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {/* Google Sheets Sync & Configuration Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        config={gsheetsConfig}
        onUpdateConfig={handleUpdateGSheetsConfig}
        onPullFromSheets={handlePullFromSheets}
        onPushToSheets={handlePushToSheets}
        isSyncing={isSyncingSheets}
        syncStatusMessage={syncStatusMessage}
      />

      {/* 1. PERSISTENT COMPACT TOP BUDGET TELEMETRY BAR */}
      <BudgetTelemetryBar
        telemetry={telemetry}
        activeTab={activeTab}
        onResetToEmpty={handleResetToEmpty}
        onLoadDemoData={handleLoadDemoData}
        onSaveData={handleManualSave}
        onCopyShareLink={handleCopyShareLink}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onQuickPullSheets={handlePullFromSheets}
        isSyncingSheets={isSyncingSheets}
        lastSavedTime={lastSavedTime}
        feedbackBadge={feedbackBadge}
        personnelCount={personnel.length}
      />

      {/* 2. MODULAR MULTI-TAB WORKSPACE NAVIGATION */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        personnelCount={personnel.length}
        completedTasksCount={completedTasksCount}
      />

      {/* 3. ACTIVE TAB WORKSPACE CONTENT - MAXIMIZED FULL WIDTH */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'summary' && (
          <SummaryGuardrailTab
            budgetPool={budgetPool}
            onBudgetPoolChange={setBudgetPool}
            telemetry={telemetry}
            tiers={tiers}
            onUpdateTierFloor={handleUpdateTierFloor}
            personnel={personnel}
          />
        )}

        {activeTab === 'roster' && (
          <PersonnelRosterTab
            personnel={personnel}
            tiers={tiers}
            onUpdatePerson={handleUpdatePerson}
            onAddPerson={handleAddPerson}
            onDeletePerson={handleDeletePerson}
            onJumpToTaskLedger={handleJumpToTaskLedger}
            onResetToEmpty={handleResetToEmpty}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeTab === 'ledger' && (
          <TaskBountyLedgerTab
            personnel={personnel}
            tiers={tiers}
            telemetry={telemetry}
            activePersonId={activePersonId}
            onSelectPerson={setActivePersonId}
            onUpdatePerson={handleUpdatePerson}
          />
        )}

        {activeTab === 'payout' && (
          <SlipPayoutTab
            personnel={personnel}
            tiers={tiers}
            telemetry={telemetry}
          />
        )}
      </main>

      {/* 4. FOOTER LEDGER SPECIFICATION & SYSTEM STATUS */}
      <footer className="w-full border-t border-carbon bg-subtle mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row lg:items-center justify-between text-xs font-mono text-mutedText gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-carbon font-bold">
              <Terminal className="w-3.5 h-3.5 text-accent" />
              SWISS NEO-BRUTALIST FINANCIAL LEDGER
            </span>
            <span className="hidden md:inline">|</span>
            <span className="text-semantic-emerald font-bold">
              AUTO-SAVE & GOOGLE SHEETS CONNECTED ({lastSavedTime})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Google Sheets Modal Button */}
            <button
              onClick={() => setIsSheetsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-emerald-50 text-semantic-emerald hover:bg-emerald-100 active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Pengaturan & Sinkronisasi Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-semantic-emerald" />
              Google Sheets Sync
            </button>

            {/* Save Now Button */}
            <button
              onClick={handleManualSave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-white text-carbon hover:bg-subtle active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Simpan semua data sekarang"
            >
              <Save className="w-3.5 h-3.5 text-accent" />
              Simpan Data
            </button>

            {/* Export Backup JSON */}
            <button
              onClick={() => exportLedgerJsonFile(budgetPool, tiers, personnel)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-white text-carbon hover:bg-subtle active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Download file backup .JSON agar bisa dibuka di komputer manapun"
            >
              <Download className="w-3.5 h-3.5 text-carbon" />
              Backup .JSON
            </button>

            {/* Import Backup JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-white text-carbon hover:bg-subtle active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Muat file backup .JSON dari perangkat Anda"
            >
              <Upload className="w-3.5 h-3.5 text-accent" />
              Import .JSON
            </button>

            {/* Reset to Empty Button */}
            <button
              onClick={handleResetToEmpty}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-white text-semantic-crimson hover:bg-red-50 active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Kosongkan seluruh data menjadi 0"
            >
              <Trash2 className="w-3.5 h-3.5 text-semantic-crimson" />
              Reset Kosong (0)
            </button>

            {/* Load Demo Data Button */}
            <button
              onClick={handleLoadDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-carbon bg-white text-carbon hover:bg-subtle active:translate-x-[1px] active:translate-y-[1px] shadow-brutalist-sm hover:shadow-none transition-all cursor-pointer"
              title="Muat kembali data contoh demo awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-accent" />
              Muat Data Demo
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
