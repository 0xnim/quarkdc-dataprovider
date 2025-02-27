# Quark DP Backend

A Deno-based stock data tracking and history service.

## Features

- Real-time stock price tracking
- Historical price data storage
- Shareholder tracking
- Scheduled updates (hourly for prices, daily for detailed information)
- RESTful API endpoints for data retrieval

## Tech Stack

- [Deno](https://deno.land/) - The JavaScript/TypeScript runtime
- [Oak](https://deno.land/x/oak) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- All timestamps are stored in Eastern Standard Time (EST)

## Getting Started

### Prerequisites

- [Deno](https://deno.land/#installation) 1.35 or higher
- [PostgreSQL](https://www.postgresql.org/download/) 12 or higher

### Running Locally

1. Clone the repository
2. Create a `.env` file based on `.env.example`
3. Start the application:

```bash
deno task dev
```

## Docker Deployment

### Using Docker Compose (Recommended)

1. Clone the repository
2. Create a `.env` file based on `.env.example` with your settings
3. Build and start the containers:

```bash
docker-compose up -d
```

### Using Docker

1. Build the Docker image:

```bash
docker build -t quark-dp-backend .
```

2. Run the container:

```bash
docker run -p 8000:8000 \
  -e ADMIN_API_KEY=your-api-key \
  -e POSTGRES_URL=your-postgres-url \
  quark-dp-backend
```

## Environment Variables

- `PORT` - Server port (default: 8000)
- `ADMIN_API_KEY` - API key for protected endpoints
- `POSTGRES_URL` - Database connection string
- `POSTGRES_PASSWORD` - Password for the PostgreSQL database (for docker-compose)

## Documentation

- [API Guide](API_GUIDE.md) - Comprehensive API documentation
- [Claude Guide](CLAUDE.md) - Development guidelines and standards

## License

This project is licensed under the MIT License - see the LICENSE file for details.# quarkdc-dataprovider
