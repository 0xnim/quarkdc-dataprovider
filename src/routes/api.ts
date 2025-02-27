// src/routes/api.ts
import { Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { fetchAllStocks, fetchStockDetail } from "../services/stockService.ts";
import {
    saveStock,
    saveStockDetail,
    getAllStocks,
    getStockByTicker,
    getStockHistoricalPrices,
    getShareholderHistorical
} from "../services/dbService.ts";

const router = new Router();

// API key middleware to protect sensitive endpoints
function requireApiKey(ctx: Context, next: () => Promise<unknown>) {
    const apiKey = ctx.request.headers.get("X-API-Key");
    const validApiKey = Deno.env.get("ADMIN_API_KEY");
    
    if (!apiKey || apiKey !== validApiKey) {
        ctx.response.status = 403;
        ctx.response.body = {
            success: false,
            error: "Unauthorized. Valid API key required."
        };
        return;
    }
    
    return next();
}

// Route to fetch and store all stocks - ADMIN ONLY
router.post("/api/fetch-stocks", requireApiKey, async (ctx) => {
    try {
        const stocks = await fetchAllStocks();

        // Save each stock to the database
        for (const stock of stocks) {
            await saveStock(stock);
        }

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: `Fetched and stored ${stocks.length} stocks`
        };
    } catch (error) {
        console.error("Error in fetch-stocks endpoint:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

// Route to fetch and store a specific stock with shareholders - ADMIN ONLY
router.post("/api/fetch-stock/:ticker", requireApiKey, async (ctx) => {
    try {
        const { ticker } = ctx.params;
        if (!ticker) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Ticker is required" };
            return;
        }

        const stockDetail = await fetchStockDetail(ticker);
        await saveStockDetail(stockDetail);

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: `Fetched and stored details for ${ticker}`
        };
    } catch (error) {
        console.error(`Error in fetch-stock endpoint:`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

// Route to get all stocks from our database
router.get("/api/stocks", async (ctx) => {
    try {
        const stocks = await getAllStocks();

        ctx.response.status = 200;
        ctx.response.body = stocks;
    } catch (error) {
        console.error("Error in get stocks endpoint:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

// Route to get a specific stock by ticker
router.get("/api/stock/:ticker", async (ctx) => {
    try {
        const { ticker } = ctx.params;
        if (!ticker) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Ticker is required" };
            return;
        }

        const stock = await getStockByTicker(ticker);

        if (!stock) {
            ctx.response.status = 404;
            ctx.response.body = {
                success: false,
                error: `Stock with ticker ${ticker} not found`
            };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = stock;
    } catch (error) {
        console.error(`Error in get stock endpoint:`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

// Route to get historical prices for a stock
router.get("/api/stock/:ticker/historical", async (ctx) => {
    try {
        const { ticker } = ctx.params;
        if (!ticker) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Ticker is required" };
            return;
        }

        const url = new URL(ctx.request.url);
        const startDate = url.searchParams.get("startDate") || undefined;
        const endDate = url.searchParams.get("endDate") || undefined;

        // Get the data in EST timezone
        const historicalPrices = await getStockHistoricalPrices(ticker, startDate, endDate);
        
        // Ensure timestamps are formatted as EST times in response
        const formattedPrices = historicalPrices.map(price => ({
            ...price,
            timestamp: new Date(price.timestamp).toLocaleString("en-US", {
                timeZone: "America/New_York"
            }) + " EST"
        }));

        ctx.response.status = 200;
        ctx.response.body = formattedPrices;
    } catch (error) {
        console.error(`Error in get historical prices endpoint:`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

// Route to get historical shareholders data
router.get("/api/stock/:ticker/shareholders", async (ctx) => {
    try {
        const { ticker } = ctx.params;
        if (!ticker) {
            ctx.response.status = 400;
            ctx.response.body = { success: false, error: "Ticker is required" };
            return;
        }

        const url = new URL(ctx.request.url);
        const accountId = url.searchParams.get("accountId") ?
            parseInt(url.searchParams.get("accountId")!) : undefined;
        const startDate = url.searchParams.get("startDate") || undefined;
        const endDate = url.searchParams.get("endDate") || undefined;

        const shareholders = await getShareholderHistorical(
            ticker,
            accountId,
            startDate,
            endDate
        );

        // Ensure timestamps are formatted as EST times in response
        const formattedShareholders = shareholders.map(shareholder => ({
            ...shareholder,
            timestamp: new Date(shareholder.timestamp).toLocaleString("en-US", {
                timeZone: "America/New_York"
            }) + " EST"
        }));

        ctx.response.status = 200;
        ctx.response.body = formattedShareholders;
    } catch (error) {
        console.error(`Error in get shareholders endpoint:`, error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: error.message
        };
    }
});

export default router;
