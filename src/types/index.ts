export type TierId = 'TIER_01' | 'TIER_02' | 'TIER_03';

export interface TierConfig {
  id: TierId;
  code: string;
  name: string;
  badgeLabel: string;
  roleScope: string;
  defaultFloor: number;
  currentFloor: number;
  weight: number;
  description: string;
}

export type TaskStatus = 'SELESAI' | 'PROSES';

export interface TaskItem {
  id: string;
  title: string;
  category: 'MARKETING' | 'DESIGN' | 'DEVELOPMENT' | 'OPERATIONS' | 'CONTENT';
  unitPrice: number; // in IDR
  quantity: number;
  status: TaskStatus;
  createdAt: string;
}

export interface Personnel {
  id: string;
  name: string;
  roleTitle: string;
  tierId: TierId;
  isLocked: boolean;
  baseSalary: number; // in IDR
  tasks: TaskItem[];
}

export interface BudgetTelemetry {
  budgetPool: number;
  totalBasePayroll: number;
  totalCompletedBounties: number;
  totalPendingBounties: number;
  grandTotalAllocation: number;
  surplusDeficit: number;
  burnRatePercentage: number;
  isDeficit: boolean;
  basePayrollPercentage: number;
  bountyPercentage: number;
  surplusPercentage: number;
}

export interface PresetRate {
  id: string;
  title: string;
  category: TaskItem['category'];
  price: number;
  description: string;
}
