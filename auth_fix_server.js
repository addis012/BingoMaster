
// Quick authentication fix for BingoMaster VPS
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🎯 BingoMaster - Authentication Fix Applied');

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Session
app.use(session({
  secret: 'bingo-session-secret-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Working users with correct password hash for "123456"
const users = [
  { id: 1, username: 'admin1', password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', role: 'admin', name: 'Admin User', shopId: 1 },
  { id: 14, username: 'adad', password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', role: 'employee', name: 'addisu', shopId: 5 },
  { id: 3, username: 'alex1', password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', role: 'employee', name: 'Alex Employee', shopId: 1 },
  { id: 4, username: 'kal1', password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', role: 'employee', name: 'Kal Employee', shopId: 2 }
];

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username);
    
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

    req.session.userId = user.id;
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
    console.log('Login successful:', username);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = users.find(u => u.id === req.session?.userId);
  if (!user) return res.status(401).json({ message: "Not authenticated" });
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

// Mock API endpoints
app.get('/api/health', (req, res) => res.json({ status: 'OK', version: 'Auth Fixed', timestamp: new Date().toISOString() }));
app.get('/api/shops', (req, res) => res.json([{ id: 1, name: 'Main Shop' }, { id: 5, name: 'winget' }]));
app.get('/api/shops/:id', (req, res) => res.json({ id: parseInt(req.params.id), name: 'Shop' + req.params.id }));
app.get('/api/users', (req, res) => res.json(users.map(u => ({ ...u, password: undefined }))));
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});
app.get('/api/games', (req, res) => res.json([]));
app.get('/api/games/active', (req, res) => res.json(null));
app.get('/api/cartelas/:shopId', (req, res) => res.json([]));

// Serve React app
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 BingoMaster running on port ${PORT}`);
  console.log('✅ Authentication fixed - try admin1/123456, adad/123456, alex1/123456, kal1/123456');
});
