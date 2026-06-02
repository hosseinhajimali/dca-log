export type AssetType = 'CRYPTO' | 'METAL' | 'STOCK' | 'ETF' | 'OTHER';
export type TransactionType = 'BUY' | 'SELL';
export type DcaFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string;
  avatar?: string | null;
  theme: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  coingeckoId?: string;
  color?: string | null;
  athOverride?: number | null;
  createdAt: string;
}

export interface SellRule {
  id: string;
  dcaPlanId: string;
  minProfit: number;
  maxProfit: number;
  sellAmount: number;
  sellAmountType: 'USD' | 'PCT';
  createdAt: string;
}

export interface BuyingRule {
  id: string;
  dcaPlanId: string;
  minDrawdown: number;  // e.g. 20  (positive %)
  maxDrawdown: number;  // e.g. 40
  buyAmount: number;    // USD
  createdAt: string;
}

export interface PlanAllocation {
  id: string;
  planId: string;
  assetId: string;
  asset: Asset;
  allocationPct: number; // 0–100, sums to 100 per plan
}

export interface SuggestedAllocation {
  assetId: string;
  symbol: string;
  color?: string | null;
  allocationPct: number;
  amount: number; // USD portion for this asset
  drawdownPct?: number | null; // only present when perAssetRules=true
}

export interface DcaPlan {
  id: string;
  userId: string;
  name?: string;
  amountUsd: number;
  frequency: DcaFrequency;
  intervalDays?: number;
  isActive: boolean;
  perAssetRules: boolean;   // false = weighted-group method; true = per-asset method
  startDate: string;
  endDate?: string | null;
  nextPurchaseDate?: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  allocations: PlanAllocation[];          // assets + their % shares
  buyingRules: BuyingRule[];
  sellRules: SellRule[];
  drawdownFromAth: number | null;         // weighted average, negative = below ATH
  suggestedAmount: number;               // total suggested buy
  suggestedAllocations: SuggestedAllocation[]; // per-asset breakdown
}

export interface Transaction {
  id: string;
  userId: string;
  assetId: string;
  asset: Asset;
  dcaPlanId?: string;
  dcaPlan?: { id: string; name?: string } | null;
  type: TransactionType;
  amountUsd: number;
  quantity: number;
  pricePerUnit: number;
  purchasedAt: string;
  exchange?: string;
  notes?: string;
  createdAt: string;
}

export interface PriceCache {
  symbol: string;
  priceUsd: number;
  change24h?: number;
  fetchedAt: string;
}

export interface AssetStats {
  asset: Asset;
  totalInvested: number;
  totalQuantity: number;
  avgCost: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  txCount: number;
  ath: number | null;
  drawdownFromAth: number | null; // 0 = at ATH, negative = below ATH, null = no data
}

export interface ActivePlanSummary {
  id:                   string;
  name:                 string | null;
  amountUsd:            number;
  suggestedAmount:      number;
  suggestedAllocations: { symbol: string; color: string | null; allocationPct: number; amount: number }[];
  suggestedSellAmount:  number | null;
  frequency:            string;
  nextPurchaseDate:     string | null;
  allocations: {
    allocationPct: number;
    asset: { symbol: string; color: string | null };
  }[];
}

export interface DashboardStats {
  portfolio: {
    totalInvested: number;
    totalCurrentValue: number;
    totalPnl: number;
    totalPnlPercent: number;
  };
  assetStats: AssetStats[];
  activePlans: number;
  activePlanList: ActivePlanSummary[];
  monthlyData: { month: string; invested: number }[];
  lastUpdated: string;
}

export type GoalType = 'ACCUMULATION' | 'PORTFOLIO_VALUE' | 'INVESTMENT_COMMITMENT';

export interface Goal {
  id:                  string;
  type:                GoalType;
  name:                string;
  notes:               string | null;
  startDate:           string | null;
  deadline:            string | null;
  daysUntil:           number | null;
  isCompleted:         boolean;
  createdAt:           string;
  asset:               { id: string; symbol: string; name: string; color: string | null } | null;
  targetQty:           number | null;
  targetValue:         number | null;
  targetMonthlyAmount: number | null;
  currentValue:        number | null;
  progressPct:         number | null;
  monthlyHistory:      { month: string; invested: number }[] | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  meta?: { total: number; page: number; limit: number };
}

export interface AuthResponse {
  user: User;
  token: string;
}
