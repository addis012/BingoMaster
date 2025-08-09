# BingoMaster MongoDB VPS Deployment Commands

## Server Details
- **IP**: 91.99.161.246
- **Hostname**: aradabingo  
- **Password**: Rjqe9RTpHdun4hbrgWFb
- **OS**: Ubuntu 22.04

## Option 1: Quick SSH Deployment

### 1. Connect to VPS
```bash
ssh root@91.99.161.246
# Password: Rjqe9RTpHdun4hbrgWFb
```

### 2. Download and Run Deployment Script
```bash
# Download the deployment script from your Replit
wget https://raw.githubusercontent.com/your-repo/MANUAL_MONGODB_DEPLOYMENT.sh
chmod +x MANUAL_MONGODB_DEPLOYMENT.sh
./MANUAL_MONGODB_DEPLOYMENT.sh
```

### 3. Configure Environment
```bash
cd /var/www/bingomaster-mongo
cp .env.template .env
nano .env
```

**Add your MongoDB URI from Replit secrets:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bingomaster?retryWrites=true&w=majority
SESSION_SECRET=your-super-secret-session-key-here
```

### 4. Start the Service
```bash
systemctl start bingomaster-mongo
systemctl status bingomaster-mongo
```

### 5. Check Logs
```bash
journalctl -u bingomaster-mongo -f
```

## Option 2: Manual Step-by-Step Commands

If the script doesn't work, run these commands manually:

### Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt update && apt install -y nodejs nginx git
node --version  # Should show v20.x
```

### Create Application
```bash
mkdir -p /var/www/bingomaster-mongo
cd /var/www/bingomaster-mongo
```

### Create package.json
```bash
cat > package.json << 'EOF'
{
  "name": "bingomaster-mongodb-vps",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node server/index.js"
  },
  "dependencies": {
    "mongoose": "^8.17.1",
    "mongodb": "^6.18.0",
    "bcrypt": "^6.0.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "memorystore": "^1.6.7",
    "ws": "^8.18.0"
  }
}
EOF
```

### Install Dependencies
```bash
npm install
```

### Create Server Directory and Files
```bash
mkdir -p server client/dist
# Copy the server/index.js content from MANUAL_MONGODB_DEPLOYMENT.sh
# Copy the client/dist/index.html content from MANUAL_MONGODB_DEPLOYMENT.sh
```

### Create Environment File
```bash
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_uri_here
SESSION_SECRET=bingo-super-secret-key
EOF
```

### Create Systemd Service
```bash
cat > /etc/systemd/system/bingomaster-mongo.service << 'EOF'
[Unit]
Description=BingoMaster MongoDB Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster-mongo
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/bingomaster-mongo/.env

[Install]
WantedBy=multi-user.target
EOF
```

### Configure Nginx
```bash
cat > /etc/nginx/sites-available/bingomaster-mongo << 'EOF'
server {
    listen 80;
    server_name 91.99.161.246;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/bingomaster-mongo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### Start Services
```bash
systemctl daemon-reload
systemctl enable bingomaster-mongo
systemctl start bingomaster-mongo
systemctl status bingomaster-mongo
```

## Testing Your Deployment

### Health Check
```bash
curl http://localhost:3000/health
curl http://91.99.161.246/health
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "password"}'
```

### View Logs
```bash
journalctl -u bingomaster-mongo -f
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Accessing Your App

Once deployed:
- **URL**: http://91.99.161.246
- **Login**: superadmin / password
- **Health**: http://91.99.161.246/health

## Troubleshooting

### Service Issues
```bash
systemctl status bingomaster-mongo
journalctl -u bingomaster-mongo --no-pager
```

### Nginx Issues
```bash
nginx -t
systemctl status nginx
```

### MongoDB Connection Issues
```bash
# Test MongoDB connection
cd /var/www/bingomaster-mongo
node -e "
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI || 'your-connection-string')
.then(() => console.log('MongoDB Connected!'))
.catch(err => console.error('MongoDB Error:', err));
"
```

### Port Issues
```bash
netstat -tulpn | grep :3000
netstat -tulpn | grep :80
```

Your BingoMaster system will be running with MongoDB as the only database!