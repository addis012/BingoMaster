# BingoMaster MongoDB-Only VPS Deployment Guide

## Overview
This guide shows how to deploy BingoMaster using **only MongoDB** as the database on your VPS. No PostgreSQL required.

## Prerequisites
- VPS Server: 91.99.161.246 (aradabingo)
- MongoDB Atlas connection string (already configured in Replit)
- SSH access to your VPS

## Quick Deployment

### Option 1: Automated Script
```bash
python3 deploy-mongodb-vps.py
```

### Option 2: Manual Steps

#### 1. Connect to VPS
```bash
ssh root@91.99.161.246
```

#### 2. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs nginx
```

#### 3. Create Application Directory
```bash
mkdir -p /var/www/bingomaster-mongo
cd /var/www/bingomaster-mongo
```

#### 4. Create package.json for MongoDB-only setup
```json
{
  "name": "bingomaster-mongodb-vps",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node server/index.js",
    "dev": "NODE_ENV=development tsx server/index.ts"
  },
  "dependencies": {
    "mongoose": "^8.0.0",
    "mongodb": "^6.0.0",
    "bcrypt": "^5.1.1",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "memorystore": "^1.6.7",
    "ws": "^8.18.0"
  }
}
```

#### 5. Install Dependencies
```bash
npm install
```

#### 6. Set Environment Variables
Create `/var/www/bingomaster-mongo/.env`:
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_connection_string_here
SESSION_SECRET=your_super_secret_session_key_here
```

**Important**: Copy your MONGODB_URI from Replit secrets and paste it here.

#### 7. Upload Your Application Files
You'll need to upload:
- `server/` directory with all MongoDB routes
- `shared/mongodb-schema.ts` 
- `client/` built files (after running `npm run build`)

#### 8. Create Systemd Service
Create `/etc/systemd/system/bingomaster-mongo.service`:
```ini
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
```

#### 9. Configure Nginx
Create `/etc/nginx/sites-available/bingomaster-mongo`:
```nginx
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
```

#### 10. Enable Services
```bash
# Enable Nginx site
ln -s /etc/nginx/sites-available/bingomaster-mongo /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Enable and start application
systemctl daemon-reload
systemctl enable bingomaster-mongo
systemctl start bingomaster-mongo
```

## MongoDB-Only Benefits

### Advantages:
✅ **Simpler Setup** - No PostgreSQL installation or configuration needed  
✅ **Cloud Native** - Uses MongoDB Atlas (managed service)  
✅ **Better Scaling** - MongoDB handles large datasets efficiently  
✅ **JSON Documents** - Natural fit for bingo game data structures  
✅ **Real-time Ready** - MongoDB change streams for live updates  

### What Works:
- All user authentication and management
- Complete bingo game functionality  
- Real-time number calling and winner detection
- Financial transactions and credit management
- Shop and admin management
- All API endpoints under `/api/mongodb/*`

## Server Management

### Start/Stop Service
```bash
systemctl start bingomaster-mongo    # Start
systemctl stop bingomaster-mongo     # Stop  
systemctl restart bingomaster-mongo  # Restart
```

### View Logs
```bash
journalctl -u bingomaster-mongo -f   # Follow logs
journalctl -u bingomaster-mongo      # View all logs
```

### Check Status
```bash
systemctl status bingomaster-mongo   # Service status
curl http://localhost:3000/health    # App health check
```

## MongoDB Connection String
Your MongoDB connection string from Replit should look like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bingomaster?retryWrites=true&w=majority
```

Make sure to:
1. Replace with your actual credentials
2. Update the database name if needed
3. Set it in the `.env` file on your VPS

## Access Your Application
Once deployed, access your BingoMaster system at:
- **URL**: http://91.99.161.246
- **Login**: superadmin / password
- **Admin Panel**: Create shops and manage users
- **Bingo Games**: Full real-time functionality

## Troubleshooting

### Connection Issues
```bash
# Check MongoDB connection
node -e "console.log(process.env.MONGODB_URI)"

# Test connection
node -e "
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error('MongoDB error:', err));
"
```

### Port Issues
```bash
# Check if port 3000 is in use
netstat -tulpn | grep :3000

# Check Nginx status
nginx -t
systemctl status nginx
```

Your BingoMaster system will be fully operational using only MongoDB - no PostgreSQL dependencies required!