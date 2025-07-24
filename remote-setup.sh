#!/bin/bash

# BingoMaster VPS Setup Script
# This will be executed on the remote VPS

echo "🚀 Starting BingoMaster VPS setup..."

# Variables
DB_PASSWORD="BingoMaster2025!SecurePass"
SESSION_SECRET="BingoMaster_Super_Secret_Session_Key_2025_Ethiopian_Bingo_System_Ultra_Secure"
APP_DIR="/var/www/bingomaster"

# Update system
echo "📦 Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt update -y && apt upgrade -y

# Install packages
echo "🔧 Installing packages..."
apt install -y curl wget git nginx postgresql postgresql-contrib build-essential ufw htop

# Install Node.js 20
echo "📱 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Setup PostgreSQL
echo "🗄️ Setting up database..."
systemctl start postgresql
systemctl enable postgresql

# Create database
sudo -u postgres psql << 'PSQL'
DROP DATABASE IF EXISTS bingomaster;
DROP USER IF EXISTS bingouser;
CREATE DATABASE bingomaster;
CREATE USER bingouser WITH ENCRYPTED PASSWORD 'BingoMaster2025!SecurePass';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingouser;
ALTER USER bingouser CREATEDB;
ALTER DATABASE bingomaster OWNER TO bingouser;
\q
PSQL

# Configure PostgreSQL
PG_VERSION=$(ls /etc/postgresql/ | head -1)
echo "local   bingomaster     bingouser                               md5" >> "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
systemctl restart postgresql

# Create app directory
mkdir -p $APP_DIR/logs
cd $APP_DIR

# Create environment
cat > .env.production << 'ENV'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingouser:BingoMaster2025!SecurePass@localhost:5432/bingomaster
SESSION_SECRET=BingoMaster_Super_Secret_Session_Key_2025_Ethiopian_Bingo_System_Ultra_Secure
CORS_ORIGIN=http://91.99.161.246
ENV

# Install PM2
npm install -g pm2

# Setup Nginx
cat > /etc/nginx/sites-available/bingomaster << 'NGINX'
server {
    listen 80 default_server;
    server_name _;
    
    location /voices/ {
        alias /var/www/bingomaster/public/voices/;
        expires 1y;
    }
    
    location /assets/ {
        alias /var/www/bingomaster/dist/client/assets/;
        expires 1y;
    }
    
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Setup firewall
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

echo "✅ VPS setup complete! Ready for BingoMaster deployment."