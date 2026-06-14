# SeatSip

A café discovery, table reservation, ordering, and loyalty platform — with real-time food delivery tracking.

## Monorepo Structure

| Directory | Stack | Description |
|-----------|-------|-------------|
| `backend/` | Node.js, Express, Prisma, TypeScript, SQLite/PostgreSQL | REST API — auth, cafes, menus, orders, reservations, cart, payments, wallet, loyalty points, subscriptions, offers, notifications, admin |
| `seatsip-frontend/` | React Native, Expo, TypeScript | Consumer mobile app — café browsing, maps, orders, reservations, rewards, wallet, profile |
| `seat-sip-web/` | Next.js 14, Tailwind CSS, TypeScript | Admin / Owner / Staff web dashboard — analytics, cafe/table/menu management, bookings, users, permissions |
| `map/foodmap/` | Express, Socket.IO, PostgreSQL + PostGIS, React Native | Real-time food delivery tracking with 3D maps |

## Quick Start

### Backend API

```bash
cd backend
npm install
npm run db:seed
npm run dev          # http://localhost:3002
```

### Mobile App (Expo)

```bash
cd seatsip-frontend
npm install
npx expo start       # Expo dev server
```

### Admin Web

```bash
cd seat-sip-web
npm install
npm run dev          # http://localhost:3001
```

## Environment

Copy the example env file in each service and fill in the values:

```bash
cp backend/.env.example backend/.env
```

Key variables:
- `PORT` — API server port (default: `3002`)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — token signing secrets
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` — email delivery (OTP, notifications)
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — payment processing
- `REDIS_URL` — Redis connection (rate limiting, caching)

## API Documentation

Detailed API reference is available at [`backend/README.md`](backend/README.md) — covers all endpoints, request/response examples, database schema, and test credentials.

## Deployment

```bash
docker compose up -d   # API server + Redis
```

The Dockerfile produces a multi-stage Node 20 Alpine image with healthcheck, `dumb-init`, and encrypted S3 DB backup support.

## License

Private — SeatSip
