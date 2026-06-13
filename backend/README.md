# SeatSip Backend API

A production-ready REST API for the SeatSip café discovery, table reservation, and ordering platform.

## Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite via `better-sqlite3` (zero-config, file-based)
- **Auth**: JWT (access + refresh tokens)
- **Language**: TypeScript

## Prerequisites
- Node.js 18+
- npm or yarn
- Python 3 + build tools (for native SQLite module):
  - **macOS**: `xcode-select --install`
  - **Ubuntu/Debian**: `sudo apt install build-essential python3`
  - **Windows**: Install "Desktop development with C++" via Visual Studio Build Tools

## Setup & Run

```bash
# 1. Install dependencies
npm install

# 2. Initialize & seed the database
npm run db:seed

# 3. Start development server
npm run dev

# OR build and run production
npm run build && npm start
```

Server runs at: **http://localhost:3000**

## Test Credentials
| Role  | Email                  | Password    |
|-------|------------------------|-------------|
| User  | arjun@example.com      | password123 |
| User  | priya@example.com      | password123 |
| Admin | admin@seatsip.com      | admin123    |

## API Endpoints

### Auth
| Method | Path                        | Auth | Description             |
|--------|-----------------------------|------|-------------------------|
| POST   | /api/v1/auth/register       | No   | Register new user       |
| POST   | /api/v1/auth/login          | No   | Login                   |
| POST   | /api/v1/auth/refresh        | No   | Refresh access token    |
| POST   | /api/v1/auth/logout         | Yes  | Logout                  |
| GET    | /api/v1/auth/me             | Yes  | Get current user        |
| GET    | /api/v1/auth/check-email    | No   | Check email availability|

### Cafes
| Method | Path                        | Auth | Description             |
|--------|-----------------------------|------|-------------------------|
| GET    | /api/v1/cafes               | No   | List cafes (filterable) |
| GET    | /api/v1/cafes/:id           | No   | Get cafe details        |
| GET    | /api/v1/cafes/:id/menu      | No   | Get cafe menu           |
| GET    | /api/v1/cafes/:id/tables    | No   | Get available tables    |
| GET    | /api/v1/cafes/:id/reviews   | No   | Get cafe reviews        |
| POST   | /api/v1/cafes/:id/reviews   | Yes  | Post a review           |

### Orders
| Method | Path                        | Auth | Description        |
|--------|-----------------------------|------|--------------------|
| GET    | /api/v1/orders              | Yes  | My order history   |
| GET    | /api/v1/orders/:id          | Yes  | Order details      |
| POST   | /api/v1/orders              | Yes  | Place an order     |
| PATCH  | /api/v1/orders/:id/cancel   | Yes  | Cancel order       |

### Reservations
| Method | Path                            | Auth | Description           |
|--------|---------------------------------|------|-----------------------|
| GET    | /api/v1/reservations            | Yes  | My reservations       |
| GET    | /api/v1/reservations/:id        | Yes  | Reservation details   |
| POST   | /api/v1/reservations            | Yes  | Book a table          |
| PATCH  | /api/v1/reservations/:id/cancel | Yes  | Cancel reservation    |

### Cart
| Method | Path                   | Auth | Description        |
|--------|------------------------|------|--------------------|
| GET    | /api/v1/cart           | Yes  | Get cart           |
| POST   | /api/v1/cart/add       | Yes  | Add item to cart   |
| PATCH  | /api/v1/cart/:id       | Yes  | Update quantity    |
| DELETE | /api/v1/cart/clear     | Yes  | Clear cart         |

### Users & Wallet
| Method | Path                              | Auth | Description             |
|--------|-----------------------------------|------|-------------------------|
| GET    | /api/v1/users/profile             | Yes  | Get profile             |
| PATCH  | /api/v1/users/profile             | Yes  | Update profile          |
| POST   | /api/v1/users/wallet/topup        | Yes  | Top up wallet           |
| GET    | /api/v1/users/wallet/transactions | Yes  | Wallet history          |

### Notifications
| Method | Path                              | Auth | Description         |
|--------|-----------------------------------|------|---------------------|
| GET    | /api/v1/notifications             | Yes  | Get notifications   |
| PATCH  | /api/v1/notifications/read-all    | Yes  | Mark all read       |

## Query Parameters

### GET /api/v1/cafes
- `city` — filter by city (e.g. `Bengaluru`)
- `mood` — filter by mood tag (e.g. `work`, `date`, `chill`)
- `search` — text search across name, description, address
- `sort` — `rating` (default), `name`, `price`
- `limit` / `offset` — pagination

### GET /api/v1/cafes/:id/tables
- `date` — YYYY-MM-DD format
- `time` — HH:MM format (24h)
- `party_size` — minimum seat count

## Request Examples

### Register
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123","phone":"+91-9999999999"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"arjun@example.com","password":"password123"}'
```

### Get Cafes
```bash
curl http://localhost:3000/api/v1/cafes?city=Bengaluru&mood=work
```

### Place Order
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cafe_id": "<cafe-id>",
    "order_type": "DINE_IN",
    "payment_method": "WALLET",
    "items": [
      {"menu_item_id": "<item-id>", "quantity": 2}
    ]
  }'
```

### Book a Table
```bash
curl -X POST http://localhost:3000/api/v1/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "cafe_id": "<cafe-id>",
    "table_id": "<table-id>",
    "date": "2026-05-01",
    "time": "19:00",
    "party_size": 2,
    "special_requests": "Window seat preferred",
    "pre_order_items": [
      {"menu_item_id": "<item-id>", "quantity": 1}
    ]
  }'
```

## Database Schema

The SQLite database (`seatsip.db`) is created automatically on first run. Tables:
- `users` — user accounts, wallet, loyalty points
- `refresh_tokens` — JWT refresh token store
- `cafes` — café listings with geo, moods, tags
- `tables` — physical tables per café with floor plan positions
- `menu_categories` — menu sections per café
- `menu_items` — individual menu items with pricing
- `orders` — customer orders with line items (JSON)
- `reservations` — table bookings with optional pre-order
- `reviews` — user reviews per café
- `cart_items` — per-user shopping cart
- `wallet_transactions` — wallet top-up / debit history
- `notifications` — in-app notification inbox

## Environment Variables (.env)

```env
PORT=3000
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-change-this
NODE_ENV=development
DB_PATH=./seatsip.db
CORS_ORIGIN=*
```

## Mobile App Integration

Update the mobile app's API base URL to point to this server:
```
http://<your-ip>:3000/api/v1
```

Use `ifconfig` (macOS/Linux) or `ipconfig` (Windows) to find your local IP if testing on a physical device.
