export type AssetType = 'CRYPTO' | 'METAL' | 'STOCK' | 'ETF' | 'OTHER';
export type TransactionType = 'BUY' | 'SELL';
export type DcaFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';
export type RuleStrategyType = 'DRAWDOWN_ATH';

// ─── Rule Sets ────────────────────────────────────────────────────────────────

export interface BuyingRuleSetRow {
  id: string;
  ruleSetId: string;
  params: Record<string, unknown>; // e.g. { minDrawdown: 20, maxDrawdown: 40 }
  multiplier: number;              // buy = multiplier × plan.amountUsd
  sortOrder: number;
  createdAt: string;
}

export interface BuyingRuleSet {
  id: string;
  userId: string;
  label: string;
  strategyType: RuleStrategyType;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  rows: BuyingRuleSetRow[];
}

export interface SellRuleSetRow {
  id: string;
  ruleSetId: string;
  params: Record<string, unknown>; // e.g. { minProfit: 10, maxProfit: 25 }
  sellAmount: number;
  sellAmountType: 'USD' | 'PCT';
  sortOrder: number;
  createdAt: string;
}

export interface SellRuleSet {
  id: string;
  userId: string;
  label: string;
  strategyType: RuleStrategyType;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  rows: SellRuleSetRow[];
}

export interface PlanBuyingRuleSet {
  id: string;
  planId: string;
  ruleSetId: string;
  isActive: boolean;
  ruleSet: BuyingRuleSet;
}

export interface PlanSellRuleSet {
  id: string;
  planId: string;
  ruleSetId: string;
  isActive: boolean;
  ruleSet: SellRuleSet;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string;
  avatar?: string | null;
  theme: string;
  isAdmin: boolean;
  monthlyDisposableIncome?: number | null;
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
  drawdownPct?: number | null;
  multiplier?: number;
  amount: number;
}

export interface AssetDrawdown {
  assetId: string;
  symbol: string;
  color?: string | null;
  allocationPct: number;
  drawdownPct: number | null;
}

export interface DcaPlan {
  id: string;
  userId: string;
  name?: string;
  amountUsd: number;
  minBudgetUsd?: number | null;
  maxBudgetUsd?: number | null;
  frequency: DcaFrequency;
  intervalDays?: number;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  nextPurchaseDate?: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  allocations: PlanAllocation[];
  planBuyingRuleSets: PlanBuyingRuleSet[];
  planSellRuleSets: PlanSellRuleSet[];
  drawdownFromAth: number | null;
  suggestedAmount: number;
  suggestedAllocations: SuggestedAllocation[];
  assetDrawdowns: AssetDrawdown[];
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
