import type { Express, Request } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
      res.status(500).json({ message: "Login failed" });
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
      
      const game = await storage.updateGame(gameId, {
        status: 'completed',
        winnerId,
        completedAt: new Date(),
      });

      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Create prize payout transaction
      const prizeAmount = parseFloat(game.prizePool || "0");
      await storage.createTransaction({
        gameId,
        shopId: game.shopId,
        employeeId: game.employeeId,
        amount: prizeAmount.toString(),
        type: 'prize_payout',
        description: `Prize payout for game ${gameId}`,
      });

      // Notify WebSocket clients
      const clients = gameClients.get(gameId);
      if (clients) {
        const message = JSON.stringify({ type: 'game_completed', game, winnerId });
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }

      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to declare winner" });
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

  return httpServer;
}
