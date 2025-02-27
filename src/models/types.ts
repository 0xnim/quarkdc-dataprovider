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
    sharePrice: string;
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
    sharePrice: string;
    timestamp: string;
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
