#!/bin/bash

# BingoMaster VPS Deployment Script
# Run this script on your VPS after uploading the code

set -e  # Exit on any error

echo "🚀 Starting BingoMaster VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
print_status "Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

print_status "Node.js version: $(node --version)"
print_status "NPM version: $(npm --version)"

# Install PostgreSQL
print_status "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt install postgresql postgresql-contrib -y
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Install PM2
print_status "Installing PM2 globally..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install nginx -y
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Create application directory
APP_DIR="/var/www/bingomaster"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Navigate to app directory
cd $APP_DIR

print_status "Current directory: $(pwd)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please upload your BingoMaster code to $APP_DIR first"
    exit 1
fi

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Create environment file template
print_status "Creating environment configuration..."
if [ ! -f ".env.production" ]; then
    cat > .env.production << EOL
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://bingomaster_user:CHANGE_PASSWORD@localhost:5432/bingomaster
SESSION_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING
CORS_ORIGIN=https://your-domain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict
TRUST_PROXY=true
EOL
    print_warning "Created .env.production template. PLEASE UPDATE THE VALUES!"
    print_warning "Generate session secret with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
fi

# Setup PostgreSQL database
print_status "Setting up PostgreSQL database..."
read -p "Enter database password for bingomaster_user: " db_password

sudo -u postgres psql << EOF
CREATE DATABASE bingomaster;
CREATE USER bingomaster_user WITH PASSWORD '$db_password';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingomaster_user;
ALTER USER bingomaster_user CREATEDB;
\q
EOF

# Update .env.production with database password
sed -i "s/CHANGE_PASSWORD/$db_password/g" .env.production

# Generate session secret
session_secret=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
sed -i "s/CHANGE_THIS_TO_SECURE_RANDOM_STRING/$session_secret/g" .env.production

print_status "Database and environment configured"

# Build application
print_status "Building application..."
npm run build

# Deploy database schema
print_status "Deploying database schema..."
npm run db:push

# Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOL
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
    restart_delay: 4000,
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOL

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Configure Nginx
print_status "Configuring Nginx..."
read -p "Enter your domain name (e.g., yourdomain.com): " domain_name

sudo tee /etc/nginx/sites-available/bingomaster << EOL
server {
    listen 80;
    server_name $domain_name www.$domain_name;

    # Redirect HTTP to HTTPS (will be enabled after SSL setup)
    # return 301 https://\$server_name\$request_uri;

    # Temporary HTTP configuration for initial setup
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket Support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    client_max_body_size 10M;
}
EOL

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Update .env.production with domain
sed -i "s/your-domain.com/$domain_name/g" .env.production

# Restart application to load new environment
pm2 restart bingomaster

print_status "✅ Basic deployment completed!"
print_status ""
print_status "Next steps:"
print_status "1. Point your domain DNS to this server's IP address"
print_status "2. Install SSL certificate: sudo certbot --nginx -d $domain_name -d www.$domain_name"
print_status "3. Update .env.production if needed"
print_status "4. Monitor application: pm2 logs bingomaster"
print_status ""
print_status "Application should be accessible at: http://$domain_name"
print_status "Application status: pm2 status"
print_status ""
print_warning "Remember to:"
print_warning "- Configure your domain's DNS A record to point to this server"
print_warning "- Install SSL certificate for HTTPS"
print_warning "- Review and update .env.production settings"
print_warning "- Set up database backups"

EOL