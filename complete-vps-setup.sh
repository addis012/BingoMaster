#!/bin/bash
# Complete the VPS setup with fixed server files

echo "🔧 Completing VPS setup with corrected files..."

# Navigate to application directory
cd /var/www/bingomaster-mongo

# Replace the truncated server file
echo "📝 Fixing server configuration..."
cat > server/index.js << 'EOF'
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemStore = MemoryStore(session);

// MongoDB Schema Definitions
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String },
  isBlocked: { type: Boolean, default: false },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creditBalance: { type: Number, default: 0 },
  accountNumber: { type: String, unique: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commissionRate: { type: Number, default: 25 },
  createdAt: { type: Date, default: Date.now }
});

const ShopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  profitMargin: { type: Number, default: 20 },
  superAdminCommission: { type: Number, default: 25 },
  referralCommission: { type: Number, default: 3 },
  isBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  totalRevenue: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const Shop = mongoose.model('Shop', ShopSchema);

const app = express();

// Connect to MongoDB
async function connectMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 Connected to MongoDB successfully');
    
    // Create super admin if not exists
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await User.create({
        username: 'superadmin',
        password: hashedPassword,
        role: 'super_admin',
        name: 'Super Admin',
        email: 'admin@bingo.com'
      });
      console.log('✅ Super admin created');
    } else {
      console.log('✅ Super admin already exists');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session configuration
app.use(session({
  store: new MemStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || 'bingo-mongo-session-key-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: false,
    sameSite: 'lax'
  }
}));

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(\`Login attempt: \${username}\`);

    const user = await User.findOne({ username }).populate('shopId');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      shopId: user.shopId?._id,
      creditBalance: user.creditBalance
    };

    res.json({ 
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
        shopId: user.shopId?._id,
        creditBalance: user.creditBalance.toString(),
        accountNumber: user.accountNumber,
        commissionRate: user.commissionRate.toString(),
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Could not log out' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Basic admin routes for super admin
app.post('/api/super-admin/admins', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { username, password, name, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await User.create({
      username,
      password: hashedPassword,
      role: 'admin',
      name,
      email
    });

    res.json({
      id: admin._id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      role: admin.role
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Failed to create admin', error: error.message });
  }
});

app.get('/api/super-admin/admins', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({ message: 'Failed to get admins', error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: 'MongoDB', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Serve static files (for frontend)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectMongoDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(\`🚀 BingoMaster MongoDB server running on port \${PORT}\`);
    console.log(\`🌐 Access at: http://91.99.161.246:\${PORT}\`);
    console.log(\`📊 Health check: http://91.99.161.246:\${PORT}/health\`);
  });
}

startServer().catch(console.error);
EOF

# Fix the frontend file
echo "🌐 Fixing frontend interface..."
cat > client/dist/index.html << 'FRONTENDEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BingoMaster MongoDB - VPS Deployment</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 900px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f5f7fa;
            color: #333;
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .status { 
            padding: 15px; 
            border-radius: 8px; 
            margin: 15px 0; 
            border-left: 4px solid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .success { 
            background: #d4f4dd; 
            border-color: #28a745; 
            color: #155724; 
        }
        .info { 
            background: #cce7ff; 
            border-color: #007bff; 
            color: #004085; 
        }
        .error { 
            background: #ffe6e6; 
            border-color: #dc3545; 
            color: #721c24; 
        }
        .card { 
            background: white; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 20px 0; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        input { 
            width: 100%;
            padding: 12px; 
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        button { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            padding: 12px 24px;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.2s;
            margin: 5px;
        }
        button:hover {
            transform: translateY(-2px);
        }
        .server-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .info-value {
            font-size: 18px;
            color: #333;
            margin-top: 5px;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid #e9ecef;
            font-size: 12px;
        }
        .btn-secondary { background: #6c757d; }
        .btn-success { background: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 BingoMaster MongoDB VPS</h1>
        <p>Production Deployment Dashboard</p>
    </div>

    <div class="server-info" id="serverInfo">
        <div class="info-item">
            <div class="info-label">Server Status</div>
            <div class="info-value" id="serverStatus">Checking...</div>
        </div>
        <div class="info-item">
            <div class="info-label">Database</div>
            <div class="info-value">MongoDB Atlas</div>
        </div>
        <div class="info-item">
            <div class="info-label">Server IP</div>
            <div class="info-value">91.99.161.246</div>
        </div>
        <div class="info-item">
            <div class="info-label">Uptime</div>
            <div class="info-value" id="uptime">--</div>
        </div>
    </div>

    <div class="card">
        <h3>🔐 Super Admin Login</h3>
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" placeholder="Enter username" value="superadmin">
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" placeholder="Enter password" value="password">
            </div>
            <button type="submit">Login</button>
            <button type="button" class="btn-secondary" onclick="testConnection()">Test Connection</button>
        </form>
        <div id="loginResult"></div>
    </div>

    <div id="userInfo" style="display:none;" class="card">
        <h3>👤 User Information</h3>
        <pre id="userDetails"></pre>
        <button class="btn-success" onclick="createTestAdmin()">Create Test Admin</button>
        <button class="btn-secondary" onclick="logout()">Logout</button>
    </div>

    <div class="card">
        <h3>📊 System Health</h3>
        <div id="healthCheck"></div>
        <button onclick="checkHealth()" class="btn-secondary">Refresh Health</button>
    </div>

    <script>
        async function checkHealth() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                document.getElementById('serverStatus').textContent = data.status;
                document.getElementById('uptime').textContent = Math.floor(data.uptime) + 's';
                
                document.getElementById('healthCheck').innerHTML = 
                    '<div class="status success">✅ Server: ' + data.status + '</div>' +
                    '<div class="status info">📊 Database: ' + data.database + '</div>' +
                    '<div class="status info">🕒 Uptime: ' + Math.floor(data.uptime) + ' seconds</div>' +
                    '<div class="status info">💾 Memory: ' + Math.round(data.memory.used / 1024 / 1024) + 'MB used</div>' +
                    '<div class="status info">⚡ Node.js: ' + data.version + '</div>';
            } catch (error) {
                document.getElementById('serverStatus').textContent = 'Error';
                document.getElementById('healthCheck').innerHTML = 
                    '<div class="status error">❌ Health check failed: ' + error.message + '</div>';
            }
        }

        async function testConnection() {
            try {
                const response = await fetch('/health');
                const data = await response.json();
                alert('✅ Connection successful! Server is running with ' + data.database);
            } catch (error) {
                alert('❌ Connection failed: ' + error.message);
            }
        }

        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                if (response.ok) {
                    document.getElementById('loginResult').innerHTML = 
                        '<div class="status success">✅ Login successful! Welcome, ' + data.user.name + '</div>';
                    document.getElementById('userDetails').textContent = 
                        JSON.stringify(data.user, null, 2);
                    document.getElementById('userInfo').style.display = 'block';
                } else {
                    document.getElementById('loginResult').innerHTML = 
                        '<div class="status error">❌ Login failed: ' + data.message + '</div>';
                }
            } catch (error) {
                document.getElementById('loginResult').innerHTML = 
                    '<div class="status error">❌ Error: ' + error.message + '</div>';
            }
        };

        async function createTestAdmin() {
            try {
                const response = await fetch('/api/super-admin/admins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'testadmin',
                        password: 'testpass123',
                        name: 'Test Admin',
                        email: 'test@bingo.com'
                    })
                });
                
                const data = await response.json();
                if (response.ok) {
                    alert('✅ Test admin created successfully!\\nUsername: testadmin\\nPassword: testpass123');
                } else {
                    alert('❌ Failed to create test admin: ' + data.message);
                }
            } catch (error) {
                alert('❌ Error creating test admin: ' + error.message);
            }
        }
        
        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                document.getElementById('userInfo').style.display = 'none';
                document.getElementById('loginResult').innerHTML = 
                    '<div class="status info">✅ Logged out successfully</div>';
            } catch (error) {
                alert('❌ Logout error: ' + error.message);
            }
        }

        // Initialize
        checkHealth();
        setInterval(checkHealth, 30000);
    </script>
</body>
</html>
FRONTENDEOF

# Set up environment file with placeholder
echo "🔧 Setting up environment configuration..."
cp .env.template .env

echo ""
echo "✅ Files have been fixed and updated!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit your environment file:"
echo "   nano /var/www/bingomaster-mongo/.env"
echo ""
echo "2. Add your MongoDB URI (replace the placeholder):"
echo "   MONGODB_URI=your_actual_mongodb_connection_string_here"
echo ""
echo "3. Test the server locally first:"
echo "   node server/index.js"
echo ""
echo "4. If it works, start the production service:"
echo "   systemctl start bingomaster-mongo"
echo "   systemctl status bingomaster-mongo"
echo ""
echo "5. View logs:"
echo "   journalctl -u bingomaster-mongo -f"
echo ""
echo "🌐 Your app will be available at: http://91.99.161.246"
echo ""