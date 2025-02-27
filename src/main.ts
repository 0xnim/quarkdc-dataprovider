// src/main.ts
import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import router from "./routes/api.ts";
import { initializeDatabase } from "./db/schema.ts";
import { startScheduler } from "./services/schedulerService.ts";

const app = new Application();
const port = parseInt(Deno.env.get("PORT") || "8000");

// Ensure environment variables are set
if (!Deno.env.get("ADMIN_API_KEY")) {
  console.warn("WARNING: ADMIN_API_KEY environment variable not set. Protected endpoints will be inaccessible.");
  // Set a random key for development
  if (Deno.env.get("NODE_ENV") !== "production") {
    const randomKey = Math.random().toString(36).substring(2, 15);
    console.log(`Setting temporary ADMIN_API_KEY for development: ${randomKey}`);
    Deno.env.set("ADMIN_API_KEY", randomKey);
  }
}

// Initialize database on startup
await initializeDatabase();

// Start the scheduler service
startScheduler();

// Custom JSON serializer to handle BigInt values
app.use(async (ctx, next) => {
  // Store the original response.json method
  const originalJson = ctx.response.json;
  
  // Override the JSON response to properly serialize BigInt values
  ctx.response.json = function(data: unknown) {
    this.type = "application/json";
    this.body = JSON.stringify(data, (_key, value) => {
      // Convert BigInt to string during serialization
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    });
    return this;
  };
  
  await next();
});

// Middleware
app.use(oakCors()); // Enable CORS
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
  }
});

// Request logging
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${ms}ms`);
});

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

// 404 handler
app.use((ctx) => {
  ctx.response.status = 404;
  ctx.response.body = { error: "Not Found" };
});

// Start the server
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
