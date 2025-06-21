#!/bin/bash

# BingoMaster VPS Quick Fix Script
# Run this script to fix all deployment issues

set -e

echo "🔧 Starting BingoMaster Quick Fix..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Change to app directory
cd /opt/aradabingo

# Stop current processes
print_status "Stopping current processes..."
pm2 stop aradabingo || true
pm2 delete aradabingo || true

# Fix PostgreSQL
print_status "Fixing PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Reset database
print_status "Resetting database..."
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS aradabingo;
DROP USER IF EXISTS aradabingo_user;
CREATE DATABASE aradabingo;
CREATE USER aradabingo_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE aradabingo TO aradabingo_user;
ALTER USER aradabingo_user CREATEDB;
\q
EOF

# Create environment file
print_status "Creating environment file..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://aradabingo_user:SecurePassword123!@localhost:5432/aradabingo
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://aradabingo.com
COOKIE_SECURE=false
TRUST_PROXY=true
EOF

# Install dependencies
print_status "Installing dependencies..."
npm install

# Deploy database schema
print_status "Deploying database schema..."
npm run db:push

# Create super admin
print_status "Creating super admin user..."
cat > create_admin.js << 'EOF'
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://aradabingo_user:SecurePassword123!@localhost:5432/aradabingo'
});

async function createSuperAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const result = await pool.query(`
      INSERT INTO users (username, password, name, email, role, account_number, credit_balance) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        email = EXCLUDED.email
      RETURNING id, username, role
    `, ['superadmin', hashedPassword, 'Super Admin', 'admin@aradabingo.com', 'super_admin', 'ADM000001', '0.00']);
    
    console.log('✓ Super Admin Created:', result.rows[0]);
    await pool.end();
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
EOF

node create_admin.js
rm create_admin.js

# Create PM2 config
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aradabingo',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start application
print_status "Starting application..."
pm2 start ecosystem.config.js --env production
pm2 save

# Fix Nginx configuration
print_status "Fixing Nginx configuration..."
sudo tee /etc/nginx/sites-available/aradabingo << 'EOF'
server {
    listen 80;
    server_name aradabingo.com www.aradabingo.com 91.99.161.246;
    
    client_max_body_size 10M;
    
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
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
    }

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx

# Test everything
print_status "Testing deployment..."

# Wait for app to start
sleep 10

# Test database
if psql -h localhost -U aradabingo_user -d aradabingo -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    print_status "✓ Database connection working"
else
    print_error "✗ Database connection failed"
fi

# Test application
if curl -s http://localhost:5000/api/auth/me > /dev/null; then
    print_status "✓ Application responding"
else
    print_error "✗ Application not responding"
fi

# Test login
LOGIN_RESULT=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "admin123"}')

if echo "$LOGIN_RESULT" | grep -q "superadmin"; then
    print_status "✓ Login working"
else
    print_error "✗ Login failed"
fi

print_status "Quick fix completed!"
print_status "Login credentials:"
print_status "  Username: superadmin"
print_status "  Password: admin123"
print_status ""
print_status "Check status with: pm2 status"
print_status "View logs with: pm2 logs aradabingo"
print_status "Access app at: http://aradabingo.com"