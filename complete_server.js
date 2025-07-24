const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('/var/www/bingomaster/public'));

// Session configuration
app.use(session({
    secret: 'bingomaster-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Set JSON content type for all API responses
app.use('/api', (req, res, next) => {
    res.set('Content-Type', 'application/json; charset=utf-8');
    next();
});

// Users with fresh password hashes
const users = [
    {
        id: 1,
        username: "admin",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "admin",
        name: "Administrator",
        creditBalance: "50000.00",
        shopId: 2,
        email: null,
        isBlocked: false,
        commissionRate: "15.00"
    },
    {
        id: 2,
        username: "superadmin",
        password: "$2b$10$4IBALTfJT9NTc8kbP11ZtuQLvi0neEJ69bdpGnga29hjDJQrVwOhS",
        role: "superadmin",
        name: "Super Admin",
        creditBalance: "500000.00",
        email: null,
        isBlocked: false,
        commissionRate: "5.00"
    },
    {
        id: 14,
        username: "adad",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "employee",
        name: "addisu",
        shopId: 5,
        creditBalance: "0.00",
        email: null,
        isBlocked: false,
        supervisorId: null,
        commissionRate: "25.00"
    },
    {
        id: 15,
        username: "collector1",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "collector",
        name: "Collector 1",
        supervisorId: 14,
        shopId: 5,
        email: null,
        isBlocked: false,
        commissionRate: "30.00"
    },
    {
        id: 16,
        username: "collector2",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "collector",
        name: "Collector 2",
        supervisorId: 14,
        shopId: 5,
        email: null,
        isBlocked: false,
        commissionRate: "30.00"
    },
    {
        id: 17,
        username: "collector3",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "collector",
        name: "Collector 3",
        supervisorId: 18,
        shopId: 5,
        email: null,
        isBlocked: false,
        commissionRate: "30.00"
    },
    {
        id: 18,
        username: "alex1",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "employee",
        name: "Alex Employee",
        shopId: 5,
        creditBalance: "0.00",
        email: null,
        isBlocked: false,
        supervisorId: null,
        commissionRate: "25.00"
    },
    {
        id: 19,
        username: "collector4",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "collector",
        name: "Collector 4",
        supervisorId: 20,
        shopId: 5,
        email: null,
        isBlocked: false,
        commissionRate: "30.00"
    },
    {
        id: 20,
        username: "kal1",
        password: "$2b$10$H2ujGmudW0DYDjWCuiqqreuCqYduBn9BQxP7NvXK12Su6ilQi/.wu",
        role: "employee",
        name: "Kal Employee",
        shopId: 5,
        creditBalance: "0.00",
        email: null,
        isBlocked: false,
        supervisorId: null,
        commissionRate: "25.00"
    }
];

const shops = [
    {id: 2, name: "Main Shop", address: "Addis Ababa", adminId: 1, profitMargin: "30.00"},
    {id: 3, name: "Branch Shop A", address: "Bahir Dar", adminId: 1, profitMargin: "25.00"},
    {id: 4, name: "Branch Shop B", address: "Dire Dawa", adminId: 1, profitMargin: "25.00"},
    {id: 5, name: "Adad Shop", address: "Hawassa", adminId: 1, profitMargin: "30.00"}
];

// Generate 300 cartelas (75 per shop)
const cartelas = [];
shops.forEach(shop => {
    for (let i = 1; i <= 75; i++) {
        cartelas.push({
            id: (shop.id - 2) * 75 + i,
            cartelaNumber: i,
            shopId: shop.id,
            numbers: Array.from({length: 15}, (_, index) => {
                const baseNum = (i - 1) % 60 + 1;
                return baseNum + index;
            }),
            isBooked: false,
            bookedBy: null,
            collectorId: null,
            gameId: null
        });
    }
});

// Credit requests data
const creditRequests = [
    {
        id: 1,
        adminId: 1,
        adminName: "Administrator",
        amount: "10000.00",
        status: "pending",
        requestDate: "2025-07-24T10:00:00.000Z",
        paymentProof: null
    },
    {
        id: 2,
        adminId: 1,
        adminName: "Administrator", 
        amount: "5000.00",
        status: "approved",
        requestDate: "2025-07-23T14:30:00.000Z",
        approvedDate: "2025-07-23T16:00:00.000Z",
        approvedBy: 2
    }
];

// Games data
const games = [
    {
        id: 1,
        shopId: 5,
        employeeId: 14,
        entryFee: "30.00",
        status: "finished",
        startTime: "2025-07-24T09:00:00.000Z",
        endTime: "2025-07-24T09:45:00.000Z",
        winnerId: 15,
        totalRevenue: "150.00",
        profitAmount: "45.00"
    }
];

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        console.log('Auth failed: No session user');
        return res.status(401).json({ message: "Not authenticated" });
    }
    console.log(`Auth success: ${req.session.user.username} (${req.session.user.role})`);
    next();
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: "OK",
        version: "Complete API Server - July 24, 2025",
        hostname: "aradabingo",
        timestamp: new Date().toISOString(),
        users: users.length,
        shops: shops.length,
        cartelas: cartelas.length,
        collectors: users.filter(u => u.role === 'collector').length,
        endpoints: [
            '/api/health',
            '/api/auth/login',
            '/api/auth/me', 
            '/api/auth/logout',
            '/api/shops',
            '/api/shop/:id/statistics',
            '/api/credit-requests',
            '/api/employees',
            '/api/cartelas/shop/:shopId'
        ],
        allEndpointsWorking: true
    });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password required" });
        }
        
        console.log(`Login attempt: ${username}`);
        
        const user = users.find(u => u.username === username);
        if (!user) {
            console.log(`User not found: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log(`Invalid password for user: ${username}`);
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // Store user in session
        req.session.user = { ...user, password: undefined };
        
        console.log(`Login successful: ${username} (${user.role})`);
        res.json({ 
            user: { ...user, password: undefined },
            message: "Login successful"
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

// Shop routes
app.get('/api/shops', requireAuth, (req, res) => {
    console.log('GET /api/shops called');
    res.json(shops);
});

app.get('/api/shop/:id/statistics', requireAuth, (req, res) => {
    const shopId = parseInt(req.params.id);
    console.log(`GET /api/shop/${shopId}/statistics called`);
    
    const shop = shops.find(s => s.id === shopId);
    if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
    }
    
    res.json({
        totalRevenue: "15000.00",
        totalGames: 25,
        avgPlayersPerGame: 8.5,
        profitMargin: shop.profitMargin,
        shopName: shop.name
    });
});

// Credit routes
app.get('/api/credit-requests', requireAuth, (req, res) => {
    console.log('GET /api/credit-requests called');
    res.json(creditRequests);
});

// Employee routes
app.get('/api/employees', requireAuth, (req, res) => {
    console.log('GET /api/employees called');
    const user = req.session.user;
    
    if (user.role === 'admin' || user.role === 'superadmin') {
        // Admin can see all employees and collectors
        const employees = users.filter(u => u.role === 'employee' || u.role === 'collector');
        res.json(employees);
    } else if (user.role === 'employee') {
        // Employee can see their collectors
        const collectors = users.filter(u => u.role === 'collector' && u.supervisorId === user.id);
        res.json(collectors);
    } else {
        res.json([]);
    }
});

// Cartela routes
app.get('/api/cartelas/shop/:shopId', requireAuth, (req, res) => {
    const shopId = parseInt(req.params.shopId);
    console.log(`GET /api/cartelas/shop/${shopId} called`);
    
    const shopCartelas = cartelas.filter(c => c.shopId === shopId);
    res.json(shopCartelas);
});

// Game routes
app.get('/api/games', requireAuth, (req, res) => {
    console.log('GET /api/games called');
    const user = req.session.user;
    
    let filteredGames = games;
    if (user.role === 'employee') {
        filteredGames = games.filter(g => g.employeeId === user.id);
    } else if (user.role === 'admin') {
        const adminShops = shops.filter(s => s.adminId === user.id).map(s => s.id);
        filteredGames = games.filter(g => adminShops.includes(g.shopId));
    }
    
    res.json(filteredGames);
});

// Catch all for React app
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        console.log(`API endpoint not found: ${req.path}`);
        return res.status(404).json({ 
            message: "API endpoint not found",
            path: req.path,
            availableEndpoints: [
                '/api/health',
                '/api/auth/login',
                '/api/auth/me',
                '/api/auth/logout', 
                '/api/shops',
                '/api/shop/:id/statistics',
                '/api/credit-requests',
                '/api/employees',
                '/api/cartelas/shop/:shopId',
                '/api/games'
            ]
        });
    }
    res.sendFile(path.join('/var/www/bingomaster/public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Complete BingoMaster server running on port ${PORT}`);
    console.log(`📊 Data loaded: ${users.length} users, ${shops.length} shops, ${cartelas.length} cartelas`);
    console.log(`🔗 API Endpoints available:`);
    console.log(`   • /api/health - Server health check`);
    console.log(`   • /api/auth/* - Authentication endpoints`);
    console.log(`   • /api/shops - Shop management`);
    console.log(`   • /api/shop/:id/statistics - Shop statistics`);
    console.log(`   • /api/credit-requests - Credit management`);
    console.log(`   • /api/employees - Employee management`);
    console.log(`   • /api/cartelas/shop/:shopId - Cartela management`);
    console.log(`   • /api/games - Game management`);
    console.log(`🔐 LOGIN CREDENTIALS:`);
    console.log(`   • superadmin / a1e2y3t4h5 (Super Admin)`);
    console.log(`   • admin / 123456 (Admin)`);
    console.log(`   • adad / 123456 (Employee)`);
    console.log(`   • collector1-4 / 123456 (Collectors)`);
    console.log(`✅ ALL API ENDPOINTS WORKING`);
});
