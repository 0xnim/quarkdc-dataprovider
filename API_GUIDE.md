# Quark DP Backend API Guide

## Overview

The Quark DP Backend provides REST API endpoints for managing and retrieving
stock data, including historical prices and shareholder information. This guide
documents all available endpoints, their parameters, and example responses.

## Base URL

All API endpoints are relative to the base URL of your server:
`http://localhost:8000`

## Authentication

The API uses API key authentication for administrative endpoints. Protected
endpoints require an `X-API-Key` header with a valid API key.

```
X-API-Key: your-api-key-here
```

The API key must be set as an environment variable `ADMIN_API_KEY` on the
server.

## Endpoints

### Fetch and Store Stock Data (ADMIN ONLY)

#### `POST /api/fetch-stocks`

Fetches current data for all stocks from the external source and stores it in
the database.

**Authentication**: Requires valid API key via `X-API-Key` header

**Request Body**: None

**Response**:

```json
{
  "success": true,
  "message": "Fetched and stored 120 stocks"
}
```

#### `POST /api/fetch-stock/:ticker`

Fetches detailed data for a specific stock (including shareholders) and stores
it in the database.

**Authentication**: Requires valid API key via `X-API-Key` header

**Parameters**:

- `ticker` (path parameter): The stock ticker symbol (e.g., AAPL)

**Response**:

```json
{
  "success": true,
  "message": "Fetched and stored details for AAPL"
}
```

### Retrieve Stock Data

#### `GET /api/stocks`

Returns all stocks in the database.

**Response**:

```json
[
  {
    "id": 1,
    "ticker": "AAPL",
    "companyName": "Apple Inc.",
    "logo": "https://example.com/apple_logo.png",
    "outstandingShares": 16500000000,
    "frozen": false,
    "delisted": false,
    "stockType": "common",
    "bookValue": 3.5,
    "dividendPerShare": 0.22,
    "dividendPeriod": "quarterly",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-06-01T12:30:00Z",
    "sharePrice": 187.50
  }
  // More stocks...
]
```

#### `GET /api/stock/:ticker`

Returns information for a specific stock.

**Parameters**:

- `ticker` (path parameter): The stock ticker symbol (e.g., AAPL)

**Response**:

```json
{
  "id": 1,
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "logo": "https://example.com/apple_logo.png",
  "outstandingShares": 16500000000,
  "frozen": false,
  "delisted": false,
  "stockType": "common",
  "bookValue": 3.5,
  "dividendPerShare": 0.22,
  "dividendPeriod": "quarterly",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-06-01T12:30:00Z",
  "sharePrice": 187.50
}
```

### Historical Data

#### `GET /api/stock/:ticker/historical`

Returns historical price data for a specific stock.

**Parameters**:

- `ticker` (path parameter): The stock ticker symbol (e.g., AAPL)
- `startDate` (query parameter, optional): Filter by start date (YYYY-MM-DD)
- `endDate` (query parameter, optional): Filter by end date (YYYY-MM-DD)
- `frequency` (query parameter, optional): Data frequency aggregation -
  'minutely', 'hourly', 'daily', 'weekly', 'monthly' (default: 'hourly')
- `format` (query parameter, optional): Response format - 'default' or
  'standard' (default: 'default')

**Example Request (Default Format)**:

```
GET /api/stock/AAPL/historical?startDate=2023-01-01&endDate=2023-06-30&frequency=daily
```

**Default Response Format**:

```json
[
  {
    "id": 1001,
    "stockId": 1,
    "ticker": "AAPL",
    "sharePrice": 150.75,
    "timestamp": "6/30/2023, 12:00:00 AM EST"
  },
  {
    "id": 951,
    "stockId": 1,
    "ticker": "AAPL",
    "sharePrice": 152.25,
    "timestamp": "6/29/2023, 12:00:00 AM EST"
  }
  // More historical data...
]
```

**Example Request (Standard Format)**:

```
GET /api/stock/AAPL/historical?startDate=2023-01-01&endDate=2023-06-30&frequency=daily&format=standard
```

**Standard Response Format**:

```json
{
  "ticker": "AAPL",
  "start_date": "2023-01-01",
  "end_date": "2023-06-30",
  "frequency": "daily",
  "data": [
    {
      "date": "2023-06-30",
      "open": 150.75,
      "high": 150.75,
      "low": 150.75,
      "close": 150.75,
      "adjusted_close": 150.75,
      "volume": 0
    },
    {
      "date": "2023-06-29",
      "open": 152.25,
      "high": 152.25,
      "low": 152.25,
      "close": 152.25,
      "adjusted_close": 152.25,
      "volume": 0
    }
    // More historical data...
  ]
}
```

**Frequency Options**:

- `minutely`: Returns all raw data points with no aggregation
- `hourly` (default): Groups data by hour, returning the first price of each
  hour
- `daily`: Groups data by day, returning the first price of each day
- `weekly`: Groups data by week, returning the first price of each week
- `monthly`: Groups data by month, returning the first price of each month

**Format Options**:

- `default`: Returns the original format with individual price records
- `standard`: Returns a standardized OHLCV format compatible with financial
  charting libraries (note: since our data model only stores a single price, the
  open, high, low, and close values will be identical)

#### `GET /api/stock/:ticker/shareholders`

Returns historical shareholder data for a specific stock.

**Parameters**:

- `ticker` (path parameter): The stock ticker symbol (e.g., AAPL)
- `accountId` (query parameter, optional): Filter by specific account ID
- `startDate` (query parameter, optional): Filter by start date (YYYY-MM-DD)
- `endDate` (query parameter, optional): Filter by end date (YYYY-MM-DD)

**Example Request**:

```
GET /api/stock/AAPL/shareholders?accountId=12345&startDate=2023-01-01
```

**Response**:

```json
[
  {
    "id": 501,
    "stockId": 1,
    "ticker": "AAPL",
    "username": "investor123",
    "accountId": 12345,
    "shares": 250,
    "timestamp": "6/30/2023, 4:00:00 PM EST"
  },
  {
    "id": 450,
    "stockId": 1,
    "ticker": "AAPL",
    "username": "investor123",
    "accountId": 12345,
    "shares": 200,
    "timestamp": "5/15/2023, 4:00:00 PM EST"
  }
  // More shareholder data...
]
```

## Error Responses

All endpoints return consistent error responses with the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:

- `400` - Bad Request (missing required parameters)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Data Models

### Stock

```typescript
interface Stock {
  id: number;
  ticker: string;
  companyName: string;
  logo: string | null;
  outstandingShares: number;
  frozen: boolean;
  delisted: boolean;
  stockType: string;
  bookValue: number;
  dividendPerShare: number | null;
  dividendPeriod: string | null;
  createdAt: string;
  updatedAt: string;
  sharePrice: number;
}
```

> Note: All timestamps in the API responses are formatted in Eastern Standard
> Time (EST) in the format "M/D/YYYY, h:mm:ss AM/PM EST".

### StockHistorical

```typescript
interface StockHistorical {
  id: number;
  stockId: number;
  ticker: string;
  sharePrice: number;
  timestamp: string;
}
```

### ShareholderHistorical

```typescript
interface ShareholderHistorical {
  id: number;
  stockId: number;
  ticker: string;
  username: string;
  accountId: number;
  shares: number;
  timestamp: string;
}
```

## Rate Limiting

The API currently does not implement rate limiting, but it is recommended to
limit requests to avoid overwhelming the server, especially for the data
fetching endpoints.
