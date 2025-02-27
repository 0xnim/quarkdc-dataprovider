// src/models/types.ts
export interface Stock {
  id: number;
  ticker: string;
  companyName: string;
  logo: string | null;
  outstandingShares: number;
  frozen: boolean;
  delisted: boolean;
  stockType: string;
  bookValue: number;
  dividendPerShare: number | null;
  dividendPeriod: string | null;
  createdAt: string;
  updatedAt: string;
  sharePrice: number;
}

export interface Shareholder {
  username: string;
  shares: number;
  accountId: number;
}

export interface StockDetail extends Stock {
  shareholders: Shareholder[];
}

export interface StockHistorical {
  id: number;
  stockId: number;
  ticker: string;
  sharePrice: number;
  timestamp: string;
}

export interface StandardPriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
}

export interface StandardDatafeed {
  ticker: string;
  start_date: string;
  end_date: string;
  frequency: string;
  data: StandardPriceData[];
}

export interface ShareholderHistorical {
  id: number;
  stockId: number;
  ticker: string;
  username: string;
  accountId: number;
  shares: number;
  timestamp: string;
}
