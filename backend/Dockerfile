# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine AS production
WORKDIR /app
# age + AWS CLI for encrypted DB backups to S3 (see src/db/backup.ts)
RUN apk add --no-cache dumb-init age aws-cli
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ecosystem.config.js ./
COPY package.json ./
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"
CMD ["dumb-init", "npx", "pm2-runtime", "ecosystem.config.js", "--env", "production"]
