// src/db/schema.ts
import { executeQuery } from "./client.ts";

export async function initializeDatabase() {
  // Create stocks table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS stocks (
      id INTEGER PRIMARY KEY,
      ticker TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      logo TEXT,
      outstanding_shares INTEGER NOT NULL,
      frozen BOOLEAN NOT NULL DEFAULT FALSE,
      delisted BOOLEAN NOT NULL DEFAULT FALSE,
      stock_type TEXT NOT NULL,
      book_value BIGINT,
      dividend_per_share NUMERIC,
      dividend_period TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      latest_share_price NUMERIC NOT NULL,
      first_recorded_at TIMESTAMP NOT NULL DEFAULT timezone('America/New_York', CURRENT_TIMESTAMP),
      last_updated_at TIMESTAMP NOT NULL DEFAULT timezone('America/New_York', CURRENT_TIMESTAMP)
    )
  `);

  // Create historical stock prices table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS stock_historical (
      id SERIAL PRIMARY KEY,
      stock_id INTEGER NOT NULL REFERENCES stocks(id),
      ticker TEXT NOT NULL,
      share_price NUMERIC NOT NULL,
      recorded_at TIMESTAMP NOT NULL DEFAULT timezone('America/New_York', CURRENT_TIMESTAMP),
      UNIQUE(stock_id, recorded_at)
    )
  `);

  // Create shareholders table
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS shareholders (
      id SERIAL PRIMARY KEY,
      stock_id INTEGER NOT NULL REFERENCES stocks(id),
      ticker TEXT NOT NULL,
      username TEXT NOT NULL,
      account_id INTEGER NOT NULL,
      shares INTEGER NOT NULL,
      recorded_at TIMESTAMP NOT NULL DEFAULT timezone('America/New_York', CURRENT_TIMESTAMP),
      UNIQUE(stock_id, account_id, recorded_at)
    )
  `);

  console.log("Database schema initialized");
}
