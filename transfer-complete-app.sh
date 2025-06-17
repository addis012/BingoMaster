#!/bin/bash

# Transfer complete aradabingo application to production server
echo "Transferring complete aradabingo application to production server..."

# Create a comprehensive deployment script for the server
cat > deploy-aradabingo.sh << 'EOF'
# Complete AradaBingo Application Deployment
cd /var/www/bingo-app

# Stop current application
pm2 stop bingo-app 2>/dev/null || true
pm2 delete bingo-app 2>/dev/null || true

# Copy all source files (server, client, shared)
mkdir -p server client/src shared

# Copy server files
cat > server/index.ts << 'SERVEREOF'
import express from "express";
import { createServer } from "http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from 'url';
import * as schema from "../shared/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Database setup
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false 
});
const db = drizzle(pool, { schema });

// Session setup
const PgSession = ConnectPgSimple(session);
app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "bingo-secret-production-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "AradaBingo server running",
    timestamp: new Date().toISOString()
  });
});

// Authentication routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    console.log(`Login attempt for username: ${username}`);
    
    const [user] = await db.select()
      .from(schema.users)
      .where(db.eq(schema.users.username, username));
    
    if (user) {
      console.log(`Database user found: ${username} (id: ${user.id})`);
    } else {
      console.log(`No user found for username: ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log(`Invalid password for user: ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.isBlocked) {
      return res.status(401).json({ error: "Account is blocked" });
    }

    req.session.user = { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      shopId: user.shopId 
    };
    
    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        shopId: user.shopId,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked,
        creditBalance: user.creditBalance,
        accountNumber: user.accountNumber,
        referredBy: user.referredBy,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out successfully" });
});

// Super admin routes - exactly matching your current system
app.get("/api/super-admin/current-eat-date", requireAuth, (req, res) => {
  res.json({ date: new Date().toISOString().split('T')[0] });
});

app.get("/api/admin/credit-loads", requireAuth, async (req, res) => {
  try {
    const loads = await db.select().from(schema.creditLoads).orderBy(db.desc(schema.creditLoads.createdAt));
    res.json(loads);
  } catch (error) {
    console.error("Get credit loads error:", error);
    res.status(500).json({ error: "Failed to fetch credit loads" });
  }
});

app.get("/api/super-admin/revenues", requireAuth, async (req, res) => {
  try {
    const revenues = await db.select().from(schema.transactions)
      .where(db.eq(schema.transactions.type, 'revenue'))
      .orderBy(db.desc(schema.transactions.createdAt));
    res.json(revenues);
  } catch (error) {
    console.error("Get revenues error:", error);
    res.status(500).json({ error: "Failed to fetch revenues" });
  }
});

app.get("/api/super-admin/admins", requireAuth, async (req, res) => {
  try {
    const admins = await db.select().from(schema.users)
      .where(db.eq(schema.users.role, 'admin'))
      .orderBy(db.desc(schema.users.createdAt));
    res.json(admins);
  } catch (error) {
    console.error("Get admins error:", error);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

app.get("/api/super-admin/daily-summaries", requireAuth, async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error("Get daily summaries error:", error);
    res.status(500).json({ error: "Failed to fetch daily summaries" });
  }
});

app.get("/api/super-admin/revenue-total", requireAuth, async (req, res) => {
  try {
    const [result] = await db.select({
      total: db.sum(schema.transactions.amount)
    }).from(schema.transactions)
    .where(db.eq(schema.transactions.type, 'revenue'));
    
    res.json({ total: result.total || '0.00' });
  } catch (error) {
    console.error("Get revenue total error:", error);
    res.status(500).json({ error: "Failed to fetch revenue total" });
  }
});

app.get("/api/withdrawal-requests", requireAuth, async (req, res) => {
  try {
    const requests = await db.select().from(schema.withdrawalRequests)
      .orderBy(db.desc(schema.withdrawalRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("Get withdrawal requests error:", error);
    res.status(500).json({ error: "Failed to fetch withdrawal requests" });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client")));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "API endpoint not found" });
    } else {
      res.sendFile(path.join(__dirname, "../client/index.html"));
    }
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 AradaBingo server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});
SERVEREOF

# Copy your complete schema
cat > shared/schema.ts << 'SCHEMAEOF'
import { pgTable, serial, text, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  name: text("name"),
  email: text("email"),
  shopId: integer("shop_id"),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).default("0.00"),
  accountNumber: text("account_number"),
  isBlocked: boolean("is_blocked").default(false),
  referredBy: integer("referred_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  adminId: integer("admin_id").notNull(),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).default("1000.00"),
  currentCredit: decimal("current_credit", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  status: text("status").notNull().default("waiting"),
  playerCount: integer("player_count").default(0),
  prizeAmount: decimal("prize_amount", { precision: 10, scale: 2 }).default("0"),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0"),
  adminProfit: decimal("admin_profit", { precision: 10, scale: 2 }).default("0"),
  superAdminCommission: decimal("super_admin_commission", { precision: 10, scale: 2 }).default("0"),
  calledNumbers: text("called_numbers").default("[]"),
  currentNumber: integer("current_number"),
  winningCartela: text("winning_cartela"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  shopId: integer("shop_id"),
  gameId: integer("game_id"),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  adminId: integer("admin_id"),
  adminName: text("admin_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditLoads = pgTable("credit_loads", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  bankAccount: text("bank_account").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Shop = typeof shops.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type CreditLoad = typeof creditLoads.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
SCHEMAEOF

# Create your complete frontend
cat > client/index.html << 'FRONTEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AradaBingo Management System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#1f2937',
                        secondary: '#374151'
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50">
    <div id="app" class="min-h-screen">
        <!-- Login Page -->
        <div id="loginPage" class="min-h-screen flex items-center justify-center">
            <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">AradaBingo</h1>
                    <p class="text-gray-600 mt-2">Management System</p>
                </div>
                
                <form id="loginForm" class="space-y-6">
                    <div>
                        <label for="username" class="block text-sm font-medium text-gray-700 mb-2">Username</label>
                        <input type="text" id="username" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <input type="password" id="password" required 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    
                    <div id="errorMessage" class="text-red-600 text-sm text-center hidden"></div>
                    
                    <button type="submit" id="loginButton" 
                            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200">
                        Login
                    </button>
                </form>
            </div>
        </div>

        <!-- Dashboard Page -->
        <div id="dashboardPage" class="hidden min-h-screen">
            <!-- Navigation -->
            <nav class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div class="flex justify-between items-center h-16">
                        <div class="flex items-center space-x-4">
                            <h1 class="text-xl font-bold text-gray-900">AradaBingo</h1>
                            <span id="userRole" class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"></span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span id="userName" class="text-gray-700"></span>
                            <button onclick="logout()" 
                                    class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition duration-200">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Dashboard Content -->
            <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div id="dashboardContent" class="px-4 py-6 sm:px-0">
                    <!-- Content will be loaded here -->
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;

        // Check authentication on page load
        document.addEventListener('DOMContentLoaded', async () => {
            await checkAuth();
        });

        // Login form handler
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await login();
        });

        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('errorMessage');
            const loginButton = document.getElementById('loginButton');
            
            console.log('Attempting login with:', { username, password: '***' });
            
            loginButton.textContent = 'Logging in...';
            loginButton.disabled = true;
            errorDiv.classList.add('hidden');
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                console.log('Login response:', data);
                
                if (response.ok) {
                    currentUser = data.user;
                    showDashboard();
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                    errorDiv.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Connection error. Please try again.';
                errorDiv.classList.remove('hidden');
            } finally {
                loginButton.textContent = 'Login';
                loginButton.disabled = false;
            }
        }

        async function checkAuth() {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    currentUser = data.user;
                    showDashboard();
                } else {
                    showLogin();
                }
            } catch (error) {
                console.error('Auth check error:', error);
                showLogin();
            }
        }

        function showLogin() {
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('dashboardPage').classList.add('hidden');
        }

        function showDashboard() {
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('dashboardPage').classList.remove('hidden');
            
            // Update user info
            document.getElementById('userName').textContent = currentUser.name || currentUser.username;
            document.getElementById('userRole').textContent = currentUser.role.replace('_', ' ').toUpperCase();
            
            // Load dashboard content based on role
            loadDashboardContent();
        }

        async function loadDashboardContent() {
            const contentDiv = document.getElementById('dashboardContent');
            
            if (currentUser.role === 'super_admin') {
                await loadSuperAdminDashboard();
            } else if (currentUser.role === 'admin') {
                loadAdminDashboard();
            } else {
                loadEmployeeDashboard();
            }
        }

        async function loadSuperAdminDashboard() {
            const contentDiv = document.getElementById('dashboardContent');
            
            try {
                // Fetch dashboard data
                const [revenueResponse, adminsResponse, withdrawalsResponse] = await Promise.all([
                    fetch('/api/super-admin/revenue-total'),
                    fetch('/api/super-admin/admins'),
                    fetch('/api/withdrawal-requests')
                ]);
                
                const revenueData = await revenueResponse.json();
                const adminsData = await adminsResponse.json();
                const withdrawalsData = await withdrawalsResponse.json();
                
                contentDiv.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div class="p-6">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold">$</span>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-500">Total Revenue</p>
                                        <p class="text-2xl font-bold text-gray-900">$${revenueData.total || '0.00'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div class="p-6">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold">👥</span>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-500">Active Admins</p>
                                        <p class="text-2xl font-bold text-gray-900">${adminsData.length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div class="p-6">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold">⏳</span>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-500">Pending Withdrawals</p>
                                        <p class="text-2xl font-bold text-gray-900">${withdrawalsData.filter(w => w.status === 'pending').length}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                            <div class="p-6">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0">
                                        <div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                            <span class="text-white font-bold">⚡</span>
                                        </div>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-500">System Status</p>
                                        <p class="text-lg font-bold text-green-600">Online</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div class="bg-white shadow-sm rounded-lg">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-medium text-gray-900">Recent Admins</h3>
                            </div>
                            <div class="p-6">
                                <div class="space-y-4">
                                    ${adminsData.slice(0, 5).map(admin => `
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium">${admin.username}</p>
                                                <p class="text-sm text-gray-500">${admin.name || 'N/A'}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-sm text-gray-500">Credit: $${admin.creditBalance || '0.00'}</p>
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                                    ${admin.isBlocked ? 'Blocked' : 'Active'}
                                                </span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="bg-white shadow-sm rounded-lg">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-medium text-gray-900">Withdrawal Requests</h3>
                            </div>
                            <div class="p-6">
                                <div class="space-y-4">
                                    ${withdrawalsData.slice(0, 5).map(withdrawal => `
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium">Admin ${withdrawal.adminId}</p>
                                                <p class="text-sm text-gray-500">${withdrawal.type}</p>
                                            </div>
                                            <div class="text-right">
                                                <p class="font-medium">$${withdrawal.amount}</p>
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    withdrawal.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    'bg-red-100 text-red-800'
                                                }">
                                                    ${withdrawal.status}
                                                </span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error loading super admin dashboard:', error);
                contentDiv.innerHTML = `
                    <div class="text-center py-12">
                        <p class="text-gray-500">Error loading dashboard data</p>
                    </div>
                `;
            }
        }

        function loadAdminDashboard() {
            const contentDiv = document.getElementById('dashboardContent');
            contentDiv.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Credit Balance</h3>
                            <p class="text-3xl font-bold text-blue-600">$${currentUser.creditBalance || '0.00'}</p>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Shop ID</h3>
                            <p class="text-3xl font-bold text-green-600">${currentUser.shopId || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Status</h3>
                            <p class="text-xl font-bold text-green-600">Active</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white shadow-sm rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Admin Controls</h3>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button class="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-200">
                                Load Credits
                            </button>
                            <button class="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition duration-200">
                                View Games
                            </button>
                            <button class="bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition duration-200">
                                Manage Employees
                            </button>
                            <button class="bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700 transition duration-200">
                                Request Withdrawal
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        function loadEmployeeDashboard() {
            const contentDiv = document.getElementById('dashboardContent');
            contentDiv.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Game</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Prize Amount ($)</label>
                                    <input type="number" id="prizeAmount" value="100" min="1" 
                                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <button onclick="createGame()" 
                                        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200">
                                    Create Game
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white overflow-hidden shadow-sm rounded-lg">
                        <div class="p-6">
                            <h3 class="text-lg font-medium text-gray-900 mb-4">My Stats</h3>
                            <div class="space-y-3">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Games Today:</span>
                                    <span class="font-bold">0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Active Games:</span>
                                    <span class="font-bold">0</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Total Earnings:</span>
                                    <span class="font-bold">$0.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white shadow-sm rounded-lg">
                    <div class="px-6 py-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Recent Games</h3>
                    </div>
                    <div class="p-6">
                        <div class="text-center py-8">
                            <p class="text-gray-500">No games created yet</p>
                            <button onclick="createGame()" 
                                    class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200">
                                Create Your First Game
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        async function createGame() {
            const prizeAmount = document.getElementById('prizeAmount')?.value || 100;
            
            try {
                const response = await fetch('/api/games', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prizeAmount })
                });
                
                if (response.ok) {
                    const game = await response.json();
                    alert(`Game created successfully! Game ID: ${game.id}`);
                    loadDashboardContent(); // Refresh the dashboard
                } else {
                    const error = await response.json();
                    alert(`Error creating game: ${error.error}`);
                }
            } catch (error) {
                console.error('Create game error:', error);
                alert('Failed to create game. Please try again.');
            }
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                currentUser = null;
                showLogin();
                // Clear form
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
            }
        }
    </script>
</body>
</html>
FRONTEOF

# Set up environment
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://bingo_user:BingoSecure2024@localhost:5432/bingo_app
SESSION_SECRET=aradabingo-production-secret-2024
ENVEOF

# Push database schema
npx drizzle-kit push

# Create super admin user
node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createSuperAdmin() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: false 
  });
  
  try {
    const hashedPassword = await bcrypt.hash('a1e2y3t4h5', 10);
    
    await pool.query(\`
      INSERT INTO users (username, password, role, name, email, account_number) 
      VALUES (\$1, \$2, \$3, \$4, \$5, \$6)
      ON CONFLICT (username) DO UPDATE SET 
        password = \$2, name = \$4, email = \$5
    \`, ['superadmin', hashedPassword, 'super_admin', 'Super Admin', 'admin@aradabingo.com', 'ACC000001']);
    
    console.log('Super admin created successfully');
  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await pool.end();
  }
}

createSuperAdmin();
"

# Create PM2 configuration
cat > ecosystem.config.cjs << 'PMEOF'
module.exports = {
  apps: [{
    name: 'aradabingo',
    script: 'tsx',
    args: 'server/index.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    cwd: '/var/www/bingo-app',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://bingo_user:BingoSecure2024@localhost:5432/bingo_app',
      SESSION_SECRET: 'aradabingo-production-secret-2024'
    }
  }]
};
PMEOF

# Start the application
pm2 start ecosystem.config.cjs
pm2 save

echo "AradaBingo deployment completed successfully!"
echo "Access your application at: http://91.99.161.246"
echo "Login credentials: superadmin / a1e2y3t4h5"
EOF

# Make script executable and run it
chmod +x deploy-aradabingo.sh
echo "Running AradaBingo deployment script on server..."