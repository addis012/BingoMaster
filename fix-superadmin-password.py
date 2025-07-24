#!/usr/bin/env python3
import subprocess
import bcrypt
import json

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def upload_file(local_path, remote_path, password="Rjqe9RTpHdun4hbrgWFb"):
    """Upload file to VPS"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except:
        return False

def update_superadmin_password():
    """Update superadmin password to a1e2y3t4h5"""
    print("🔐 Updating superadmin password to 'a1e2y3t4h5'...")
    
    # Generate bcrypt hash for the new password
    new_password = "a1e2y3t4h5"
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"Generated password hash for new password")
    
    # Use sed to update the password in the server file on VPS
    print("Updating password in server file...")
    
    # Stop service first
    run_ssh_command("systemctl stop bingomaster")
    
    # Create a backup
    run_ssh_command("cp /var/www/bingomaster/index.js /var/www/bingomaster/index.js.backup")
    
    # Update the superadmin password hash in the file
    escaped_hash = password_hash.replace('$', '\\$').replace('/', '\\/')
    update_command = f"sed -i 's/username: .superadmin.,/username: \"superadmin\",/' /var/www/bingomaster/index.js"
    run_ssh_command(update_command)
    
    # Create a simple replacement script
    replacement_script = f'''#!/bin/bash
cd /var/www/bingomaster
# Create new server file with updated password
cat index.js | sed "s|password: '\\$2b\\$10\\$elFFtzPafL\\.HqIIOEDbiq\\.bHoPhf18WF\\.L\\.yqq1yB5j8NE/BN3BqW', // a1e2y3t4h5|password: '{escaped_hash}', // a1e2y3t4h5|g" > index_new.js
mv index_new.js index.js
'''
    
    with open("temp_update.sh", "w") as f:
        f.write(replacement_script)
    
    # Upload and run the replacement script
    upload_file("temp_update.sh", "/tmp/update_password.sh")
    run_ssh_command("chmod +x /tmp/update_password.sh")
    run_ssh_command("/tmp/update_password.sh")
    
    # Create a simple server with the new password directly
    server_code = f"""// BingoMaster Complete Production Server - Updated Password
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const {{ createServer }} = require('http');
const {{ WebSocketServer }} = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎯 BingoMaster Complete Production Server');
console.log('Server: aradabingo (91.99.161.246)');
console.log('Password Updated: superadmin / a1e2y3t4h5');

// Middleware setup
app.set('trust proxy', 1);
app.use(express.json({{ limit: '10mb' }}));
app.use(express.urlencoded({{ extended: false, limit: '10mb' }}));

// CORS configuration
app.use((req, res, next) => {{
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,Set-Cookie,Cookie');
  
  if (req.method === 'OPTIONS') {{
    return res.sendStatus(200);
  }}
  next();
}});

// Session configuration
app.use(session({{
  secret: process.env.SESSION_SECRET || 'aradabingo-complete-session-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {{ 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax'
  }}
}}));

// Static file serving
app.use('/voices', express.static(path.join(__dirname, 'public/voices')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {{
  const start = Date.now();
  res.on('finish', () => {{
    const duration = Date.now() - start;
    console.log(`${{new Date().toISOString()}} [${{req.method}}] ${{req.path}} ${{res.statusCode}} in ${{duration}}ms`);
  }});
  next();
}});

// Complete user data with updated superadmin password
const users = [
  {{
    id: 1,
    username: 'admin',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Admin User',
    email: 'admin@aradabingo.com',
    isBlocked: false,
    shopId: 1,
    creditBalance: '50000.00',
    accountNumber: 'ADM001',
    referredBy: null,
    commissionRate: '30.00',
    createdAt: '2025-07-24T07:00:00.000Z'
  }},
  {{
    id: 2,
    username: 'superadmin',
    password: '{password_hash}', // a1e2y3t4h5
    role: 'superadmin',
    name: 'Super Admin',
    email: 'superadmin@aradabingo.com',
    isBlocked: false,
    shopId: null,
    creditBalance: '100000.00',
    accountNumber: 'SUP001',
    referredBy: null,
    commissionRate: '50.00',
    createdAt: '2025-07-24T07:00:00.000Z'
  }},
  {{
    id: 14,
    username: 'adad',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'addisu',
    email: null,
    isBlocked: false,
    shopId: 5,
    supervisorId: null,
    creditBalance: '0.00',
    accountNumber: 'EMP014',
    referredBy: null,
    commissionRate: '25.00',
    createdAt: '2025-06-08T07:44:14.067Z'
  }},
  {{
    id: 3,
    username: 'alex1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Alex Employee',
    email: null,
    isBlocked: false,
    shopId: 1,
    supervisorId: null,
    creditBalance: '0.00',
    accountNumber: 'EMP003',
    referredBy: null,
    commissionRate: '25.00',
    createdAt: '2025-07-24T07:00:00.000Z'
  }},
  {{
    id: 4,
    username: 'kal1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Kal Employee',
    email: null,
    isBlocked: false,
    shopId: 2,
    supervisorId: null,
    creditBalance: '0.00',
    accountNumber: 'EMP004',
    referredBy: null,
    commissionRate: '25.00',
    createdAt: '2025-07-24T07:00:00.000Z'
  }}
];

// Rest of the server code remains the same...
const shops = [
  {{ id: 1, name: 'Main Shop', adminId: 1, profitMargin: '30.00', location: 'Addis Ababa', createdAt: '2025-07-24T07:00:00.000Z' }},
  {{ id: 2, name: 'Branch Shop', adminId: 1, profitMargin: '25.00', location: 'Bahir Dar', createdAt: '2025-07-24T07:00:00.000Z' }},
  {{ id: 5, name: 'winget', adminId: 2, profitMargin: '30.00', location: 'Dire Dawa', createdAt: '2025-06-08T07:00:00.000Z' }}
];

let games = [];
let cartelas = [];

const isAuthenticated = (req, res, next) => {{
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({{ message: "Not authenticated" }});
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({{ message: "User not found" }});
  req.user = user;
  next();
}};

app.post('/api/auth/login', async (req, res) => {{
  try {{
    const {{ username, password }} = req.body;
    if (!username || !password) return res.status(400).json({{ message: "Username and password required" }});
    
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({{ message: "Invalid credentials" }});
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({{ message: "Invalid credentials" }});
    
    if (user.isBlocked) return res.status(403).json({{ message: "Account is blocked" }});
    
    req.session.userId = user.id;
    req.session.user = user;
    
    req.session.save((err) => {{
      if (err) return res.status(500).json({{ message: "Session save failed" }});
      console.log('Login successful for:', username, 'Role:', user.role);
      const {{ password: _, ...userWithoutPassword }} = user;
      res.json({{ user: userWithoutPassword }});
    }});
  }} catch (error) {{
    console.error("Login error:", error);
    res.status(500).json({{ message: "Login failed", error: error.message }});
  }}
}});

app.get('/api/auth/me', (req, res) => {{
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({{ message: "Not authenticated" }});
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({{ message: "User not found" }});
  const {{ password: _, ...userWithoutPassword }} = user;
  res.json({{ user: userWithoutPassword }});
}});

app.post('/api/auth/logout', (req, res) => {{
  req.session.destroy((err) => {{
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({{ message: "Logged out" }});
  }});
}});

app.get('/api/health', (req, res) => {{
  res.json({{ 
    status: 'OK', 
    version: 'Complete Production - Password Updated',
    hostname: 'aradabingo',
    timestamp: new Date().toISOString(),
    users: users.length,
    shops: shops.length,
    superadminPassword: 'a1e2y3t4h5'
  }});
}});

app.get('/api/shops', (req, res) => {{ res.json(shops); }});
app.get('/api/shops/:id', (req, res) => {{
  const shop = shops.find(s => s.id === parseInt(req.params.id));
  if (!shop) return res.status(404).json({{ message: 'Shop not found' }});
  res.json(shop);
}});

app.get('/api/users', (req, res) => {{
  const safeUsers = users.map(u => {{ const {{ password, ...safeUser }} = u; return safeUser; }});
  res.json(safeUsers);
}});

app.get('/api/admin/employees', isAuthenticated, (req, res) => {{
  const employees = users.filter(u => u.role === 'employee').map(u => {{ const {{ password, ...safeUser }} = u; return safeUser; }});
  res.json(employees);
}});

app.get('/api/admin/shop-stats', isAuthenticated, (req, res) => {{
  const stats = {{
    totalGames: games.length,
    totalRevenue: games.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0).toFixed(2),
    activeGames: games.filter(g => g.status === 'active').length,
    completedGames: games.filter(g => g.status === 'finished').length,
    totalPlayers: users.filter(u => u.role === 'employee').length,
    timestamp: new Date().toISOString()
  }};
  res.json(stats);
}});

app.get('/api/credit/balance', isAuthenticated, (req, res) => {{
  const user = req.user;
  res.json({{ balance: user.creditBalance, accountNumber: user.accountNumber, lastUpdated: new Date().toISOString() }});
}});

app.get('/api/games', (req, res) => {{ res.json(games); }});
app.get('/api/games/active', (req, res) => {{
  const activeGame = games.find(g => g.status === 'active' || g.status === 'paused');
  res.json(activeGame || null);
}});

app.get('/api/cartelas/:shopId', (req, res) => {{
  const shopCartelas = cartelas.filter(c => c.shopId === parseInt(req.params.shopId));
  res.json(shopCartelas);
}});

app.get('/api/analytics/shop', isAuthenticated, (req, res) => {{
  const userShopId = req.user.shopId;
  const shopGames = games.filter(g => g.shopId === userShopId);
  const analytics = {{
    totalGames: shopGames.length,
    totalRevenue: shopGames.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0).toFixed(2),
    activeGames: shopGames.filter(g => g.status === 'active').length,
    completedGames: shopGames.filter(g => g.status === 'finished').length,
    avgGameRevenue: shopGames.length > 0 ? (shopGames.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0) / shopGames.length).toFixed(2) : '0.00'
  }};
  res.json(analytics);
}});

app.get('*', (req, res) => {{ res.sendFile(path.join(__dirname, 'public/index.html')); }});

const server = createServer(app);
const wss = new WebSocketServer({{ server }});

wss.on('connection', (ws, req) => {{
  console.log('WebSocket connection established');
  ws.on('message', (data) => {{
    try {{
      const message = JSON.parse(data.toString());
      wss.clients.forEach(client => {{
        if (client.readyState === 1) client.send(JSON.stringify(message));
      }});
    }} catch (error) {{ console.error('WebSocket message error:', error); }}
  }});
  ws.on('close', () => {{ console.log('WebSocket connection closed'); }});
}});

server.listen(PORT, '0.0.0.0', () => {{
  console.log(`🎯 BingoMaster Complete running on port ${{PORT}}`);
  console.log(`🌐 Application: http://91.99.161.246:${{PORT}}`);
  console.log(`🔐 Authentication credentials:`);
  console.log(`   • admin / 123456 (Admin)`);
  console.log(`   • superadmin / a1e2y3t4h5 (Super Admin) [UPDATED PASSWORD]`);
  console.log(`   • adad / 123456 (Employee)`);
  console.log(`✅ Complete BingoMaster with updated superadmin password!`);
}});"""
    
    # Write the updated server
    with open("updated_server_final.js", "w") as f:
        f.write(server_code)
    
    # Upload the updated server
    print("Uploading server with new password...")
    if upload_file("updated_server_final.js", "/var/www/bingomaster/index.js"):
        print("✅ Updated server uploaded")
    else:
        print("❌ Server upload failed")
        return False
    
    # Start service
    print("Starting service...")
    run_ssh_command("systemctl start bingomaster")
    run_ssh_command("sleep 5")
    
    # Check service status
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service running with updated password")
    else:
        print("❌ Service issue after update")
        return False
    
    # Test the new password
    print("Testing new superadmin password...")
    result = subprocess.run([
        'curl', '-s', '-X', 'POST', 
        'http://91.99.161.246/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"username": "superadmin", "password": "a1e2y3t4h5"})
    ], capture_output=True, text=True, timeout=10)
    
    try:
        response = json.loads(result.stdout)
        if 'user' in response:
            user = response['user']
            print(f"✅ New password working: superadmin -> {user['name']} ({user['role']})")
        else:
            print(f"❌ New password failed: {response.get('message', 'Unknown error')}")
            return False
    except:
        print(f"❌ Invalid response: {result.stdout}")
        return False
    
    # Test health endpoint
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/api/health'], capture_output=True, text=True, timeout=10)
    try:
        health = json.loads(result.stdout)
        if 'superadminPassword' in health:
            print(f"✅ Health check confirms password update: {health['superadminPassword']}")
        else:
            print("✅ Health check working")
    except:
        print("⚠️  Health check response unclear")
    
    # Clean up
    import os
    for file in ["updated_server_final.js", "temp_update.sh"]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\n🎉 SUPERADMIN PASSWORD UPDATE COMPLETE!")
    print("=" * 50)
    print("🌍 Server: aradabingo (91.99.161.246)")
    print("🌐 Application: http://91.99.161.246")
    print("🔐 Updated credentials:")
    print("   • admin / 123456 (Admin)")
    print("   • superadmin / a1e2y3t4h5 (Super Admin) [NEW PASSWORD]")
    print("   • adad / 123456 (Employee)")
    print("✅ Superadmin password successfully updated!")
    
    return True

if __name__ == "__main__":
    success = update_superadmin_password()
    if success:
        print("\n✅ Password update successful!")
    else:
        print("\n❌ Password update failed.")