#!/bin/bash

# Bingo App Deployment Script for Ubuntu 22.04
# Run this script on your server after uploading the files

set -e

echo "🚀 Starting Bingo App Deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 20
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt install postgresql postgresql-contrib -y

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install nginx
echo "📦 Installing Nginx..."
apt install nginx -y

# Setup PostgreSQL
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE bingo_app;"
sudo -u postgres psql -c "CREATE USER bingo_user WITH PASSWORD 'BingoSecure2024!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bingo_app TO bingo_user;"

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/bingo-app
cd /var/www/bingo-app

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingo_user:BingoSecure2024!@localhost:5432/bingo_app
EOF

# Install dependencies (assumes package.json is already uploaded)
echo "📦 Installing application dependencies..."
npm install

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Create PM2 ecosystem file
echo "⚙️ Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bingo-app',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
echo "🔧 Configuring Nginx..."
cat > /etc/nginx/sites-available/bingo-app << 'EOF'
server {
    listen 80;
    server_name aradabingo.com www.aradabingo.com 91.99.161.246;

    client_max_body_size 100M;

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle static assets
    location /assets/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/bingo-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

echo "✅ Deployment completed successfully!"
echo "📍 Your application is now accessible at:"
echo "   - HTTP: http://91.99.161.246"
echo "   - Domain: http://aradabingo.com (if DNS is configured)"
echo ""
echo "🔧 Useful commands:"
echo "   - Check app status: pm2 status"
echo "   - View app logs: pm2 logs bingo-app"
echo "   - Restart app: pm2 restart bingo-app"
echo "   - Check nginx status: systemctl status nginx"