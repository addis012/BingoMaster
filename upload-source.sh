#!/bin/bash

# Script to upload BingoMaster source code to VPS
# Run this on your local machine after running auto-deploy.sh on VPS

VPS_IP="91.99.161.246"
VPS_USER="root"
APP_PATH="/var/www/bingomaster"

echo "🚀 Uploading BingoMaster source code to VPS..."

# Create deployment archive excluding unnecessary files
echo "📦 Creating deployment package..."
tar -czf bingomaster-source.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=.env \
  --exclude=.env.* \
  --exclude=attached_assets \
  --exclude="*.log" \
  --exclude="*.tar.gz" \
  client/ \
  server/ \
  shared/ \
  public/ \
  components.json \
  drizzle.config.ts \
  postcss.config.js \
  tailwind.config.ts \
  tsconfig.json \
  vite.config.ts

echo "📤 Uploading to VPS ($VPS_IP)..."
scp bingomaster-source.tar.gz $VPS_USER@$VPS_IP:/tmp/

echo "🔧 Extracting and building on VPS..."
ssh $VPS_USER@$VPS_IP << 'EOF'
  cd /var/www/bingomaster
  
  # Extract source code
  tar -xzf /tmp/bingomaster-source.tar.gz
  
  # Set correct permissions
  chown -R www-data:www-data /var/www/bingomaster
  chmod -R 755 /var/www/bingomaster
  
  # Build the application
  echo "🏗️  Building BingoMaster..."
  npm run build
  
  # Push database schema
  echo "🗄️  Setting up database schema..."
  npm run db:push
  
  # Start the application
  echo "🚀 Starting BingoMaster..."
  pm2 start ecosystem.config.js
  pm2 startup
  pm2 save
  
  # Start Nginx
  systemctl start nginx
  systemctl enable nginx
  
  # Check status
  echo ""
  echo "✅ Deployment complete!"
  echo ""
  echo "📊 Application Status:"
  pm2 status
  
  echo ""
  echo "🌐 BingoMaster is now running at:"
  echo "   http://91.99.161.246"
  
  echo ""
  echo "🔍 Check logs with:"
  echo "   pm2 logs bingomaster"
  
  echo ""
  echo "📈 Monitor system:"
  echo "   htop"
  echo "   pm2 monit"
EOF

# Cleanup
rm bingomaster-source.tar.gz

echo ""
echo "🎉 BingoMaster deployment completed!"
echo ""
echo "🌐 Access your application:"
echo "   http://91.99.161.246"
echo ""
echo "🔧 SSH to manage:"
echo "   ssh root@91.99.161.246"
echo ""
echo "📊 Monitor application:"
echo "   ssh root@91.99.161.246 'pm2 status'"
echo "   ssh root@91.99.161.246 'pm2 logs bingomaster'"