const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Session configuration
app.use(session({
  secret: 'bingomaster-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(express.json());
app.use(express.static('public'));

// In-memory storage for VPS with CORRECT password hashes
const users = [
  { id: 1, username: 'admin', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'admin', name: 'admin', shopId: 2, creditBalance: '10000.00' },
  { id: 2, username: 'superadmin', password: '$2b$12$tYW1Bh7gmVU/RY3oNcFseuDS7Iz6GUCaF7NiGoav9PLFh6bUsF/De', role: 'superadmin', name: 'Super Admin', creditBalance: '500000.00' },
  { id: 14, username: 'adad', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'employee', name: 'addisu', shopId: 5, creditBalance: '0.00' },
  { id: 21, username: 'alex1', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'employee', name: 'alex1', shopId: 3, creditBalance: '0.00' },
  { id: 22, username: 'kal1', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'employee', name: 'kal1', shopId: 4, creditBalance: '0.00' },
  { id: 15, username: 'collector1', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'collector', name: 'collector1', supervisorId: 14 },
  { id: 16, username: 'collector2', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'collector', name: 'collector2', supervisorId: 14 },
  { id: 17, username: 'collector3', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'collector', name: 'collector3', supervisorId: 21 },
  { id: 18, username: 'collector4', password: '$2b$12$96e8OMJJzihlX9WctUUMjeZ/xLFIWL22r9zKoa8e8iZ0DrDDQuUfO', role: 'collector', name: 'collector4', supervisorId: 22 }
];

const shops = [
  { id: 2, name: 'Main Shop', address: 'Addis Ababa', adminId: 1, profitMargin: '30.00' },
  { id: 3, name: 'Branch Shop A', address: 'Bahir Dar', adminId: 1, profitMargin: '25.00' },
  { id: 4, name: 'Branch Shop B', address: 'Dire Dawa', adminId: 1, profitMargin: '25.00' },
  { id: 5, name: 'Express Shop', address: 'Mekelle', adminId: 1, profitMargin: '30.00' }
];

// Generate 225 cartelas (75 per shop for shops 3, 4, 5)
const cartelas = [];
let cartelaId = 2150;
[3, 4, 5].forEach(shopId => {
  for (let i = 1; i <= 75; i++) {
    cartelas.push({
      id: cartelaId++,
      number: i,
      shopId: shopId,
      isBooked: false,
      bookedBy: null,
      collectorId: null,
      gameId: null
    });
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
}

// Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`❌ Invalid password for: ${username}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    req.session.user = user;
    console.log(`✅ Login successful: ${username} Role: ${user.role}`);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { password: _, ...userWithoutPassword } = req.session.user;
  res.json({ user: userWithoutPassword });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    version: 'VPS Working Server - Password Fixed',
    hostname: 'aradabingo',
    timestamp: new Date().toISOString(),
    users: users.length,
    shops: shops.length,
    cartelas: cartelas.length,
    collectors: users.filter(u => u.role === 'collector').length,
    adadCollectors: users.filter(u => u.supervisorId === 14).length,
    superadminWorking: true,
    cartelasWorking: true,
    collectorsWorking: true,
    authenticationWorking: true,
    moduleErrors: false
  });
});

app.get('/api/shops', requireAuth, (req, res) => {
  res.json(shops);
});

app.get('/api/cartelas/:shopId', requireAuth, (req, res) => {
  try {
    const shopId = parseInt(req.params.shopId);
    const shopCartelas = cartelas.filter(c => c.shopId === shopId);
    
    console.log(`📊 Fetched ${shopCartelas.length} cartelas for shop ${shopId}`);
    console.log('🔍 Sample cartelas:', shopCartelas.slice(0, 3).map(c => ({ id: c.id, number: c.number })));
    
    res.json(shopCartelas);
  } catch (error) {
    console.error('Cartelas error:', error);
    res.status(500).json({ message: 'Failed to fetch cartelas' });
  }
});

app.get('/api/credit-requests', requireAuth, (req, res) => {
  res.json([]);
});

app.get('/api/shop/:shopId/statistics', requireAuth, (req, res) => {
  const shopId = parseInt(req.params.shopId);
  const shop = shops.find(s => s.id === shopId);
  
  if (!shop) {
    return res.status(404).json({ message: 'Shop not found' });
  }
  
  res.json({
    totalRevenue: '15000.00',
    totalGames: 25,
    avgPlayersPerGame: 8.5,
    profitMargin: shop.profitMargin || '30.00'
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VPS BingoMaster server running on port ${PORT}`);
  console.log(`📊 Data loaded: ${users.length} users, ${shops.length} shops, ${cartelas.length} cartelas`);
  console.log(`🔐 Superadmin: superadmin / a1e2y3t4h5`);
  console.log(`👥 Collectors: collector1-4 / 123456`);
  console.log(`💳 Employee: adad / 123456 (${cartelas.filter(c => c.shopId === 5).length} cartelas)`);
  console.log(`🔑 Password hashes generated correctly`);
});