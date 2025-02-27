// src/services/schedulerService.ts
import { fetchAllStocks, fetchStockDetail } from "./stockService.ts";
import { saveStock, saveStockDetail, getLastStockHistoricalEntryTime } from "./dbService.ts";

// Time intervals in milliseconds
const ONE_HOUR = 3600000;
const FIVE_MINUTES = 300000;
const ONE_DAY = 24 * ONE_HOUR;

// Track scheduled tasks
const scheduledTasks: number[] = [];

export function startScheduler() {
    // Check if we need to run immediately
    checkAndRunScheduledTasks();
    
    // Schedule for the next hour mark
    scheduleOnHourlyInterval();
    
    // Schedule detailed updates daily at midnight EST
    scheduleAtMidnightEST();

    console.log("Scheduler service started");
}

export function stopScheduler() {
    // Clear all scheduled tasks
    for (const taskId of scheduledTasks) {
        clearTimeout(taskId);
        clearInterval(taskId);
    }
    scheduledTasks.length = 0;
    console.log("Scheduler service stopped");
}

// Schedule stock price updates to run at the top of each hour (:00)
function scheduleOnHourlyInterval() {
    const now = new Date();
    
    // Calculate time until next exact hour
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Set to next hour, 0 minutes, 0 seconds, 0 ms
    
    // Get milliseconds until next hour
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    console.log(`Scheduling stock price update in ${Math.round(msUntilNextHour / 1000)} seconds (next hour mark)`);
    
    // Schedule the initial task
    const taskId = setTimeout(() => {
        // Run the stock price update
        updateAllStockPrices();
        
        // Then set up a recurring hourly interval exactly on the hour
        const hourlyTaskId = setInterval(updateAllStockPrices, ONE_HOUR);
        scheduledTasks.push(hourlyTaskId);
        
        console.log(`Stock price updates now scheduled to run on the hour, every hour`);
    }, msUntilNextHour);
    
    scheduledTasks.push(taskId);
}

// Schedule detailed updates to run at midnight EST
function scheduleAtMidnightEST() {
    const now = new Date();
    
    // Convert current time to EST (UTC-5)
    const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    
    // Calculate time until next midnight EST
    const nextMidnight = new Date(estTime);
    nextMidnight.setHours(24, 0, 0, 0); // Set to next midnight
    
    // Get milliseconds until midnight EST
    const msUntilMidnight = nextMidnight.getTime() - estTime.getTime();
    
    // Schedule the task
    const taskId = setTimeout(() => {
        // Run the detailed stock update
        updateAllStockDetails();
        
        // Schedule for the next day
        scheduleAtMidnightEST();
    }, msUntilMidnight);
    
    scheduledTasks.push(taskId);
    console.log(`Stock details update scheduled at midnight EST (in ${Math.round(msUntilMidnight / 60000)} minutes)`);
}

// Check if tasks haven't run in 24 hours and run if needed
async function checkAndRunScheduledTasks() {
    const lastRunTime = await getLastStockHistoricalEntryTime();
    const now = new Date();
    
    // Check for stock prices (hourly updates)
    if (!lastRunTime || (now.getTime() - lastRunTime.getTime() > ONE_HOUR)) {
        console.log("No price updates in the last hour. Running stock price update now...");
        updateAllStockPrices();
    }
    
    // Check for detailed info (daily updates)
    if (!lastRunTime || (now.getTime() - lastRunTime.getTime() > ONE_DAY)) {
        console.log("No detailed updates in the last 24 hours. Running stock details update now...");
        updateAllStockDetails();
    }
}

async function updateAllStockPrices() {
    try {
        console.log(`[${new Date().toISOString()}] Starting scheduled stock price update...`);
        const stocks = await fetchAllStocks();
        let successCount = 0;

        for (const stock of stocks) {
            try {
                await saveStock(stock);
                successCount++;
            } catch (error) {
                console.error(`Error saving stock ${stock.ticker}:`, error);
            }
        }

        console.log(`[${new Date().toISOString()}] Completed stock price update. Successfully updated ${successCount}/${stocks.length} stocks.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to update stock prices:`, error);
    }
}

async function updateAllStockDetails() {
    try {
        console.log(`[${new Date().toISOString()}] Starting scheduled stock details update...`);
        const stocks = await fetchAllStocks();
        let successCount = 0;

        for (const stock of stocks) {
            try {
                const stockDetail = await fetchStockDetail(stock.ticker);
                await saveStockDetail(stockDetail);
                successCount++;
            } catch (error) {
                console.error(`Error updating stock details for ${stock.ticker}:`, error);
            }

            // Add a small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[${new Date().toISOString()}] Completed stock details update. Successfully updated ${successCount}/${stocks.length} stocks.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to update stock details:`, error);
    }
}
