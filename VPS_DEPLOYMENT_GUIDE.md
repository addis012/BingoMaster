# BingoMaster VPS Deployment Guide

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or CentOS 7+ VPS
- Minimum 2GB RAM, 2 CPU cores
- 20GB+ storage
- Root or sudo access

### Required Software
- Node.js 18+ 
- PostgreSQL 13+
- Nginx (reverse proxy)
- PM2 (process manager)
- SSL certificate (Let's Encrypt)

## Step 1: Server Setup

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Should show v20.x
```

### Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### Install Nginx
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 2: Database Setup

### Create Database and User
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE bingomaster;
CREATE USER bingomaster_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingomaster_user;
ALTER USER bingomaster_user CREATEDB;
\q
```

### Configure PostgreSQL for Remote Connections
```bash
sudo nano /etc/postgresql/13/main/postgresql.conf
```
Add/modify:
```
listen_addresses = 'localhost'
```

```bash
sudo nano /etc/postgresql/13/main/pg_hba.conf
```
Add:
```
local   bingomaster     bingomaster_user                     md5
```

```bash
sudo systemctl restart postgresql
```

## Step 3: Application Deployment

### Create Application Directory
```bash
sudo mkdir -p /var/www/bingomaster
sudo chown $USER:$USER /var/www/bingomaster
cd /var/www/bingomaster
```

### Clone/Upload Your Code
```bash
# Option 1: Upload via SCP/SFTP from your local machine
# Option 2: Git clone (if you have a repository)
git clone <your-repo-url> .

# Or copy files from Replit export
```

### Install Dependencies
```bash
npm install
```

### Build Application
```bash
npm run build
```

## Step 4: Environment Configuration

### Create Production Environment File
```bash
nano .env.production
```

```env
NODE_ENV=production
DATABASE_URL=postgresql://bingomaster_user:your_secure_password@localhost:5432/bingomaster
SESSION_SECRET=your_very_secure_random_string_here_64_chars_minimum
PORT=3000

# Optional: Additional security
CORS_ORIGIN=https://yourdomain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
```

### Generate Secure Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Set Environment Variables
```bash
export NODE_ENV=production
export DATABASE_URL="postgresql://bingomaster_user:your_secure_password@localhost:5432/bingomaster"
export SESSION_SECRET="your_generated_secret"
```

## Step 5: Database Schema Deployment

### Push Schema to Production Database
```bash
npm run db:push
```

### Verify Database Connection
```bash
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : 'Database connected successfully');
  pool.end();
});
"
```

## Step 6: PM2 Process Management

### Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'bingomaster',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
```

### Create Logs Directory
```bash
mkdir logs
```

### Start Application with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Monitor Application
```bash
pm2 status
pm2 logs bingomaster
pm2 monit
```

## Step 7: Nginx Reverse Proxy

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/bingomaster
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate paths (to be configured after Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Proxy to Node.js Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket Support for Real-time Features
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static File Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Increase upload size for file uploads
    client_max_body_size 10M;
}
```

### Enable Site and Test Configuration
```bash
sudo ln -s /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: SSL Certificate (Let's Encrypt)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtain SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Auto-renewal Setup
```bash
sudo crontab -e
```
Add:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 9: Firewall Configuration

### Configure UFW Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5432  # PostgreSQL (if needed for external access)
sudo ufw --force enable
sudo ufw status
```

## Step 10: Production Optimizations

### Database Optimizations
```bash
sudo nano /etc/postgresql/13/main/postgresql.conf
```

```
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# Performance settings
random_page_cost = 1.1
effective_io_concurrency = 200
```

### Node.js Production Settings
Update your `server/index.ts` for production:

```typescript
// Add production-specific configurations
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  
  // Enhanced session security
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'strict'
    }
  }));
}
```

## Step 11: Monitoring and Logging

### Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/bingomaster
```

```
/var/www/bingomaster/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
```

### System Monitoring
```bash
# Install htop for system monitoring
sudo apt install htop -y

# Monitor application
pm2 monit

# Check system resources
htop
df -h
free -h
```

## Step 12: Backup Strategy

### Database Backup Script
```bash
nano backup_db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/bingomaster"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U bingomaster_user -d bingomaster > $BACKUP_DIR/bingomaster_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: bingomaster_$DATE.sql"
```

```bash
chmod +x backup_db.sh

# Add to crontab for daily backups
crontab -e
```
Add:
```
0 2 * * * /var/www/bingomaster/backup_db.sh
```

## Step 13: Deployment Commands Summary

### Quick Deployment Checklist
```bash
# 1. Update code
git pull origin main  # or upload new files

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Update database schema if needed
npm run db:push

# 5. Restart application
pm2 restart bingomaster

# 6. Check status
pm2 status
pm2 logs bingomaster --lines 50
```

## Step 14: Domain and DNS Configuration

### DNS Records (Configure at your domain registrar)
```
A     yourdomain.com       -> YOUR_VPS_IP
A     www.yourdomain.com   -> YOUR_VPS_IP
```

### Update Environment Variables with Domain
```bash
nano .env.production
```
Add:
```
CORS_ORIGIN=https://yourdomain.com
COOKIE_DOMAIN=yourdomain.com
```

## Security Checklist

- [ ] Database user with limited privileges
- [ ] Secure session secret (64+ characters)
- [ ] SSL certificate installed and auto-renewing
- [ ] Firewall configured (UFW)
- [ ] Security headers in Nginx
- [ ] Regular system updates scheduled
- [ ] Database backups automated
- [ ] Application logs monitored
- [ ] PM2 process monitoring
- [ ] Non-root user for application

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Check database credentials
   psql -h localhost -U bingomaster_user -d bingomaster
   ```

2. **Application Won't Start**
   ```bash
   # Check PM2 logs
   pm2 logs bingomaster
   
   # Check environment variables
   pm2 show bingomaster
   ```

3. **Nginx Configuration Issues**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **SSL Certificate Issues**
   ```bash
   # Renew certificate manually
   sudo certbot renew --dry-run
   
   # Check certificate status
   sudo certbot certificates
   ```

## Performance Monitoring

### Key Metrics to Monitor
- CPU usage
- Memory usage
- Database connections
- Response times
- Error rates
- Disk space

### Monitoring Commands
```bash
# System resources
htop
free -h
df -h

# Application metrics
pm2 monit
pm2 logs bingomaster

# Database performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

Your BingoMaster application will be production-ready with this setup, providing high availability, security, and performance for your users.