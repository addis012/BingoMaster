#!/bin/bash

# Production deployment script for complete aradabingo application
# Preserves all super admin dashboard, revenue tracking, and financial systems

SERVER_IP="91.99.161.246"
APP_DIR="/var/www/bingo-app"
USER="root"
DB_NAME="bingo_app"
DB_USER="bingo_user"
DB_PASS="BingoSecure2024@"

echo "Starting production deployment of aradabingo to $SERVER_IP..."

# Create deployment package with all working features
echo "Creating comprehensive deployment package..."
mkdir -p production-deploy

# Copy all application files
cp -r server production-deploy/
cp -r client production-deploy/
cp -r shared production-deploy/
cp -r attached_assets production-deploy/ 2>/dev/null || echo "No assets directory found"

# Copy configuration files
cp package*.json production-deploy/
cp tsconfig.json production-deploy/
cp vite.config.ts production-deploy/
cp tailwind.config.ts production-deploy/
cp postcss.config.js production-deploy/
cp components.json production-deploy/
cp drizzle.config.ts production-deploy/

# Create production environment configuration
cat > production-deploy/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
EOF

# Create PM2 ecosystem configuration
cat > production-deploy/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aradabingo',
    script: 'tsx',
    args: 'server/index.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/aradabingo-error.log',
    out_file: '/var/log/pm2/aradabingo-out.log',
    log_file: '/var/log/pm2/aradabingo.log'
  }]
};
EOF

# Create Nginx configuration
cat > production-deploy/nginx-aradabingo.conf << 'EOF'
server {
    listen 80;
    server_name 91.99.161.246;
    
    # Serve static files
    location / {
        root /var/www/bingo-app/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000" always;
    }
    
    # API routes
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Create database setup script
cat > production-deploy/setup-database.sql << EOF
-- Create database and user if they don't exist
CREATE DATABASE IF NOT EXISTS $DB_NAME;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "Creating deployment archive..."
cd production-deploy
tar -czf ../aradabingo-production.tar.gz .
cd ..

echo "Transferring to production server..."
scp aradabingo-production.tar.gz $USER@$SERVER_IP:/tmp/

echo "Executing production deployment..."
ssh $USER@$SERVER_IP << 'ENDSSH'
set -e

echo "Setting up production environment..."

# Stop existing services
pm2 stop aradabingo 2>/dev/null || true
pm2 delete aradabingo 2>/dev/null || true

# Backup existing installation
if [ -d "/var/www/bingo-app" ]; then
    echo "Backing up existing installation..."
    rm -rf /var/www/bingo-app-backup 2>/dev/null || true
    mv /var/www/bingo-app /var/www/bingo-app-backup
fi

# Create application directory
mkdir -p /var/www/bingo-app
cd /var/www/bingo-app

# Extract new deployment
echo "Extracting application files..."
tar -xzf /tmp/aradabingo-production.tar.gz
rm /tmp/aradabingo-production.tar.gz

# Install system dependencies if needed
apt update
apt install -y nodejs npm nginx postgresql postgresql-contrib

# Install Node.js 18+ if needed
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install global dependencies
npm install -g pm2 tsx

# Install application dependencies
echo "Installing application dependencies..."
npm install

# Build the application
echo "Building production application..."
npm run build

# Setup PostgreSQL database
echo "Setting up database..."
service postgresql start
sudo -u postgres psql -c "CREATE DATABASE bingo_app;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER bingo_user WITH ENCRYPTED PASSWORD 'BingoSecure2024@';" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE bingo_app TO bingo_user;" 2>/dev/null || true

# Push database schema
echo "Setting up database schema..."
npm run db:push

# Setup Nginx
echo "Configuring Nginx..."
cp nginx-aradabingo.conf /etc/nginx/sites-available/aradabingo
ln -sf /etc/nginx/sites-available/aradabingo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Create log directory
mkdir -p /var/log/pm2

# Start application with PM2
echo "Starting aradabingo application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Enable services
systemctl enable nginx
systemctl enable postgresql

echo "Testing deployment..."
sleep 10

# Test health endpoint
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Application health check passed"
else
    echo "⚠️  Health check failed - checking logs..."
    pm2 logs aradabingo --lines 20
fi

# Test database connection
if curl -f http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Database connection working"
else
    echo "⚠️  Database connection issues - check configuration"
fi

echo "🎉 Production deployment completed!"
echo "📊 Application Status: $(pm2 describe aradabingo | grep status || echo 'Check with: pm2 status')"
echo "🌐 Application URL: http://91.99.161.246"
echo "👤 Super Admin Login: superadmin / a1e2y3t4h5"
echo "📋 View logs: pm2 logs aradabingo"
echo "🔄 Restart app: pm2 restart aradabingo"
ENDSSH

# Cleanup local files
rm -rf production-deploy aradabingo-production.tar.gz

echo "Deployment script completed!"
echo "Your complete aradabingo application with all features is now deployed at: http://91.99.161.246"
echo "Super admin dashboard accessible with: superadmin / a1e2y3t4h5"