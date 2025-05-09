# Scheduler Service

A NodeJS service for scheduling API calls to external services at specified intervals using node-cron, worker threads, and PostgreSQL database.

## Features

- Schedule API calls using cron expressions
- Support for various HTTP methods (GET, POST, PUT, DELETE, etc.)
- Job management (create, update, delete, pause, resume)
- Manual job execution
- Job status tracking
- Multi-threaded job execution using worker threads
- Dynamic worker pool based on CPU cores
- Store and pass target service credentials when making API calls
- Database persistence with PostgreSQL
- Support for different timezones
- REST API for job management

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/scheduler-service.git
cd scheduler-service
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on this template:
```
# Server configuration
PORT=5000
NODE_ENV=development

# Database configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/scheduler?schema=public"

# Redis configuration (optional - only needed for backward compatibility)
REDIS_URL=redis://localhost:6379

# Worker thread configuration
MAX_WORKERS=4  # Optional: defaults to half the CPU cores

# Logging configuration
LOG_LEVEL=info
LOG_DIR=logs

# CORS configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

4. Set up the database:
```bash
# Generate Prisma client
npm run generate

# Run database migrations
npm run migrate
```

## Usage

### Starting the Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Scheduler API Endpoints

Note: In production, these endpoints should be secured with admin/super_admin authentication.

#### Get All Jobs
```
GET /api/v1/scheduler
```

#### Create a Job
```
POST /api/v1/scheduler
```

Request body:
```json
{
  "name": "Example Job",
  "apiUrl": "https://api.example.com/endpoint",
  "method": "GET",
  "interval": "*/5 * * * *",
  "timezone": "America/New_York",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "key": "value"
  },
  "targetServiceClientId": "client_a1b2c3d4e5f6",
  "targetServiceSecret": "secret_z9y8x7w6v5u4",
  "enabled": true
}
```

#### Get a Job by ID
```
GET /api/v1/scheduler/:id
```

#### Update a Job
```
PUT /api/v1/scheduler/:id
```

Request body: Same as create job (fields to update)

#### Delete a Job
```
DELETE /api/v1/scheduler/:id
```

#### Pause a Job
```
PATCH /api/v1/scheduler/:id/pause
```

#### Resume a Job
```
PATCH /api/v1/scheduler/:id/resume
```

#### Run a Job Immediately
```
POST /api/v1/scheduler/:id/run
```

#### Get Worker Thread Status
```
GET /api/v1/scheduler/status/workers
```

Example response:
```json
{
  "success": true,
  "data": {
    "maxWorkers": 4,
    "activeWorkers": 2,
    "activeJobIds": ["job-id-1", "job-id-2"]
  }
}
```

## Cron Expression Format

The service uses node-cron which supports the standard cron format:

```
┌────────────── second (optional)
│ ┌──────────── minute
│ │ ┌────────── hour
│ │ │ ┌──────── day of month
│ │ │ │ ┌────── month
│ │ │ │ │ ┌──── day of week
│ │ │ │ │ │
│ │ │ │ │ │
* * * * * *
```

Examples:
- `*/5 * * * *` - Every 5 minutes
- `0 */1 * * *` - Every hour
- `0 0 * * *` - Every day at midnight
- `0 0 * * 0` - Every Sunday at midnight
- `0 0 1 * *` - First day of every month at midnight

## Timezone Support

The scheduler service supports different timezones for job scheduling. You can specify the timezone when creating or updating a job. The timezone should be in the format specified by the IANA Time Zone Database (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo').

Examples:
- `America/New_York` - Eastern Time (ET)
- `America/Chicago` - Central Time (CT)
- `America/Denver` - Mountain Time (MT)
- `America/Los_Angeles` - Pacific Time (PT)
- `UTC` - Coordinated Universal Time

If no timezone is specified, UTC is used as the default.

## Worker Thread Architecture

The scheduler service uses Node.js worker threads to execute jobs concurrently without blocking the main event loop. This approach provides several benefits:

- **Improved Performance**: Multiple jobs can run simultaneously
- **Isolation**: Each job runs in its own thread, preventing one job's errors from affecting others
- **Resource Management**: The number of concurrent workers is controlled to prevent system overload
- **Timeouts**: Workers have built-in timeouts to prevent jobs from running indefinitely

### Worker Pool Configuration

By default, the service uses a worker pool size of half the available CPU cores. You can adjust this by setting the `MAX_WORKERS` environment variable.

## Authentication Flow

The scheduler service is designed to handle authentication for target services:

1. Admin/super_admin creates a job with target service credentials
2. Credentials (client ID and secret) are securely stored in the database
3. When executing a job, the scheduler:
   - Retrieves the stored credentials
   - Passes them in the headers of the API call to the target service
   - The target service authenticates the request using the credentials

This way, the scheduler service can make authenticated API calls to various microservices on behalf of the system administrators.

## Database Schema

The service uses PostgreSQL database with the following schema:

### Job Table
- `id`: UUID primary key
- `name`: Job name
- `apiUrl`: URL to call
- `method`: HTTP method (GET, POST, etc.)
- `headers`: HTTP headers (stored as JSON)
- `body`: Request body (stored as JSON)
- `interval`: Cron expression for scheduling
- `timezone`: Timezone for scheduling
- `enabled`: Whether the job is enabled
- `lastRun`: When the job was last run
- `lastRunStatus`: Status of the last run (success/error)
- `lastRunError`: Error message from the last run (if any)
- `executionCount`: Number of times the job has been executed
- `errorCount`: Number of times the job has failed
- `targetServiceClientId`: Client ID for target service authentication
- `targetServiceSecret`: Secret for target service authentication
- `createdBy`: Who created the job
- `updatedBy`: Who last updated the job
- `createdAt`: When the job was created
- `updatedAt`: When the job was last updated

## Docker Support

Build the Docker image:
```bash
docker build -t scheduler-service .
```

Run with Docker Compose (includes Redis and PostgreSQL):
```bash
docker-compose up
```

## License

[MIT License](LICENSE)