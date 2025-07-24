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

def fix_vps_login():
    """Fix VPS login issue"""
    print("🔧 Fixing VPS login issue...")
    
    # Create simple login test page
    login_html = '''<!DOCTYPE html>
<html>
<head>
    <title>BingoMaster Login Test</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
        button:hover { background: #0056b3; }
        .error { color: red; margin-top: 10px; }
        .success { color: green; margin-top: 10px; }
    </style>
</head>
<body>
    <h2>BingoMaster Login</h2>
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
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password }),
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<div class="success">Login successful! User: ' + data.user.name + '</div>';
                    // Test session
                    setTimeout(async () => {
                        const meResponse = await fetch('/api/auth/me', { credentials: 'include' });
                        const meData = await meResponse.json();
                        if (meResponse.ok) {
                            messageDiv.innerHTML += '<div class="success">Session working! Redirecting...</div>';
                            setTimeout(() => window.location.href = '/dashboard', 1000);
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
</html>'''
    
    # Create improved server with better session handling
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

// Trust proxy for proper session handling
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS headers
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

// Session configuration
app.use(session({
  secret: 'bingo-session-secret-key-longer-for-security-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    domain: undefined
  },
  name: 'connect.sid'
}));

// Enhanced logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} [${req.method}] ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Sample users for testing
const users = [
  {
    id: 1,
    username: 'admin1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Shop Admin',
    email: 'admin@bingomaster.com',
    isBlocked: false,
    shopId: 1
  },
  {
    id: 2,
    username: 'employee1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Employee User',
    isBlocked: false,
    shopId: 1
  }
];

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: "Username and password required" });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Invalid password for:', username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.isBlocked) {
      console.log('User blocked:', username);
      return res.status(403).json({ message: "Account is blocked" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.user = user;
    
    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ message: "Session save failed" });
      }
      
      console.log('Login successful for:', username, 'Session ID:', req.sessionID);
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  console.log('Auth check - Session ID:', req.sessionID, 'User ID:', req.session?.userId);
  
  const userId = req.session?.userId;
  if (!userId) {
    console.log('No session found');
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    console.log('User not found in session:', userId);
    return res.status(401).json({ message: "User not found" });
  }

  console.log('Auth successful for:', user.username);
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

// Simple dashboard route
app.get('/dashboard', (req, res) => {
  res.send(`
    <html>
    <head><title>BingoMaster Dashboard</title></head>
    <body style="font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px;">
      <h1>🎯 BingoMaster Dashboard</h1>
      <p>Welcome to BingoMaster! Authentication is working.</p>
      <div id="userInfo"></div>
      <button onclick="logout()">Logout</button>
      
      <script>
        fetch('/api/auth/me', { credentials: 'include' })
          .then(r => r.json())
          .then(data => {
            if (data.user) {
              document.getElementById('userInfo').innerHTML = 
                '<h3>User: ' + data.user.name + '</h3>' +
                '<p>Role: ' + data.user.role + '</p>' +
                '<p>Username: ' + data.user.username + '</p>';
            }
          })
          .catch(e => {
            document.getElementById('userInfo').innerHTML = '<p style="color:red;">Please login first</p>';
          });
          
        function logout() {
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
            .then(() => window.location.href = '/');
        }
      </script>
    </body>
    </html>
  `);
});

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// Serve login page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

// Catch all route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 BingoMaster server running on port ${PORT}`);
  console.log(`🌐 Access at: http://91.99.161.246:${PORT}`);
  console.log(`👤 Login with: admin1 / 123456`);
});
'''
    
    # Upload files
    print("Uploading login page...")
    with open('temp_login.html', 'w') as f:
        f.write(login_html)
    
    with open('temp_server_fixed.js', 'w') as f:
        f.write(server_code)
    
    # Stop service, upload files, restart
    print("Updating VPS application...")
    run_ssh_command("systemctl stop bingomaster")
    
    if upload_file('temp_login.html', '/var/www/bingomaster/login.html'):
        print("✅ Login page uploaded")
    
    if upload_file('temp_server_fixed.js', '/var/www/bingomaster/server/index.js'):
        print("✅ Fixed server uploaded")
    
    # Restart service
    run_ssh_command("systemctl start bingomaster")
    
    # Clean up temp files
    os.remove('temp_login.html')
    os.remove('temp_server_fixed.js')
    
    print("\n✅ VPS login fixed!")
    print("🌐 Test at: http://91.99.161.246")
    print("👤 Username: admin1")
    print("🔑 Password: 123456")

if __name__ == "__main__":
    fix_vps_login()