import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SeatSip API',
      version: '1.0.0',
      description: 'SeatSip Backend API Documentation',
    },
    servers: [
      { url: 'http://localhost:3002', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/api/**/*.ts'],
};

const spec = swaggerJsdoc(options);
export default spec;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         email: { type: string }
 *         phone: { type: string, nullable: true }
 *         role: { type: string, enum: [USER, ADMIN, CAFE_OWNER] }
 *         wallet_balance: { type: number }
 *         loyalty_points: { type: integer }
 *         loyalty_tier: { type: string }
 *         avatar: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean }
 *         token: { type: string }
 *         user: { $ref: '#/components/schemas/User' }
 *         data:
 *           type: object
 *           properties:
 *             user: { $ref: '#/components/schemas/User' }
 *             accessToken: { type: string }
 *             refreshToken: { type: string }
 *
 *     Cafe:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string }
 *         address: { type: string }
 *         city: { type: string }
 *         latitude: { type: number }
 *         longitude: { type: number }
 *         phone: { type: string }
 *         email: { type: string }
 *         image_url: { type: string, nullable: true }
 *         rating: { type: number }
 *         review_count: { type: integer }
 *         is_active: { type: boolean }
 *         open_time: { type: string }
 *         close_time: { type: string }
 *         price_level: { type: integer }
 *         priority: { type: integer }
 *
 *     MenuItem:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         description: { type: string }
 *         price: { type: number }
 *         category_id: { type: string }
 *         is_available: { type: boolean }
 *         is_popular: { type: boolean }
 *         image_url: { type: string, nullable: true }
 *         prep_time_minutes: { type: integer }
 *         stock_quantity: { type: integer }
 *         customizations: { type: string }
 *
 *     Order:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         user_id: { type: string }
 *         cafe_id: { type: string }
 *         status: { type: string, enum: [PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED] }
 *         order_type: { type: string, enum: [DINE_IN, TAKEOUT, DELIVERY] }
 *         subtotal: { type: number }
 *         tax: { type: number }
 *         delivery_fee: { type: number }
 *         total: { type: number }
 *         payment_status: { type: string }
 *         payment_method: { type: string }
 *         items: { type: string }
 *         created_at: { type: string, format: date-time }
 *
 *     Reservation:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         user_id: { type: string }
 *         cafe_id: { type: string }
 *         table_id: { type: string, nullable: true }
 *         date: { type: string }
 *         time: { type: string }
 *         party_size: { type: integer }
 *         status: { type: string, enum: [CONFIRMED, COMPLETED, CANCELLED, NO_SHOW] }
 *         confirmation_code: { type: string }
 *         special_requests: { type: string, nullable: true }
 *         pre_order_items: { type: string }
 *         pre_order_total: { type: number }
 *         duration_minutes: { type: integer }
 *         created_at: { type: string, format: date-time }
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success: { type: boolean, default: false }
 *         message: { type: string }
 *         requestId: { type: string }
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 10 }
 *               phone: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Tokens refreshed
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @swagger
 * /api/v1/auth/forgot-password/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               channel: { type: string, enum: [email, phone], default: email }
 *     responses:
 *       200:
 *         description: OTP sent if email is registered
 *
 * /api/v1/auth/forgot-password/reset:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, password]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *               password: { type: string, minLength: 10 }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP or email
 */

/**
 * @swagger
 * /api/v1/cafes:
 *   get:
 *     tags: [Cafes]
 *     summary: List cafes with filters
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: mood
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [rating, name, price, distance] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: List of cafes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Cafe'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     limit: { type: integer }
 *                     offset: { type: integer }
 */

/**
 * @swagger
 * /api/v1/cafes/{id}:
 *   get:
 *     tags: [Cafes]
 *     summary: Get cafe by ID or slug
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cafe details with menu items
 *       404:
 *         description: Cafe not found
 *
 * /api/v1/cafes/{id}/menu:
 *   get:
 *     tags: [Cafes]
 *     summary: Get cafe menu with categories
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Menu organized by category
 *       404:
 *         description: Cafe not found
 */

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cafe_id, items]
 *             properties:
 *               cafe_id: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     menu_item_id: { type: string }
 *                     quantity: { type: integer, minimum: 1 }
 *               order_type: { type: string, enum: [DINE_IN, TAKEOUT, DELIVERY] }
 *               payment_method: { type: string, enum: [WALLET, UPI, CARD] }
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Insufficient stock or wallet balance
 *
 *   get:
 *     tags: [Orders]
 *     summary: List user orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: List of orders
 *
 * /api/v1/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *
 * /api/v1/orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel an order
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Order cannot be cancelled
 */

/**
 * @swagger
 * /api/v1/payments/razorpay/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid signature
 */

/**
 * @swagger
 * /api/v1/reservations:
 *   post:
 *     tags: [Reservations]
 *     summary: Create a reservation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cafe_id, date, time, party_size]
 *             properties:
 *               cafe_id: { type: string }
 *               table_id: { type: string }
 *               date: { type: string, format: date }
 *               time: { type: string, pattern: "^([01]?\\d|2[0-3]):[0-5]\\d" }
 *               party_size: { type: integer, minimum: 1, maximum: 20 }
 *               special_requests: { type: string }
 *               duration_minutes: { type: integer }
 *     responses:
 *       201:
 *         description: Reservation created
 *       404:
 *         description: Cafe not found
 *       409:
 *         description: Table already booked
 *
 *   get:
 *     tags: [Reservations]
 *     summary: List user reservations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *
 * /api/v1/reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get reservation by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation details
 *       404:
 *         description: Reservation not found
 *
 * /api/v1/reservations/{id}/cancel:
 *   patch:
 *     tags: [Reservations]
 *     summary: Cancel a reservation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reservation cancelled
 *       400:
 *         description: Reservation already cancelled/completed
 */
