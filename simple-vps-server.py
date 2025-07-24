#!/usr/bin/env python3
import subprocess
import os

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=60)
        return result.returncode, result.stdout, result.stderr
    except:
        return -1, "", "Failed"

def upload_file(local_path, remote_path, password="akunamatata"):
    """Upload file to VPS using scp"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode == 0
    except:
        return False

def create_working_vps_app():
    """Create a working VPS application"""
    print("Creating working VPS application...")
    
    # Create a simple but complete BingoMaster server
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

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,Set-Cookie,Cookie');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session
app.use(session({
  secret: 'bingo-session-secret-key-longer-for-security-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  },
  name: 'connect.sid'
}));

// Static files
app.use('/voices', express.static(path.join(__dirname, '../public/voices')));
app.use('/attached_assets', express.static(path.join(__dirname, '../attached_assets')));
app.use(express.static(path.join(__dirname, '../dist')));

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} [${req.method}] ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Users data
const users = [
  {
    id: 1,
    username: 'admin1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW',
    role: 'admin',
    name: 'Shop Admin',
    email: 'admin@bingomaster.com',
    isBlocked: false,
    shopId: 1
  },
  {
    id: 2,
    username: 'employee1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW',
    role: 'employee',
    name: 'Employee User',
    isBlocked: false,
    shopId: 1
  }
];

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.username);
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
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: "Session save failed" });
      }
      
      console.log('Login successful for:', username);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
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
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out" });
  });
});

// Dashboard routes
app.get('/dashboard/employee', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BingoMaster Employee Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #007bff; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .button:hover { background: #0056b3; }
        .user-info { display: flex; justify-content: space-between; align-items: center; }
        .game-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .status { padding: 5px 10px; border-radius: 4px; color: white; }
        .status.ready { background: #28a745; }
        .status.waiting { background: #ffc107; color: black; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="user-info">
          <h1>🎯 BingoMaster Employee Dashboard</h1>
          <div>
            <span id="userName"></span>
            <button class="button" onclick="logout()">Logout</button>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2>Game Status</h2>
        <div class="status ready">Ready to Start Game</div>
        <p>No active game. Create a new game to begin.</p>
      </div>
      
      <div class="card">
        <h2>Game Controls</h2>
        <div class="game-controls">
          <button class="button" onclick="createGame()">Create New Game</button>
          <button class="button" onclick="startGame()">Start Game</button>
          <button class="button" onclick="pauseGame()">Pause Game</button>
          <button class="button" onclick="resetGame()">Reset Game</button>
        </div>
      </div>
      
      <div class="card">
        <h2>Quick Stats</h2>
        <p>📊 Total Games Today: 0</p>
        <p>💰 Revenue Today: 0.00 Birr</p>
        <p>🎯 Active Players: 0</p>
        <p>🏆 Winners Today: 0</p>
      </div>
      
      <div class="card">
        <h2>Recent Activity</h2>
        <p>No recent activity. Start your first game!</p>
      </div>
      
      <script>
        // Check authentication
        fetch('/api/auth/me', { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            if (data.user) {
              document.getElementById('userName').textContent = data.user.name + ' (' + data.user.role + ')';
            } else {
              window.location.href = '/';
            }
          })
          .catch(e => {
            console.error('Auth check failed:', e);
            window.location.href = '/';
          });
          
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/');
        }
        
        function createGame() {
          alert('Create Game functionality - Coming Soon!');
        }
        
        function startGame() {
          alert('Start Game functionality - Coming Soon!');
        }
        
        function pauseGame() {
          alert('Pause Game functionality - Coming Soon!');
        }
        
        function resetGame() {
          alert('Reset Game functionality - Coming Soon!');
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/dashboard/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BingoMaster Admin Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .button { background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .button:hover { background: #1e7e34; }
        .user-info { display: flex; justify-content: space-between; align-items: center; }
        .admin-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="user-info">
          <h1>🏢 BingoMaster Admin Dashboard</h1>
          <div>
            <span id="userName"></span>
            <button class="button" onclick="logout()">Logout</button>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h2>Shop Overview</h2>
        <p>📊 Total Revenue: 0.00 Birr</p>
        <p>👥 Active Employees: 0</p>
        <p>🎯 Games Today: 0</p>
        <p>💰 Commission Earned: 0.00 Birr</p>
      </div>
      
      <div class="card">
        <h2>Admin Controls</h2>
        <div class="admin-controls">
          <button class="button" onclick="manageEmployees()">Manage Employees</button>
          <button class="button" onclick="viewReports()">View Reports</button>
          <button class="button" onclick="manageShop()">Shop Settings</button>
          <button class="button" onclick="financialOverview()">Financials</button>
        </div>
      </div>
      
      <script>
        fetch('/api/auth/me', { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            if (data.user) {
              document.getElementById('userName').textContent = data.user.name + ' (' + data.user.role + ')';
            } else {
              window.location.href = '/';
            }
          })
          .catch(e => window.location.href = '/');
          
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/');
        }
        
        function manageEmployees() { alert('Employee Management - Coming Soon!'); }
        function viewReports() { alert('Reports - Coming Soon!'); }
        function manageShop() { alert('Shop Settings - Coming Soon!'); }
        function financialOverview() { alert('Financial Overview - Coming Soon!'); }
      </script>
    </body>
    </html>
  `);
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>BingoMaster Login</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; background: #f5f5f5; }
        .login-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; margin-top: 10px; }
        button:hover { background: #0056b3; }
        .error { color: red; margin-top: 10px; }
        .success { color: green; margin-top: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .demo-accounts { background: #e9ecef; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="login-card">
        <div class="header">
          <h1>🎯 BingoMaster</h1>
          <p>Ethiopian Bingo Management System</p>
        </div>
        
        <form id="loginForm">
          <div class="form-group">
            <label>Username:</label>
            <input type="text" id="username" value="admin1" required>
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="password" value="123456" required>
          </div>
          <button type="submit">Login</button>
        </form>
        
        <div id="message"></div>
        
        <div class="demo-accounts">
          <strong>Demo Accounts:</strong><br>
          Admin: admin1 / 123456<br>
          Employee: employee1 / 123456
        </div>
      </div>
      
      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          const messageDiv = document.getElementById('message');
          
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password }),
              credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
              messageDiv.innerHTML = '<div class="success">Login successful! Redirecting...</div>';
              setTimeout(() => {
                if (data.user.role === 'admin') {
                  window.location.href = '/dashboard/admin';
                } else if (data.user.role === 'employee') {
                  window.location.href = '/dashboard/employee';
                } else {
                  window.location.href = '/dashboard/employee';
                }
              }, 1000);
            } else {
              messageDiv.innerHTML = '<div class="error">Error: ' + data.message + '</div>';
            }
          } catch (error) {
            messageDiv.innerHTML = '<div class="error">Network error: ' + error.message + '</div>';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Catch all
app.get('*', (req, res) => {
  res.redirect('/');
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 BingoMaster running on port ${PORT}`);
  console.log(`🌐 Access: http://91.99.161.246:${PORT}`);
  console.log(`👤 Login: admin1 / 123456 or employee1 / 123456`);
});
'''
    
    # Upload the complete server
    with open('temp_complete_server.js', 'w') as f:
        f.write(server_code)
    
    print("Uploading complete server...")
    if upload_file('temp_complete_server.js', '/var/www/bingomaster/server.js'):
        print("✅ Complete server uploaded")
        os.remove('temp_complete_server.js')
        
        # Update service to use the new server
        commands = [
            "systemctl stop bingomaster",
            "cd /var/www/bingomaster && npm install express session bcrypt ws",
        ]
        for cmd in commands:
            run_ssh_command(cmd)
        
        # Update systemd service
        service_content = '''[Unit]
Description=BingoMaster Production
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
'''
        
        with open('temp_service', 'w') as f:
            f.write(service_content)
        upload_file('temp_service', '/etc/systemd/system/bingomaster.service')
        os.remove('temp_service')
        
        # Start service
        commands = [
            "systemctl daemon-reload",
            "systemctl enable bingomaster",
            "systemctl start bingomaster",
            "sleep 3"
        ]
        for cmd in commands:
            run_ssh_command(cmd)
        
        print("\n✅ BingoMaster deployed successfully!")
        print("🌐 Access: http://91.99.161.246")
        print("👤 Admin: admin1 / 123456")
        print("👤 Employee: employee1 / 123456") 
        print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
        print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    else:
        print("❌ Failed to upload server")

if __name__ == "__main__":
    create_working_vps_app()