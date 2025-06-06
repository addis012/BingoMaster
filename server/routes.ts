import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUserSchema, insertShopSchema, insertGameSchema, insertGamePlayerSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

// Extend Express Request to include session
declare module 'express-serve-static-core' {
  interface Request {
    session: any;
  }
}

// WebSocket clients by game ID
const gameClients = new Map<number, Set<WebSocket>>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from attached_assets directory
  app.use('/attached_assets', express.static('attached_assets'));
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.isBlocked) {
        return res.status(403).json({ message: "Account is blocked" });
      }

      // Set session
      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/shop/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const users = await storage.getUsersByShop(shopId);
      
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 10);
      }

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Additional user routes for admin dashboard
  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.updateUser(id, { password: hashedPassword });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/users/shop/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const users = await storage.getUsersByShop(shopId);
      
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shop users" });
    }
  });

  // Shop routes
  app.get("/api/shops", async (req, res) => {
    try {
      const shops = await storage.getShops();
      res.json(shops);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shops" });
    }
  });

  app.post("/api/shops", async (req, res) => {
    try {
      const shopData = insertShopSchema.parse(req.body);
      const shop = await storage.createShop(shopData);
      res.json(shop);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create shop" });
    }
  });

  app.patch("/api/shops/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const shop = await storage.updateShop(id, req.body);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      res.json(shop);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shop" });
    }
  });

  app.get("/api/shops/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const shop = await storage.getShop(id);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      res.json(shop);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shop" });
    }
  });

  app.get("/api/shops/:id/stats", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getShopStats(id, start, end);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shop stats" });
    }
  });

  // Game routes
  app.get("/api/games/active/:employeeId", async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const game = await storage.getActiveGameByEmployee(employeeId);
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active game" });
    }
  });

  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.patch("/api/games/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const game = await storage.updateGame(id, req.body);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Notify WebSocket clients about game update
      const clients = gameClients.get(id);
      if (clients) {
        const message = JSON.stringify({ type: 'game_updated', game });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.get("/api/games/:id/players", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const players = await storage.getGamePlayers(gameId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game players" });
    }
  });

  app.post("/api/games/:id/players", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const playerData = insertGamePlayerSchema.parse({
        ...req.body,
        gameId,
      });
      
      const player = await storage.createGamePlayer(playerData);

      // Create entry fee transaction
      const game = await storage.getGame(gameId);
      if (game) {
        await storage.createTransaction({
          gameId,
          shopId: game.shopId,
          employeeId: game.employeeId,
          amount: playerData.entryFee,
          type: 'entry_fee',
          description: `Entry fee for ${playerData.playerName}`,
        });

        // Update game prize pool
        const currentPrizePool = parseFloat(game.prizePool || "0");
        const newPrizePool = currentPrizePool + parseFloat(playerData.entryFee);
        await storage.updateGame(gameId, { prizePool: newPrizePool.toString() });
      }

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ type: 'player_registered', player });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register player" });
    }
  });

  app.delete("/api/games/:gameId/players/:playerId", async (req, res) => {
    try {
      const gameId = parseInt(req.params.gameId);
      const playerId = parseInt(req.params.playerId);
      
      const success = await storage.removeGamePlayer(playerId);
      if (!success) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ type: 'player_removed', playerId });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json({ message: "Player removed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove player" });
    }
  });

  // Game control routes
  app.post("/api/games/:id/start", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const game = await storage.updateGame(gameId, {
        status: 'active',
        startedAt: new Date(),
      });

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ type: 'game_started', game });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to start game" });
    }
  });

  app.post("/api/games/:id/call-number", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { number } = req.body;
      
      const game = await storage.getGame(gameId);
      if (!game || game.status !== 'active') {
        return res.status(400).json({ message: "Game not active" });
      }

      const calledNumbers = [...(game.calledNumbers || []), number];
      const updatedGame = await storage.updateGame(gameId, { calledNumbers });

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ type: 'number_called', number, calledNumbers });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json({ number, calledNumbers });
    } catch (error) {
      res.status(500).json({ message: "Failed to call number" });
    }
  });

  app.post("/api/games/:id/declare-winner", async (req, res) => {
    try {
      const gameId = parseInt(req.params.id);
      const { winnerId } = req.body;
      
      // Get game, shop, and winner details
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      const shop = await storage.getShop(game.shopId);
      const players = await storage.getGamePlayers(gameId);
      const winner = players.find(p => p.id === winnerId);
      
      // System already uses Ethiopian Birr (ETB)
      const totalCollectedBirr = parseFloat(game.prizePool || "0");
      
      // Calculate profit margin and commission
      const profitMargin = parseFloat(shop?.profitMargin || "0");
      const commissionRate = parseFloat(shop?.commissionRate || "0");
      
      const adminProfit = (totalCollectedBirr * profitMargin) / 100;
      const prizeAmountBirr = totalCollectedBirr - adminProfit;
      const superAdminCommission = (adminProfit * commissionRate) / 100;
      
      // Update game status
      const updatedGame = await storage.updateGame(gameId, {
        status: 'completed',
        winnerId,
        completedAt: new Date(),
        prizePool: prizeAmountBirr.toString(),
      });

      // Create transactions in Birr
      await storage.createTransaction({
        gameId,
        shopId: game.shopId,
        employeeId: game.employeeId,
        amount: prizeAmountBirr.toString(),
        type: 'prize_payout',
        description: `Prize payout for game ${gameId} - ${prizeAmountBirr.toFixed(2)} Birr`,
      });

      await storage.createTransaction({
        gameId,
        shopId: game.shopId,
        employeeId: game.employeeId,
        amount: adminProfit.toString(),
        type: 'admin_profit',
        description: `Admin profit for game ${gameId} - ${adminProfit.toFixed(2)} Birr`,
      });

      if (superAdminCommission > 0) {
        await storage.createTransaction({
          gameId,
          shopId: game.shopId,
          employeeId: game.employeeId,
          amount: superAdminCommission.toString(),
          type: 'super_admin_commission',
          description: `Super admin commission for game ${gameId} - ${superAdminCommission.toFixed(2)} Birr`,
        });
      }

      // Create game history record
      await storage.createGameHistory({
        gameId,
        shopId: game.shopId,
        employeeId: game.employeeId,
        totalCollected: totalCollectedBirr.toString(),
        prizeAmount: prizeAmountBirr.toString(),
        adminProfit: adminProfit.toString(),
        superAdminCommission: superAdminCommission.toString(),
        playerCount: players.length,
        winnerName: winner?.playerName || 'Unknown',
      });

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ 
          type: 'game_completed', 
          game: updatedGame, 
          winnerId,
          prizeAmount: prizeAmountBirr.toFixed(2),
          adminProfit: adminProfit.toFixed(2),
          superAdminCommission: superAdminCommission.toFixed(2),
          currency: 'ETB'
        });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json({
        game: updatedGame,
        financial: {
          totalCollected: totalCollectedBirr.toFixed(2),
          prizeAmount: prizeAmountBirr.toFixed(2),
          adminProfit: adminProfit.toFixed(2),
          superAdminCommission: superAdminCommission.toFixed(2),
          currency: 'ETB'
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to declare winner" });
    }
  });

  // Game History routes
  app.get("/api/game-history/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const history = await storage.getGameHistory(shopId, start, end);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game history" });
    }
  });

  // Stats routes
  app.get("/api/stats/employee/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const stats = await storage.getEmployeeStats(id, start, end);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get employee stats" });
    }
  });

  // Update shop settings (commission rate, profit margin)
  app.patch("/api/shops/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const user = req.session?.user;
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { commissionRate, profitMargin } = req.body;
      
      // Only super admins can update commission rates
      if (commissionRate !== undefined && user.role !== "super_admin") {
        return res.status(403).json({ message: "Only super admins can update commission rates" });
      }
      
      // Regular admins can only update profit margins
      const updateData: any = {};
      if (user.role === "super_admin" && commissionRate !== undefined) {
        updateData.commissionRate = commissionRate.toString();
      }
      if (profitMargin !== undefined) {
        updateData.profitMargin = profitMargin.toString();
      }
      
      const updatedShop = await storage.updateShop(shopId, updateData);
      
      if (!updatedShop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      res.json(updatedShop);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shop" });
    }
  });

  // Get today's games for a shop
  app.get("/api/games/shop/:shopId/today", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const games = await storage.getGamesByShop(shopId);
      const todayGames = games.filter(game => {
        const gameDate = new Date(game.createdAt);
        return gameDate >= startOfDay && gameDate < endOfDay;
      });

      // Get players for each game
      const gamesWithPlayers = await Promise.all(
        todayGames.map(async (game) => {
          const players = await storage.getGamePlayers(game.id);
          const employee = await storage.getUser(game.employeeId);
          return { 
            ...game, 
            players,
            employee: employee ? { name: employee.name } : null
          };
        })
      );
      
      res.json(gamesWithPlayers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get today's games" });
    }
  });

  // Get daily income for a shop
  app.get("/api/shops/:shopId/daily-income", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const transactions = await storage.getTransactionsByShop(shopId, startOfDay);
      const totalIncome = transactions
        .filter(t => t.type === 'entry_fee')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalPayout = transactions
        .filter(t => t.type === 'prize_payout')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      res.json({
        amount: (totalIncome - totalPayout).toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        totalPayout: totalPayout.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get daily income" });
    }
  });

  // Update employee password
  app.patch("/api/users/:userId/password", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  // Retail Report API
  app.get("/api/reports/retail/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const { dateFrom, dateTo, sortBy, order } = req.query;
      
      const start = dateFrom ? new Date(dateFrom as string) : new Date();
      const end = dateTo ? new Date(dateTo as string) : new Date();
      
      const games = await storage.getGamesByShop(shopId);
      const filteredGames = games.filter(game => {
        const gameDate = new Date(game.createdAt);
        return gameDate >= start && gameDate <= end;
      });

      const reportData = await Promise.all(
        filteredGames.map(async (game) => {
          const players = await storage.getGamePlayers(game.id);
          const employee = await storage.getUser(game.employeeId);
          return {
            ...game,
            shopName: employee?.name || 'Shop',
            playerCount: players.length,
            stakeAmount: (players.length * parseFloat(game.entryFee || "0")).toString(),
            claimedAmount: game.status === 'completed' ? game.prizePool : "0.00",
            netBalance: (players.length * parseFloat(game.entryFee || "0") - parseFloat(game.prizePool || "0")).toString()
          };
        })
      );

      // Sort data
      if (sortBy === 'stake') {
        reportData.sort((a, b) => {
          const aVal = parseFloat(a.stakeAmount);
          const bVal = parseFloat(b.stakeAmount);
          return order === 'DESC' ? bVal - aVal : aVal - bVal;
        });
      }
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "Failed to get retail report" });
    }
  });

  // Report Summary API
  app.get("/api/reports/summary/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const { dateFrom, dateTo } = req.query;
      
      const start = dateFrom ? new Date(dateFrom as string) : new Date();
      const end = dateTo ? new Date(dateTo as string) : new Date();
      
      const transactions = await storage.getTransactionsByShop(shopId, start, end);
      const totalIncome = transactions
        .filter(t => t.type === 'entry_fee')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      const totalPayout = transactions
        .filter(t => t.type === 'prize_payout')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      res.json({
        netBalance: (totalIncome - totalPayout).toFixed(2),
        totalIncome: totalIncome.toFixed(2),
        totalPayout: totalPayout.toFixed(2)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get report summary" });
    }
  });

  // Transaction routes
  app.get("/api/transactions/shop/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const transactions = await storage.getTransactionsByShop(shopId, start, end);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  app.get("/api/transactions/employee/:employeeId", async (req, res) => {
    try {
      const employeeId = parseInt(req.params.employeeId);
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const transactions = await storage.getTransactionsByEmployee(employeeId, start, end);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get transactions" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time game updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const gameId = parseInt(url.searchParams.get('gameId') || '0');

    if (gameId) {
      if (!gameClients.has(gameId)) {
        gameClients.set(gameId, new Set());
      }
      gameClients.get(gameId)!.add(ws);

      ws.on('close', () => {
        const clients = gameClients.get(gameId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) {
            gameClients.delete(gameId);
          }
        }
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'call_number') {
            // Auto-call next number for demo
            const letters = ['B', 'I', 'N', 'G', 'O'];
            const ranges = {
              'B': [1, 15],
              'I': [16, 30],
              'N': [31, 45],
              'G': [46, 60],
              'O': [61, 75]
            };
            
            const letter = letters[Math.floor(Math.random() * letters.length)];
            const [min, max] = ranges[letter as keyof typeof ranges];
            const number = Math.floor(Math.random() * (max - min + 1)) + min;
            const calledNumber = `${letter}-${number}`;
            
            // Update game with called number
            const game = await storage.getGame(gameId);
            if (game && game.status === 'active') {
              const calledNumbers = [...(game.calledNumbers || []), calledNumber];
              await storage.updateGame(gameId, { calledNumbers });
              
              // Broadcast to all clients
              const clients = gameClients.get(gameId);
              if (clients) {
                const response = JSON.stringify({ 
                  type: 'number_called', 
                  number: calledNumber, 
                  calledNumbers 
                });
                clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(response);
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
    }
  });

  // Additional API routes for admin dashboard
  app.get("/api/games/shop", async (req, res) => {
    try {
      const games = await storage.getGamesByShop(1);
      res.json(games);
    } catch (error) {
      res.status(500).json({ message: "Failed to get games" });
    }
  });

  app.get("/api/users/shop", async (req, res) => {
    try {
      const users = await storage.getUsersByShop(1);
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shop users" });
    }
  });

  return httpServer;
}
