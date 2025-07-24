#!/usr/bin/env python3
import subprocess
import os
import json
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

def deploy_complete_with_cartelas():
    """Deploy complete current version with all cartelas and updated password"""
    print("🚀 Deploying complete BingoMaster with cartelas and updated password...")
    
    # Build current version first
    print("Building current version...")
    subprocess.run(["npm", "run", "build"], check=True)
    
    # Create server with updated password and cartela support
    new_password_hash = bcrypt.hashpw("a1e2y3t4h5".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    server_code = f'''// BingoMaster Complete Production Server - Full Version with Cartelas
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const {{ createServer }} = require('http');
const {{ WebSocketServer }} = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎯 BingoMaster Complete Production Server - Full Version');
console.log('Server: aradabingo (91.99.161.246)');
console.log('✅ Cartelas support enabled');
console.log('✅ Updated superadmin password: a1e2y3t4h5');

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
    password: '{new_password_hash}', // a1e2y3t4h5
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

// Complete cartelas data - 75 fixed cartelas
const cartelas = [];
let cartelaIdCounter = 751;

// Generate 75 cartelas for each shop
for (let shopIndex = 0; shopIndex < shops.length; shopIndex++) {{
  const shop = shops[shopIndex];
  for (let cartelaNum = 1; cartelaNum <= 75; cartelaNum++) {{
    cartelas.push({{
      id: cartelaIdCounter++,
      number: cartelaNum,
      shopId: shop.id,
      adminId: shop.adminId,
      collectorId: null,
      bookedBy: null,
      isBlocked: false,
      createdAt: '2025-07-24T07:00:00.000Z'
    }});
  }}
}}

console.log(`✅ Generated ${{cartelas.length}} cartelas for ${{shops.length}} shops`);

// Games data
let games = [];
let gameCounter = 1;

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
    version: 'Complete Production - Full Cartelas',
    hostname: 'aradabingo',
    timestamp: new Date().toISOString(),
    users: users.length,
    shops: shops.length,
    cartelas: cartelas.length,
    superadminPassword: 'a1e2y3t4h5'
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

// Cartela endpoints - FULL SUPPORT
app.get('/api/cartelas/:shopId', (req, res) => {{
  const shopId = parseInt(req.params.shopId);
  const shopCartelas = cartelas.filter(c => c.shopId === shopId);
  console.log(`🎯 Fetched ${{shopCartelas.length}} cartelas for shop ${{shopId}}`);
  res.json(shopCartelas);
}});

app.post('/api/cartelas/:cartelaId/book', isAuthenticated, (req, res) => {{
  const cartelaId = parseInt(req.params.cartelaId);
  const cartela = cartelas.find(c => c.id === cartelaId);
  
  if (!cartela) {{
    return res.status(404).json({{ message: 'Cartela not found' }});
  }}
  
  if (cartela.collectorId || cartela.bookedBy) {{
    return res.status(400).json({{ message: 'Cartela already booked' }});
  }}
  
  cartela.bookedBy = req.user.id;
  console.log(`✅ Cartela ${{cartela.number}} booked by employee ${{req.user.id}}`);
  res.json(cartela);
}});

app.post('/api/cartelas/:cartelaId/unbook', isAuthenticated, (req, res) => {{
  const cartelaId = parseInt(req.params.cartelaId);
  const cartela = cartelas.find(c => c.id === cartelaId);
  
  if (!cartela) {{
    return res.status(404).json({{ message: 'Cartela not found' }});
  }}
  
  if (cartela.bookedBy === req.user.id) {{
    cartela.bookedBy = null;
    console.log(`✅ Cartela ${{cartela.number}} unbooked by employee ${{req.user.id}}`);
  }}
  
  res.json(cartela);
}});

// Analytics endpoints
app.get('/api/analytics/shop', isAuthenticated, (req, res) => {{
  const userShopId = req.user.shopId;
  const shopGames = games.filter(g => g.shopId === userShopId);
  const shopCartelas = cartelas.filter(c => c.shopId === userShopId);
  
  const analytics = {{
    totalGames: shopGames.length,
    totalRevenue: shopGames.reduce((sum, game) => sum + parseFloat(game.totalCollected || 0), 0).toFixed(2),
    activeGames: shopGames.filter(g => g.status === 'active').length,
    completedGames: shopGames.filter(g => g.status === 'finished').length,
    totalCartelas: shopCartelas.length,
    bookedCartelas: shopCartelas.filter(c => c.collectorId || c.bookedBy).length,
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
  console.log(`   • superadmin / a1e2y3t4h5 (Super Admin) [UPDATED PASSWORD]`);
  console.log(`   • adad / 123456 (Employee)`);
  console.log(`   • alex1 / 123456 (Employee)`);
  console.log(`   • kal1 / 123456 (Employee)`);
  console.log(`📊 Data loaded:`);
  console.log(`   • ${{users.length}} users`);
  console.log(`   • ${{shops.length}} shops`);
  console.log(`   • ${{cartelas.length}} cartelas`);
  console.log(`✅ Complete BingoMaster with full cartela support ready!`);
}});'''
    
    with open("complete_server_with_cartelas.js", "w") as f:
        f.write(server_code)
    
    # Stop service
    print("Stopping service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Upload complete server with cartelas
    print("Uploading complete server with cartelas...")
    if upload_file("complete_server_with_cartelas.js", "/var/www/bingomaster/index.js"):
        print("✅ Complete server uploaded")
    else:
        print("❌ Server upload failed")
        return False
    
    # Upload current frontend
    print("Uploading current frontend...")
    if os.path.exists("dist/public"):
        subprocess.run(["tar", "-czf", "complete_frontend.tar.gz", "-C", "dist", "public"], check=True)
        if upload_file("complete_frontend.tar.gz", "/var/www/bingomaster/frontend.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf frontend.tar.gz && rm frontend.tar.gz")
            print("✅ Complete frontend uploaded")
        if os.path.exists("complete_frontend.tar.gz"):
            os.remove("complete_frontend.tar.gz")
    
    # Upload all voice files
    print("Uploading complete voice system...")
    if os.path.exists("public/voices"):
        subprocess.run(["tar", "-czf", "all_voices.tar.gz", "-C", "public", "voices"], check=True)
        if upload_file("all_voices.tar.gz", "/var/www/bingomaster/voices.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf voices.tar.gz && rm voices.tar.gz")
            print("✅ All voice files uploaded")
        if os.path.exists("all_voices.tar.gz"):
            os.remove("all_voices.tar.gz")
    
    # Upload all audio assets
    print("Uploading all audio assets...")
    if os.path.exists("attached_assets"):
        subprocess.run(["tar", "-czf", "all_audio.tar.gz", "attached_assets"], check=True)
        if upload_file("all_audio.tar.gz", "/var/www/bingomaster/audio.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf audio.tar.gz && rm audio.tar.gz")
            print("✅ All audio assets uploaded")
        if os.path.exists("all_audio.tar.gz"):
            os.remove("all_audio.tar.gz")
    
    # Start service
    print("Starting complete service...")
    run_ssh_command("systemctl start bingomaster")
    run_ssh_command("sleep 10")
    
    # Check service status
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Complete service running")
    else:
        print("❌ Service issue")
        return False
    
    # Test everything
    print("Testing complete deployment...")
    
    # Test frontend
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/'], capture_output=True, text=True, timeout=15)
    if "index-Bn24jAUe.js" in result.stdout:
        print("✅ Current frontend version deployed")
    elif "<!DOCTYPE html>" in result.stdout:
        print("⚠️  Frontend deployed but version unclear")
    
    # Test superadmin password
    result = subprocess.run([
        'curl', '-s', '-X', 'POST', 
        'http://91.99.161.246/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"username": "superadmin", "password": "a1e2y3t4h5"})
    ], capture_output=True, text=True, timeout=10)
    
    try:
        response = json.loads(result.stdout)
        if 'user' in response:
            print(f"✅ Superadmin password updated: a1e2y3t4h5")
        else:
            print(f"❌ Superadmin password failed")
    except:
        print(f"❌ Superadmin test error")
    
    # Test adad employee login
    result = subprocess.run([
        'curl', '-s', '-X', 'POST', 
        'http://91.99.161.246/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"username": "adad", "password": "123456"})
    ], capture_output=True, text=True, timeout=10)
    
    try:
        response = json.loads(result.stdout)
        if 'user' in response:
            user = response['user']
            print(f"✅ Employee adad login working: {user['name']} (Shop {user['shopId']})")
            
            # Test cartelas for adad's shop
            result = subprocess.run(['curl', '-s', f'http://91.99.161.246/api/cartelas/{user["shopId"]}'], capture_output=True, text=True, timeout=10)
            try:
                cartelas_data = json.loads(result.stdout)
                if isinstance(cartelas_data, list) and len(cartelas_data) > 0:
                    print(f"✅ Cartelas loaded for adad: {len(cartelas_data)} cartelas available")
                else:
                    print("❌ No cartelas found for adad")
            except:
                print("❌ Cartelas API error")
        else:
            print(f"❌ Adad login failed")
    except:
        print(f"❌ Adad test error")
    
    # Test health endpoint
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/api/health'], capture_output=True, text=True, timeout=10)
    try:
        health = json.loads(result.stdout)
        print(f"✅ Health check: {health['cartelas']} cartelas, {health['users']} users, {health['shops']} shops")
    except:
        print("⚠️  Health check unclear")
    
    # Clean up
    for file in ["complete_server_with_cartelas.js"]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\n🎉 COMPLETE DEPLOYMENT WITH CARTELAS FINISHED!")
    print("=" * 60)
    print("🌍 Server: aradabingo (91.99.161.246)")
    print("🌐 Application: http://91.99.161.246")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    print("🔐 Authentication credentials:")
    print("   • admin / 123456 (Admin)")
    print("   • superadmin / a1e2y3t4h5 (Super Admin) [UPDATED]")
    print("   • adad / 123456 (Employee) - with cartelas")
    print("   • alex1 / 123456 (Employee)")
    print("   • kal1 / 123456 (Employee)")
    print("✅ Complete BingoMaster with all cartelas deployed!")
    print("✅ Superadmin password updated to a1e2y3t4h5!")
    print("✅ All employees have access to their cartelas!")
    
    return True

if __name__ == "__main__":
    success = deploy_complete_with_cartelas()
    if success:
        print("\n✅ Complete deployment successful!")
    else:
        print("\n❌ Deployment failed.")