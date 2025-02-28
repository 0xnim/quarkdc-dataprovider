// src/services/dbService.ts
import { executeQuery } from "../db/client.ts";
import {
  CompanyMetadata,
  ShareholderHistorical,
  Stock,
  StockDetail,
  StockHistorical,
  StockWithMetadata,
} from "../models/types.ts";

export async function saveStock(stock: Stock): Promise<void> {
  const existingStock = await executeQuery<{ id: number }>(
    "SELECT id FROM stocks WHERE id = $1",
    [stock.id],
  );

  const sharePrice = parseFloat(stock.sharePrice);

  if (existingStock.length === 0) {
    // Insert new stock
    await executeQuery(
      `INSERT INTO stocks (
        id, ticker, company_name, logo, outstanding_shares, frozen, delisted, 
        stock_type, book_value, dividend_per_share, dividend_period, 
        created_at, updated_at, latest_share_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        stock.id,
        stock.ticker,
        stock.companyName,
        stock.logo,
        stock.outstandingShares,
        stock.frozen,
        stock.delisted,
        stock.stockType,
        stock.bookValue,
        stock.dividendPerShare,
        stock.dividendPeriod,
        new Date(stock.createdAt),
        new Date(stock.updatedAt),
        sharePrice,
      ],
    );
  } else {
    // Update existing stock
    await executeQuery(
      `UPDATE stocks SET 
        ticker = $2, company_name = $3, logo = $4, outstanding_shares = $5,
        frozen = $6, delisted = $7, stock_type = $8, book_value = $9,
        dividend_per_share = $10, dividend_period = $11, created_at = $12,
        updated_at = $13, latest_share_price = $14, last_updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
      [
        stock.id,
        stock.ticker,
        stock.companyName,
        stock.logo,
        stock.outstandingShares,
        stock.frozen,
        stock.delisted,
        stock.stockType,
        stock.bookValue,
        stock.dividendPerShare,
        stock.dividendPeriod,
        new Date(stock.createdAt),
        new Date(stock.updatedAt),
        sharePrice,
      ],
    );
  }

  // Save historical price data
  await executeQuery(
    `INSERT INTO stock_historical (stock_id, ticker, share_price, recorded_at) 
     VALUES ($1, $2, $3, timezone('America/New_York', CURRENT_TIMESTAMP))
     ON CONFLICT (stock_id, recorded_at) DO NOTHING`,
    [stock.id, stock.ticker, sharePrice],
  );
}

export async function saveStockDetail(stockDetail: StockDetail): Promise<void> {
  // First save the stock basic info
  await saveStock(stockDetail);

  // Then save shareholders data
  for (const shareholder of stockDetail.shareholders) {
    await executeQuery(
      `INSERT INTO shareholders (stock_id, ticker, username, account_id, shares, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, timezone('America/New_York', CURRENT_TIMESTAMP))
       ON CONFLICT (stock_id, account_id, recorded_at) DO NOTHING`,
      [
        stockDetail.id,
        stockDetail.ticker,
        shareholder.username,
        shareholder.accountId,
        shareholder.shares,
      ],
    );
  }
}

export async function getStockHistoricalPrices(
  ticker: string,
  startDate?: string,
  endDate?: string,
  frequency: string = "hourly",
): Promise<StockHistorical[]> {
  let baseQuery = `
    SELECT sh.id, sh.stock_id as "stockId", sh.ticker, sh.share_price as "sharePrice", 
           sh.recorded_at as "timestamp"
    FROM stock_historical sh
    JOIN stocks s ON sh.stock_id = s.id
    WHERE s.ticker = $1
  `;

  const params: (string | number)[] = [ticker];
  let paramIndex = 2;

  if (startDate) {
    baseQuery +=
      ` AND sh.recorded_at >= timezone('America/New_York', $${paramIndex}::timestamp)`;
    params.push(startDate);
    paramIndex++;

    if (endDate) {
      baseQuery +=
        ` AND sh.recorded_at <= timezone('America/New_York', $${paramIndex}::timestamp)`;
      params.push(endDate);
      paramIndex++;
    }
  }

  let query = "";

  // Apply frequency filtering
  switch (frequency.toLowerCase()) {
    case "minutely":
      // Return all data points (no grouping)
      query = baseQuery;
      break;
    case "hourly":
      // Group by hour using proper aggregation
      query = `
                SELECT 
                    MIN(sh.id) as id, 
                    sh.stock_id as "stockId", 
                    sh.ticker, 
                    MIN(sh.share_price) as "sharePrice",
                    DATE_TRUNC('hour', sh.recorded_at) as "timestamp"
                FROM stock_historical sh
                JOIN stocks s ON sh.stock_id = s.id
                WHERE s.ticker = $1
            `;

      if (startDate) {
        query += ` AND sh.recorded_at >= timezone('America/New_York', $${
          paramIndex - (endDate ? 2 : 1)
        }::timestamp)`;

        if (endDate) {
          query += ` AND sh.recorded_at <= timezone('America/New_York', $${
            paramIndex - 1
          }::timestamp)`;
        }
      }

      query +=
        ` GROUP BY sh.stock_id, sh.ticker, DATE_TRUNC('hour', sh.recorded_at)`;
      break;
    case "daily":
      // Group by day using proper aggregation
      query = `
                SELECT 
                    MIN(sh.id) as id, 
                    sh.stock_id as "stockId", 
                    sh.ticker, 
                    MIN(sh.share_price) as "sharePrice",
                    DATE_TRUNC('day', sh.recorded_at) as "timestamp"
                FROM stock_historical sh
                JOIN stocks s ON sh.stock_id = s.id
                WHERE s.ticker = $1
            `;

      if (startDate) {
        query += ` AND sh.recorded_at >= timezone('America/New_York', $${
          paramIndex - (endDate ? 2 : 1)
        }::timestamp)`;

        if (endDate) {
          query += ` AND sh.recorded_at <= timezone('America/New_York', $${
            paramIndex - 1
          }::timestamp)`;
        }
      }

      query +=
        ` GROUP BY sh.stock_id, sh.ticker, DATE_TRUNC('day', sh.recorded_at)`;
      break;
    case "weekly":
      // Group by week using proper aggregation
      query = `
                SELECT 
                    MIN(sh.id) as id, 
                    sh.stock_id as "stockId", 
                    sh.ticker, 
                    MIN(sh.share_price) as "sharePrice",
                    DATE_TRUNC('week', sh.recorded_at) as "timestamp"
                FROM stock_historical sh
                JOIN stocks s ON sh.stock_id = s.id
                WHERE s.ticker = $1
            `;

      if (startDate) {
        query += ` AND sh.recorded_at >= timezone('America/New_York', $${
          paramIndex - (endDate ? 2 : 1)
        }::timestamp)`;

        if (endDate) {
          query += ` AND sh.recorded_at <= timezone('America/New_York', $${
            paramIndex - 1
          }::timestamp)`;
        }
      }

      query +=
        ` GROUP BY sh.stock_id, sh.ticker, DATE_TRUNC('week', sh.recorded_at)`;
      break;
    case "monthly":
      // Group by month using proper aggregation
      query = `
                SELECT 
                    MIN(sh.id) as id, 
                    sh.stock_id as "stockId", 
                    sh.ticker, 
                    MIN(sh.share_price) as "sharePrice",
                    DATE_TRUNC('month', sh.recorded_at) as "timestamp"
                FROM stock_historical sh
                JOIN stocks s ON sh.stock_id = s.id
                WHERE s.ticker = $1
            `;

      if (startDate) {
        query += ` AND sh.recorded_at >= timezone('America/New_York', $${
          paramIndex - (endDate ? 2 : 1)
        }::timestamp)`;

        if (endDate) {
          query += ` AND sh.recorded_at <= timezone('America/New_York', $${
            paramIndex - 1
          }::timestamp)`;
        }
      }

      query +=
        ` GROUP BY sh.stock_id, sh.ticker, DATE_TRUNC('month', sh.recorded_at)`;
      break;
    default:
      // Default to hourly if frequency is not recognized
      query = baseQuery;
  }

  query += ' ORDER BY "timestamp" DESC';

  return await executeQuery<StockHistorical>(query, params);
}

export async function getShareholderHistorical(
  ticker: string,
  accountId?: number,
  startDate?: string,
  endDate?: string,
): Promise<ShareholderHistorical[]> {
  let query = `
    SELECT sh.id, sh.stock_id as "stockId", sh.ticker, sh.username, 
           sh.account_id as "accountId", sh.shares, sh.recorded_at as "timestamp"
    FROM shareholders sh
    JOIN stocks s ON sh.stock_id = s.id
    WHERE s.ticker = $1
  `;

  const params: (string | number)[] = [ticker];
  let paramIndex = 2;

  if (accountId) {
    query += ` AND sh.account_id = $${paramIndex}`;
    params.push(accountId);
    paramIndex++;
  }

  if (startDate) {
    query +=
      ` AND sh.recorded_at >= timezone('America/New_York', $${paramIndex}::timestamp)`;
    params.push(startDate);
    paramIndex++;

    if (endDate) {
      query +=
        ` AND sh.recorded_at <= timezone('America/New_York', $${paramIndex}::timestamp)`;
      params.push(endDate);
    }
  }

  query += " ORDER BY sh.recorded_at DESC";

  return await executeQuery<ShareholderHistorical>(query, params);
}

export async function getAllStocks(): Promise<Stock[]> {
  return await executeQuery<Stock>(`
    SELECT 
      id, ticker, company_name as "companyName", logo, outstanding_shares as "outstandingShares",
      frozen, delisted, stock_type as "stockType", book_value as "bookValue", 
      dividend_per_share as "dividendPerShare", dividend_period as "dividendPeriod",
      created_at as "createdAt", updated_at as "updatedAt", 
      latest_share_price as "sharePrice"
    FROM stocks
    ORDER BY ticker
  `);
}

export async function getStockByTicker(ticker: string): Promise<Stock | null> {
  const stocks = await executeQuery<Stock>(
    `
    SELECT 
      id, ticker, company_name as "companyName", logo, outstanding_shares as "outstandingShares",
      frozen, delisted, stock_type as "stockType", book_value as "bookValue", 
      dividend_per_share as "dividendPerShare", dividend_period as "dividendPeriod",
      created_at as "createdAt", updated_at as "updatedAt", 
      latest_share_price as "sharePrice"
    FROM stocks
    WHERE ticker = $1
  `,
    [ticker],
  );

  return stocks.length > 0 ? stocks[0] : null;
}

export async function getLastStockHistoricalEntryTime(): Promise<Date | null> {
  const result = await executeQuery<{ max_time: Date }>(`
    SELECT MAX(recorded_at AT TIME ZONE 'America/New_York') as max_time
    FROM stock_historical
  `);

  return result.length > 0 && result[0].max_time ? result[0].max_time : null;
}

export async function saveCompanyMetadata(
  metadata: CompanyMetadata,
): Promise<void> {
  const existingMetadata = await executeQuery<{ id: number }>(
    "SELECT id FROM company_metadata WHERE stock_id = $1",
    [metadata.stockId],
  );

  if (existingMetadata.length === 0) {
    // Insert new metadata
    await executeQuery(
      `INSERT INTO company_metadata (
        stock_id, ticker, ceo, sector, industry, employees, 
        founded, website, description, headquarters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        metadata.stockId,
        metadata.ticker,
        metadata.ceo,
        metadata.sector,
        metadata.industry,
        metadata.employees,
        metadata.founded,
        metadata.website,
        metadata.description,
        metadata.headquarters,
      ],
    );
  } else {
    // Update existing metadata
    await executeQuery(
      `UPDATE company_metadata SET 
        ticker = $2, ceo = $3, sector = $4, industry = $5, employees = $6,
        founded = $7, website = $8, description = $9, headquarters = $10,
        last_updated_at = timezone('America/New_York', CURRENT_TIMESTAMP)
      WHERE stock_id = $1`,
      [
        metadata.stockId,
        metadata.ticker,
        metadata.ceo,
        metadata.sector,
        metadata.industry,
        metadata.employees,
        metadata.founded,
        metadata.website,
        metadata.description,
        metadata.headquarters,
      ],
    );
  }
}

export async function getCompanyMetadataByTicker(
  ticker: string,
): Promise<CompanyMetadata | null> {
  const metadata = await executeQuery<CompanyMetadata>(
    `SELECT 
      id, stock_id as "stockId", ticker, ceo, sector, industry, employees, 
      founded, website, description, headquarters, 
      last_updated_at as "lastUpdatedAt"
    FROM company_metadata
    WHERE ticker = $1`,
    [ticker],
  );

  return metadata.length > 0 ? metadata[0] : null;
}

export async function getStockWithMetadataByTicker(
  ticker: string,
): Promise<StockWithMetadata | null> {
  const stock = await getStockByTicker(ticker);
  if (!stock) {
    return null;
  }

  const metadata = await getCompanyMetadataByTicker(ticker);

  return {
    ...stock,
    metadata,
  };
}
