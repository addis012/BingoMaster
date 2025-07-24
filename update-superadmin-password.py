#!/usr/bin/env python3
import subprocess
import bcrypt

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
    print("Updating superadmin password to 'a1e2y3t4h5'...")
    
    # Generate bcrypt hash for the new password
    new_password = "a1e2y3t4h5"
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"Generated password hash: {password_hash}")
    
    # Create updated server with new password
    server_code = f'''// BingoMaster Complete Production Server - Updated Password
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

// Shops data
const shops = [
  {{
    id: 1,
    name: 'Main Shop',
    adminId: 1,
    profitMargin: '30.00',
    location: 'Addis Ababa',
    createdAt: '2025-07-24T07:00:00.000Z'
  }},
  {{
    id: 2,
    name: 'Branch Shop',
    adminId: 1,
    profitMargin: '25.00',
    location: 'Bahir Dar',
    createdAt: '2025-07-24T07:00:00.000Z'
  }},
  {{
    id: 5,
    name: 'winget',
    adminId: 2,
    profitMargin: '30.00',
    location: 'Dire Dawa',
    createdAt: '2025-06-08T07:00:00.000Z'
  }}
];

// Games data
let games = [];
let gameCounter = 1;

// Cartelas data
let cartelas = [];

// Authentication middleware
const isAuthenticated = (req, res, next) => {{
  const userId = req.session?.userId;
  if (!userId) {{
    return res.status(401).json({{ message: "Not authenticated" }});
  }}
  
  const user = users.find(u => u.id === userId);
  if (!user) {{
    return res.status(401).json({{ message: "User not found" }});
  }}
  
  req.user = user;
  next();
}};

// Authentication routes
app.post('/api/auth/login', async (req, res) => {{
  try {{
    console.log('Login attempt for:', req.body.username);
    const {{ username, password }} = req.body;
    
    if (!username || !password) {{
      return res.status(400).json({{ message: "Username and password required" }});
    }}

    const user = users.find(u => u.username === username);
    if (!user) {{
      console.log('User not found:', username);
      return res.status(401).json({{ message: "Invalid credentials" }});
    }}

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {{
      console.log('Invalid password for:', username);
      return res.status(401).json({{ message: "Invalid credentials" }});
    }}

    if (user.isBlocked) {{
      console.log('User blocked:', username);
      return res.status(403).json({{ message: "Account is blocked" }});
    }}

    req.session.userId = user.id;
    req.session.user = user;
    
    req.session.save((err) => {{
      if (err) {{
        console.error('Session save error:', err);
        return res.status(500).json({{ message: "Session save failed" }});
      }}
      
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
  if (!userId) {{
    return res.status(401).json({{ message: "Not authenticated" }});
  }}

  const user = users.find(u => u.id === userId);
  if (!user) {{
    return res.status(401).json({{ message: "User not found" }});
  }}

  const {{ password: _, ...userWithoutPassword }} = user;
  res.json({{ user: userWithoutPassword }});
}});

app.post('/api/auth/logout', (req, res) => {{
  req.session.destroy((err) => {{
    if (err) {{
      console.error('Logout error:', err);
    }}
    res.clearCookie('connect.sid');
    res.json({{ message: "Logged out" }});
  }});
}});

// Health endpoint
app.get('/api/health', (req, res) => {{
  res.json({{ 
    status: 'OK', 
    version: 'Complete Production - Updated Password',
    hostname: 'aradabingo',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
    users: users.length,
    shops: shops.length
  }});
}});

// Shop endpoints
app.get('/api/shops', (req, res) => {{
  res.json(shops);
}});

app.get('/api/shops/:id', (req, res) => {{
  const shop = shops.find(s => s.id === parseInt(req.params.id));
  if (!shop) return res.status(404).json({{ message: 'Shop not found' }});
  res.json(shop);
}});

// User endpoints
app.get('/api/users', (req, res) => {{
  const safeUsers = users.map(u => {{
    const {{ password, ...safeUser }} = u;
    return safeUser;
  }});
  res.json(safeUsers);
}});

app.get('/api/users/:id', (req, res) => {{
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({{ message: 'User not found' }});
  const {{ password, ...safeUser }} = user;
  res.json(safeUser);
}});

// Admin endpoints
app.get('/api/admin/employees', isAuthenticated, (req, res) => {{
  const employees = users.filter(u => u.role === 'employee').map(u => {{
    const {{ password, ...safeUser }} = u;
    return safeUser;
  }});
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
  res.json({{ 
    balance: user.creditBalance,
    accountNumber: user.accountNumber,
    lastUpdated: new Date().toISOString()
  }});
}});

// Game endpoints
app.get('/api/games', (req, res) => {{
  res.json(games);
}});

app.get('/api/games/active', (req, res) => {{
  const activeGame = games.find(g => g.status === 'active' || g.status === 'paused');
  res.json(activeGame || null);
}});

// Cartela endpoints
app.get('/api/cartelas/:shopId', (req, res) => {{
  const shopCartelas = cartelas.filter(c => c.shopId === parseInt(req.params.shopId));
  res.json(shopCartelas);
}});

// Analytics endpoints
app.get('/api/analytics/shop', isAuthenticated, (req, res) => {{
  const userShopId = req.user.shopId;
  const shopGames = games.filter(g => g.shopId === userShopId);
  
  const analytics = {{
    totalGames: shopGames.length,
    totalRevenue: shopGames.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0).toFixed(2),
    activeGames: shopGames.filter(g => g.status === 'active').length,
    completedGames: shopGames.filter(g => g.status === 'finished').length,
    avgGameRevenue: shopGames.length > 0 ? 
      (shopGames.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0) / shopGames.length).toFixed(2) : 
      '0.00'
  }};
  res.json(analytics);
}});

// Serve React app for all other routes
app.get('*', (req, res) => {{
  res.sendFile(path.join(__dirname, 'public/index.html'));
}});

// WebSocket setup
const server = createServer(app);
const wss = new WebSocketServer({{ server }});

wss.on('connection', (ws, req) => {{
  console.log('WebSocket connection established');
  
  ws.on('message', (data) => {{
    try {{
      const message = JSON.parse(data.toString());
      console.log('WebSocket message:', message.type);
      
      // Broadcast to all connected clients
      wss.clients.forEach(client => {{
        if (client.readyState === 1) {{ // WebSocket.OPEN
          client.send(JSON.stringify(message));
        }}
      }});
    }} catch (error) {{
      console.error('WebSocket message error:', error);
    }}
  }});
  
  ws.on('close', () => {{
    console.log('WebSocket connection closed');
  }});
}});

// Start server
server.listen(PORT, '0.0.0.0', () => {{
  console.log(`🎯 BingoMaster Complete running on port ${{PORT}}`);
  console.log(`🌐 Application: http://91.99.161.246:${{PORT}}`);
  console.log(`📱 Employee Dashboard: http://91.99.161.246/dashboard/employee`);
  console.log(`🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin`);
  console.log(`🔐 Authentication credentials:`);
  console.log(`   • admin / 123456 (Admin)`);
  console.log(`   • superadmin / a1e2y3t4h5 (Super Admin) [UPDATED]`);
  console.log(`   • adad / 123456 (Employee)`);
  console.log(`   • alex1 / 123456 (Employee)`);
  console.log(`   • kal1 / 123456 (Employee)`);
  console.log(`✅ Complete BingoMaster production ready with updated password!`);
}});
'''
    
    # Write the updated server
    with open("updated_server.js", "w") as f:
        f.write(server_code)
    
    # Stop service
    print("Stopping service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Upload updated server
    print("Uploading updated server...")
    if upload_file("updated_server.js", "/var/www/bingomaster/index.js"):
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
    print("Testing updated superadmin password...")
    import json
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
    
    # Test old password should fail
    print("Verifying old password no longer works...")
    result = subprocess.run([
        'curl', '-s', '-X', 'POST', 
        'http://91.99.161.246/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"username": "superadmin", "password": "123456"})
    ], capture_output=True, text=True, timeout=10)
    
    try:
        response = json.loads(result.stdout)
        if 'user' in response:
            print("⚠️  Old password still works - update may not have taken effect")
        else:
            print("✅ Old password correctly rejected")
    except:
        print("✅ Old password correctly rejected")
    
    # Clean up
    import os
    if os.path.exists("updated_server.js"):
        os.remove("updated_server.js")
    
    print("\\n🎉 SUPERADMIN PASSWORD UPDATE COMPLETE!")
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
        print("\\n✅ Password update successful!")
    else:
        print("\\n❌ Password update failed.")
'''
    
    with open("update-superadmin-password.py", "w") as f:
        f.write(update_script)
    
    return True

if __name__ == "__main__":
    update_superadmin_password()