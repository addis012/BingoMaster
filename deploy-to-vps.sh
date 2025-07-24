#!/bin/bash

# BingoMaster VPS Deployment Script
# Run this script on your local machine to deploy to your VPS

VPS_IP="91.99.161.246"
VPS_USER="root"
APP_PATH="/var/www/bingomaster"

echo "🚀 Starting BingoMaster deployment to VPS..."

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf bingomaster-deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=attached_assets \
  --exclude="*.log" \
  package*.json \
  src/ \
  client/ \
  server/ \
  shared/ \
  public/ \
  *.ts \
  *.js \
  *.json \
  *.md

# Upload to VPS
echo "📤 Uploading to VPS..."
scp bingomaster-deploy.tar.gz $VPS_USER@$VPS_IP:/tmp/

# Connect to VPS and deploy
echo "🔧 Deploying on VPS..."
ssh $VPS_USER@$VPS_IP << 'EOF'
  # Stop existing application
  pm2 stop bingomaster || true
  
  # Create app directory
  mkdir -p /var/www/bingomaster
  cd /var/www/bingomaster
  
  # Backup existing if exists
  if [ -d "src" ]; then
    mv public/voices /tmp/voices-backup || true
    rm -rf *
    mv /tmp/voices-backup public/voices || true
  fi
  
  # Extract new version
  tar -xzf /tmp/bingomaster-deploy.tar.gz -C /var/www/bingomaster/
  
  # Install dependencies
  npm install
  
  # Build application
  npm run build
  
  # Start with PM2
  pm2 start ecosystem.config.js || pm2 restart bingomaster
  pm2 save
  
  # Reload Nginx
  nginx -t && systemctl reload nginx
  
  echo "✅ Deployment complete!"
  echo "🌐 Your BingoMaster is running at http://91.99.161.246"
  
  # Show status
  pm2 status
EOF

# Cleanup
rm bingomaster-deploy.tar.gz

echo "🎉 Deployment finished!"
echo "📊 Check status with: ssh $VPS_USER@$VPS_IP 'pm2 status'"
echo "📝 View logs with: ssh $VPS_USER@$VPS_IP 'pm2 logs bingomaster'"