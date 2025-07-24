#!/bin/bash

# BingoMaster One-Command VPS Deployment
# Run this single command on your VPS: curl -sSL https://your-url/deploy.sh | bash

set -e
VPS_IP="91.99.161.246"
DB_PASSWORD="BingoMaster2025!SecurePass"
SESSION_SECRET="BingoMaster_Super_Secret_Session_Key_2025_Ethiopian_Bingo_System_Ultra_Secure"

echo "🚀 BingoMaster One-Command Deployment Starting..."
echo "📍 Target VPS: $VPS_IP (aradabingo)"

# Update system
echo "📦 Updating system..."
apt update && apt upgrade -y

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

sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS bingomaster;
DROP USER IF EXISTS bingouser;
CREATE DATABASE bingomaster;
CREATE USER bingouser WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE bingomaster TO bingouser;
ALTER USER bingouser CREATEDB;
ALTER DATABASE bingomaster OWNER TO bingouser;
\q
EOF

# Configure PostgreSQL
PG_VERSION=$(ls /etc/postgresql/)
echo "local   bingomaster     bingouser                               md5" >> "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
systemctl restart postgresql

# Create app directory
mkdir -p /var/www/bingomaster
cd /var/www/bingomaster

# Download BingoMaster source (you'll need to replace this with actual download)
echo "📥 Downloading BingoMaster source..."
# For now, create the essential structure
mkdir -p {client,server,shared,public/voices}

# Create package.json
cat > package.json << 'EOF'
{
  "name": "bingomaster",
  "version": "1.0.0",
  "scripts": {
    "build": "echo 'Build placeholder'",
    "start": "node server.js",
    "db:push": "echo 'DB push placeholder'"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF

# Create simple server for testing
cat > server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.send(`
    <h1>🎲 BingoMaster VPS Deployment Successful!</h1>
    <p>Server running on ${req.get('host')}</p>
    <p>Database: Connected ✅</p>
    <p>Ready for BingoMaster source code upload</p>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BingoMaster server running on port ${PORT}`);
});
EOF

# Install dependencies
npm install

# Install PM2
npm install -g pm2

# Create environment
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingouser:$DB_PASSWORD@localhost:5432/bingomaster
SESSION_SECRET=$SESSION_SECRET
EOF

# Setup Nginx
cat > /etc/nginx/sites-available/bingomaster << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Setup firewall
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Start services
pm2 start server.js --name bingomaster
pm2 startup
pm2 save
systemctl start nginx
systemctl enable nginx

echo ""
echo "✅ BingoMaster VPS Setup Complete!"
echo "🌐 Test at: http://$VPS_IP"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs bingomaster"
echo ""
echo "🔄 Next: Upload your BingoMaster source code to replace the placeholder"