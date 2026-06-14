# SeatSip

A café discovery, table reservation, ordering, and loyalty platform — with real-time food delivery tracking.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  seatsip-frontend │  │   seat-sip-web   │  │  map/foodmap  │  │
│  │  (React Native)  │  │   (Next.js 15)   │  │  (Socket.IO)  │  │
│  │  Expo SDK 53     │  │   Tailwind CSS   │  │  React Native │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
└───────────┼──────────────────────┼──────────────────────┼────────┘
            │ HTTP/JSON            │ HTTP/JSON            │ WebSocket
            ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐   │
│  │ Auth    │ │ Cafes   │ │ Orders   │ │ Payments│ │Admin     │   │
│  │ /auth   │ │ /cafes  │ │ /orders  │ │ /pay   │ │/admin    │   │
│  ├─────────┤ ├─────────┤ ├──────────┤ ├────────┤ ├──────────┤   │
│  │Reserv.  │ │ Cart    │ │ Rewards  │ │ Points │ │Subscript │   │
│  │ /reserv │ │ /cart   │ │ /rewards │ │ /points│ │ /subs    │   │
│  └─────────┘ └─────────┘ └──────────┘ └────────┘ └──────────┘   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
             ┌─────────────────┼────────────────────┐
             ▼                 ▼                    ▼
      ┌────────────┐   ┌──────────┐        ┌──────────────┐
      │ PostgreSQL │   │  Redis   │        │    Expo      │
      │ (Primary)  │   │ (Session │        │  Push API    │
      │            │   │  + Rate) │        │ (Notifications)│
      └────────────┘   └──────────┘        └──────────────┘
```

## Monorepo Structure

| Directory | Stack | Description |
|-----------|-------|-------------|
| `backend/` | Node.js 20, Express 4, Prisma 6, TypeScript | REST API — auth, cafes, menus, orders, reservations, cart, payments (Razorpay), wallet, loyalty points, subscriptions, offers, admin panel |
| `seatsip-frontend/` | React Native 0.79, Expo SDK 53, React 19, TypeScript | Consumer mobile app — café browsing, map discovery, orders, reservations, rewards, wallet, notifications |
| `seat-sip-web/` | Next.js 15, Tailwind CSS, TypeScript, React 18 | Admin / Owner / Staff web dashboard — analytics, cafe/table/menu management, bookings, users, permissions, notifications broadcast |
| `map/foodmap/` | Express, Socket.IO, PostgreSQL + PostGIS | Real-time food delivery tracking with 3D maps (separate service) |
| `scripts/` | — | Debug and maintenance scripts (DB inspection, seeding tools) |
| `.github/` | GitHub Actions | CI pipeline — lint, test (backend + web), build (backend + web) |

## Tech Stack

### Backend (`backend/`)

- **Runtime**: Node.js 20, TypeScript
- **Framework**: Express 4 with `express-async-errors` for async error propagation
- **Database ORM**: Prisma 6 with PostgreSQL (migrated from SQLite)
- **Validation**: Zod schemas on all request bodies/queries/params
- **Auth**: JWT (access + refresh token rotation), Google OAuth, bcryptjs password hashing
- **Payments**: Razorpay Orders API + webhook signature verification with HMAC-SHA256
- **Rate Limiting**: `express-rate-limit` with Redis store — general (60/min/IP), strict (20/min/IP)
- **Caching/Sessions**: Redis 7 (mobile location sessions, rate limiting token bucket)
- **Logging**: Pino structured JSON + `pino-http` for HTTP request logging
- **Monitoring**: Sentry error tracking (conditional on `SENTRY_DSN`)
- **Security**: Helmet, CORS whitelist, input sanitization, request-ID tracing, audit logging
- **Email**: Nodemailer (SMTP — OTP delivery, notification emails)
- **Push**: Expo Push API for mobile notifications

### Mobile (`seatsip-frontend/`)

- **Framework**: React Native 0.79, Expo SDK 53, React 19
- **Navigation**: React Navigation (native stack + bottom tabs)
- **Maps**: react-native-maps (native) / maplibre-gl (web fallback, lazy-loaded)
- **Payments**: react-native-razorpay
- **Security**: SSL pinning (production), Jail-Monkey (root detection), biometric auth
- **Storage**: react-native-keychain + AsyncStorage for secure token storage
- **Notifications**: Expo Notifications + deep linking (`seatsip://orders/:id`, `seatsip://reservations/:id`)
- **Charts/UI**: react-native-svg, reanimated, gesture-handler, bottom-sheet
- **i18n**: react-i18next with English, Hindi, Tamil translations

### Web Admin (`seat-sip-web/`)

- **Framework**: Next.js 15 (Pages Router), React 18
- **Styling**: Tailwind CSS with class-variance-authority
- **UI Components**: Radix UI, lucide-react, react-hot-toast
- **Forms**: react-hook-form + Zod resolvers
- **Tables**: @tanstack/react-table with drag-and-drop (@dnd-kit)
- **Charts**: Recharts
- **Calendar**: react-big-calendar
- **API Data**: @tanstack/react-query
- **Auth**: Custom auth with admin_token cookie, role-based guards (ADMIN / CAFE_OWNER)

## Backend Architecture

### Middleware Chain (in order)

```
Request
  → requestId (UUID per request, used in logs & audit)
  → cookieParser
  → helmet (security headers)
  → cors (whitelist origins from ALLOWED_ORIGINS)
  → compression (gzip)
  → pino-http (HTTP request logging)
  → /payments route (raw body needed for webhook verification)
  → express.json (2mb limit, after payments to avoid breaking raw body)
  → urlencoded parser
  → sanitizeInput (strip malicious patterns)
  → apiGeneralLimiter (60 req/min/IP)
  → Route-specific limiters (apiStrictLimiter on cafes, menu, orders: 20 req/min/IP)
  → Route handlers
  → Sentry error handler (if SENTRY_DSN set)
  → Global error handler (Zod → 400, everything else → 500)
```

### API Routes

| Prefix | Router | Auth | Rate Limit | Description |
|--------|--------|------|------------|-------------|
| `/api/v1/auth` | `auth.ts` | No | Auth-specific | Register, login, Google OAuth, refresh, logout, forgot-password, account deletion |
| `/api/v1/admin` | `admin.ts` | JWT + role (ADMIN/OWNER) | General | Stats, revenue, cafes, menus, owners, rewards, banners, notifications, audit logs |
| `/api/v1/cafes` | `cafes.ts` | No | Strict | List, search, filter, details, images, reviews |
| `/api/v1/menu` | `menu.ts` | No | Strict | Public menu items |
| `/api/v1/orders` | `orders.ts` | JWT | Strict | Create, list, cancel, refund, payment intent |
| `/api/v1/reservations` | `reservations.ts` | JWT + optional | General | Create, list, cancel, pre-order updates |
| `/api/v1/cart` | `misc.ts` | JWT | General | Add, update, delete, clear |
| `/api/v1/users` | `misc.ts` | JWT | General | Profile, wallet, push tokens |
| `/api/v1/notifications` | `misc.ts` | JWT | General | List, unread count, mark read |
| `/api/v1/rewards` | `rewards.ts` | JWT | General | List, redeem, earn, purchase tier |
| `/api/v1/banners` | `banners.ts` | No | General | Active banners |
| `/api/v1/explore-categories` | `exploreCategories.ts` | No | General | Explore categories |
| `/api/v1/points` | `points.ts` | JWT | General | Earn, redeem, convert to wallet, admin grant/debit |
| `/api/v1/subscriptions` | `subscriptions.ts` | JWT | General | Status, activate (wallet/Razorpay), cancel, auto-renew |
| `/api/v1/offers` | `offers.ts` | JWT | General | List, redeem promotional codes |
| `/api/v1/payments` | `payments.ts` | No (webhook) | None | Razorpay webhook handler |
| `/api/docs` | Swagger UI | No | General | OpenAPI 3.0 documentation |

### Key Services

| Service | File | Purpose |
|---------|------|---------|
| Account Lifecycle | `services/accountLifecycle.ts` | Scheduled purge of accounts past deletion deadline, push token cleanup |
| Push Notifications | `services/pushNotifications.ts` | Expo Push API — single-user and bulk broadcast |
| Razorpay | `payments/razorpay.ts` | Razorpay client, HMAC signature verification, webhook verification |
| Rate Limiter | `security/rateLimit.ts` | Redis-backed sliding-window rate limiter + API limiter factories |
| Logger | `security/logger.ts` | Pino logger instance (console with pino-pretty in dev, JSON in production) |
| HTTP Security | `security/http.ts` | CORS, Helmet config, request ID, input sanitization, Zod validation middleware, audit logging |
| Production Secrets | `security/productionSecrets.ts` | Validates that required secrets are set in production (JWT, etc.) |
| Redaction | `security/redaction.ts` | PII redaction from log payloads |

### Database Schema (22 models)

| Model | Table | Key Relationships | Purpose |
|-------|-------|-------------------|---------|
| User | `users` | → DevicePushToken, Notification, Order, Reservation, Review, CartItem, WalletTransaction, Subscription, PointsTransaction, RefreshToken, Cafe (owned) | Core user entity with wallet, loyalty, subscription |
| Cafe | `cafes` | → MenuCategory, MenuItem, Table, Order, Reservation, Review, Banner, CartItem | Café entity with location, hours, amenities |
| MenuItem | `menu_items` | → MenuCategory, Cafe, CartItem | Menu items with pricing, dietary flags, customizations |
| MenuCategory | `menu_categories` | → Cafe, MenuItem | Menu grouping |
| Table | `tables` | → Cafe, Reservation | Floor-plan tables with position mapping |
| Order | `orders` | → User, Cafe | Full order lifecycle (PENDING → CONFIRMED → PREPARING → READY → DELIVERED → COMPLETED) |
| Reservation | `reservations` | → User, Cafe, Table | Booking with pre-order, confirmation code, cancellation |
| CartItem | `cart_items` | → User, Cafe, MenuItem | Per-user cart per café |
| Subscription | `subscriptions` | → User | MONTHLY/YEARLY plans with auto-renew and wallet charging |
| PointsTransaction | `points_transactions` | → User | Earn/spend ledger with multiplier tracking |
| WalletTransaction | `wallet_transactions` | → User | Wallet credit/debit ledger with Razorpay references |
| Offer | `offers` | → RedeemedOffer | Promotional codes with multipliers, subscriber-only flags |
| Reward | `rewards` | → RedeemedReward | Tier-gated rewards with stock and point cost |
| RedeemedReward | `redeemed_rewards` | → User, Reward | Reward redemption tracking |
| RedeemedOffer | `redeemed_offers` | → User, Offer | Offer redemption with points earned |
| Notification | `notifications` | → User | In-app notification inbox |
| DevicePushToken | `device_push_tokens` | → User | Expo push tokens per device |
| IdempotencyKey | `idempotency_keys` | — | Webhook idempotency via `razorpay_payment_id` uniqueness |
| RefreshToken | `refresh_tokens` | → User | Token rotation with family tracking, revocation |
| PaymentEvent | `payment_events` | — | Razorpay webhook event log for reconciliation |
| AuditLog | `audit_logs` | — | Immutable audit trail for admin actions |
| Banner | `banners` | → Cafe (optional) | Home screen banners (PROMO/FOOD_PROMO types) |
| Review | `reviews` | → User, Cafe | User reviews with ratings |
| LoyaltyTierHistory | `loyalty_tier_history` | → User | Tier promotion/demotion audit |
| RevokedToken | `revoked_tokens` | — | JWT blacklist |
| SystemSetting | `system_settings` | — | Key-value configuration |
| FeatureFlag | `feature_flags` | — | Feature toggles |
| ExploreCategory | `explore_categories` | — | Browse categories for home screen |

## Key Workflows

### Authentication Flow

```
Register/Login → Password hashing (bcryptjs, 12 rounds)
  → JWT access token (15 min) + refresh token (7 days)
  → Refresh token rotation with family tracking (prevents reuse)
  → Account lockout after 5 failed attempts (30 min)
  → Rate-limited auth endpoints (10/min for login, 5/min for refresh)
  → Google OAuth via google-auth-library (optional)
```

### Order Placement Flow

```
Add items to cart → POST /cart/add
  → Create order → POST /orders with cafe_id + items
  → Create payment intent → Razorpay order created
  → Process payment on client (Razorpay SDK)
  → Verify signature → POST /orders payment verification
  → Order status progression: PENDING → CONFIRMED → PREPARING → READY → DELIVERED → COMPLETED
```

### Reservation Flow

```
Browse cafes → Select date/time/party size
  → POST /reservations → Confirmation code generated
  → Table assignment (optional)
  → Pre-order items (optional, added to reservation)
  → Cancel with reason before 24h (full refund)
```

### Payment Flow

```
Wallet top-up:
  POST /users/wallet/topup/order → Razorpay order created
  → Client processes payment → POST /users/wallet/topup/verify (signature check)

Order payment:
  POST /orders/payment-intent → Razorpay order
  → Client processes payment → Order includes razorpay_payment_id
  
Webhook:
  Razorpay → POST /api/v1/payments/webhook (HMAC-SHA256 verified)
  → Idempotency check (raw_event_id unique)
  → Payment event logged, wallet credited if applicable
```

### Subscription Flow

```
POST /subscriptions/activate
  → WALLET method: deduct from wallet balance directly
  → RAZORPAY method: create Razorpay order, verify payment
  → Create/update Subscription record with 30/365 day expiry
  → Set is_subscribed + subscription_expires_at on User
  
Auto-renew:
  → Cron runs every 6 hours (in main.ts)
  → Checks subscriptions.expires_at <= now && auto_renew = true
  → Charges wallet for renewal amount
  → If insufficient balance: disables auto-renew, expires subscription, notifies user

Benefits enforcement:
  → points.ts getSubscriptionBoost(): 1.5x multiplier for subscribers
  → Points redeem: 10% discount for subscribers (priorityRedemption)
  → Offer codes: subscriber_only flag checked in offers.ts
```

### Rewards & Points Flow

```
Earning:
  → Types: PER_SPEND (10 pts/₹100), PER_RESERVATION (50), REVIEW (30), REFERRAL (100)
  → Subscribers get 1.5× multiplier via getSubscriptionBoost()
  → Points capped at 50000 (points_cap on User)
  
Spending:
  → POST /points/redeem → Check reward.stock, user.tier, user.points
  → Subscribers can redeem with 10% fewer points
  → Points converted to wallet at 100 pts = ₹1 (minimum 100 pts)
  
Tiers:
  → SILVER (default) → GOLD (500 pts) → PLATINUM (1000 pts)
  → Each tier unlocks higher-value rewards
```

## Security Features

| Feature | Implementation | Details |
|---------|---------------|---------|
| Input Validation | Zod schemas | Every request body, query, and path parameter validated before handler execution |
| Rate Limiting | Redis sliding window | 60 req/min general, 20 req/min for cafes/menu/orders, 10/min for auth |
| CORS | Whitelist origins | `ALLOWED_ORIGINS` env var — comma-separated, validated at startup |
| Helmet | Security headers | X-Content-Type-Options, X-Frame-Options, CSP, etc. |
| JWT | Token rotation | Access tokens (15 min) + refresh tokens (7 day) with family tracking |
| Password Hashing | bcryptjs | 12 salt rounds |
| Payment Verification | HMAC-SHA256 | Razorpay webhook signature verified with constant-time comparison |
| Idempotency | Database unique constraint | `razorpay_payment_id` uniqueness prevents duplicate webhook processing |
| Audit Logging | Immutable DB log | Every admin action logged with request-ID, user, IP, metadata |
| PII Redaction | `redactObjectForLog` | Sensitive fields stripped from error logs |
| SSL Pinning | react-native-ssl-pinning | Production mobile builds pin API server certificate |
| Root Detection | Jail-Monkey | Mobile app detects jailbroken/rooted devices |
| Biometric Auth | react-native-biometrics | Optional fingerprint/face unlock for app access |
| Input Sanitization | `sanitizeInput` | Strips XSS patterns from request bodies |
| Express Trust Proxy | Production | Correct IP detection behind reverse proxies |

## Mobile App Architecture

```
seatsip-frontend/
├── screens/          # Screen components (auth, cafes, orders, profile, etc.)
│   ├── auth/         # Login, Register, Google Sign-In, Forgot Password
│   ├── cafes/         # Café list, detail, maps
│   ├── orders/        # Order list, tracking
│   ├── reservations/  # Reservation management
│   ├── rewards/       # Rewards screen, tier purchase, subscription
│   ├── profile/       # Profile, settings, language selection
│   └── explore/       # MapCanvas with dynamic maplibre-gl import
├── components/       # Reusable UI components
├── services/         # API client, auth, notifications, sentry
│   ├── api/          # Axios client with auto-refresh, SSL pinning
│   ├── auth/         # Google auth, secure storage (keychain)
│   └── notifications/ # Push token registration, deep linking
├── security/         # Secure storage, safe log, notification permissions
├── context/          # AuthContext, ThemeContext
├── navigation/       # Stack + tab navigators
└── i18n/             # English, Hindi, Tamil translations
```

**API Client Features:**
- Auto-refresh on 401 (dedicated refresh client to avoid loops)
- SSL pinning in production (server leaf cert bundled)
- JWT stored in react-native-keychain
- Request interceptor attaches Bearer token and API version header

## Web Admin Architecture

```
seat-sip-web/
├── pages/            # Next.js Pages Router
│   ├── admin/        # Admin dashboard, banners, rewards, notifications
│   ├── cafe-owners/  # Pending owner management
│   ├── cafes/        # Café CRUD
│   ├── menu/         # Menu management
│   ├── tables/       # Table layout editor
│   ├── bookings/     # Reservation calendar
│   ├── orders/       # Order management
│   ├── analytics/    # Revenue charts, stats
│   ├── permissions/  # Role management
│   ├── audit-logs/   # Admin audit history
│   └── api/          # API routes (admin login/logout, mobile-location proxy)
├── components/       # Layout, UI (Button, Input, Select, Modal, Table, etc.)
├── services/         # API client (fetch-based with cookie auth)
├── hooks/            # useAuthGuard (role-based routing)
├── contexts/         # ThemeContext
└── utils/            # Auth utilities (cookie management, role parsing)
```

## Infrastructure

### Docker

```yaml
services:
  api:      # Node.js Express server (port 3000)
    build: backend/Dockerfile
    depends_on: [redis]
    healthcheck: curl http://localhost:3000/health (30s interval)
    volumes: persistent SQLite data /var/lib/seatsip/
    
  redis:    # Redis 7 (rate limiting, sessions)
    image: redis:7-alpine
    volumes: redis-data:/data
```

### CI/CD (GitHub Actions)

5 jobs run on push to `main` / PR:

| Job | Command | Notes |
|-----|---------|-------|
| `lint` | `eslint .` | Backend code style |
| `test-backend` | `npm test` | Jest tests (orders, payments, reservations, wallet) |
| `test-web` | `npx jest` | Web project unit tests |
| `build-backend` | `npm run build` | TypeScript compilation + Prisma generation |
| `build-web` | `npx next build` | Next.js production build |

### Environment Variables

Key variables across services:

| Variable | Service | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | Backend | PostgreSQL connection string |
| `REDIS_URL` | Backend | Redis connection (rate limiting + sessions) |
| `JWT_ACCESS_SECRET_CURRENT` | Backend | Access token signing (64+ chars in production) |
| `JWT_REFRESH_SECRET_CURRENT` | Backend | Refresh token signing |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Backend | Payment processing |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | Webhook HMAC verification |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Backend | Email delivery (OTP, notifications) |
| `EXPO_ACCESS_TOKEN` | Backend | Expo Push API for notifications |
| `GOOGLE_CLIENT_ID` | Backend + Web | Google OAuth |
| `SENTRY_DSN` | All | Error tracking |
| `ALLOWED_ORIGINS` | Backend | CORS whitelist (production) |
| `NEXT_PUBLIC_API_URL` | Web | Backend API URL for web client |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Web | Google Maps integration |
| `EXPO_PUBLIC_API_URL` | Mobile | Backend API URL for mobile client |

## Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Expo CLI (`npx expo`)
- Android Studio / Xcode (for mobile builds)

### Backend

```bash
cd backend
cp .env.example .env      # Configure DATABASE_URL, etc.
npm install
npx prisma db push        # Create tables
npm run db:seed           # Seed with sample data
npm run dev               # → http://localhost:3002
```

API docs available at http://localhost:3002/api/docs (Swagger UI).

### Web Admin

```bash
cd seat-sip-web
cp .env.example .env.local
npm install
npm run dev               # → http://localhost:3001
```

### Mobile

```bash
cd seatsip-frontend
npm install
npx expo start            # Expo dev server
# Scan QR code with Expo Go, or press 'a' for Android / 'i' for iOS
```

### Running Tests

```bash
# Backend tests
cd backend && npm test

# Web tests
cd seat-sip-web && npm test

# Mobile tests
cd seatsip-frontend && npx jest
```

## API Documentation

Full OpenAPI 3.0 specification is available at `backend/src/api/swagger.ts`. When running locally, visit `/api/docs` for the Swagger UI interface.

Key endpoint categories:
- `GET /api/v1/cafes` — List cafés with filters (city, mood, search, sort)
- `POST /api/v1/orders` — Place an order
- `POST /api/v1/reservations` — Book a table
- `POST /api/v1/auth/register` — User registration
- `POST /api/v1/auth/login` — User login
- `POST /api/v1/payments/webhook` — Razorpay webhook (HMAC verified)
- `GET /api/v1/admin/stats` — Admin dashboard statistics
- `POST /api/v1/admin/notifications/send` — Broadcast push + in-app notifications

## Key Design Decisions

1. **Payment bypass removed**: HMAC verification is the only allowed payment validation path — no `demo_bypass_signature`
2. **Webhook idempotency**: `IdempotencyKey` model with unique `razorpay_payment_id` prevents duplicate webhook processing
3. **Redis for sessions**: In-memory `Map` replaced with Redis for mobile location sessions — enables horizontal scaling
4. **Pino logging**: Structured JSON log output with PII redaction — replaces `console.*` / morgan
5. **Separate push token table**: `DevicePushToken` decoupled from `User` — supports multi-device push
6. **Subscription auto-renew**: Charges wallet on expiry; if insufficient, disables auto-renew and notifies user
7. **Priority redemption**: Subscribers get 10% discount on reward points cost
8. **Lazy maplibre-gl**: Dynamically imported on web only — keeps mobile bundle size smaller

## License

Private — SeatSip
