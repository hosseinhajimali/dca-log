export type AssetType = 'CRYPTO' | 'METAL' | 'STOCK' | 'ETF' | 'OTHER';
export type DcaFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

export interface User {
  id: string;
  email: string;
  name?: string;
  currency: string;
  avatar?: string | null;
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

export interface DcaPlan {
  id: string;
  userId: string;
  assetId: string;
  asset: Asset;
  name?: string;
  amountUsd: number;
  frequency: DcaFrequency;
  intervalDays?: number;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  nextPurchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  buyingRules: BuyingRule[];
  drawdownFromAth: number | null;   // computed by server, negative = below ATH
  suggestedAmount: number;          // computed by server based on active rules
}

export interface Transaction {
  id: string;
  userId: string;
  assetId: string;
  asset: Asset;
  dcaPlanId?: string;
  dcaPlan?: { id: string; name?: string } | null;
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

export interface DashboardStats {
  portfolio: {
    totalInvested: number;
    totalCurrentValue: number;
    totalPnl: number;
    totalPnlPercent: number;
  };
  assetStats: AssetStats[];
  activePlans: number;
  monthlyData: { month: string; invested: number }[];
  lastUpdated: string;
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
