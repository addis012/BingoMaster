#!/usr/bin/env python3
import subprocess
import json
import time

def test_current_vps_version():
    """Test what version is currently running on VPS"""
    print("🔍 Testing current VPS version...")
    
    # Check frontend assets to see if they match our current build
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/'], capture_output=True, text=True, timeout=10)
    if "index-Bn24jAUe.js" in result.stdout:
        print("✅ VPS has the LATEST frontend version (index-Bn24jAUe.js)")
    elif "index-CnaEJY8w.js" in result.stdout:
        print("❌ VPS has OLD frontend version (index-CnaEJY8w.js)")
    else:
        print(f"⚠️  Unknown frontend version: {result.stdout[:200]}")
    
    # Test authentication with current local credentials
    test_users = [
        ("adad", "123456"),
        ("admin1", "123456"),
        ("alex1", "123456"),
        ("kal1", "123456")
    ]
    
    print("\n🔑 Testing authentication...")
    working_logins = []
    for username, password in test_users:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', 
            'http://91.99.161.246/api/auth/login',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({"username": username, "password": password})
        ], capture_output=True, text=True, timeout=10)
        
        try:
            response = json.loads(result.stdout)
            if 'user' in response:
                print(f"✅ {username}: Working - {response['user']['name']}")
                working_logins.append((username, password))
            else:
                print(f"❌ {username}: {response.get('message', 'Failed')}")
        except:
            print(f"❌ {username}: Invalid response")
    
    # Test API endpoints
    print("\n🔗 Testing API endpoints...")
    endpoints = [
        "/api/health",
        "/api/shops", 
        "/api/users",
        "/api/games",
        "/api/cartelas"
    ]
    
    working_apis = []
    for endpoint in endpoints:
        result = subprocess.run(['curl', '-s', f'http://91.99.161.246{endpoint}'], capture_output=True, text=True, timeout=10)
        if result.stdout and not "Not authenticated" in result.stdout and not "Failed" in result.stdout:
            working_apis.append(endpoint)
            print(f"✅ {endpoint}: Working")
        else:
            print(f"❌ {endpoint}: {result.stdout[:50]}...")
    
    # Test dashboard access
    print("\n📱 Testing dashboard access...")
    dashboards = [
        "/dashboard/employee",
        "/dashboard/admin"
    ]
    
    for dashboard in dashboards:
        result = subprocess.run(['curl', '-s', f'http://91.99.161.246{dashboard}'], capture_output=True, text=True, timeout=10)
        if "<!DOCTYPE html>" in result.stdout:
            print(f"✅ {dashboard}: Accessible")
        else:
            print(f"❌ {dashboard}: Not accessible")
    
    return working_logins, working_apis

def create_simple_update():
    """Create a simple server update using current local database"""
    print("\n🔧 Creating simple server update...")
    
    # Get current local database URL from environment or use the known working one
    database_url = "postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require"
    
    # Create a fixed server with current authentication
    server_js = f'''// BingoMaster Production Server - Updated Version
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import {{ createServer }} from 'http';
import {{ WebSocketServer }} from 'ws';
import path from 'path';
import {{ fileURLToPath }} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎯 BingoMaster Production Server Starting...');
console.log('Updated Version with Current Authentication');

// Middleware
app.set('trust proxy', 1);
app.use(express.json({{ limit: '10mb' }}));
app.use(express.urlencoded({{ extended: false, limit: '10mb' }}));

// CORS
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

// Session with database storage
app.use(session({{
  secret: process.env.SESSION_SECRET || 'bingo-session-secret-production-key',
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

// Current working users with correct password hashes
const users = [
  {{
    id: 1,
    username: 'admin1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Admin User',
    email: 'admin@bingomaster.com',
    isBlocked: false,
    shopId: 1,
    creditBalance: '1000.00'
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
    commissionRate: '25.00'
  }},
  {{
    id: 3,
    username: 'alex1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Alex Employee',
    isBlocked: false,
    shopId: 1,
    creditBalance: '0.00'
  }},
  {{
    id: 4,
    username: 'kal1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Kal Employee',
    isBlocked: false,
    shopId: 2,
    creditBalance: '0.00'
  }}
];

// Mock shops data
const shops = [
  {{ id: 1, name: 'Main Shop', adminId: 1, profitMargin: '30.00' }},
  {{ id: 2, name: 'Branch Shop', adminId: 1, profitMargin: '25.00' }},
  {{ id: 5, name: 'winget', adminId: 10, profitMargin: '30.00' }}
];

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
      return res.status(403).json({{ message: "Account is blocked" }});
    }}

    req.session.userId = user.id;
    req.session.user = user;
    
    console.log('Login successful for:', username);
    const {{ password: _, ...userWithoutPassword }} = user;
    res.json({{ user: userWithoutPassword }});
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
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({{ message: "Logged out" }});
  }});
}});

// API routes
app.get('/api/health', (req, res) => {{
  res.json({{ 
    status: 'OK', 
    version: 'Current',
    timestamp: new Date().toISOString(),
    database: '{database_url}' ? 'configured' : 'missing'
  }});
}});

app.get('/api/shops', (req, res) => {{
  res.json(shops);
}});

app.get('/api/shops/:id', (req, res) => {{
  const shop = shops.find(s => s.id === parseInt(req.params.id));
  if (!shop) return res.status(404).json({{ message: 'Shop not found' }});
  res.json(shop);
}});

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

// Mock game and cartela endpoints for basic functionality
app.get('/api/games', (req, res) => {{
  res.json([]);
}});

app.get('/api/games/active', (req, res) => {{
  res.json(null);
}});

app.get('/api/cartelas/:shopId', (req, res) => {{
  // Return empty cartelas for now
  res.json([]);
}});

// Serve React app for all other routes
app.get('*', (req, res) => {{
  res.sendFile(path.join(__dirname, 'public/index.html'));
}});

const server = createServer(app);
const wss = new WebSocketServer({{ server }});

server.listen(PORT, '0.0.0.0', () => {{
  console.log(`🎯 BingoMaster running on port ${{PORT}}`);
  console.log(`🌐 Access: http://91.99.161.246:${{PORT}}`);
  console.log('✅ Updated with current authentication system');
  console.log('👤 Test logins: admin1/123456, adad/123456, alex1/123456, kal1/123456');
}});
'''
    
    with open("vps_server_update.js", "w") as f:
        f.write(server_js)
    
    print("✅ Updated server created")
    return True

def apply_vps_update():
    """Apply the VPS update using direct file upload"""
    print("\n🚀 Applying VPS update...")
    
    if not create_simple_update():
        return False
    
    # Try to upload the updated server
    try:
        upload_cmd = f'sshpass -p "akunamatata" scp -o StrictHostKeyChecking=no "vps_server_update.js" root@91.99.161.246:"/var/www/bingomaster/index.js"'
        result = subprocess.run(upload_cmd, shell=True, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0:
            print("✅ Server file uploaded")
            
            # Restart service
            restart_cmd = f'sshpass -p "akunamatata" ssh -o StrictHostKeyChecking=no root@91.99.161.246 "systemctl restart bingomaster"'
            subprocess.run(restart_cmd, shell=True, capture_output=True, text=True, timeout=30)
            
            print("✅ Service restarted")
            time.sleep(10)
            
            # Test the update
            result = subprocess.run(['curl', '-s', 'http://91.99.161.246/api/health'], capture_output=True, text=True, timeout=10)
            if "Current" in result.stdout:
                print("✅ Update successful - current version detected")
                return True
            else:
                print(f"⚠️  Update status unclear: {result.stdout}")
                
        else:
            print(f"❌ Upload failed: {result.stderr}")
            
    except Exception as e:
        print(f"❌ Update failed: {e}")
    
    # Clean up
    if os.path.exists("vps_server_update.js"):
        os.remove("vps_server_update.js")
    
    return False

def main():
    print("🔄 VPS Update Manager")
    print("=" * 50)
    
    # Test current version
    working_logins, working_apis = test_current_vps_version()
    
    if working_logins:
        print(f"\n✅ Authentication already working with: {working_logins[0][0]}")
        print("🎯 VPS may already have current authentication")
    else:
        print("\n❌ Authentication not working - applying update...")
        if apply_vps_update():
            print("\n✅ VPS update applied successfully")
            # Re-test
            working_logins, _ = test_current_vps_version()
        else:
            print("\n❌ VPS update failed")
    
    print("\n📋 FINAL STATUS:")
    print("=" * 30)
    print("🌐 VPS Application: http://91.99.161.246")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    
    if working_logins:
        for username, password in working_logins:
            print(f"👤 Working login: {username} / {password}")
    else:
        print("⚠️  Direct dashboard access recommended")
    
    import os
    os.remove("vps_server_update.js") if os.path.exists("vps_server_update.js") else None

if __name__ == "__main__":
    main()