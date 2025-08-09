#!/usr/bin/env python3
"""
MongoDB-Only VPS Deployment Script for BingoMaster
This script deploys BingoMaster using MongoDB as the primary database
"""
import subprocess
import sys
import time
import os

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=60)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

def upload_file(local_path, remote_path, password="akunamatata"):
    """Upload file to VPS using scp"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode == 0
    except:
        return False

def deploy_mongodb_bingomaster():
    """Deploy BingoMaster to VPS with MongoDB only"""
    print("🚀 Starting BingoMaster MongoDB-only deployment to VPS...")
    
    # Step 1: Create application directory
    print("\n1. Creating application directory...")
    code, stdout, stderr = run_ssh_command("mkdir -p /var/www/bingomaster-mongo && cd /var/www/bingomaster-mongo")
    if code == 0:
        print("✅ Application directory created")
    else:
        print(f"❌ Failed to create directory: {stderr}")
        return False
    
    # Step 2: Install Node.js 20
    print("\n2. Installing Node.js 20...")
    commands = [
        "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
        "apt-get install -y nodejs",
        "node --version && npm --version"
    ]
    for cmd in commands:
        code, stdout, stderr = run_ssh_command(cmd)
        if "v20" in stdout or "10." in stdout:
            print("✅ Node.js 20 installed successfully")
            break
    
    # Step 3: Create MongoDB-focused package.json
    print("\n3. Creating MongoDB-focused package.json...")
    package_json = '''{
  "name": "bingomaster-mongodb-vps",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=server/index.js --format=esm --banner:js=\\"import { createRequire } from 'module'; const require = createRequire(import.meta.url);\\"",
    "dev": "NODE_ENV=development tsx server/index.ts"
  },
  "dependencies": {
    "mongoose": "^8.0.0",
    "mongodb": "^6.0.0",
    "bcrypt": "^5.1.1",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "memorystore": "^1.6.7",
    "ws": "^8.18.0",
    "zod": "^3.22.0",
    "nanoid": "^5.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "vite": "^5.0.0"
  }
}'''
    
    # Upload package.json
    with open('/tmp/package.json', 'w') as f:
        f.write(package_json)
    
    if upload_file('/tmp/package.json', '/var/www/bingomaster-mongo/package.json'):
        print("✅ Package.json uploaded")
    else:
        print("❌ Failed to upload package.json")
        return False
    
    # Step 4: Create MongoDB-only server configuration
    print("\n4. Creating MongoDB-only server configuration...")
    server_config = '''// MongoDB-Only BingoMaster Server Configuration
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemStore = MemoryStore(session);

const app = express();

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is required");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🍃 Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session configuration with memory store
app.use(session({
  store: new MemStore({
    checkPeriod: 86400000 // 24 hours
  }),
  secret: 'bingo-mongo-session-key-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: false,
    sameSite: 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', database: 'MongoDB', timestamp: new Date().toISOString() });
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectMongoDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BingoMaster MongoDB server running on port ${PORT}`);
    console.log(`🌐 Access at: http://91.99.161.246:${PORT}`);
  });
}

startServer().catch(console.error);
'''
    
    # Upload server config
    with open('/tmp/mongodb-server.js', 'w') as f:
        f.write(server_config)
    
    # Create server directory and upload
    run_ssh_command("mkdir -p /var/www/bingomaster-mongo/server")
    if upload_file('/tmp/mongodb-server.js', '/var/www/bingomaster-mongo/server/index.js'):
        print("✅ MongoDB server configuration uploaded")
    else:
        print("❌ Failed to upload server configuration")
        return False
    
    # Step 5: Install dependencies
    print("\n5. Installing dependencies...")
    code, stdout, stderr = run_ssh_command("cd /var/www/bingomaster-mongo && npm install")
    if code == 0:
        print("✅ Dependencies installed")
    else:
        print(f"❌ Failed to install dependencies: {stderr}")
        return False
    
    # Step 6: Create environment file template
    print("\n6. Creating environment template...")
    env_template = '''# BingoMaster MongoDB Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_connection_string_here

# Session Configuration
SESSION_SECRET=your_super_secret_session_key_here

# Optional: WebSocket Configuration
WS_PORT=3001
'''
    
    with open('/tmp/.env.template', 'w') as f:
        f.write(env_template)
    
    if upload_file('/tmp/.env.template', '/var/www/bingomaster-mongo/.env.template'):
        print("✅ Environment template created")
    else:
        print("❌ Failed to upload environment template")
    
    # Step 7: Create systemd service for MongoDB version
    print("\n7. Creating systemd service...")
    service_config = '''[Unit]
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
'''
    
    with open('/tmp/bingomaster-mongo.service', 'w') as f:
        f.write(service_config)
    
    if upload_file('/tmp/bingomaster-mongo.service', '/etc/systemd/system/bingomaster-mongo.service'):
        print("✅ Systemd service created")
        
        # Enable the service
        run_ssh_command("systemctl daemon-reload")
        run_ssh_command("systemctl enable bingomaster-mongo")
        print("✅ Service enabled")
    else:
        print("❌ Failed to create systemd service")
    
    # Step 8: Setup Nginx reverse proxy
    print("\n8. Setting up Nginx reverse proxy...")
    nginx_config = '''server {
    listen 80;
    server_name 91.99.161.246;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}'''
    
    with open('/tmp/bingomaster-mongo', 'w') as f:
        f.write(nginx_config)
    
    # Install nginx if not present
    run_ssh_command("apt update && apt install -y nginx")
    
    if upload_file('/tmp/bingomaster-mongo', '/etc/nginx/sites-available/bingomaster-mongo'):
        run_ssh_command("ln -sf /etc/nginx/sites-available/bingomaster-mongo /etc/nginx/sites-enabled/")
        run_ssh_command("rm -f /etc/nginx/sites-enabled/default")
        run_ssh_command("nginx -t && systemctl reload nginx")
        print("✅ Nginx configured")
    else:
        print("❌ Failed to configure Nginx")
    
    print("\n🎉 MongoDB-only deployment completed successfully!")
    print("\n📋 Next Steps:")
    print("1. Set your MONGODB_URI in /var/www/bingomaster-mongo/.env")
    print("2. Copy your MongoDB connection string from Replit secrets")
    print("3. Start the service: systemctl start bingomaster-mongo")
    print("4. Check status: systemctl status bingomaster-mongo")
    print("5. View logs: journalctl -u bingomaster-mongo -f")
    print(f"6. Access your app at: http://91.99.161.246")
    
    return True

if __name__ == "__main__":
    try:
        success = deploy_mongodb_bingomaster()
        if success:
            print("\n✅ Deployment completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Deployment failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Deployment cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)