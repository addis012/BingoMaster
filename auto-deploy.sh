#!/bin/bash

# BingoMaster Auto-Deployment Script for Ubuntu 22.04 VPS
# IP: 91.99.161.246
# This script will set up everything automatically

set -e  # Exit on any error

VPS_IP="91.99.161.246"
DB_PASSWORD="BingoMaster2025!SecurePass"
SESSION_SECRET="BingoMaster_Super_Secret_Session_Key_2025_Ethiopian_Bingo_System_Ultra_Secure"

echo "🚀 BingoMaster Auto-Deployment Starting..."
echo "📍 Target VPS: $VPS_IP (aradabingo)"
echo "🖥️  OS: Ubuntu 22.04"

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt install -y curl wget git nginx postgresql postgresql-contrib build-essential ufw htop

# Install Node.js 20
echo "📱 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
echo "✅ Verifying installations..."
node --version
npm --version
nginx -v
psql --version

# Setup PostgreSQL
echo "🗄️  Setting up PostgreSQL database..."
systemctl start postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bingomaster;
CREATE USER bingouser WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingouser;
ALTER USER bingouser CREATEDB;
ALTER DATABASE bingomaster OWNER TO bingouser;
\q
EOF

# Configure PostgreSQL
echo "⚙️  Configuring PostgreSQL..."
PG_VERSION=$(ls /etc/postgresql/)
PG_CONFIG="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original configs
cp "$PG_CONFIG" "$PG_CONFIG.backup"
cp "$PG_HBA" "$PG_HBA.backup"

# Update postgresql.conf
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG"
sed -i "s/#port = 5432/port = 5432/" "$PG_CONFIG"

# Add authentication rule
echo "local   bingomaster     bingouser                               md5" >> "$PG_HBA"

# Restart PostgreSQL
systemctl restart postgresql

# Test database connection
echo "🔍 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U bingouser -d bingomaster -c "SELECT version();"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/bingomaster
cd /var/www/bingomaster

# Create package.json for BingoMaster
echo "📝 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "bingomaster",
  "version": "1.0.0",
  "description": "BingoMaster - Ethiopian Bingo Management System",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:pg-native",
    "start": "node dist/server.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.9.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-aspect-ratio": "^1.0.3",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-context-menu": "^2.1.5",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@tanstack/react-query": "^5.0.0",
    "bcrypt": "^5.1.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "cmdk": "^0.2.0",
    "connect-pg-simple": "^9.0.1",
    "date-fns": "^2.30.0",
    "drizzle-orm": "^0.29.0",
    "drizzle-zod": "^0.5.1",
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "framer-motion": "^10.16.0",
    "input-otp": "^1.2.4",
    "lucide-react": "^0.292.0",
    "nanoid": "^5.0.0",
    "next-themes": "^0.2.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "react": "^18.2.0",
    "react-day-picker": "^8.9.1",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.47.0",
    "react-icons": "^4.12.0",
    "react-resizable-panels": "^0.0.55",
    "recharts": "^2.8.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^0.7.0",
    "wouter": "^2.12.1",
    "ws": "^8.14.2",
    "zod": "^3.22.4",
    "zod-validation-error": "^1.5.0"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.3.2",
    "@types/bcrypt": "^5.0.2",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/node": "^20.8.0",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/react": "^18.2.31",
    "@types/react-dom": "^18.2.14",
    "@types/ws": "^8.5.8",
    "@vitejs/plugin-react": "^4.1.0",
    "autoprefixer": "^10.4.16",
    "drizzle-kit": "^0.20.4",
    "esbuild": "^0.19.5",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "tsx": "^3.14.0",
    "typescript": "^5.2.2",
    "vite": "^4.5.0"
  }
}
EOF

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Create environment file
echo "🔐 Creating environment configuration..."
cat > .env.production << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingouser:$DB_PASSWORD@localhost:5432/bingomaster
SESSION_SECRET=$SESSION_SECRET
CORS_ORIGIN=http://$VPS_IP
EOF

# Install PM2 globally
echo "⚡ Installing PM2 process manager..."
npm install -g pm2

# Create PM2 ecosystem file
echo "🔧 Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
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
EOF

# Create logs directory
mkdir -p logs

# Create Nginx configuration
echo "🌐 Setting up Nginx reverse proxy..."
cat > /etc/nginx/sites-available/bingomaster << EOF
server {
    listen 80;
    server_name $VPS_IP aradabingo.com *.aradabingo.com;

    client_max_body_size 50M;

    # Serve static files directly
    location /voices/ {
        alias /var/www/bingomaster/public/voices/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri \$uri/ =404;
    }

    location /assets/ {
        alias /var/www/bingomaster/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri \$uri/ =404;
    }

    # WebSocket support for real-time bingo
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # API and app routes
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

# Enable site and test nginx
ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Setup firewall
echo "🔒 Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 5432/tcp  # PostgreSQL (for admin access if needed)

# Create backup script
echo "💾 Setting up automated backups..."
mkdir -p /root/backups
cat > /root/backup-bingomaster.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD="BingoMaster2025!SecurePass" pg_dump -h localhost -U bingouser bingomaster > /root/backups/bingomaster_$DATE.sql
find /root/backups/ -name "bingomaster_*.sql" -mtime +7 -delete
echo "Backup completed: bingomaster_$DATE.sql"
EOF

chmod +x /root/backup-bingomaster.sh

# Add to crontab for daily backups at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-bingomaster.sh") | crontab -

echo "✅ System setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Upload your BingoMaster source code to /var/www/bingomaster/"
echo "2. Run: npm run build"
echo "3. Run: npm run db:push"
echo "4. Start application: pm2 start ecosystem.config.js"
echo "5. Start Nginx: systemctl start nginx"
echo ""
echo "📊 Useful commands:"
echo "• Check app status: pm2 status"
echo "• View logs: pm2 logs bingomaster"
echo "• Restart app: pm2 restart bingomaster"
echo "• Check nginx: systemctl status nginx"
echo "• Database backup: /root/backup-bingomaster.sh"
echo ""
echo "🌐 Your BingoMaster will be available at:"
echo "   http://$VPS_IP"
echo ""
echo "🔐 Database credentials:"
echo "   Host: localhost"
echo "   Database: bingomaster"
echo "   User: bingouser"
echo "   Password: $DB_PASSWORD"
echo ""
echo "🚀 Deployment foundation ready!"