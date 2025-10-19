# Deployment Guide

This guide covers deploying ChatConnect Dashboard to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Building for Production](#building-for-production)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Options](#deployment-options)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Rollback Procedures](#rollback-procedures)

## Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass (when implemented)
- [ ] TypeScript compilation succeeds: `npm run check`
- [ ] Production build completes: `npm run build`
- [ ] Environment variables are configured
- [ ] Database migrations are ready
- [ ] SSL certificates are obtained (for HTTPS)
- [ ] Secrets are securely stored (not in repository)
- [ ] Backup strategy is in place
- [ ] Monitoring tools are configured
- [ ] Error tracking is set up (e.g., Sentry)

## Building for Production

### Build Process

```bash
# Install dependencies
npm ci  # Use ci for reproducible builds

# Type check
npm run check

# Build application
npm run build
```

This creates:
```
dist/
├── public/              # Client assets (HTML, CSS, JS)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── ...
└── index.js            # Bundled server code
```

### Build Optimization

The build process automatically:
- **Minifies** JavaScript and CSS
- **Tree-shakes** unused code
- **Code-splits** by route
- **Generates hashes** for cache busting
- **Bundles server** into single file

### Build Verification

```bash
# Test production build locally
NODE_ENV=production npm start

# Visit http://localhost:5000
```

## Environment Configuration

### Required Environment Variables

Create a `.env` file in production (never commit this):

```env
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=5000
HOST=0.0.0.0  # Listen on all interfaces

# Database
DATABASE_URL=postgresql://user:password@host:5432/chatconnect_production

# Session Configuration
SESSION_SECRET=<generate-strong-random-secret-64-chars-minimum>

# Security
COOKIE_SECURE=true  # Requires HTTPS
TRUST_PROXY=true    # If behind reverse proxy (nginx, load balancer)

# Optional: External Services
# SENTRY_DSN=https://...
# AWS_S3_BUCKET=my-bucket
# OPENAI_API_KEY=sk-...
```

### Generating Secrets

```bash
# Generate session secret (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 64
```

### Environment Variable Security

**DO NOT:**
- ❌ Commit `.env` files to repository
- ❌ Share secrets in plain text
- ❌ Use weak or default secrets
- ❌ Reuse secrets across environments

**DO:**
- ✅ Use environment variable management (Vault, AWS Secrets Manager)
- ✅ Rotate secrets periodically
- ✅ Use different secrets per environment
- ✅ Document required variables in `.env.example`

### Sample .env.example

Create this file for documentation:

```env
# .env.example - Copy to .env and fill in actual values

NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@host:5432/database
SESSION_SECRET=generate-random-secret-here
COOKIE_SECURE=true
TRUST_PROXY=true
```

## Database Setup

### Production Database Preparation

1. **Create production database:**
```bash
# On production server or database host
createdb chatconnect_production
```

2. **Run migrations:**
```bash
# Push schema to production database
DATABASE_URL=<production-url> npm run db:push

# Or use migrations for more control:
npx drizzle-kit generate:pg
npx drizzle-kit migrate
```

3. **Create initial admin user** (if needed):
```sql
-- Connect to database
psql $DATABASE_URL

-- Create admin user (password should be hashed by application)
-- This is just an example - implement proper admin creation
```

### Database Connection Pooling

For production, consider connection pooling:

**Using PgBouncer:**
```bash
# Install PgBouncer
apt-get install pgbouncer  # Ubuntu/Debian

# Configure connection pooling
# /etc/pgbouncer/pgbouncer.ini
```

**Using Neon (Serverless PostgreSQL):**
Already includes connection pooling - no additional configuration needed.

### Database Backups

**Automated backups:**
```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > $BACKUP_DIR/chatconnect_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

**Setup cron job:**
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, Linode, AWS EC2)

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install nginx (reverse proxy)
sudo apt install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy Application

```bash
# Clone repository
git clone <repository-url> /var/www/chatconnect
cd /var/www/chatconnect

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name chatconnect
pm2 save
pm2 startup  # Enable auto-start on reboot
```

#### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/chatconnect
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/chatconnect /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Option 2: Docker Deployment

#### Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "dist/index.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/chatconnect
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=chatconnect
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=secure_password_here
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

#### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

### Option 3: Platform as a Service (Heroku, Railway, Render)

#### Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create chatconnect-production

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(openssl rand -hex 64)

# Deploy
git push heroku main

# Run migrations
heroku run npm run db:push

# Open application
heroku open
```

#### Railway

1. Connect GitHub repository
2. Add PostgreSQL service
3. Configure environment variables in dashboard
4. Deploy automatically on push

#### Render

1. Create Web Service from Git repository
2. Add PostgreSQL database
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Configure environment variables
6. Deploy

### Option 4: Serverless (Vercel, Netlify - requires adaptation)

**Note:** This application uses a traditional Express server with WebSockets, which doesn't fit the serverless model perfectly. Consider:

- Splitting into separate frontend (Vercel/Netlify) and backend (Railway/Render)
- Or using serverless-friendly alternatives for sessions and WebSockets

## Post-Deployment

### Verify Deployment

```bash
# Check application is running
curl https://yourdomain.com

# Check API endpoints
curl https://yourdomain.com/api/health  # If you add a health check

# Monitor logs
pm2 logs chatconnect  # PM2
docker-compose logs -f  # Docker
heroku logs --tail  # Heroku
```

### Health Check Endpoint

Add to `server/routes.ts`:

```typescript
export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // ... other routes
}
```

### Database Indexes

For production performance, add indexes:

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_chat_messages_widget_id ON chat_messages(widget_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

## Monitoring & Maintenance

### Application Monitoring

**PM2 Monitoring:**
```bash
pm2 monit  # Real-time monitoring
pm2 status  # Check status
pm2 logs chatconnect --lines 100  # View logs
```

**Add health checks:**
```bash
# PM2 ecosystem file
module.exports = {
  apps: [{
    name: 'chatconnect',
    script: 'dist/index.js',
    instances: 2,  # Cluster mode
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

### Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/tracing
```

```typescript
// server/index.ts
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Add error handler
app.use(Sentry.Handlers.errorHandler());
```

### Log Management

**Centralized logging:**
- **Papertrail** - Cloud log management
- **Loggly** - Log aggregation
- **DataDog** - Full observability platform

### Uptime Monitoring

Free options:
- **UptimeRobot** - https://uptimerobot.com
- **Pingdom** - https://www.pingdom.com
- **StatusCake** - https://www.statuscake.com

### Backup Verification

```bash
# Test backup restoration monthly
pg_restore -d test_database backup.sql
```

## Rollback Procedures

### Rolling Back a Deployment

**With PM2:**
```bash
# Stop current version
pm2 stop chatconnect

# Checkout previous version
git checkout <previous-commit>
npm ci
npm run build

# Restart
pm2 restart chatconnect
```

**With Docker:**
```bash
# Use previous image tag
docker-compose down
docker-compose pull app:previous-tag
docker-compose up -d
```

**With Heroku:**
```bash
# Rollback to previous release
heroku rollback
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d chatconnect backup_file.sql

# Or specific migrations
npx drizzle-kit drop  # Drop last migration
```

### Zero-Downtime Deployments

**Blue-Green Deployment:**
1. Deploy new version to separate server (green)
2. Test thoroughly
3. Switch load balancer to green server
4. Keep blue server as rollback option

**Rolling Updates:**
```bash
# PM2 cluster mode with reload
pm2 reload chatconnect  # Zero-downtime restart
```

## Performance Optimization

### Caching Strategy

```nginx
# Nginx caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Connection Pool

```typescript
// Increase pool size for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Enable Compression

```typescript
// server/index.ts
import compression from 'compression';

app.use(compression());
```

## Security Hardening

### Production Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured (nginx/helmet.js)
- [ ] Rate limiting implemented
- [ ] CSRF protection enabled
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS protection (React escapes by default)
- [ ] Secure cookies (httpOnly, secure, sameSite)
- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] Regular security updates
- [ ] Firewall configured (only ports 80, 443, 22 open)

### Helmet.js Security Headers

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## Scaling Considerations

### Horizontal Scaling

**Load Balancing:**
- Use nginx/HAProxy for load distribution
- Session store must be centralized (PostgreSQL sessions work)
- Use Redis for session store at scale

**Multiple Instances:**
```bash
# PM2 cluster mode
pm2 start dist/index.js -i max  # Use all CPU cores
```

### Database Scaling

- **Read replicas** for read-heavy workloads
- **Connection pooling** (PgBouncer)
- **Query optimization** and indexing
- **Caching layer** (Redis) for frequent queries

---

## Troubleshooting Production Issues

### Application Won't Start

```bash
# Check logs
pm2 logs chatconnect --err
journalctl -u chatconnect  # systemd
docker-compose logs app

# Common issues:
# - Missing environment variables
# - Database connection failed
# - Port already in use
# - Build artifacts missing
```

### High Memory Usage

```bash
# Check memory
pm2 list
free -h

# Restart application
pm2 restart chatconnect
```

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

---

**Remember:** Always test thoroughly in a staging environment before deploying to production!
