// src/services/stockService.ts
import { Stock, StockDetail } from "../models/types.ts";

const API_BASE_URL = "https://theexchange.apps.vertilehosting.com";

export async function fetchAllStocks(): Promise<Stock[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/stocks`);

        if (!response.ok) {
            throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.stocks as Stock[];
    } catch (error) {
        console.error("Error fetching stocks:", error);
        throw error;
    }
}

export async function fetchStockDetail(ticker: string): Promise<StockDetail> {
    try {
        const response = await fetch(`${API_BASE_URL}/stock/${ticker}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch stock detail: ${response.status} ${response.statusText}`);
        }

        return await response.json() as StockDetail;
    } catch (error) {
        console.error(`Error fetching stock detail for ${ticker}:`, error);
        throw error;
    }
}
