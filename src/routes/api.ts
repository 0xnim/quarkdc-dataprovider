// src/routes/api.ts
import { Context, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { fetchAllStocks, fetchStockDetail } from "../services/stockService.ts";
import {
  getAllStocks,
  getCompanyMetadataByTicker,
  getShareholderHistorical,
  getStockByTicker,
  getStockHistoricalPrices,
  getStockWithMetadataByTicker,
  saveCompanyMetadata,
  saveStock,
  saveStockDetail,
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
      error: "Unauthorized. Valid API key required.",
    };
    return;
  }

  return next();
}

router.get("/", (ctx) => {
  ctx.response.body = {
    success: true,
    message: "API is now allowed for commercial use.",
  };
});

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
      message: `Fetched and stored ${stocks.length} stocks`,
    };
  } catch (error) {
    console.error("Error in fetch-stocks endpoint:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
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
      message: `Fetched and stored details for ${ticker}`,
    };
  } catch (error) {
    console.error(`Error in fetch-stock endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
    };
  }
});

// Route to get all stocks from our database
router.get("/api/stocks", async (ctx) => {
  try {
    const stocks = await getAllStocks();

    // Manually convert BigInt values to regular JavaScript numbers
    // and ensure sharePrice is a number not a string
    const safeStocks = stocks.map((stock) => ({
      ...stock,
      bookValue: stock.bookValue ? Number(stock.bookValue) : null,
      sharePrice: typeof stock.sharePrice === "string"
        ? parseFloat(stock.sharePrice)
        : stock.sharePrice,
    }));

    ctx.response.status = 200;
    ctx.response.body = safeStocks;
  } catch (error) {
    console.error("Error in get stocks endpoint:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
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
        error: `Stock with ticker ${ticker} not found`,
      };
      return;
    }

    // Convert BigInt values to regular JavaScript numbers
    // and ensure sharePrice is a number not a string
    const safeStock = {
      ...stock,
      bookValue: stock.bookValue ? Number(stock.bookValue) : null,
      sharePrice: typeof stock.sharePrice === "string"
        ? parseFloat(stock.sharePrice)
        : stock.sharePrice,
    };

    ctx.response.status = 200;
    ctx.response.body = safeStock;
  } catch (error) {
    console.error(`Error in get stock endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
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
    let endDate = url.searchParams.get("endDate") || undefined;

    // If endDate is provided, append T23:59:59 to include the entire day
    if (endDate && !endDate.includes("T")) {
      endDate = `${endDate}T23:59:59`;
    }

    const frequency = url.searchParams.get("frequency") || "hourly";
    const format = url.searchParams.get("format") || "default";

    // Validate frequency parameter
    const validFrequencies = [
      "minutely",
      "hourly",
      "daily",
      "weekly",
      "monthly",
    ];
    if (!validFrequencies.includes(frequency.toLowerCase())) {
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: `Invalid frequency parameter. Valid options are: ${
          validFrequencies.join(", ")
        }`,
      };
      return;
    }

    // Get the data in EST timezone with specified frequency
    const historicalPrices = await getStockHistoricalPrices(
      ticker,
      startDate,
      endDate,
      frequency,
    );

    // Return data in standard format if requested
    if (format === "standard") {
      // Convert historical prices to standard format
      // Since we don't have OHLCV data in our model, we'll use sharePrice for all price fields
      const standardData = {
        ticker: ticker,
        start_date: startDate || "",
        end_date: endDate || "",
        frequency: frequency,
        data: historicalPrices.map((price) => {
          const priceValue = typeof price.sharePrice === "string"
            ? parseFloat(price.sharePrice)
            : price.sharePrice;

          // Format date based on frequency
          const dateObj = new Date(price.timestamp);
          let formattedDate;

          if (
            frequency.toLowerCase() === "daily" ||
            frequency.toLowerCase() === "weekly" ||
            frequency.toLowerCase() === "monthly"
          ) {
            // For daily or above frequencies, use date-only format (YYYY-MM-DD)
            formattedDate = dateObj.toISOString().split("T")[0];
          } else {
            // For hourly or minutely, include the time (YYYY-MM-DD HH:MM:SS)
            formattedDate = dateObj.toISOString().replace("T", " ").substring(
              0,
              19,
            );
          }

          return {
            date: formattedDate,
            open: priceValue,
            high: priceValue,
            low: priceValue,
            close: priceValue,
            adjusted_close: priceValue,
            volume: 0, // We don't have volume data in our current schema
          };
        }),
      };

      ctx.response.status = 200;
      ctx.response.body = standardData;
      return;
    }

    // Default format - Format timestamps based on frequency and ensure sharePrice is a number
    const formattedPrices = historicalPrices.map((price) => {
      const dateObj = new Date(price.timestamp);

      // The timestamp from DB is already in EST, simply format it
      let formattedTimestamp;
      if (
        frequency.toLowerCase() === "daily" ||
        frequency.toLowerCase() === "weekly" ||
        frequency.toLowerCase() === "monthly"
      ) {
        // For daily or above frequencies, use date-only format
        // Format: YYYY-MM-DD EST
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        formattedTimestamp = `${year}-${month}-${day} EST`;
      } else {
        // For hourly or minutely, include the time
        // Format: YYYY-MM-DD HH:MM:SS EST
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        const seconds = String(dateObj.getSeconds()).padStart(2, "0");
        formattedTimestamp =
          `${year}-${month}-${day} ${hours}:${minutes}:${seconds} EST`;
      }

      return {
        ...price,
        sharePrice: typeof price.sharePrice === "string"
          ? parseFloat(price.sharePrice)
          : price.sharePrice,
        timestamp: formattedTimestamp,
      };
    });

    ctx.response.status = 200;
    ctx.response.body = formattedPrices;
  } catch (error) {
    console.error(`Error in get historical prices endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
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
    const accountId = url.searchParams.get("accountId")
      ? parseInt(url.searchParams.get("accountId")!)
      : undefined;
    const startDate = url.searchParams.get("startDate") || undefined;
    let endDate = url.searchParams.get("endDate") || undefined;

    // If endDate is provided, append T23:59:59 to include the entire day
    if (endDate && !endDate.includes("T")) {
      endDate = `${endDate}T23:59:59`;
    }

    const shareholders = await getShareholderHistorical(
      ticker,
      accountId,
      startDate,
      endDate,
    );

    // Ensure timestamps are formatted as EST times in response
    const formattedShareholders = shareholders.map((shareholder) => ({
      ...shareholder,
      timestamp: new Date(shareholder.timestamp).toLocaleString("en-US", {
        timeZone: "America/New_York",
      }) + " EST",
    }));

    ctx.response.status = 200;
    ctx.response.body = formattedShareholders;
  } catch (error) {
    console.error(`Error in get shareholders endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
    };
  }
});

// Route to get company metadata
router.get("/api/stock/:ticker/metadata", async (ctx) => {
  try {
    const { ticker } = ctx.params;
    if (!ticker) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "Ticker is required" };
      return;
    }

    const metadata = await getCompanyMetadataByTicker(ticker);

    if (!metadata) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Metadata for stock with ticker ${ticker} not found`,
      };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = metadata;
  } catch (error) {
    console.error(`Error in get company metadata endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
    };
  }
});

// Route to get stock with metadata
router.get("/api/stock/:ticker/full", async (ctx) => {
  try {
    const { ticker } = ctx.params;
    if (!ticker) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, error: "Ticker is required" };
      return;
    }

    const stockWithMetadata = await getStockWithMetadataByTicker(ticker);

    if (!stockWithMetadata) {
      ctx.response.status = 404;
      ctx.response.body = {
        success: false,
        error: `Stock with ticker ${ticker} not found`,
      };
      return;
    }

    // Convert BigInt values to regular JavaScript numbers
    // and ensure sharePrice is a number not a string
    const safeStock = {
      ...stockWithMetadata,
      bookValue: stockWithMetadata.bookValue
        ? Number(stockWithMetadata.bookValue)
        : null,
      sharePrice: typeof stockWithMetadata.sharePrice === "string"
        ? parseFloat(stockWithMetadata.sharePrice)
        : stockWithMetadata.sharePrice,
    };

    ctx.response.status = 200;
    ctx.response.body = safeStock;
  } catch (error) {
    console.error(`Error in get stock with metadata endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
    };
  }
});

// Route to save or update company metadata - ADMIN ONLY
router.post("/api/stock/:ticker/metadata", requireApiKey, async (ctx) => {
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
        error: `Stock with ticker ${ticker} not found`,
      };
      return;
    }

    const requestBody = await ctx.request.body().value;

    // Create metadata object from request
    const metadata: Omit<CompanyMetadata, "id" | "lastUpdatedAt"> = {
      stockId: stock.id,
      ticker: stock.ticker,
      ceo: requestBody.ceo || null,
      sector: requestBody.sector || null,
      industry: requestBody.industry || null,
      employees: requestBody.employees || null,
      founded: requestBody.founded || null,
      website: requestBody.website || null,
      description: requestBody.description || null,
      headquarters: requestBody.headquarters || null,
    };

    await saveCompanyMetadata(metadata as CompanyMetadata);

    ctx.response.status = 200;
    ctx.response.body = {
      success: true,
      message: `Updated metadata for ${ticker}`,
    };
  } catch (error) {
    console.error(`Error in save company metadata endpoint:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message,
    };
  }
});

export default router;
