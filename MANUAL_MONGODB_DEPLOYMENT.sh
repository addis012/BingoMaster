#!/bin/bash
# BingoMaster MongoDB-Only Manual Deployment Script
# Run this script directly on your VPS: 91.99.161.246

echo "🚀 BingoMaster MongoDB-Only Deployment Starting..."

# Step 1: Update system and install Node.js 20
echo "📦 Installing Node.js 20 and dependencies..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt update && apt install -y nodejs nginx git

# Verify Node.js installation
echo "📋 Node.js version: $(node --version)"
echo "📋 NPM version: $(npm --version)"

# Step 2: Create application directory
echo "📁 Creating application directory..."
mkdir -p /var/www/bingomaster-mongo
cd /var/www/bingomaster-mongo

# Step 3: Create package.json
echo "📄 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "bingomaster-mongodb-vps",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "NODE_ENV=production node server/index.js",
    "dev": "NODE_ENV=development node server/index.js"
  },
  "dependencies": {
    "mongoose": "^8.17.1",
    "mongodb": "^6.18.0",
    "bcrypt": "^6.0.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "memorystore": "^1.6.7",
    "ws": "^8.18.0",
    "zod": "^3.24.2",
    "nanoid": "^5.1.5",
    "date-fns": "^3.6.0"
  }
}
EOF

# Step 4: Install dependencies
echo "⬇️ Installing dependencies..."
npm install

# Step 5: Create server directory and main server file
echo "🖥️ Creating server configuration..."
mkdir -p server shared client/dist

# Create simplified MongoDB server
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
    console.log(`Login attempt: ${username}`);

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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: 'MongoDB', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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
    console.log(`🚀 BingoMaster MongoDB server running on port ${PORT}`);
    console.log(`🌐 Access at: http://91.99.161.246:${PORT}`);
    console.log(`📊 Health check: http://91.99.161.246:${PORT}/health`);
  });
}

startServer().catch(console.error);
EOF

# Step 6: Create environment file template
echo "🔧 Creating environment template..."
cat > .env.template << 'EOF'
# BingoMaster MongoDB Environment Variables
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_connection_string_here
SESSION_SECRET=bingo-super-secret-session-key-change-this-in-production

# Optional WebSocket port
WS_PORT=3001
EOF

# Step 7: Create basic index.html for testing
echo "🌐 Creating basic frontend..."
mkdir -p client/dist
cat > client/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BingoMaster MongoDB - VPS Deployment</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .info { background: #d1ecf1; border: 1px solid #b8daff; color: #0c5460; }
        .form { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        input, button { padding: 8px; margin: 5px; }
        button { background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
    </style>
</head>
<body>
    <h1>🎯 BingoMaster MongoDB VPS</h1>
    <div class="status success">✅ Server is running successfully!</div>
    <div class="status info">📊 Database: MongoDB Atlas</div>
    
    <div class="form">
        <h3>Super Admin Login</h3>
        <form id="loginForm">
            <input type="text" id="username" placeholder="Username" value="superadmin">
            <input type="password" id="password" placeholder="Password" value="password">
            <button type="submit">Login</button>
        </form>
        <div id="loginResult"></div>
    </div>

    <div id="userInfo" style="display:none;">
        <h3>User Information</h3>
        <pre id="userDetails"></pre>
        <button onclick="logout()">Logout</button>
    </div>

    <script>
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
                        '<div class="status success">✅ Login successful!</div>';
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
        
        async function logout() {
            await fetch('/api/auth/logout', { method: 'POST' });
            document.getElementById('userInfo').style.display = 'none';
            document.getElementById('loginResult').innerHTML = '';
        }
        
        // Check server health on load
        fetch('/health').then(r => r.json()).then(data => {
            console.log('Server health:', data);
        });
    </script>
</body>
</html>
EOF

# Step 8: Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/bingomaster-mongo.service << 'EOF'
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
EOF

# Step 9: Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/bingomaster-mongo << 'EOF'
server {
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
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/bingomaster-mongo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Step 10: Enable services
echo "⚙️ Enabling services..."
systemctl daemon-reload
systemctl enable bingomaster-mongo

echo ""
echo "🎉 BingoMaster MongoDB deployment completed!"
echo ""
echo "📋 Final Steps:"
echo "1. Copy your .env.template to .env: cp .env.template .env"
echo "2. Edit .env and add your MONGODB_URI from Replit secrets"
echo "3. Start the service: systemctl start bingomaster-mongo"
echo "4. Check status: systemctl status bingomaster-mongo"
echo "5. View logs: journalctl -u bingomaster-mongo -f"
echo ""
echo "🌐 Your app will be available at: http://91.99.161.246"
echo "🩺 Health check: http://91.99.161.246/health"
echo ""
echo "📝 Default login: superadmin / password"
echo ""