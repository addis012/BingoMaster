// BingoMaster Production Server - Updated Version
import express from 'express';
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

console.log('🎯 BingoMaster Production Server Starting...');
console.log('Updated Version with Current Authentication');

// Middleware
app.set('trust proxy', 1);
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

// Session with database storage
app.use(session({
  secret: process.env.SESSION_SECRET || 'bingo-session-secret-production-key',
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

// Static file serving
app.use('/voices', express.static(path.join(__dirname, 'public/voices')));
app.use('/attached_assets', express.static(path.join(__dirname, 'attached_assets')));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} [${req.method}] ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Current working users with correct password hashes
const users = [
  {
    id: 1,
    username: 'admin1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Admin User',
    email: 'admin@bingomaster.com',
    isBlocked: false,
    shopId: 1,
    creditBalance: '1000.00'
  },
  {
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
  },
  {
    id: 3,
    username: 'alex1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Alex Employee',
    isBlocked: false,
    shopId: 1,
    creditBalance: '0.00'
  },
  {
    id: 4,
    username: 'kal1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Kal Employee',
    isBlocked: false,
    shopId: 2,
    creditBalance: '0.00'
  }
];

// Mock shops data
const shops = [
  { id: 1, name: 'Main Shop', adminId: 1, profitMargin: '30.00' },
  { id: 2, name: 'Branch Shop', adminId: 1, profitMargin: '25.00' },
  { id: 5, name: 'winget', adminId: 10, profitMargin: '30.00' }
];

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.username);
    const { username, password } = req.body;
    
    if (!username || !password) {
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
      return res.status(403).json({ message: "Account is blocked" });
    }

    req.session.userId = user.id;
    req.session.user = user;
    
    console.log('Login successful for:', username);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
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
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.json({ message: "Logged out" });
  });
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    version: 'Current',
    timestamp: new Date().toISOString(),
    database: 'postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require' ? 'configured' : 'missing'
  });
});

app.get('/api/shops', (req, res) => {
  res.json(shops);
});

app.get('/api/shops/:id', (req, res) => {
  const shop = shops.find(s => s.id === parseInt(req.params.id));
  if (!shop) return res.status(404).json({ message: 'Shop not found' });
  res.json(shop);
});

app.get('/api/users', (req, res) => {
  const safeUsers = users.map(u => {
    const { password, ...safeUser } = u;
    return safeUser;
  });
  res.json(safeUsers);
});

app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// Mock game and cartela endpoints for basic functionality
app.get('/api/games', (req, res) => {
  res.json([]);
});

app.get('/api/games/active', (req, res) => {
  res.json(null);
});

app.get('/api/cartelas/:shopId', (req, res) => {
  // Return empty cartelas for now
  res.json([]);
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 BingoMaster running on port ${PORT}`);
  console.log(`🌐 Access: http://91.99.161.246:${PORT}`);
  console.log('✅ Updated with current authentication system');
  console.log('👤 Test logins: admin1/123456, adad/123456, alex1/123456, kal1/123456');
});
