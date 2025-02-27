# Quark DP Backend Project Guide

## Commands
- `deno task start` - Run the server with network and env permissions
- `deno task dev` - Run the server in dev mode with file watching
- `deno test src/main_test.ts` - Run a specific test file
- `deno test` - Run all tests
- `deno lint` - Lint the codebase
- `deno fmt` - Format code according to Deno standards

## Environment Variables
- `PORT` - Server port (default: 8000)
- `ADMIN_API_KEY` - API key for protected endpoints
- `POSTGRES_URL` - Database connection string

## Timezone Handling
- All timestamps are stored and displayed in Eastern Standard Time (EST/EDT)
- Database is configured to use America/New_York timezone
- Historical stock records show EST times regardless of server location

## Code Style
- **Typing**: Use strict TypeScript typing; define interfaces in models/types.ts
- **Imports**: Use direct URL imports for external modules (deno standard)
- **Naming**: camelCase for variables/functions, PascalCase for interfaces
- **Error Handling**: Use try/catch in middleware; return structured error responses
- **Database**: Use parameterized queries for all SQL statements
- **Route Structure**: Follow RESTful API patterns in routes/api.ts
- **Async**: Use async/await pattern for asynchronous operations
- **Middleware**: Register middleware in main.ts for global concerns
- **Comments**: Add JSDoc for public functions and complex logic

## Project Structure
- `src/main.ts` - Application entry point
- `src/db/` - Database connection and schema
- `src/routes/` - API endpoint definitions
- `src/services/` - Business logic and external services
- `src/models/` - Type definitions and interfaces

## Scheduler
- Stock prices are updated hourly at the top of each hour
- Detailed stock information (with shareholders) is updated daily at midnight EST
- Fallback mechanism checks if updates were missed during downtime