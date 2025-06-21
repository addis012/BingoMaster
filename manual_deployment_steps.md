# Manual VPS Deployment Steps

Follow these exact commands on your VPS to deploy BingoMaster:

## Step 1: Connect to Your VPS
```bash
ssh root@your-vps-ip
# or
ssh username@your-vps-ip
```

## Step 2: Create Non-Root User (if needed)
```bash
adduser bingomaster
usermod -aG sudo bingomaster
su - bingomaster
```

## Step 3: Upload Your Code
Choose one method:

### Method A: Download from Replit
```bash
# Create app directory
sudo mkdir -p /var/www/bingomaster
sudo chown $USER:$USER /var/www/bingomaster
cd /var/www/bingomaster

# Download your code (you'll need to export from Replit first)
# Then upload via SCP from your local machine:
# scp -r /path/to/exported/code/* username@your-vps-ip:/var/www/bingomaster/
```

### Method B: Git Clone (if you have a repository)
```bash
cd /var/www
sudo git clone https://github.com/yourusername/bingomaster.git
sudo chown -R $USER:$USER bingomaster
cd bingomaster
```

## Step 4: Run the Deployment Script
```bash
# Make script executable
chmod +x deploy_to_vps.sh

# Run deployment script
./deploy_to_vps.sh
```

## Step 5: Manual Commands (if you prefer step-by-step)

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Setup Database
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE bingomaster;
CREATE USER bingomaster_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingomaster_user;
ALTER USER bingomaster_user CREATEDB;
\q
```

### Install PM2 and Nginx
```bash
sudo npm install -g pm2
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Application
```bash
cd /var/www/bingomaster
npm install
npm run build

# Create environment file
cp .env.production.example .env.production
nano .env.production
```

Update these values in `.env.production`:
```env
DATABASE_URL=postgresql://bingomaster_user:your_secure_password_here@localhost:5432/bingomaster
SESSION_SECRET=run_this_command_to_generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
CORS_ORIGIN=https://yourdomain.com
```

### Deploy Database Schema
```bash
npm run db:push
```

### Start with PM2
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/bingomaster
```

Paste the Nginx configuration from the deployment guide, then:
```bash
sudo ln -s /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Configure Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Step 6: SSL Certificate (after DNS is configured)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Verify Deployment
```bash
# Check application status
pm2 status
pm2 logs bingomaster

# Check Nginx status
sudo systemctl status nginx

# Check if app responds
curl http://localhost:3000
curl http://yourdomain.com
```

## Troubleshooting Commands
```bash
# Check application logs
pm2 logs bingomaster --lines 50

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check database connection
psql -h localhost -U bingomaster_user -d bingomaster

# Restart services
pm2 restart bingomaster
sudo systemctl restart nginx
sudo systemctl restart postgresql
```

## DNS Configuration
Point these DNS records to your VPS IP:
- A record: yourdomain.com → YOUR_VPS_IP
- A record: www.yourdomain.com → YOUR_VPS_IP

## Post-Deployment Checklist
- [ ] Application accessible via domain
- [ ] SSL certificate installed
- [ ] PM2 monitoring working
- [ ] Database schema deployed
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Environment variables secured