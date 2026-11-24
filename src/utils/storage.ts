import { TierConfig, Personnel } from '../types';

export interface PersistedLedgerState {
  version: number;
  updatedAt: string;
  budgetPool: number;
  tiers: TierConfig[];
  personnel: Personnel[];
}

const STORAGE_KEY = 'RATE_CALCULATOR_LEDGER_STATE_V2';
const URL_HASH_PREFIX = '#ledger=';

function isValidLedgerState(data: any): data is PersistedLedgerState {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.budgetPool === 'number' &&
    Array.isArray(data.tiers) &&
    Array.isArray(data.personnel)
  );
}

/**
 * Load synchronously from URL Hash (#ledger=...) if present, or from localStorage
 */
export function loadInitialLocalState(): PersistedLedgerState | null {
  // 1. Check URL Hash first (allows opening shared link anywhere)
  try {
    if (typeof window !== 'undefined' && window.location.hash.startsWith(URL_HASH_PREFIX)) {
      const encoded = window.location.hash.slice(URL_HASH_PREFIX.length);
      const jsonStr = decodeURIComponent(escape(window.atob(encoded)));
      const parsed = JSON.parse(jsonStr);
      if (isValidLedgerState(parsed)) {
        // Also persist to localStorage so subsequent refreshes keep it
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca state dari URL hash:', e);
  }

  // 2. Check Browser LocalStorage
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidLedgerState(parsed)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Gagal membaca state dari localStorage:', e);
  }

  return null;
}

/**
 * Load state from disk API (/api/ledger-state) if available
 */
export async function fetchDiskState(): Promise<PersistedLedgerState | null> {
  try {
    const res = await fetch('/api/ledger-state', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (isValidLedgerState(data)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save state to Browser LocalStorage + Server Disk File (/api/ledger-state)
 */
export async function saveFullLedgerState(
  budgetPool: number,
  tiers: TierConfig[],
  personnel: Personnel[]
): Promise<PersistedLedgerState> {
  const payload: PersistedLedgerState = {
    version: 2,
    updatedAt: new Date().toISOString(),
    budgetPool,
    tiers,
    personnel,
  };

  // 1. Save to localStorage immediately
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }

  // 2. Save to local disk file via Vite server middleware
  try {
    await fetch('/api/ledger-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore if running in static hosting without dev server middleware
  }

  return payload;
}

/**
 * Encode state into a portable URL that can be opened in any browser or device
 */
export function generateShareableUrl(
  budgetPool: number,
  tiers: TierConfig[],
  personnel: Personnel[]
): string {
  const payload: PersistedLedgerState = {
    version: 2,
    updatedAt: new Date().toISOString(),
    budgetPool,
    tiers,
    personnel,
  };
  const jsonStr = JSON.stringify(payload);
  const encoded = window.btoa(unescape(encodeURIComponent(jsonStr)));
  const baseUrl = window.location.origin + window.location.pathname;
  // Also update current URL hash silently so bookmarking works
  window.history.replaceState(null, '', `${URL_HASH_PREFIX}${encoded}`);
  return `${baseUrl}${URL_HASH_PREFIX}${encoded}`;
}

/**
 * Export full ledger state as a downloadable .json file
 */
export function exportLedgerJsonFile(
  budgetPool: number,
  tiers: TierConfig[],
  personnel: Personnel[]
): void {
  const payload: PersistedLedgerState = {
    version: 2,
    updatedAt: new Date().toISOString(),
    budgetPool,
    tiers,
    personnel,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Payroll_Bounty_Data_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported .json file
 */
export function parseImportedJsonFile(rawText: string): PersistedLedgerState | null {
  try {
    const parsed = JSON.parse(rawText);
    if (isValidLedgerState(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
