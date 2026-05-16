import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface TransactionQuery extends PaginationQuery {
  assetId?: string;
  from?: string;
  to?: string;
  type?: 'BUY' | 'SELL';
  sortBy?: 'purchasedAt' | 'amountUsd' | 'quantity' | 'pricePerUnit';
  sortOrder?: 'asc' | 'desc';
}
