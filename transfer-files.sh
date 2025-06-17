#!/bin/bash

# File Transfer Script for Bingo App Deployment
# Run this script from your local machine to transfer files to the server

SERVER_IP="91.99.161.246"
SERVER_USER="root"
APP_DIR="/var/www/bingo-app"

echo "🚀 Transferring Bingo App files to server..."

# Create directory on server
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Transfer application files (excluding development files)
echo "📁 Uploading application files..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.replit' \
  --exclude 'attached_assets' \
  --exclude '.env' \
  --exclude 'dist' \
  --exclude '*.log' \
  ./ $SERVER_USER@$SERVER_IP:$APP_DIR/

# Transfer deployment script
echo "📜 Uploading deployment script..."
scp deploy.sh $SERVER_USER@$SERVER_IP:$APP_DIR/

# Make deployment script executable
ssh $SERVER_USER@$SERVER_IP "chmod +x $APP_DIR/deploy.sh"

echo "✅ File transfer completed!"
echo "🔧 Next steps:"
echo "1. SSH into your server: ssh $SERVER_USER@$SERVER_IP"
echo "2. Navigate to app directory: cd $APP_DIR"
echo "3. Run deployment script: ./deploy.sh"