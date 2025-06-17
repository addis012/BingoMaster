#!/bin/bash

# Complete Bingo Application Deployment Script
SERVER_IP="91.99.161.246"
USER="root"

echo "Deploying complete Bingo application to $SERVER_IP..."

# Upload the complete application package
echo "Uploading application package..."
scp -o StrictHostKeyChecking=no complete-bingo-app.tar.gz $USER@$SERVER_IP:/tmp/

# Deploy on server
ssh -o StrictHostKeyChecking=no $USER@$SERVER_IP << 'ENDSSH'
cd /tmp

# Stop existing application
pm2 stop bingo-app 2>/dev/null || true
pm2 delete bingo-app 2>/dev/null || true

# Backup existing installation
cd /var/www
rm -rf bingo-app-backup 2>/dev/null
mv bingo-app bingo-app-backup 2>/dev/null || true

# Create fresh directory and extract complete application
mkdir -p bingo-app
cd bingo-app
tar -xzf /tmp/complete-bingo-app.tar.gz
rm /tmp/complete-bingo-app.tar.gz

# Set up production environment
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingo_user:BingoSecure2024@localhost:5432/bingo_app
SESSION_SECRET=bingo-production-secret-2024
EOF

# Install dependencies
npm install --production

# Build the application
npm run build

# Push database schema
npx drizzle-kit push

# Create PM2 configuration
cat > ecosystem.config.js << 'EOF'
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

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save

# Wait for startup
sleep 5

# Test health
curl -f http://localhost:5000/api/health

echo "Complete Bingo application deployed successfully!"
echo "Application URL: http://91.99.161.246"
ENDSSH

echo "Deployment completed!"
echo "Your complete Bingo application is now live at: http://$SERVER_IP"