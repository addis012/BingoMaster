#!/usr/bin/env python3
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

def deploy_bingomaster():
    """Deploy BingoMaster to VPS"""
    print("🚀 Starting BingoMaster deployment to VPS...")
    
    # Step 1: Create application directory
    print("\n1. Creating application directory...")
    code, stdout, stderr = run_ssh_command("mkdir -p /var/www/bingomaster && cd /var/www/bingomaster")
    if code == 0:
        print("✅ Application directory created")
    else:
        print(f"❌ Failed to create directory: {stderr}")
        return False
    
    # Step 2: Install Node.js 20 if not installed
    print("\n2. Installing Node.js 20...")
    commands = [
        "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -",
        "apt-get install -y nodejs",
        "node --version && npm --version"
    ]
    for cmd in commands:
        code, stdout, stderr = run_ssh_command(cmd)
        if "v20" in stdout or "10." in stdout:  # Node 20.x and npm 10.x
            print("✅ Node.js 20 installed successfully")
            break
    
    # Step 3: Create package.json
    print("\n3. Creating package.json...")
    package_json = '''{
  "name": "bingomaster-vps",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server/index.js",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=server/index.js --external:pg-native --external:cpu-features --format=esm --banner:js=\\"import { createRequire } from 'module'; const require = createRequire(import.meta.url);\\"",
    "dev": "NODE_ENV=development tsx server/index.ts"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.3",
    "bcrypt": "^5.1.1",
    "connect-pg-simple": "^9.0.1",
    "drizzle-orm": "^0.33.0",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "ws": "^8.18.0"
  }
}'''
    
    # Upload package.json
    with open('temp_package.json', 'w') as f:
        f.write(package_json)
    
    if upload_file('temp_package.json', '/var/www/bingomaster/package.json'):
        print("✅ package.json uploaded")
        os.remove('temp_package.json')
    else:
        print("❌ Failed to upload package.json")
        return False
    
    # Step 4: Create basic server file
    print("\n4. Creating server application...")
    server_code = '''import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: 'bingo-session-secret-key-longer-for-security',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: false,
    sameSite: 'lax'
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Sample users for testing
const users = [
  {
    id: 1,
    username: 'admin1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Shop Admin',
    isBlocked: false
  }
];

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: "Account is blocked" });
    }

    req.session.userId = user.id;
    req.session.user = user;
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get('/api/auth/me', (req, res) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out" });
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BingoMaster server running on port ${PORT}`);
  console.log(`Access at: http://91.99.161.246:${PORT}`);
});
'''
    
    # Upload server file
    with open('temp_server.js', 'w') as f:
        f.write(server_code)
    
    if upload_file('temp_server.js', '/var/www/bingomaster/server/index.js'):
        print("✅ Server application uploaded")
        os.remove('temp_server.js')
    else:
        print("❌ Failed to upload server application")
        return False
    
    # Step 5: Create directory structure
    print("\n5. Creating directory structure...")
    run_ssh_command("mkdir -p /var/www/bingomaster/server /var/www/bingomaster/dist")
    
    # Step 6: Install dependencies
    print("\n6. Installing dependencies...")
    code, stdout, stderr = run_ssh_command("cd /var/www/bingomaster && npm install")
    if code == 0:
        print("✅ Dependencies installed")
    else:
        print(f"❌ Failed to install dependencies: {stderr}")
        return False
    
    # Step 7: Create systemd service
    print("\n7. Creating systemd service...")
    service_content = '''[Unit]
Description=BingoMaster Node.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
'''
    
    with open('temp_service', 'w') as f:
        f.write(service_content)
    
    if upload_file('temp_service', '/etc/systemd/system/bingomaster.service'):
        print("✅ Systemd service created")
        os.remove('temp_service')
    else:
        print("❌ Failed to create systemd service")
        return False
    
    # Step 8: Start service
    print("\n8. Starting BingoMaster service...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster",
        "systemctl start bingomaster",
        "systemctl status bingomaster --no-pager"
    ]
    
    for cmd in commands:
        code, stdout, stderr = run_ssh_command(cmd)
        if "active (running)" in stdout:
            print("✅ BingoMaster service started successfully")
            break
    
    # Step 9: Configure Nginx
    print("\n9. Configuring Nginx...")
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
    }
}
'''
    
    with open('temp_nginx', 'w') as f:
        f.write(nginx_config)
    
    if upload_file('temp_nginx', '/etc/nginx/sites-available/bingomaster'):
        print("✅ Nginx configuration uploaded")
        os.remove('temp_nginx')
        
        # Enable site and restart Nginx
        run_ssh_command("ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/")
        run_ssh_command("rm -f /etc/nginx/sites-enabled/default")
        run_ssh_command("nginx -t && systemctl restart nginx")
        print("✅ Nginx configured and restarted")
    else:
        print("❌ Failed to configure Nginx")
    
    # Step 10: Test deployment
    print("\n10. Testing deployment...")
    time.sleep(3)
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000 | head -1")
    if "200 OK" in stdout:
        print("✅ BingoMaster deployed successfully!")
        print("\n🎉 DEPLOYMENT COMPLETE!")
        print("Access your application at: http://91.99.161.246")
        print("Login credentials:")
        print("  Username: admin1")
        print("  Password: 123456")
        return True
    else:
        print(f"❌ Deployment test failed: {stdout}")
        return False

if __name__ == "__main__":
    success = deploy_bingomaster()
    if success:
        print("\n✅ BingoMaster is now running on your VPS!")
    else:
        print("\n❌ Deployment failed. Please check the logs above.")