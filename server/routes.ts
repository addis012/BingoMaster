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
      
      // Ensure session is saved before sending response
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
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

  // Delete user (admin can delete employees from their shop)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.session.user;
      
      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get the user to be deleted
      const userToDelete = await storage.getUser(id);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check permissions: admin can only delete employees from their shop
      if (currentUser.role === 'admin') {
        if (userToDelete.role !== 'employee' || userToDelete.shopId !== currentUser.shopId) {
          return res.status(403).json({ message: "Cannot delete this user" });
        }
      } else if (currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
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

  // Today's stats route for admin dashboard
  app.get("/api/stats/today/:shopId", async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayTransactions = await storage.getTransactionsByShop(shopId, startOfDay, endOfDay);
      
      const todayRevenue = todayTransactions
        .filter(t => t.type === 'entry_fee')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const todayPrizes = todayTransactions
        .filter(t => t.type === 'prize_payout')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
      const todayProfit = todayTransactions
        .filter(t => t.type === 'admin_profit')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      
      res.json({
        revenue: todayRevenue,
        prizes: todayPrizes,
        profit: todayProfit,
        netIncome: todayProfit
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get today's stats" });
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

  // Credit System API Endpoints
  
  // Get admin credit balance
  app.get("/api/credit/balance", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const balance = await storage.getCreditBalance(user.id);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to get credit balance" });
    }
  });

  // Create credit transfer between admins
  app.post("/api/credit/transfer", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { toAdminId, amount, description } = req.body;
      
      if (!toAdminId || !amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid transfer data" });
      }

      // Check if sender has sufficient balance
      const currentBalance = await storage.getCreditBalance(user.id);
      if (parseFloat(currentBalance) < parseFloat(amount)) {
        return res.status(400).json({ message: "Insufficient credit balance" });
      }

      const transfer = await storage.createCreditTransfer({
        fromAdminId: user.id,
        toAdminId: parseInt(toAdminId),
        amount,
        description,
      });

      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to process credit transfer" });
    }
  });

  // Get credit transfer history
  app.get("/api/credit/transfers", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const transfers = await storage.getCreditTransfers(user.id);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get credit transfers" });
    }
  });

  // Request credit load
  app.post("/api/credit/load", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { amount, paymentMethod, referenceNumber } = req.body;
      
      if (!amount || !paymentMethod || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Invalid load request data" });
      }

      const { transferScreenshot, adminAccountNumber, notes } = req.body;

      const load = await storage.createCreditLoad({
        adminId: user.id,
        amount,
        paymentMethod,
        referenceNumber,
        transferScreenshot,
        adminAccountNumber,
        notes,
      });

      res.json(load);
    } catch (error) {
      res.status(500).json({ message: "Failed to create credit load request" });
    }
  });

  // Super admin: Get pending credit loads
  app.get("/api/admin/credit-loads", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { status = 'pending' } = req.query;
      const loads = await storage.getCreditLoads(undefined, status as string);
      res.json(loads);
    } catch (error) {
      res.status(500).json({ message: "Failed to get credit loads" });
    }
  });

  // Super admin: Process credit load
  app.post("/api/admin/credit-loads/:id/process", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const loadId = parseInt(req.params.id);
      const { status } = req.body; // 'confirmed' or 'rejected'
      
      if (!['confirmed', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const processedLoad = await storage.processCreditLoad(loadId, status, user.id);
      res.json(processedLoad);
    } catch (error) {
      res.status(500).json({ message: "Failed to process credit load" });
    }
  });

  // System settings management
  app.post("/api/admin/system-settings", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { commissionRate, adminProfitMargin, prizePoolPercentage } = req.body;
      
      // Store settings (in a real app, you'd save to database)
      // For now, just return success
      res.json({ 
        message: "Settings updated successfully",
        settings: { commissionRate, adminProfitMargin, prizePoolPercentage }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  // Get game history
  app.get("/api/admin/game-history", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      let gameHistory;
      if (user.role === 'super_admin') {
        // Super admin sees all game history
        gameHistory = await storage.getGameHistory(0); // 0 means all shops
      } else {
        // Admin sees only their shop's game history
        if (!user.shopId) {
          return res.status(400).json({ message: "Admin not assigned to a shop" });
        }
        gameHistory = await storage.getGameHistory(user.shopId);
      }

      res.json(gameHistory);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game history" });
    }
  });

  // Create admin with account number generation
  app.post("/api/admin/create-admin", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser || currentUser.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { name, username, password, email, shopName, referredBy } = req.body;
      
      if (!name || !username || !password || !shopName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const accountNumber = await storage.generateAccountNumber();

      // Create admin user
      const admin = await storage.createUser({
        name,
        username,
        password: hashedPassword,
        email,
        role: 'admin',
        accountNumber,
        referredBy: referredBy && typeof referredBy === 'number' ? referredBy : undefined,
      });

      // Create shop for admin
      const shop = await storage.createShop({
        name: shopName,
        adminId: admin.id,
      });

      // Update admin with shop assignment
      await storage.updateUser(admin.id, { shopId: shop.id });

      res.json({ 
        admin: { ...admin, password: undefined }, 
        shop,
        accountNumber 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Get profit sharing calculation for a game amount
  app.post("/api/calculate-profits", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { gameAmount, shopId } = req.body;
      
      if (!gameAmount || !shopId) {
        return res.status(400).json({ message: "Missing required data" });
      }

      const profits = await storage.calculateProfitSharing(gameAmount, shopId);
      res.json(profits);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate profits" });
    }
  });

  // Get referral earnings for an admin
  app.get("/api/referrals/earnings", async (req, res) => {
    try {
      const user = req.session.user;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const referredAdmins = await storage.getAdminsByReferrer(user.id);
      
      // Get referral bonus transactions
      const transactions = await storage.getTransactionsByEmployee(user.id);
      const referralBonuses = transactions.filter(t => t.type === 'referral_bonus');
      
      const totalEarnings = referralBonuses.reduce((sum, t) => sum + parseFloat(t.amount), 0);

      res.json({
        referredAdmins: referredAdmins.length,
        totalEarnings: totalEarnings.toFixed(2),
        recentBonuses: referralBonuses.slice(0, 10)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral earnings" });
    }
  });

  // Get all admins for super admin
  app.get("/api/admin/all-admins", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'super_admin') {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const admins = await storage.getUsers();
      const adminUsers = admins.filter(u => u.role === 'admin');
      
      // Remove passwords from response
      const safeAdmins = adminUsers.map(admin => ({
        ...admin,
        password: undefined
      }));

      res.json(safeAdmins);
    } catch (error) {
      res.status(500).json({ message: "Failed to get admins" });
    }
  });

  // Admin creates employee
  app.post("/api/admin/create-employee", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { name, username, password, email } = req.body;
      
      if (!name || !username || !password) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create employee user
      const employee = await storage.createUser({
        name,
        username,
        password: hashedPassword,
        email: email || null,
        role: 'employee',
        shopId: user.shopId!,
      });

      res.json({ 
        employee: { ...employee, password: undefined }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Get admin's employees
  app.get("/api/admin/employees", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // For super admin, return all employees; for admin, return only their shop's employees
      let employees;
      if (user.role === 'super_admin') {
        const allUsers = await storage.getUsers();
        employees = allUsers.filter(u => u.role === 'employee');
      } else {
        if (!user.shopId) {
          return res.status(400).json({ message: "Admin not assigned to a shop" });
        }
        const shopUsers = await storage.getUsersByShop(user.shopId);
        employees = shopUsers.filter(u => u.role === 'employee');
      }
      
      // Remove passwords from response
      const safeEmployees = employees.map(emp => ({
        ...emp,
        password: undefined
      }));

      res.json(safeEmployees);
    } catch (error) {
      res.status(500).json({ message: "Failed to get employees" });
    }
  });

  // Get admin's shop statistics
  app.get("/api/admin/shop-stats", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // For super admin, return aggregate stats; for admin, return their shop's stats
      if (user.role === 'super_admin') {
        // Return aggregate stats across all shops
        const allShops = await storage.getShops();
        const totalRevenue = allShops.reduce((sum, shop) => sum + parseFloat(shop.totalRevenue || "0"), 0);
        const totalGames = allShops.reduce((sum, shop) => sum + (shop.totalGames || 0), 0);
        const totalPlayers = allShops.reduce((sum, shop) => sum + (shop.totalPlayers || 0), 0);
        
        res.json({
          totalRevenue: totalRevenue.toFixed(2),
          totalGames,
          totalPlayers
        });
      } else {
        if (!user.shopId) {
          return res.status(400).json({ message: "Admin not assigned to a shop" });
        }

        const shopStats = await storage.getShopStats(user.shopId);
        res.json(shopStats);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get shop statistics" });
    }
  });

  // Credit management routes
  
  // Get credit balance
  app.get("/api/credit/balance", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const balance = await storage.getCreditBalance(userId);
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: "Failed to get credit balance" });
    }
  });

  // Load credit request
  app.post("/api/credit/load", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { amount, paymentMethod, bankAccount } = req.body;
      
      if (!amount || !paymentMethod || !bankAccount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const creditLoad = await storage.createCreditLoad({
        adminId: userId,
        amount: amount.toString(),
        paymentMethod,
        bankAccount,
        status: "pending"
      });

      res.json(creditLoad);
    } catch (error) {
      res.status(500).json({ message: "Failed to create credit load request" });
    }
  });

  // Transfer credit
  app.post("/api/credit/transfer", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { amount, toAdminId } = req.body;
      
      if (!amount || !toAdminId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if recipient exists and is an admin
      const recipient = await storage.getUser(parseInt(toAdminId));
      if (!recipient || recipient.role !== 'admin') {
        return res.status(400).json({ message: "Invalid recipient" });
      }

      // Check sender's balance
      const senderBalance = parseFloat(await storage.getCreditBalance(userId));
      const transferAmount = parseFloat(amount);
      
      if (senderBalance < transferAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const transfer = await storage.createCreditTransfer({
        fromAdminId: userId,
        toAdminId: parseInt(toAdminId),
        amount: amount.toString()
      });

      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to transfer credit" });
    }
  });

  return httpServer;
}
