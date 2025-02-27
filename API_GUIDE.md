# Quark DP Backend API Guide

## Overview

The Quark DP Backend provides REST API endpoints for managing and retrieving stock data, including historical prices and shareholder information. This guide documents all available endpoints, their parameters, and example responses.

## Base URL

All API endpoints are relative to the base URL of your server: `http://localhost:8000`

## Authentication

The API uses API key authentication for administrative endpoints. Protected endpoints require an `X-API-Key` header with a valid API key.

```
X-API-Key: your-api-key-here
```

The API key must be set as an environment variable `ADMIN_API_KEY` on the server.

## Endpoints

### Fetch and Store Stock Data (ADMIN ONLY)

#### `POST /api/fetch-stocks`

Fetches current data for all stocks from the external source and stores it in the database.

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

Fetches detailed data for a specific stock (including shareholders) and stores it in the database.

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
    "sharePrice": "187.50"
  },
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
  "sharePrice": "187.50"
}
```

### Historical Data

#### `GET /api/stock/:ticker/historical`

Returns historical price data for a specific stock.

**Parameters**:
- `ticker` (path parameter): The stock ticker symbol (e.g., AAPL)
- `startDate` (query parameter, optional): Filter by start date (YYYY-MM-DD)
- `endDate` (query parameter, optional): Filter by end date (YYYY-MM-DD)

**Example Request**: 
```
GET /api/stock/AAPL/historical?startDate=2023-01-01&endDate=2023-06-30
```

**Response**:
```json
[
  {
    "id": 1001,
    "stockId": 1,
    "ticker": "AAPL",
    "sharePrice": "150.75",
    "timestamp": "2023-06-30T16:00:00Z"
  },
  {
    "id": 951,
    "stockId": 1,
    "ticker": "AAPL",
    "sharePrice": "152.25",
    "timestamp": "2023-06-29T16:00:00Z"
  },
  // More historical data...
]
```

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
    "timestamp": "2023-06-30T16:00:00Z"
  },
  {
    "id": 450,
    "stockId": 1,
    "ticker": "AAPL",
    "username": "investor123",
    "accountId": 12345,
    "shares": 200,
    "timestamp": "2023-05-15T16:00:00Z"
  },
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
    sharePrice: string;
}
```

> Note: All timestamps in the API are in Eastern Standard Time (EST).

### StockHistorical

```typescript
interface StockHistorical {
    id: number;
    stockId: number;
    ticker: string;
    sharePrice: string;
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

The API currently does not implement rate limiting, but it is recommended to limit requests to avoid overwhelming the server, especially for the data fetching endpoints.