# Bingo App Deployment Guide

## Server Information
- **IP**: 91.99.161.246
- **OS**: Ubuntu 22.04
- **Hostname**: aradabingo
- **Location**: Nuremberg

## Quick Deployment Steps

### Option 1: Automated Deployment (Recommended)

1. **Make scripts executable locally:**
   ```bash
   chmod +x deploy.sh transfer-files.sh
   ```

2. **Transfer files to server:**
   ```bash
   ./transfer-files.sh
   ```

3. **SSH into server and run deployment:**
   ```bash
   ssh root@91.99.161.246
   cd /var/www/bingo-app
   ./deploy.sh
   ```

### Option 2: Manual Deployment

1. **Connect to server:**
   ```bash
   ssh root@91.99.161.246
   ```

2. **Install dependencies:**
   ```bash
   # Update system
   apt update && apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt-get install -y nodejs
   
   # Install PostgreSQL
   apt install postgresql postgresql-contrib -y
   
   # Install PM2 and Nginx
   npm install -g pm2
   apt install nginx -y
   ```

3. **Setup database:**
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE bingo_app;"
   sudo -u postgres psql -c "CREATE USER bingo_user WITH PASSWORD 'BingoSecure2024!';"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bingo_app TO bingo_user;"
   ```

4. **Upload application files:**
   - Use SCP, SFTP, or Git clone to transfer files to `/var/www/bingo-app`

5. **Setup application:**
   ```bash
   cd /var/www/bingo-app
   cp .env.production .env
   npm install
   npm run db:push
   ```

6. **Start with PM2:**
   ```bash
   pm2 start server/index.ts --name bingo-app --interpreter tsx
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx:**
   ```bash
   # Copy the nginx config from deploy.sh
   # Enable site and restart nginx
   nginx -t
   systemctl restart nginx
   ```

## Post-Deployment

### Access Your Application
- **Direct IP**: http://91.99.161.246
- **Domain**: http://aradabingo.com (after DNS setup)

### Default Credentials
- **Super Admin**: username `superadmin`, password `a1e2y3t4h5`
- **Admin**: username `admin`, password `123456`

### Useful Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs bingo-app

# Restart application
pm2 restart bingo-app

# Check nginx status
systemctl status nginx

# View database
sudo -u postgres psql bingo_app
```

### SSL Setup (Optional)
If you have a domain pointing to your server:
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d aradabingo.com -d www.aradabingo.com
```

## Troubleshooting

### Common Issues
1. **Port 5000 not accessible**: Check firewall settings
2. **Database connection failed**: Verify PostgreSQL is running
3. **Nginx 502 error**: Check if Node.js app is running with PM2

### Logs Location
- **Application logs**: `pm2 logs bingo-app`
- **Nginx logs**: `/var/log/nginx/error.log`
- **System logs**: `journalctl -f`

## Security Notes
- Change default database password in production
- Configure firewall properly
- Set up SSL certificates
- Regular backups of database and application files