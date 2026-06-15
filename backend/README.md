# SeatSip Backend API

REST API for café discovery, table reservations, ordering, payments (Razorpay), wallet, loyalty points, subscriptions, and admin management.

## Stack
- **Runtime**: Node.js 20, TypeScript
- **Framework**: Express 4
- **Database**: PostgreSQL 18 (Prisma 6 ORM)
- **Cache/Sessions**: Redis 7
- **Auth**: JWT (access + refresh token rotation), Google OAuth
- **Payments**: Razorpay Orders API + HMAC-SHA256 webhook verification
- **Logging**: Pino structured JSON + `secureLogger` with PII redaction
- **Load Balancer**: PM2 cluster mode (all CPU cores)

## Prerequisites
- Node.js 20+
- PostgreSQL 18+ (Homebrew: `brew install postgresql@18`)
- Redis 7+ (Homebrew: `brew install redis`)
- Expo CLI (for push notifications)

## Setup

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
```

## Run

```bash
# Development (single process)
npm run dev                # → http://localhost:3002

# Production cluster (8 workers, load balanced)
npm run build
npm run start:cluster:dev  # → http://localhost:3002

# Zero-downtime reload
npm run reload:cluster
```

## Test Credentials
| Role       | Email                  | Password    |
|------------|------------------------|-------------|
| User       | arjun@example.com      | password123 |
| User       | priya@example.com      | password123 |
| Admin      | admin@seatsip.com      | admin123    |

## Logging

Every API endpoint logs descriptive success/error messages with `secureLogger`:
- Success: `[Auth] Login successful: arjun@example.com (user: id, role: USER)`
- Error: `[Auth] Login failed: arjun@example.com - user not found or inactive`
- Admin: `[Admin] Notification sent by admin-id: "title" to 50 users`

Logs are Pino structured JSON with `pino-pretty` in development. PII is automatically redacted from payloads.

## PM2 Cluster Management

| Command | Description |
|---------|-------------|
| `npm run start:cluster` | Start production cluster (8 workers) |
| `npm run start:cluster:dev` | Start development cluster |
| `npm run reload:cluster` | Zero-downtime rolling restart |
| `npm run restart:cluster` | Hard restart all workers |
| `npm run stop:cluster` | Stop all workers |
| `npm run status:cluster` | Show worker status (CPU/mem/uptime) |
| `npm run logs:cluster` | Tail combined logs |
| `npm run monit:cluster` | Real-time monitoring dashboard |

## API Docs

Swagger UI: http://localhost:3002/api/docs

OpenAPI spec at `src/api/swagger.ts`.

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection |
| `JWT_ACCESS_SECRET_CURRENT` | Access token signing (64+ chars) |
| `JWT_REFRESH_SECRET_CURRENT` | Refresh token signing |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment processing |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC verification |
| `ALLOWED_ORIGINS` | CORS whitelist (production) |
| `EXPO_ACCESS_TOKEN` | Expo Push API |
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `SENTRY_DSN` | Error tracking (optional) |
