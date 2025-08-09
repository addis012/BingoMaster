#!/bin/bash

# BingoMaster VPS Deployment Fix Script
# This script addresses common deployment issues

set -e

echo "🔧 BingoMaster VPS Deployment Fix Starting..."

VPS_IP="91.99.161.246"
APP_DIR="/var/www/bingo-app"

echo "📊 Checking current deployment status..."

# Check if PM2 is running
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "❌ App directory not found. Creating $APP_DIR..."
    mkdir -p $APP_DIR
    cd $APP_DIR
else
    cd $APP_DIR
fi

# Create proper environment file with PostgreSQL connection
echo "⚙️ Creating production environment file..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingo_user:BingoSecure2024!@localhost:5432/bingo_app
SESSION_SECRET=bingo-session-secret-production-key-longer-for-security
PGHOST=localhost
PGPORT=5432
PGUSER=bingo_user
PGPASSWORD=BingoSecure2024!
PGDATABASE=bingo_app
EOF

echo "🗄️ Setting up PostgreSQL database..."
# Ensure PostgreSQL is running
systemctl start postgresql
systemctl enable postgresql

# Create database and user (ignore errors if they already exist)
sudo -u postgres psql -c "CREATE DATABASE bingo_app;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER bingo_user WITH PASSWORD 'BingoSecure2024!';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bingo_app TO bingo_user;" 2>/dev/null || echo "Privileges already granted"
sudo -u postgres psql -c "ALTER USER bingo_user CREATEDB;" 2>/dev/null || echo "User already has CREATEDB"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
    
    echo "🗄️ Running database migrations..."
    npm run db:push
else
    echo "❌ package.json not found. Please upload your application files first."
    exit 1
fi

# Create PM2 ecosystem file with proper configuration
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
    },
    error_file: '/var/log/bingo-app-error.log',
    out_file: '/var/log/bingo-app-out.log',
    log_file: '/var/log/bingo-app.log'
  }]
};
EOF

# Stop any existing PM2 processes
echo "🔄 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || echo "No existing processes to stop"
pm2 delete all 2>/dev/null || echo "No existing processes to delete"

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure Nginx with WebSocket support
echo "🔧 Configuring Nginx with WebSocket support..."
cat > /etc/nginx/sites-available/bingo-app << 'EOF'
server {
    listen 80;
    server_name aradabingo.com www.aradabingo.com 91.99.161.246;

    client_max_body_size 100M;

    # Main application proxy
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
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization";
    }

    # Handle static assets
    location /assets/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle audio files
    location /voices/ {
        proxy_pass http://localhost:5000;
        add_header Access-Control-Allow-Origin *;
    }
}
EOF

# Enable site and test nginx
ln -sf /etc/nginx/sites-available/bingo-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    systemctl enable nginx
    echo "✅ Nginx configuration successful"
else
    echo "❌ Nginx configuration failed"
    exit 1
fi

# Setup firewall
echo "🔒 Configuring firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 5000
ufw --force enable

# Create initial super admin user in database
echo "👤 Creating initial super admin user..."
sudo -u postgres psql -d bingo_app -c "
INSERT INTO users (username, password, role, name, email, credit_balance, commission_rate) 
VALUES ('superadmin', '\$2b\$10\$Qct/N6ONolv5uVvaqnwP0eXYm2K3IvuREtSjB3EwfJTIqGWVh54Ye', 'super_admin', 'Super Administrator', 'admin@bingomaster.com', 0.00, 0.00)
ON CONFLICT (username) DO NOTHING;
" 2>/dev/null || echo "Super admin user already exists or table not ready"

echo "✅ Deployment fix completed!"
echo ""
echo "📍 Your application should now be accessible at:"
echo "   - HTTP: http://91.99.161.246"
echo "   - Domain: http://aradabingo.com (if DNS is configured)"
echo ""
echo "🔧 Check status with these commands:"
echo "   - pm2 status"
echo "   - pm2 logs bingo-app"
echo "   - systemctl status nginx"
echo "   - systemctl status postgresql"
echo ""
echo "🔑 Login credentials:"
echo "   - Username: superadmin"
echo "   - Password: password"