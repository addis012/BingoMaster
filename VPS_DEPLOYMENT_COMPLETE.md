# BingoMaster VPS Deployment Guide
## Server Details
- **Hostname**: aradabingo
- **IP**: 91.99.161.246
- **OS**: Ubuntu 22.04
- **Location**: Nuremberg

## Step 1: Initial Server Setup

### Connect to your VPS
```bash
ssh root@91.99.161.246
```

### Update system packages
```bash
apt update && apt upgrade -y
```

### Install essential packages
```bash
apt install -y curl wget git nginx postgresql postgresql-contrib nodejs npm build-essential
```

### Setup Node.js 20 (required for BingoMaster)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

### Verify installations
```bash
node --version  # Should show v20.x
npm --version
nginx -v
psql --version
```

## Step 2: PostgreSQL Database Setup

### Switch to postgres user and create database
```bash
sudo -u postgres psql
```

### In PostgreSQL prompt, run:
```sql
CREATE DATABASE bingomaster;
CREATE USER bingouser WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingouser;
ALTER USER bingouser CREATEDB;
\q
```

### Configure PostgreSQL for network connections
```bash
# Edit postgresql.conf
nano /etc/postgresql/14/main/postgresql.conf
```

Add/modify these lines:
```
listen_addresses = 'localhost'
port = 5432
```

### Edit pg_hba.conf for authentication
```bash
nano /etc/postgresql/14/main/pg_hba.conf
```

Add this line:
```
local   bingomaster     bingouser                               md5
```

### Restart PostgreSQL
```bash
systemctl restart postgresql
systemctl enable postgresql
```

## Step 3: Deploy BingoMaster Application

### Create application directory
```bash
mkdir -p /var/www/bingomaster
cd /var/www/bingomaster
```

### Clone or upload your BingoMaster files
```bash
# If using git (recommended)
git clone your-bingomaster-repo.git .

# Or upload files via SCP from your local machine:
# scp -r /path/to/bingomaster root@91.99.161.246:/var/www/bingomaster/
```

### Install dependencies
```bash
npm install
```

### Create production environment file
```bash
nano .env.production
```

Add these environment variables:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingouser:your_secure_password_here@localhost:5432/bingomaster
SESSION_SECRET=your_very_long_random_session_secret_here_at_least_32_characters
CORS_ORIGIN=https://aradabingo.yourdomain.com
```

### Build the application
```bash
npm run build
```

### Run database migrations
```bash
npm run db:push
```

## Step 4: Process Management with PM2

### Install PM2 globally
```bash
npm install -g pm2
```

### Create PM2 ecosystem file
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'bingomaster',
    script: 'dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
```

### Create logs directory and start application
```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

## Step 5: Nginx Reverse Proxy Configuration

### Create Nginx configuration
```bash
nano /etc/nginx/sites-available/bingomaster
```

```nginx
server {
    listen 80;
    server_name aradabingo.yourdomain.com 91.99.161.246;

    # Serve static files directly
    location /voices/ {
        alias /var/www/bingomaster/public/voices/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        alias /var/www/bingomaster/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket support for real-time bingo
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API and app routes
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### Enable the site and restart Nginx
```bash
ln -s /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
systemctl enable nginx
```

## Step 6: SSL Certificate with Let's Encrypt (Optional but Recommended)

### Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### Obtain SSL certificate (replace with your domain)
```bash
certbot --nginx -d aradabingo.yourdomain.com
```

## Step 7: Firewall Configuration

### Setup UFW firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

## Step 8: Monitoring and Maintenance

### Check application status
```bash
pm2 status
pm2 logs bingomaster
```

### Monitor system resources
```bash
htop
df -h
free -h
```

### Database backup script
```bash
nano /root/backup-bingomaster.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U bingouser bingomaster > /root/backups/bingomaster_$DATE.sql
find /root/backups/ -name "bingomaster_*.sql" -mtime +7 -delete
```

```bash
chmod +x /root/backup-bingomaster.sh
mkdir -p /root/backups
crontab -e
```

Add daily backup at 2 AM:
```
0 2 * * * /root/backup-bingomaster.sh
```

## Step 9: Multi-Shop Configuration

### Domain Setup Options:

**Option 1: Subdomains**
- shop1.aradabingo.com
- shop2.aradabingo.com
- admin.aradabingo.com

**Option 2: Path-based**
- aradabingo.com/shop1
- aradabingo.com/shop2
- aradabingo.com/admin

**Option 3: Multiple domains**
- shop1bingo.com
- shop2bingo.com
- aradabingo.com (main admin)

### Your BingoMaster system already supports multi-shop through:
- Shop ID system in database
- Role-based access (Super Admin → Admin → Employee → Collector)
- Isolated shop data and financial tracking

## Step 10: Final Verification

### Test your deployment:
1. Visit `http://91.99.161.246` or your domain
2. Create super admin account
3. Add shops and admins
4. Test real-time bingo functionality
5. Verify voice system works
6. Test WebSocket connections

### Performance optimization:
```bash
# Optimize PostgreSQL
nano /etc/postgresql/14/main/postgresql.conf
```

Add:
```
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
```

```bash
systemctl restart postgresql
```

## Troubleshooting

### Common issues:
1. **Port 5000 conflicts**: Change PORT in .env.production
2. **Database connection**: Check PostgreSQL credentials
3. **WebSocket issues**: Verify Nginx WebSocket configuration
4. **Voice files**: Ensure `/voices/` directory has correct permissions

### Logs to check:
```bash
pm2 logs bingomaster
tail -f /var/log/nginx/error.log
journalctl -u postgresql
```

## Next Steps for Multiple Shops

1. **Domain Configuration**: Point your domains to 91.99.161.246
2. **Shop Registration**: Use super admin to create shop accounts
3. **Training**: Train shop admins on the system
4. **Monitoring**: Set up system monitoring and alerts

Your BingoMaster system is now production-ready for multiple Ethiopian bingo shops!