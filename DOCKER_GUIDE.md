# Docker Deployment Guide for Quark DP Backend

This guide explains how to deploy the Quark DP Backend using Docker and Docker Compose.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Configuration

### Environment Variables

Create a `.env` file in the project root directory with the following variables:

```
# API authentication
ADMIN_API_KEY=your-secure-api-key-here

# Database configuration
POSTGRES_PASSWORD=your-secure-password-here
```

## Deployment Options

### Option 1: Using Docker Compose (Recommended)

Docker Compose sets up both the application and database in a single command.

1. Start the services:

```bash
docker-compose up -d
```

2. View logs:

```bash
docker-compose logs -f
```

3. Stop the services:

```bash
docker-compose down
```

To persist database data between restarts, a Docker volume is configured to store PostgreSQL data.

### Option 2: Manual Docker Deployment

If you need more control over the deployment, you can build and run the containers separately.

1. Build the application image:

```bash
docker build -t quark-dp-backend .
```

2. Create a network for the containers:

```bash
docker network create quark-network
```

3. Start the PostgreSQL container:

```bash
docker run -d \
  --name quark-dp-postgres \
  --network quark-network \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=stock_history \
  -e TZ=America/New_York \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine -c "timezone=America/New_York"
```

4. Start the application container:

```bash
docker run -d \
  --name quark-dp-backend \
  --network quark-network \
  -p 8000:8000 \
  -e ADMIN_API_KEY=your-api-key \
  -e POSTGRES_URL=postgres://postgres:your-password@quark-dp-postgres:5432/stock_history \
  -e TZ=America/New_York \
  quark-dp-backend
```

## Container Management

### View Logs

```bash
# For docker-compose:
docker-compose logs -f

# For individual containers:
docker logs -f quark-dp-backend
docker logs -f quark-dp-postgres
```

### Restart Containers

```bash
# For docker-compose:
docker-compose restart

# For individual containers:
docker restart quark-dp-backend
docker restart quark-dp-postgres
```

### Stop and Remove Containers

```bash
# For docker-compose:
docker-compose down

# For individual containers:
docker stop quark-dp-backend quark-dp-postgres
docker rm quark-dp-backend quark-dp-postgres
```

## Data Management

Database data is stored in a Docker volume named `postgres_data`. To backup this data:

```bash
docker run --rm \
  -v postgres_data:/source \
  -v $(pwd):/backup \
  alpine \
  tar -czvf /backup/postgres_backup.tar.gz -C /source .
```

To restore from a backup:

```bash
# First, stop the containers
docker-compose down

# Remove the existing volume (caution: this deletes all data)
docker volume rm postgres_data

# Create a new volume
docker volume create postgres_data

# Restore from backup
docker run --rm \
  -v postgres_data:/target \
  -v $(pwd):/backup \
  alpine \
  tar -xzvf /backup/postgres_backup.tar.gz -C /target

# Restart the containers
docker-compose up -d
```

## Troubleshooting

### Connection Issues

If the application can't connect to the database:

1. Check that both containers are running:
   ```bash
   docker ps
   ```

2. Ensure they're on the same network:
   ```bash
   docker network inspect quark-network
   ```

3. Verify the connection string matches the PostgreSQL container configuration.

### Timezone Issues

If timestamps are not in EST:

1. Check the container's timezone setting:
   ```bash
   docker exec -it quark-dp-backend ash -c "date"
   ```

2. Verify PostgreSQL timezone setting:
   ```bash
   docker exec -it quark-dp-postgres psql -U postgres -c "SHOW timezone;"
   ```