// src/db/client.ts
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

// You would typically load these from environment variables
const POSTGRES_URL = Deno.env.get("POSTGRES_URL") || "postgres://postgres:postgres@localhost:5432/stock_history";

// Initialize the pool with timezone set to EST
const pool = new Pool(POSTGRES_URL, 10);

export const getClient = async () => {
    const client = await pool.connect();
    // Set timezone to EST for this session
    await client.queryObject("SET timezone='America/New_York'");
    return client;
};

// Convert a date to EST timezone
export function toESTDate(date: Date): Date {
    return new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

// Get current EST timestamp
export function getCurrentESTTime(): Date {
    return toESTDate(new Date());
}

// Format a Date object to ISO string in EST
export function formatESTDate(date: Date): string {
    const estDate = toESTDate(date);
    return estDate.toISOString();
}

export async function executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    const client = await getClient();
    try {
        const result = await client.queryObject<T>(query, params);
        return result.rows;
    } finally {
        client.release();
    }
}
