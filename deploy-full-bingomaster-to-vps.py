#!/usr/bin/env python3
"""
Complete BingoMaster Deployment to VPS
Deploys the full-featured bingo game system with MongoDB backend
"""

import subprocess
import os
import json

# VPS Configuration
VPS_HOST = "91.99.161.246"
VPS_USER = "root"
VPS_PASSWORD = "jUVcakxHajeL"
APP_DIR = "/var/www/bingomaster-full"

def run_ssh_command(command, show_output=True):
    """Execute command on VPS via SSH"""
    ssh_cmd = f'sshpass -p "{VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no {VPS_USER}@{VPS_HOST} "{command}"'
    if show_output:
        print(f"Executing: {command}")
    
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    if show_output and result.stdout:
        print(result.stdout)
    if result.stderr and "Warning" not in result.stderr:
        print(f"Error: {result.stderr}")
    return result

def upload_file(local_path, remote_path):
    """Upload file to VPS using scp"""
    scp_cmd = f'sshpass -p "{VPS_PASSWORD}" scp -o StrictHostKeyChecking=no {local_path} {VPS_USER}@{VPS_HOST}:{remote_path}'
    print(f"Uploading {local_path} -> {remote_path}")
    subprocess.run(scp_cmd, shell=True)

def main():
    print("🚀 Starting Complete BingoMaster Deployment to VPS")
    print(f"Target: {VPS_HOST}")
    
    # 1. Prepare VPS Environment
    print("\n1. Setting up VPS environment...")
    run_ssh_command("mkdir -p /var/www/bingomaster-full/{server,client,shared}")
    run_ssh_command("cd /var/www/bingomaster-full && npm init -y")
    
    # 2. Create package.json with all dependencies
    print("\n2. Creating package.json...")
    package_json = {
        "name": "bingomaster-complete",
        "version": "1.0.0",
        "type": "module",
        "scripts": {
            "start": "NODE_ENV=production node server/index.js",
            "dev": "NODE_ENV=development node server/index.js"
        },
        "dependencies": {
            "express": "^4.21.2",
            "express-session": "^1.18.1",
            "mongoose": "^8.17.1",
            "bcrypt": "^6.0.0",
            "ws": "^8.18.0",
            "memorystore": "^1.6.7",
            "nanoid": "^5.1.5",
            "zod": "^3.24.2",
            "date-fns": "^3.6.0",
            "cors": "^2.8.5"
        }
    }
    
    with open('/tmp/package.json', 'w') as f:
        json.dump(package_json, f, indent=2)
    upload_file('/tmp/package.json', f'{APP_DIR}/package.json')
    
    # 3. Install dependencies
    print("\n3. Installing dependencies...")
    run_ssh_command(f"cd {APP_DIR} && npm install")
    
    # 4. Create complete server with MongoDB integration
    print("\n4. Creating complete server...")
    server_code = '''import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { WebSocketServer } from 'ws';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemStore = MemoryStore(session);

// MongoDB Schemas
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

const CartelaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  numbers: { type: [[Number]], required: true },
  price: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const GameSchema = new mongoose.Schema({
  name: { type: String, required: true },
  calledNumbers: [Number],
  isActive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Shop = mongoose.model('Shop', ShopSchema);
const Cartela = mongoose.model('Cartela', CartelaSchema);
const Game = mongoose.model('Game', GameSchema);

const app = express();

// Game state management
let activeGame = null;
let gameClients = new Set();

// MongoDB Connection
async function connectMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 MongoDB connected successfully');
    
    // Create super admin if not exists
    const superAdmin = await User.findOne({ username: 'superadmin' });
    if (!superAdmin) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await User.create({
        username: 'superadmin',
        password: hashedPassword,
        role: 'super_admin',
        name: 'Super Administrator',
        email: 'admin@bingomaster.com',
        accountNumber: 'BGO000000001'
      });
      console.log('✅ Super admin created');
    }
    
    // Create sample cartelas
    const cartelaCount = await Cartela.countDocuments();
    if (cartelaCount === 0) {
      const sampleCartelas = [
        {
          name: 'Classic Bingo 1',
          numbers: [
            [1, 16, 31, 46, 61],
            [2, 17, 32, 47, 62],
            [3, 18, 0, 48, 63],
            [4, 19, 34, 49, 64],
            [5, 20, 35, 50, 65]
          ],
          price: 10
        },
        {
          name: 'Classic Bingo 2',
          numbers: [
            [6, 21, 36, 51, 66],
            [7, 22, 37, 52, 67],
            [8, 23, 0, 53, 68],
            [9, 24, 39, 54, 69],
            [10, 25, 40, 55, 70]
          ],
          price: 10
        }
      ];
      await Cartela.insertMany(sampleCartelas);
      console.log('✅ Sample cartelas created');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session configuration
app.use(session({
  store: new MemStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET || 'bingo-full-secret-key',
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

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.session.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate('shopId');
    
    if (!user || !await bcrypt.compare(password, user.password)) {
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

    res.json({ user: req.session.user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
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
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Super Admin routes
app.post('/api/super-admin/admins', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await User.create({
      username,
      password: hashedPassword,
      role: 'admin',
      name,
      email,
      accountNumber: `BGO${Date.now()}`
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
    res.status(500).json({ message: 'Failed to create admin' });
  }
});

app.get('/api/super-admin/admins', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get admins' });
  }
});

// Cartela routes
app.get('/api/cartelas', requireAuth, async (req, res) => {
  try {
    const cartelas = await Cartela.find({ isActive: true });
    res.json(cartelas);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get cartelas' });
  }
});

app.post('/api/cartelas', requireAuth, requireRole(['super_admin', 'admin']), async (req, res) => {
  try {
    const { name, numbers, price } = req.body;
    const cartela = await Cartela.create({
      name,
      numbers,
      price,
      createdBy: req.session.user.id
    });
    res.json(cartela);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create cartela' });
  }
});

// Game routes
app.get('/api/games/active', async (req, res) => {
  try {
    const game = await Game.findOne({ isActive: true });
    res.json(game || null);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get active game' });
  }
});

app.post('/api/games', requireAuth, requireRole(['super_admin', 'admin', 'employee']), async (req, res) => {
  try {
    const { name } = req.body;
    
    // Deactivate any existing active games
    await Game.updateMany({}, { isActive: false });
    
    const game = await Game.create({
      name,
      calledNumbers: [],
      isActive: true,
      createdBy: req.session.user.id
    });
    
    activeGame = game;
    broadcastToClients({ type: 'game-started', game: activeGame });
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create game' });
  }
});

app.post('/api/games/:id/call-number', requireAuth, requireRole(['super_admin', 'admin', 'employee']), async (req, res) => {
  try {
    const { id } = req.params;
    const { number } = req.body;
    
    const game = await Game.findById(id);
    if (!game || !game.isActive) {
      return res.status(404).json({ message: 'Active game not found' });
    }
    
    if (game.calledNumbers.includes(number)) {
      return res.status(400).json({ message: 'Number already called' });
    }
    
    game.calledNumbers.push(number);
    await game.save();
    
    activeGame = game;
    broadcastToClients({ type: 'number-called', number, calledNumbers: game.calledNumbers });
    res.json({ number, calledNumbers: game.calledNumbers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to call number' });
  }
});

// WebSocket broadcast function
function broadcastToClients(message) {
  gameClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify(message));
    }
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'MongoDB',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeGame: activeGame ? true : false,
    connectedClients: gameClients.size
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../client')));

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start servers
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

async function startServers() {
  await connectMongoDB();
  
  // HTTP Server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BingoMaster server running on port ${PORT}`);
  });
  
  // WebSocket Server
  const wss = new WebSocketServer({ port: WS_PORT });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to game');
    gameClients.add(ws);
    
    // Send current game state
    if (activeGame) {
      ws.send(JSON.stringify({ type: 'game-state', game: activeGame }));
    }
    
    ws.on('close', () => {
      gameClients.delete(ws);
      console.log('Client disconnected from game');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      gameClients.delete(ws);
    });
  });
  
  console.log(`🎮 WebSocket server running on port ${WS_PORT}`);
}

startServers().catch(console.error);'''
    
    with open('/tmp/server.js', 'w') as f:
        f.write(server_code)
    upload_file('/tmp/server.js', f'{APP_DIR}/server/index.js')
    
    # 5. Create complete frontend
    print("\n5. Creating complete frontend...")
    frontend_code = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BingoMaster - Complete Game System</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }
        .card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
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
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin: 5px;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .btn-danger {
            background: linear-gradient(135deg, #ff4757 0%, #ff3838 100%);
        }
        .btn-success {
            background: linear-gradient(135deg, #2ed573 0%, #1e90ff 100%);
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
        }
        .status.success {
            background: #d4f4dd;
            color: #155724;
            border-left: 4px solid #28a745;
        }
        .status.error {
            background: #ffe6e6;
            color: #721c24;
            border-left: 4px solid #dc3545;
        }
        .status.info {
            background: #cce7ff;
            color: #004085;
            border-left: 4px solid #007bff;
        }
        .bingo-board {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            max-width: 400px;
            margin: 20px auto;
        }
        .bingo-cell {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .bingo-cell.marked {
            background: #28a745;
            color: white;
            border-color: #28a745;
        }
        .bingo-cell.free {
            background: #ffc107;
            color: #333;
            border-color: #ffc107;
        }
        .called-numbers {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        .called-number {
            background: #667eea;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
        }
        .number-caller {
            text-align: center;
            padding: 30px;
        }
        .next-number {
            font-size: 72px;
            font-weight: bold;
            color: #667eea;
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
        }
        .hidden { display: none !important; }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .game-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 BingoMaster</h1>
            <p>Complete Bingo Game System</p>
            <div id="userInfo" class="hidden">
                <p>Welcome, <span id="userName"></span> (<span id="userRole"></span>)</p>
                <button onclick="logout()" class="btn-danger">Logout</button>
            </div>
        </div>

        <!-- Login Form -->
        <div id="loginCard" class="card">
            <h3>🔐 Login</h3>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" value="superadmin">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" value="password">
                </div>
                <button type="submit">Login</button>
            </form>
            <div id="loginResult"></div>
        </div>

        <!-- Main App -->
        <div id="mainApp" class="hidden">
            <!-- Game Management -->
            <div class="card">
                <h3>🎮 Game Management</h3>
                <div id="activeGameInfo"></div>
                
                <div class="grid">
                    <div>
                        <h4>Start New Game</h4>
                        <div class="form-group">
                            <input type="text" id="gameName" placeholder="Game Name" value="Evening Bingo">
                        </div>
                        <button onclick="startGame()" id="startGameBtn">Start Game</button>
                    </div>
                    
                    <div id="numberCaller" class="hidden">
                        <h4>Number Caller</h4>
                        <div class="number-caller">
                            <div id="nextNumber" class="next-number">-</div>
                            <button onclick="callRandomNumber()" id="callNumberBtn">Call Number</button>
                            <button onclick="endGame()" class="btn-danger">End Game</button>
                        </div>
                    </div>
                </div>
                
                <div id="calledNumbers" class="called-numbers"></div>
            </div>

            <!-- Bingo Board -->
            <div class="card">
                <h3>🎯 Sample Bingo Board</h3>
                <div class="bingo-board" id="bingoBoard">
                    <!-- Will be generated dynamically -->
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <button onclick="generateRandomBoard()">Generate New Board</button>
                    <button onclick="checkWinner()" class="btn-success">Check Winner</button>
                </div>
            </div>

            <!-- Cartelas Management -->
            <div class="card">
                <h3>🎫 Cartelas</h3>
                <div id="cartelasList"></div>
                <button onclick="loadCartelas()">Refresh Cartelas</button>
            </div>

            <!-- Admin Panel -->
            <div id="adminPanel" class="hidden">
                <div class="card">
                    <h3>👥 Admin Management</h3>
                    <div class="grid">
                        <div>
                            <h4>Create Admin</h4>
                            <div class="form-group">
                                <input type="text" id="adminUsername" placeholder="Username">
                            </div>
                            <div class="form-group">
                                <input type="password" id="adminPassword" placeholder="Password">
                            </div>
                            <div class="form-group">
                                <input type="text" id="adminName" placeholder="Full Name">
                            </div>
                            <div class="form-group">
                                <input type="email" id="adminEmail" placeholder="Email">
                            </div>
                            <button onclick="createAdmin()">Create Admin</button>
                        </div>
                        <div>
                            <h4>Admin List</h4>
                            <div id="adminsList"></div>
                            <button onclick="loadAdmins()">Refresh List</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Game Statistics -->
            <div class="card">
                <h3>📊 Statistics</h3>
                <div class="game-stats">
                    <div class="stat-card">
                        <div class="stat-value" id="totalGames">0</div>
                        <div class="stat-label">Total Games</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="activeClients">0</div>
                        <div class="stat-label">Connected Players</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="numbersRemaining">75</div>
                        <div class="stat-label">Numbers Remaining</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;
        let activeGame = null;
        let calledNumbers = [];
        let bingoBoard = [];
        let ws = null;

        // Initialize WebSocket connection
        function initWebSocket() {
            try {
                ws = new WebSocket('ws://91.99.161.246:3001');
                
                ws.onopen = () => {
                    console.log('Connected to game server');
                };
                
                ws.onmessage = (event) => {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                };
                
                ws.onclose = () => {
                    console.log('Disconnected from game server');
                    setTimeout(initWebSocket, 5000); // Reconnect after 5 seconds
                };
            } catch (error) {
                console.error('WebSocket connection failed:', error);
            }
        }

        function handleWebSocketMessage(message) {
            switch (message.type) {
                case 'game-started':
                    activeGame = message.game;
                    updateGameInfo();
                    break;
                case 'number-called':
                    calledNumbers = message.calledNumbers;
                    updateCalledNumbers();
                    updateNextNumber(message.number);
                    updateStats();
                    break;
                case 'game-state':
                    activeGame = message.game;
                    calledNumbers = message.game?.calledNumbers || [];
                    updateGameInfo();
                    updateCalledNumbers();
                    break;
            }
        }

        // Authentication
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
                    currentUser = data.user;
                    showMainApp();
                    initWebSocket();
                    checkActiveGame();
                } else {
                    showMessage(data.message, 'error');
                }
            } catch (error) {
                showMessage('Login failed: ' + error.message, 'error');
            }
        });

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                currentUser = null;
                if (ws) ws.close();
                showLoginForm();
            } catch (error) {
                console.error('Logout error:', error);
            }
        }

        function showMainApp() {
            document.getElementById('loginCard').classList.add('hidden');
            document.getElementById('mainApp').classList.remove('hidden');
            document.getElementById('userInfo').classList.remove('hidden');
            document.getElementById('userName').textContent = currentUser.name;
            document.getElementById('userRole').textContent = currentUser.role;
            
            if (currentUser.role === 'super_admin') {
                document.getElementById('adminPanel').classList.remove('hidden');
            }
            
            generateRandomBoard();
            loadCartelas();
            updateStats();
        }

        function showLoginForm() {
            document.getElementById('loginCard').classList.remove('hidden');
            document.getElementById('mainApp').classList.add('hidden');
            document.getElementById('userInfo').classList.add('hidden');
        }

        // Game Management
        async function checkActiveGame() {
            try {
                const response = await fetch('/api/games/active');
                const game = await response.json();
                
                if (game) {
                    activeGame = game;
                    calledNumbers = game.calledNumbers;
                    updateGameInfo();
                    updateCalledNumbers();
                }
            } catch (error) {
                console.error('Error checking active game:', error);
            }
        }

        async function startGame() {
            const gameName = document.getElementById('gameName').value;
            
            try {
                const response = await fetch('/api/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: gameName })
                });
                
                const game = await response.json();
                
                if (response.ok) {
                    activeGame = game;
                    calledNumbers = [];
                    updateGameInfo();
                    showMessage('Game started successfully!', 'success');
                } else {
                    showMessage(game.message, 'error');
                }
            } catch (error) {
                showMessage('Failed to start game: ' + error.message, 'error');
            }
        }

        function callRandomNumber() {
            if (!activeGame) return;
            
            const availableNumbers = [];
            for (let i = 1; i <= 75; i++) {
                if (!calledNumbers.includes(i)) {
                    availableNumbers.push(i);
                }
            }
            
            if (availableNumbers.length === 0) {
                showMessage('All numbers have been called!', 'info');
                return;
            }
            
            const randomNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
            callNumber(randomNumber);
        }

        async function callNumber(number) {
            if (!activeGame) return;
            
            try {
                const response = await fetch(`/api/games/${activeGame._id}/call-number`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    calledNumbers = result.calledNumbers;
                    updateCalledNumbers();
                    updateNextNumber(number);
                    updateStats();
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Failed to call number: ' + error.message, 'error');
            }
        }

        function updateGameInfo() {
            const info = document.getElementById('activeGameInfo');
            
            if (activeGame) {
                info.innerHTML = `
                    <div class="status success">
                        🎮 Active Game: ${activeGame.name} 
                        (${calledNumbers.length} numbers called)
                    </div>
                `;
                document.getElementById('numberCaller').classList.remove('hidden');
            } else {
                info.innerHTML = '<div class="status info">No active game</div>';
                document.getElementById('numberCaller').classList.add('hidden');
            }
        }

        function updateCalledNumbers() {
            const container = document.getElementById('calledNumbers');
            container.innerHTML = calledNumbers.map(num => 
                `<span class="called-number">${num}</span>`
            ).join('');
        }

        function updateNextNumber(number) {
            document.getElementById('nextNumber').textContent = number;
            setTimeout(() => {
                document.getElementById('nextNumber').textContent = '-';
            }, 3000);
        }

        // Bingo Board
        function generateRandomBoard() {
            const board = [
                ['B', 'I', 'N', 'G', 'O']
            ];
            
            // Generate random numbers for each column
            const ranges = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
            
            for (let row = 0; row < 5; row++) {
                const boardRow = [];
                for (let col = 0; col < 5; col++) {
                    if (row === 2 && col === 2) {
                        boardRow.push('FREE');
                    } else {
                        const [min, max] = ranges[col];
                        const num = Math.floor(Math.random() * (max - min + 1)) + min;
                        boardRow.push(num);
                    }
                }
                board.push(boardRow);
            }
            
            bingoBoard = board;
            renderBingoBoard();
        }

        function renderBingoBoard() {
            const boardElement = document.getElementById('bingoBoard');
            boardElement.innerHTML = '';
            
            bingoBoard.forEach((row, rowIndex) => {
                row.forEach((cell, colIndex) => {
                    const cellElement = document.createElement('div');
                    cellElement.className = 'bingo-cell';
                    cellElement.textContent = cell;
                    
                    if (cell === 'FREE') {
                        cellElement.classList.add('free');
                    } else if (rowIndex === 0) {
                        cellElement.style.background = '#667eea';
                        cellElement.style.color = 'white';
                    } else {
                        cellElement.addEventListener('click', () => toggleCell(cellElement, cell));
                        
                        if (calledNumbers.includes(parseInt(cell))) {
                            cellElement.classList.add('marked');
                        }
                    }
                    
                    boardElement.appendChild(cellElement);
                });
            });
        }

        function toggleCell(element, number) {
            if (calledNumbers.includes(parseInt(number))) {
                element.classList.toggle('marked');
            }
        }

        function checkWinner() {
            // Simple winner check logic
            const marked = document.querySelectorAll('.bingo-cell.marked, .bingo-cell.free');
            if (marked.length >= 5) {
                showMessage('🎉 BINGO! Congratulations!', 'success');
            } else {
                showMessage('Keep playing - you need more marked numbers!', 'info');
            }
        }

        // Cartela Management
        async function loadCartelas() {
            try {
                const response = await fetch('/api/cartelas');
                const cartelas = await response.json();
                
                const container = document.getElementById('cartelasList');
                container.innerHTML = cartelas.map(cartela => `
                    <div class="status info">
                        <strong>${cartela.name}</strong> - $${cartela.price}
                        <br>Created: ${new Date(cartela.createdAt).toLocaleDateString()}
                    </div>
                `).join('');
            } catch (error) {
                showMessage('Failed to load cartelas: ' + error.message, 'error');
            }
        }

        // Admin Management
        async function createAdmin() {
            const username = document.getElementById('adminUsername').value;
            const password = document.getElementById('adminPassword').value;
            const name = document.getElementById('adminName').value;
            const email = document.getElementById('adminEmail').value;
            
            try {
                const response = await fetch('/api/super-admin/admins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, name, email })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage('Admin created successfully!', 'success');
                    document.getElementById('adminUsername').value = '';
                    document.getElementById('adminPassword').value = '';
                    document.getElementById('adminName').value = '';
                    document.getElementById('adminEmail').value = '';
                    loadAdmins();
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('Failed to create admin: ' + error.message, 'error');
            }
        }

        async function loadAdmins() {
            try {
                const response = await fetch('/api/super-admin/admins');
                const admins = await response.json();
                
                const container = document.getElementById('adminsList');
                container.innerHTML = admins.map(admin => `
                    <div class="status success">
                        <strong>${admin.name}</strong> (${admin.username})
                        <br>Email: ${admin.email || 'N/A'}
                        <br>Created: ${new Date(admin.createdAt).toLocaleDateString()}
                    </div>
                `).join('');
            } catch (error) {
                showMessage('Failed to load admins: ' + error.message, 'error');
            }
        }

        // Utility functions
        function updateStats() {
            document.getElementById('numbersRemaining').textContent = 75 - calledNumbers.length;
            
            // Update other stats via health check
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('activeClients').textContent = data.connectedClients || 0;
                });
        }

        function showMessage(message, type) {
            const loginResult = document.getElementById('loginResult');
            loginResult.innerHTML = `<div class="status ${type}">${message}</div>`;
            setTimeout(() => {
                loginResult.innerHTML = '';
            }, 5000);
        }

        // Initialize the app
        document.addEventListener('DOMContentLoaded', () => {
            // Check if already logged in
            fetch('/api/auth/me')
                .then(response => response.json())
                .then(data => {
                    if (data.user) {
                        currentUser = data.user;
                        showMainApp();
                        initWebSocket();
                        checkActiveGame();
                    }
                })
                .catch(() => {
                    // User not logged in, show login form
                });
        });
    </script>
</body>
</html>'''
    
    with open('/tmp/index.html', 'w') as f:
        f.write(frontend_code)
    upload_file('/tmp/index.html', f'{APP_DIR}/client/index.html')
    
    # 6. Create environment file
    print("\n6. Setting up environment...")
    env_content = f"""NODE_ENV=production
PORT=3000
WS_PORT=3001
MONGODB_URI=mongodb+srv://addisumelke01:a1e2y3t4h5@cluster0.yjzywln.mongodb.net/bingomaster?retryWrites=true&w=majority
SESSION_SECRET=bingo-full-production-secret-key-2025"""
    
    with open('/tmp/.env', 'w') as f:
        f.write(env_content)
    upload_file('/tmp/.env', f'{APP_DIR}/.env')
    
    # 7. Create systemd service
    print("\n7. Creating system service...")
    service_content = f"""[Unit]
Description=BingoMaster Complete Game System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={APP_DIR}
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile={APP_DIR}/.env

[Install]
WantedBy=multi-user.target"""
    
    with open('/tmp/bingomaster-full.service', 'w') as f:
        f.write(service_content)
    upload_file('/tmp/bingomaster-full.service', '/etc/systemd/system/bingomaster-full.service')
    
    # 8. Create nginx configuration
    print("\n8. Configuring Nginx...")
    nginx_config = f"""server {{
    listen 80;
    server_name 91.99.161.246;

    # Main application
    location / {{
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
    }}
    
    # WebSocket proxy for real-time game updates
    location /ws {{
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }}
}}"""
    
    with open('/tmp/bingomaster-nginx', 'w') as f:
        f.write(nginx_config)
    upload_file('/tmp/bingomaster-nginx', '/etc/nginx/sites-available/bingomaster-full')
    
    # 9. Enable services and start
    print("\n9. Starting services...")
    
    # Enable nginx site
    run_ssh_command(f"ln -sf /etc/nginx/sites-available/bingomaster-full /etc/nginx/sites-enabled/")
    run_ssh_command("rm -f /etc/nginx/sites-enabled/default")
    run_ssh_command("rm -f /etc/nginx/sites-enabled/bingomaster-mongo")
    run_ssh_command("nginx -t && systemctl reload nginx")
    
    # Stop old service if running
    run_ssh_command("systemctl stop bingomaster-mongo", False)
    run_ssh_command("systemctl disable bingomaster-mongo", False)
    
    # Enable and start new service
    run_ssh_command("systemctl daemon-reload")
    run_ssh_command("systemctl enable bingomaster-full")
    run_ssh_command("systemctl start bingomaster-full")
    
    # 10. Test deployment
    print("\n10. Testing deployment...")
    run_ssh_command("systemctl status bingomaster-full")
    run_ssh_command("curl -s http://localhost:3000/health")
    
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print(f"🌐 Your complete BingoMaster system is now running at: http://{VPS_HOST}")
    print("🔐 Login with: superadmin / password")
    print("\n✨ Features Available:")
    print("  • Real-time bingo game with number calling")
    print("  • Interactive bingo boards with winner detection")
    print("  • Complete user and admin management")
    print("  • Cartela management system")
    print("  • WebSocket-powered live updates")
    print("  • MongoDB-powered data persistence")
    print("  • Professional web interface")
    print("\n📊 Monitor with:")
    print(f"  • System status: systemctl status bingomaster-full")
    print(f"  • Logs: journalctl -u bingomaster-full -f")
    print(f"  • Health check: http://{VPS_HOST}/health")

if __name__ == "__main__":
    main()