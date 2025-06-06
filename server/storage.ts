import { 
  users, shops, games, gamePlayers, transactions, commissionPayments,
  type User, type InsertUser, type Shop, type InsertShop, 
  type Game, type InsertGame, type GamePlayer, type InsertGamePlayer,
  type Transaction, type InsertTransaction, type CommissionPayment, type InsertCommissionPayment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, sum, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getUsersByShop(shopId: number): Promise<User[]>;
  
  // Shop methods
  getShop(id: number): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop | undefined>;
  getShopsByAdmin(adminId: number): Promise<Shop[]>;
  
  // Game methods
  getGame(id: number): Promise<Game | undefined>;
  getGamesByShop(shopId: number): Promise<Game[]>;
  getActiveGameByEmployee(employeeId: number): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, updates: Partial<InsertGame>): Promise<Game | undefined>;
  
  // Game Player methods
  getGamePlayers(gameId: number): Promise<GamePlayer[]>;
  createGamePlayer(player: InsertGamePlayer): Promise<GamePlayer>;
  updateGamePlayer(id: number, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined>;
  removeGamePlayer(id: number): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByShop(shopId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  getTransactionsByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  
  // Commission methods
  createCommissionPayment(payment: InsertCommissionPayment): Promise<CommissionPayment>;
  getCommissionPayments(shopId: number): Promise<CommissionPayment[]>;
  
  // Analytics methods
  getShopStats(shopId: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: string;
    totalGames: number;
    totalPlayers: number;
  }>;
  getEmployeeStats(employeeId: number, startDate?: Date, endDate?: Date): Promise<{
    totalCollections: string;
    gamesCompleted: number;
    playersRegistered: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getUsersByShop(shopId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.shopId, shopId));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop || undefined;
  }

  async getShops(): Promise<Shop[]> {
    return await db.select().from(shops).orderBy(desc(shops.createdAt));
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const [shop] = await db.insert(shops).values(insertShop).returning();
    return shop;
  }

  async updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop | undefined> {
    const [shop] = await db.update(shops).set(updates).where(eq(shops.id, id)).returning();
    return shop || undefined;
  }

  async getShopsByAdmin(adminId: number): Promise<Shop[]> {
    return await db.select().from(shops).where(eq(shops.adminId, adminId));
  }

  async getGame(id: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || undefined;
  }

  async getGamesByShop(shopId: number): Promise<Game[]> {
    return await db.select().from(games)
      .where(eq(games.shopId, shopId))
      .orderBy(desc(games.createdAt));
  }

  async getActiveGameByEmployee(employeeId: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games)
      .where(and(
        eq(games.employeeId, employeeId),
        eq(games.status, 'waiting')
      ));
    return game || undefined;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async updateGame(id: number, updates: Partial<InsertGame>): Promise<Game | undefined> {
    const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return game || undefined;
  }

  async getGamePlayers(gameId: number): Promise<GamePlayer[]> {
    return await db.select().from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId))
      .orderBy(desc(gamePlayers.registeredAt));
  }

  async createGamePlayer(insertPlayer: InsertGamePlayer): Promise<GamePlayer> {
    const [player] = await db.insert(gamePlayers).values(insertPlayer).returning();
    return player;
  }

  async updateGamePlayer(id: number, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined> {
    const [player] = await db.update(gamePlayers).set(updates).where(eq(gamePlayers.id, id)).returning();
    return player || undefined;
  }

  async removeGamePlayer(id: number): Promise<boolean> {
    const result = await db.delete(gamePlayers).where(eq(gamePlayers.id, id));
    return result.rowCount > 0;
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async getTransactionsByShop(shopId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    let query = db.select().from(transactions).where(eq(transactions.shopId, shopId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(transactions.shopId, shopId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    let query = db.select().from(transactions).where(eq(transactions.employeeId, employeeId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(transactions.employeeId, employeeId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(transactions.createdAt));
  }

  async createCommissionPayment(insertPayment: InsertCommissionPayment): Promise<CommissionPayment> {
    const [payment] = await db.insert(commissionPayments).values(insertPayment).returning();
    return payment;
  }

  async getCommissionPayments(shopId: number): Promise<CommissionPayment[]> {
    return await db.select().from(commissionPayments)
      .where(eq(commissionPayments.shopId, shopId))
      .orderBy(desc(commissionPayments.paidAt));
  }

  async getShopStats(shopId: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: string;
    totalGames: number;
    totalPlayers: number;
  }> {
    let transactionQuery = db.select({
      total: sum(transactions.amount).as('total')
    }).from(transactions).where(eq(transactions.shopId, shopId));

    let gameQuery = db.select({
      count: count().as('count')
    }).from(games).where(eq(games.shopId, shopId));

    let playerQuery = db.select({
      count: count().as('count')
    }).from(gamePlayers)
      .leftJoin(games, eq(gamePlayers.gameId, games.id))
      .where(eq(games.shopId, shopId));

    if (startDate && endDate) {
      transactionQuery = transactionQuery.where(and(
        eq(transactions.shopId, shopId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));

      gameQuery = gameQuery.where(and(
        eq(games.shopId, shopId),
        gte(games.createdAt, startDate),
        lte(games.createdAt, endDate)
      ));

      playerQuery = playerQuery.where(and(
        eq(games.shopId, shopId),
        gte(gamePlayers.registeredAt, startDate),
        lte(gamePlayers.registeredAt, endDate)
      ));
    }

    const [revenueResult] = await transactionQuery;
    const [gamesResult] = await gameQuery;
    const [playersResult] = await playerQuery;

    return {
      totalRevenue: revenueResult.total || "0",
      totalGames: gamesResult.count || 0,
      totalPlayers: playersResult.count || 0,
    };
  }

  async getEmployeeStats(employeeId: number, startDate?: Date, endDate?: Date): Promise<{
    totalCollections: string;
    gamesCompleted: number;
    playersRegistered: number;
  }> {
    let transactionQuery = db.select({
      total: sum(transactions.amount).as('total')
    }).from(transactions)
      .where(and(
        eq(transactions.employeeId, employeeId),
        eq(transactions.type, 'entry_fee')
      ));

    let gameQuery = db.select({
      count: count().as('count')
    }).from(games)
      .where(and(
        eq(games.employeeId, employeeId),
        eq(games.status, 'completed')
      ));

    let playerQuery = db.select({
      count: count().as('count')
    }).from(gamePlayers)
      .leftJoin(games, eq(gamePlayers.gameId, games.id))
      .where(eq(games.employeeId, employeeId));

    if (startDate && endDate) {
      transactionQuery = transactionQuery.where(and(
        eq(transactions.employeeId, employeeId),
        eq(transactions.type, 'entry_fee'),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      ));

      gameQuery = gameQuery.where(and(
        eq(games.employeeId, employeeId),
        eq(games.status, 'completed'),
        gte(games.createdAt, startDate),
        lte(games.createdAt, endDate)
      ));

      playerQuery = playerQuery.where(and(
        eq(games.employeeId, employeeId),
        gte(gamePlayers.registeredAt, startDate),
        lte(gamePlayers.registeredAt, endDate)
      ));
    }

    const [collectionsResult] = await transactionQuery;
    const [gamesResult] = await gameQuery;
    const [playersResult] = await playerQuery;

    return {
      totalCollections: collectionsResult.total || "0",
      gamesCompleted: gamesResult.count || 0,
      playersRegistered: playersResult.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
