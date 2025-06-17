#!/bin/bash

# Complete deployment script for Bingo application
# Usage: ./deploy-complete.sh

SERVER_IP="91.99.161.246"
APP_DIR="/var/www/bingo-app"
USER="root"

echo "🚀 Starting complete deployment to $SERVER_IP..."

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deploy-temp
cp -r server deploy-temp/
cp -r client deploy-temp/
cp -r shared deploy-temp/
cp package*.json deploy-temp/
cp tsconfig.json deploy-temp/
cp vite.config.ts deploy-temp/
cp tailwind.config.ts deploy-temp/
cp postcss.config.js deploy-temp/
cp components.json deploy-temp/
cp drizzle.config.ts deploy-temp/
cp -r attached_assets deploy-temp/ 2>/dev/null || echo "No assets to copy"

# Create production environment file
cat > deploy-temp/.env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingo_user:BingoSecure2024@localhost:5432/bingo_app
EOF

# Create ecosystem file for PM2
cat > deploy-temp/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'bingo-app',
    script: 'server/index.ts',
    interpreter: 'tsx',
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

# Create archive
echo "📄 Creating deployment archive..."
cd deploy-temp
tar -czf ../bingo-app-deploy.tar.gz .
cd ..

# Transfer to server
echo "📤 Transferring files to server..."
scp bingo-app-deploy.tar.gz $USER@$SERVER_IP:/tmp/

# Deploy on server
echo "🔧 Deploying on server..."
ssh $USER@$SERVER_IP << 'ENDSSH'
# Stop existing app
pm2 stop bingo-app 2>/dev/null || true
pm2 delete bingo-app 2>/dev/null || true

# Backup and clear app directory
cd /var/www
rm -rf bingo-app-backup 2>/dev/null || true
mv bingo-app bingo-app-backup 2>/dev/null || true
mkdir -p bingo-app

# Extract new files
cd bingo-app
tar -xzf /tmp/bingo-app-deploy.tar.gz
rm /tmp/bingo-app-deploy.tar.gz

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production

# Install tsx globally if not available
npm install -g tsx

# Build client
echo "🏗️ Building client..."
npm run build

# Start with PM2
echo "🚀 Starting application..."
pm2 start ecosystem.config.js
pm2 save

# Test the application
echo "🧪 Testing application..."
sleep 5
curl -f http://localhost:5000/api/health || echo "Health check failed - check logs with: pm2 logs bingo-app"

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs bingo-app"
echo "🌐 Application URL: http://91.99.161.246"
ENDSSH

# Cleanup
rm -rf deploy-temp bingo-app-deploy.tar.gz

echo "🎉 Deployment script completed!"
echo "🌐 Your application should be available at: http://$SERVER_IP"
echo "🔍 Check status on server with: ssh $USER@$SERVER_IP 'pm2 status'"