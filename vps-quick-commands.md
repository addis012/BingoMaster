# Quick VPS Commands to Complete Setup

## 1. Copy Complete Server File
```bash
cd /var/www/bingomaster-mongo
cat > server/index.js << 'SERVEREOF'
import express from 'express';
import session from 'express-session';
import MemoryStore from 'memorystore';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemStore = MemoryStore(session);

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

async function connectMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🍃 Connected to MongoDB successfully');
    
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

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
SERVEREOF
```

## 2. Test Server
```bash
node server/index.js
```

## 3. Start Production Service (if test works)
```bash
# Ctrl+C to stop test server, then:
systemctl start bingomaster-mongo
systemctl status bingomaster-mongo
```

## 4. View Logs
```bash
journalctl -u bingomaster-mongo -f
```

## 5. Test Health Check
```bash
curl http://localhost:3000/health
curl http://91.99.161.246/health
```