import { 
  users, shops, games, gamePlayers, transactions, commissionPayments, gameHistory,
  creditTransfers, creditLoads, referralCommissions, withdrawalRequests,
  superAdminRevenues, dailyRevenueSummary, employeeProfitMargins,
  cartelas, customCartelas,
  type User, type InsertUser, type Shop, type InsertShop, 
  type Game, type InsertGame, type GamePlayer, type InsertGamePlayer,
  type Transaction, type InsertTransaction, type CommissionPayment, type InsertCommissionPayment,
  type GameHistory, type InsertGameHistory, type CreditTransfer, type InsertCreditTransfer,
  type CreditLoad, type InsertCreditLoad, type ReferralCommission, type InsertReferralCommission,
  type WithdrawalRequest, type InsertWithdrawalRequest,
  type SuperAdminRevenue, type InsertSuperAdminRevenue,
  type DailyRevenueSummary, type InsertDailyRevenueSummary,
  type EmployeeProfitMargin, type InsertEmployeeProfitMargin,
  type CustomCartela, type InsertCustomCartela
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sum, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByShopId(shopId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  updateUserBalance(id: number, balance: string): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
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
  updateGameStatus(gameId: number, status: string): Promise<Game>;
  updateGameNumbers(gameId: number, calledNumbers: string[]): Promise<Game>;
  updateGamePrizePool(gameId: number, additionalAmount: number): Promise<Game>;
  completeGame(gameId: number, winnerId: number, prizeAmount: string): Promise<Game>;
  
  // Game Player methods
  getGamePlayers(gameId: number): Promise<GamePlayer[]>;
  getGamePlayerCount(gameId: number): Promise<number>;
  createGamePlayer(player: InsertGamePlayer): Promise<GamePlayer>;
  addGamePlayer(player: InsertGamePlayer): Promise<GamePlayer>;
  updateGamePlayer(id: number, updates: Partial<InsertGamePlayer>): Promise<GamePlayer | undefined>;
  removeGamePlayer(id: number): Promise<boolean>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByShop(shopId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  getTransactionsByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]>;
  
  // Commission methods
  createCommissionPayment(payment: InsertCommissionPayment): Promise<CommissionPayment>;
  getCommissionPayments(shopId: number): Promise<CommissionPayment[]>;
  
  // Game History methods
  createGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  recordGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  getGameHistory(shopId: number, startDate?: Date, endDate?: Date): Promise<GameHistory[]>;
  getEmployeeGameHistory(employeeId: number, startDate?: Date, endDate?: Date): Promise<GameHistory[]>;
  
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

  // Credit system methods
  getCreditBalance(adminId: number): Promise<string>;
  updateCreditBalance(adminId: number, amount: string, operation: 'add' | 'subtract'): Promise<void>;
  createCreditTransfer(transfer: InsertCreditTransfer): Promise<CreditTransfer>;
  getCreditTransfers(adminId: number): Promise<CreditTransfer[]>;
  createCreditLoad(load: InsertCreditLoad): Promise<CreditLoad>;
  getCreditLoads(adminId?: number, status?: string): Promise<CreditLoad[]>;
  processCreditLoad(loadId: number, status: 'confirmed' | 'rejected', processedBy: number): Promise<CreditLoad>;
  
  // Profit sharing and referral methods
  calculateProfitSharing(gameAmount: string, shopId: number): Promise<{
    adminProfit: string;
    superAdminCommission: string;
    prizeAmount: string;
    referralBonus?: string;
  }>;
  processGameProfits(gameId: number, totalCollected: string): Promise<void>;
  generateAccountNumber(): Promise<string>;
  getAdminsByReferrer(referrerId: number): Promise<User[]>;
  
  // Referral commission methods
  createReferralCommission(commission: InsertReferralCommission): Promise<ReferralCommission>;
  getReferralCommissions(referrerId: number): Promise<ReferralCommission[]>;
  processReferralCommission(commissionId: number, action: 'withdraw' | 'convert_to_credit'): Promise<ReferralCommission>;
  calculateReferralCommission(sourceAmount: string, commissionRate: string): string;
  
  // Withdrawal and conversion methods
  createWithdrawalRequest(request: {
    adminId: number;
    amount: string;
    bankAccount: string;
    type: string;
    status: string;
  }): Promise<any>;
  convertCommissionToCredit(adminId: number, amount: number): Promise<any>;
  
  // Super Admin revenue tracking methods
  createSuperAdminRevenue(revenue: InsertSuperAdminRevenue): Promise<SuperAdminRevenue>;
  getSuperAdminRevenues(dateFrom?: string, dateTo?: string): Promise<SuperAdminRevenue[]>;
  getSuperAdminRevenuesByDate(date: string): Promise<SuperAdminRevenue[]>;
  getTotalSuperAdminRevenue(dateFrom?: string, dateTo?: string): Promise<string>;
  
  // Daily revenue summary methods
  createOrUpdateDailyRevenueSummary(summary: InsertDailyRevenueSummary): Promise<DailyRevenueSummary>;
  getDailyRevenueSummary(date: string): Promise<DailyRevenueSummary | undefined>;
  getDailyRevenueSummaries(dateFrom?: string, dateTo?: string): Promise<DailyRevenueSummary[]>;
  
  // Employee profit margin methods
  setEmployeeProfitMargin(margin: InsertEmployeeProfitMargin): Promise<EmployeeProfitMargin>;
  getEmployeeProfitMarginsByAdmin(adminId: number): Promise<any[]>;
  updateEmployeeProfitMargin(marginId: number, profitMargin: string, adminId: number): Promise<EmployeeProfitMargin>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  // Collector methods
  markCartelaByCollector(cartelaId: number, collectorId: number): Promise<void>;
  unmarkCartelaByCollector(cartelaId: number, collectorId: number): Promise<void>;
  unmarkAllCartelasByCollector(collectorId: number): Promise<void>;
  getCollectorStats(collectorId: number): Promise<any>;
  getCollectorsByEmployee(employeeId: number): Promise<User[]>;
  
  // Employee cartela marking methods
  markCartelaByEmployee(cartelaId: number, employeeId: number): Promise<void>;
  unmarkCartelaByEmployee(cartelaId: number, employeeId: number): Promise<void>;
  
  // Game reset methods
  resetCartelasForShop(shopId: number): Promise<void>;
  
  // EAT time zone utility methods
  getCurrentEATDate(): string;
  performDailyReset(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      console.log("Database user found:", user ? `${user.username} (id: ${user.id})` : "none");
      return user || undefined;
    } catch (error) {
      console.error("Database error in getUserByUsername:", error);
      throw error;
    }
  }

  async getUserByAccountNumber(accountNumber: string): Promise<User | undefined> {
    try {
      console.log("Looking up user by account number:", accountNumber);
      const [user] = await db.select().from(users).where(eq(users.accountNumber, accountNumber));
      console.log("Found user:", user ? `${user.username} (id: ${user.id})` : "none");
      return user || undefined;
    } catch (error) {
      console.error("Database error in getUserByAccountNumber:", error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async getUsersByShop(shopId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.shopId, shopId));
  }

  async getUserByShopId(shopId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.shopId, shopId), eq(users.role, 'admin')));
    return user || undefined;
  }

  async updateUserBalance(id: number, balance: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ creditBalance: balance }).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
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
        or(
          eq(games.status, 'waiting'),
          eq(games.status, 'pending'),
          eq(games.status, 'active')
        )
      ))
      .orderBy(desc(games.id));
    return game || undefined;
  }

  async getActiveGameByShop(shopId: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games)
      .where(and(
        eq(games.shopId, shopId),
        or(
          eq(games.status, 'waiting'),
          eq(games.status, 'pending'),
          eq(games.status, 'active'),
          eq(games.status, 'paused')
        )
      ))
      .orderBy(desc(games.id));
    return game || undefined;
  }

  async getRecentGamesByShop(shopId: number, hoursBack: number = 1): Promise<Game[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
    
    const recentGames = await db.select().from(games)
      .where(and(
        eq(games.shopId, shopId),
        gte(games.createdAt, cutoffTime)
      ))
      .orderBy(desc(games.id));
    return recentGames;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async updateGame(id: number, updates: Partial<InsertGame>): Promise<Game | undefined> {
    const [game] = await db.update(games).set(updates).where(eq(games.id, id)).returning();
    return game || undefined;
  }

  async updateGameStatus(gameId: number, status: string): Promise<Game> {
    const [game] = await db.update(games)
      .set({ status, startedAt: status === 'active' ? new Date() : undefined })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async updateGameNumbers(gameId: number, calledNumbers: string[]): Promise<Game> {
    // Get current game to check if it's paused
    const currentGame = await this.getGame(gameId);
    if (currentGame && currentGame.status === 'paused' && calledNumbers.length > 0) {
      // Only block if trying to ADD numbers to a paused game
      // Allow clearing numbers (reset operation) even for paused games
      throw new Error('Cannot add numbers to paused game');
    }
    
    const [game] = await db.update(games)
      .set({ calledNumbers })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async updateGamePrizePool(gameId: number, additionalAmount: number): Promise<Game> {
    const currentGame = await this.getGame(gameId);
    if (!currentGame) throw new Error('Game not found');
    
    const newPrizePool = (parseFloat(currentGame.prizePool) + additionalAmount).toString();
    const [game] = await db.update(games)
      .set({ prizePool: newPrizePool })
      .where(eq(games.id, gameId))
      .returning();
    return game;
  }

  async completeGame(gameId: number, winnerId: number, prizeAmount: string): Promise<Game> {
    const [game] = await db.update(games)
      .set({ 
        status: 'completed',
        winnerId,
        completedAt: new Date()
      })
      .where(eq(games.id, gameId))
      .returning();
    return game;
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

  async addGamePlayer(insertPlayer: InsertGamePlayer): Promise<GamePlayer> {
    return this.createGamePlayer(insertPlayer);
  }

  async getGamePlayerCount(gameId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, gameId));
    return result[0]?.count || 0;
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
    if (startDate && endDate) {
      return await db.select().from(transactions).where(and(
        eq(transactions.shopId, shopId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      )).orderBy(desc(transactions.createdAt));
    }
    
    return await db.select().from(transactions)
      .where(eq(transactions.shopId, shopId))
      .orderBy(desc(transactions.createdAt));
  }

  async getTransactionsByEmployee(employeeId: number, startDate?: Date, endDate?: Date): Promise<Transaction[]> {
    if (startDate && endDate) {
      return await db.select().from(transactions).where(and(
        eq(transactions.employeeId, employeeId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate)
      )).orderBy(desc(transactions.createdAt));
    }
    
    return await db.select().from(transactions)
      .where(eq(transactions.employeeId, employeeId))
      .orderBy(desc(transactions.createdAt));
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

  async createGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const [history] = await db.insert(gameHistory).values(insertHistory).returning();
    return history;
  }

  async recordGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    return this.createGameHistory(insertHistory);
  }

  async getGameHistory(shopId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.select({
      id: gameHistory.id,
      gameId: gameHistory.gameId,
      shopId: gameHistory.shopId,
      employeeId: gameHistory.employeeId,
      totalCollected: gameHistory.totalCollected,
      prizeAmount: gameHistory.prizeAmount,
      adminProfit: gameHistory.adminProfit,
      superAdminCommission: gameHistory.superAdminCommission,
      playerCount: gameHistory.playerCount,
      winnerName: gamePlayers.playerName,
      completedAt: gameHistory.completedAt,
      winnerId: games.winnerId,
      winningCartela: gameHistory.winningCartela
    })
    .from(gameHistory)
    .leftJoin(games, eq(gameHistory.gameId, games.id))
    .leftJoin(gamePlayers, eq(games.winnerId, gamePlayers.id))
    .where(eq(gameHistory.shopId, shopId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(gameHistory.shopId, shopId),
        gte(gameHistory.completedAt, startDate),
        lte(gameHistory.completedAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(gameHistory.completedAt));
  }

  async getEmployeeGameHistory(employeeId: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    let query = db.select({
      id: gameHistory.id,
      gameId: gameHistory.gameId,
      shopId: gameHistory.shopId,
      employeeId: gameHistory.employeeId,
      totalCollected: gameHistory.totalCollected,
      prizeAmount: gameHistory.prizeAmount,
      adminProfit: gameHistory.adminProfit,
      superAdminCommission: gameHistory.superAdminCommission,
      playerCount: gameHistory.playerCount,
      winnerName: gamePlayers.playerName,
      completedAt: gameHistory.completedAt,
      winnerId: games.winnerId,
      winningCartela: gameHistory.winningCartela
    })
    .from(gameHistory)
    .leftJoin(games, eq(gameHistory.gameId, games.id))
    .leftJoin(gamePlayers, eq(games.winnerId, gamePlayers.id))
    .where(eq(gameHistory.employeeId, employeeId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(gameHistory.employeeId, employeeId),
        gte(gameHistory.completedAt, startDate),
        lte(gameHistory.completedAt, endDate)
      ));
    }
    
    return await query.orderBy(desc(gameHistory.completedAt));
  }

  async getShopStats(shopId: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: string;
    totalGames: number;
    totalPlayers: number;
  }> {
    // Use game history for revenue calculation to avoid duplicates
    let revenueQuery = db.select({
      total: sum(gameHistory.totalCollected).as('total')
    }).from(gameHistory).where(eq(gameHistory.shopId, shopId));

    let gameQuery = db.select({
      count: count().as('count')
    }).from(games).where(eq(games.shopId, shopId));

    let playerQuery = db.select({
      count: count().as('count')
    }).from(gamePlayers)
      .leftJoin(games, eq(gamePlayers.gameId, games.id))
      .where(eq(games.shopId, shopId));

    if (startDate && endDate) {
      revenueQuery = revenueQuery.where(and(
        eq(gameHistory.shopId, shopId),
        gte(gameHistory.completedAt, startDate),
        lte(gameHistory.completedAt, endDate)
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

    const [revenueResult] = await revenueQuery;
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

  // Credit system methods
  async getCreditBalance(adminId: number): Promise<string> {
    const [user] = await db.select({ creditBalance: users.creditBalance })
      .from(users)
      .where(eq(users.id, adminId));
    return user?.creditBalance || "0.00";
  }

  async updateCreditBalance(adminId: number, amount: string, operation: 'add' | 'subtract'): Promise<void> {
    const currentBalance = await this.getCreditBalance(adminId);
    const currentAmount = parseFloat(currentBalance);
    const changeAmount = parseFloat(amount);
    
    const newBalance = operation === 'add' 
      ? currentAmount + changeAmount 
      : currentAmount - changeAmount;

    await db.update(users)
      .set({ creditBalance: newBalance.toFixed(2) })
      .where(eq(users.id, adminId));
  }

  async createCreditTransfer(transferData: { fromAdminId: number; toAdminId: number; amount: string; description?: string }): Promise<CreditTransfer> {
    try {
      // Update balances first
      await this.updateCreditBalance(transferData.fromAdminId, transferData.amount, 'subtract');
      await this.updateCreditBalance(transferData.toAdminId, transferData.amount, 'add');
      
      // Create credit transfer record
      const [creditTransfer] = await db.insert(creditTransfers).values({
        fromAdminId: transferData.fromAdminId,
        toAdminId: transferData.toAdminId,
        amount: transferData.amount,
        description: transferData.description || '',
        status: 'completed'
      }).returning();

      return creditTransfer as CreditTransfer;
    } catch (error) {
      console.error('Credit transfer error:', error);
      throw error;
    }
  }

  async getCreditTransfers(adminId: number): Promise<any[]> {
    const results = await db.select({
      id: creditTransfers.id,
      fromAdminId: creditTransfers.fromAdminId,
      toAdminId: creditTransfers.toAdminId,
      amount: creditTransfers.amount,
      description: creditTransfers.description,
      status: creditTransfers.status,
      createdAt: creditTransfers.createdAt,
    })
    .from(creditTransfers)
    .where(or(
      eq(creditTransfers.fromAdminId, adminId),
      eq(creditTransfers.toAdminId, adminId)
    ))
    .orderBy(desc(creditTransfers.createdAt));

    // Enrich with admin details
    const enrichedResults = [];
    for (const transfer of results) {
      const [fromAdmin] = await db.select({
        name: users.name,
        username: users.username,
        accountNumber: users.accountNumber,
      }).from(users).where(eq(users.id, transfer.fromAdminId));

      const [toAdmin] = await db.select({
        name: users.name,
        username: users.username,
        accountNumber: users.accountNumber,
      }).from(users).where(eq(users.id, transfer.toAdminId));

      enrichedResults.push({
        ...transfer,
        fromAdmin,
        toAdmin
      });
    }

    return enrichedResults;
  }

  async createCreditLoad(load: InsertCreditLoad): Promise<CreditLoad> {
    const [creditLoad] = await db.insert(creditLoads).values(load).returning();
    return creditLoad;
  }

  async getCreditLoads(adminId?: number, status?: string): Promise<CreditLoad[]> {
    let query = db.select({
      id: creditLoads.id,
      adminId: creditLoads.adminId,
      amount: creditLoads.amount,
      paymentMethod: creditLoads.paymentMethod,
      referenceNumber: creditLoads.referenceNumber,
      transferScreenshot: creditLoads.transferScreenshot,
      adminAccountNumber: creditLoads.adminAccountNumber,
      notes: creditLoads.notes,
      status: creditLoads.status,
      requestedAt: creditLoads.requestedAt,
      processedAt: creditLoads.processedAt,
      processedBy: creditLoads.processedBy,
      admin: {
        id: users.id,
        name: users.name,
        username: users.username,
        accountNumber: users.accountNumber,
      }
    }).from(creditLoads)
    .leftJoin(users, eq(creditLoads.adminId, users.id));
    
    const conditions = [];
    if (adminId) conditions.push(eq(creditLoads.adminId, adminId));
    if (status) conditions.push(eq(creditLoads.status, status));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(creditLoads.requestedAt));
  }

  async processCreditLoad(loadId: number, status: 'confirmed' | 'rejected', processedBy: number): Promise<CreditLoad> {
    const [load] = await db.select().from(creditLoads).where(eq(creditLoads.id, loadId));
    
    if (!load) {
      throw new Error('Credit load not found');
    }

    const [updatedLoad] = await db.update(creditLoads)
      .set({
        status,
        processedAt: new Date(),
        processedBy,
      })
      .where(eq(creditLoads.id, loadId))
      .returning();

    if (status === 'confirmed') {
      // Add credit to admin's balance
      await this.updateCreditBalance(load.adminId, load.amount, 'add');
      
      // Get admin's shop ID for the transaction
      const admin = await this.getUser(load.adminId);
      
      // Create transaction record
      await this.createTransaction({
        type: 'credit_load',
        amount: load.amount,
        description: `Credit loaded via ${load.paymentMethod}`,
        referenceId: load.referenceNumber,
        adminId: load.adminId,
        shopId: admin?.shopId || null,
        employeeId: null,
        gameId: null,
        fromUserId: null,
        toUserId: load.adminId,
      });

      // Check if admin has a referrer and create referral commission
      if (admin && admin.referredBy) {
        const commissionRate = "3.00"; // 3% commission
        const commissionAmount = this.calculateReferralCommission(load.amount, commissionRate);
        
        await this.createReferralCommission({
          referrerId: admin.referredBy,
          referredId: load.adminId,
          sourceType: 'credit_load',
          sourceId: loadId,
          sourceAmount: load.amount,
          commissionRate,
          commissionAmount,
          status: 'pending'
        });
      }
    }

    return updatedLoad;
  }

  async calculateProfitSharing(gameAmount: string, shopId: number): Promise<{
    adminProfit: string;
    superAdminCommission: string;
    prizeAmount: string;
    referralBonus?: string;
  }> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId));
    
    if (!shop) {
      throw new Error('Shop not found');
    }

    const totalAmount = parseFloat(gameAmount);
    const profitMarginPercent = parseFloat(shop.profitMargin);
    const superAdminCommissionPercent = parseFloat(shop.superAdminCommission);
    
    // Calculate admin profit (admin's cut from total collected)
    const adminProfit = (totalAmount * profitMarginPercent) / 100;
    
    // Calculate super admin commission (super admin's cut from admin profit)
    const superAdminCommission = (adminProfit * superAdminCommissionPercent) / 100;
    
    // Calculate prize amount (remaining after admin cut)
    const prizeAmount = totalAmount - adminProfit;

    const result = {
      adminProfit: adminProfit.toFixed(2),
      superAdminCommission: superAdminCommission.toFixed(2),
      prizeAmount: prizeAmount.toFixed(2),
    };

    // Check for referral bonus
    const [admin] = await db.select().from(users).where(eq(users.id, shop.adminId!));
    if (admin?.referredBy) {
      const referralCommissionPercent = parseFloat(shop.referralCommission);
      const referralBonus = (adminProfit * referralCommissionPercent) / 100;
      result.referralBonus = referralBonus.toFixed(2);
    }

    return result;
  }

  async processGameProfits(gameId: number, totalCollected: string): Promise<void> {
    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) return;

    const [shop] = await db.select().from(shops).where(eq(shops.id, game.shopId));
    if (!shop) return;

    const [admin] = await db.select().from(users).where(eq(users.id, shop.adminId!));
    if (!admin) return;

    const profits = await this.calculateProfitSharing(totalCollected, game.shopId);
    
    // CORRECT LOGIC: Deduct super admin's commission from admin's credit balance
    // Admin keeps their profit but pays super admin commission from their credit
    await this.updateCreditBalance(shop.adminId!, profits.superAdminCommission, 'subtract');
    
    // Update shop revenue (this represents the money actually collected)
    const newTotalRevenue = (parseFloat(shop.totalRevenue || "0") + parseFloat(totalCollected)).toFixed(2);
    console.log(`Updating shop ${game.shopId} revenue to ${newTotalRevenue}`);
    
    // Create transaction records
    const gameTransaction = await this.createTransaction({
      gameId,
      shopId: game.shopId,
      employeeId: game.employeeId,
      adminId: shop.adminId!,
      type: 'game_collection',
      amount: totalCollected,
      description: `Game ${gameId} collection by employee`,
    });

    const commissionTransaction = await this.createTransaction({
      gameId,
      shopId: game.shopId,
      employeeId: null,
      adminId: shop.adminId!,
      type: 'super_admin_commission',
      amount: `-${profits.superAdminCommission}`,
      description: `Super admin commission deducted for game ${gameId}`,
    });

    // Log Super Admin Revenue - THIS WAS MISSING!
    const currentDate = this.getCurrentEATDate();
    await this.createSuperAdminRevenue({
      adminId: shop.adminId!,
      adminName: admin.name || admin.username,
      shopId: game.shopId,
      shopName: shop.name,
      gameId: gameId,
      transactionId: commissionTransaction.id,
      revenueType: 'game_commission',
      amount: profits.superAdminCommission,
      commissionRate: admin.commissionRate || "15.00",
      sourceAmount: totalCollected,
      description: `Game commission from ${admin.name || admin.username} - Game ${gameId}`,
      dateEAT: currentDate,
    });

    console.log(`✅ Super Admin revenue logged: ${profits.superAdminCommission} ETB from game ${gameId}`);

    // Process referral bonus if applicable
    if (profits.referralBonus) {
      const [admin] = await db.select().from(users).where(eq(users.id, shop.adminId!));
      if (admin?.referredBy) {
        await this.updateCreditBalance(admin.referredBy, profits.referralBonus, 'add');
        
        await this.createTransaction({
          gameId,
          shopId: null,
          employeeId: null,
          adminId: admin.referredBy,
          type: 'referral_bonus',
          amount: profits.referralBonus,
          description: `Referral bonus for game ${gameId}`,
        });
      }
    }
  }

  async generateAccountNumber(): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BGO${timestamp}${random}`;
  }

  async getAdminsByReferrer(referrerId: number): Promise<User[]> {
    return await db.select().from(users)
      .where(and(
        eq(users.referredBy, referrerId),
        eq(users.role, 'admin')
      ));
  }

  // Referral commission methods
  async createReferralCommission(commission: InsertReferralCommission): Promise<ReferralCommission> {
    const [created] = await db.insert(referralCommissions).values(commission).returning();
    return created;
  }

  async getReferralCommissions(referrerId: number): Promise<ReferralCommission[]> {
    return await db.select().from(referralCommissions).where(eq(referralCommissions.referrerId, referrerId));
  }

  async processReferralCommission(commissionId: number, action: 'withdraw' | 'convert_to_credit'): Promise<ReferralCommission> {
    const status = action === 'withdraw' ? 'paid' : 'converted_to_credit';
    const [updated] = await db.update(referralCommissions)
      .set({ status, processedAt: new Date() })
      .where(eq(referralCommissions.id, commissionId))
      .returning();
    return updated;
  }

  calculateReferralCommission(sourceAmount: string, commissionRate: string): string {
    const amount = parseFloat(sourceAmount);
    const rate = parseFloat(commissionRate);
    return (amount * rate / 100).toFixed(2);
  }

  async createWithdrawalRequest(request: {
    adminId: number;
    amount: string;
    bankAccount: string;
    type: string;
    status: string;
  }): Promise<any> {
    const [created] = await db.insert(withdrawalRequests).values({
      adminId: request.adminId,
      amount: request.amount,
      bankAccount: request.bankAccount,
      type: request.type,
      status: request.status,
    }).returning();
    return created;
  }

  async getAllWithdrawalRequests(): Promise<any[]> {
    return await db.select({
      id: withdrawalRequests.id,
      adminId: withdrawalRequests.adminId,
      amount: withdrawalRequests.amount,
      bankAccount: withdrawalRequests.bankAccount,
      type: withdrawalRequests.type,
      status: withdrawalRequests.status,
      createdAt: withdrawalRequests.createdAt,
      processedAt: withdrawalRequests.processedAt,
      processedBy: withdrawalRequests.processedBy,
      rejectionReason: withdrawalRequests.rejectionReason,
      adminName: users.name,
    })
    .from(withdrawalRequests)
    .leftJoin(users, eq(withdrawalRequests.adminId, users.id))
    .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getWithdrawalRequestsByAdmin(adminId: number): Promise<any[]> {
    return await db.select().from(withdrawalRequests)
      .where(eq(withdrawalRequests.adminId, adminId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async approveWithdrawalRequest(requestId: number, processedBy: number): Promise<void> {
    const [request] = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, requestId));
    
    if (!request || request.status !== 'pending') {
      throw new Error('Invalid withdrawal request');
    }

    // Update request status
    await db.update(withdrawalRequests)
      .set({ 
        status: 'approved', 
        processedAt: new Date(), 
        processedBy 
      })
      .where(eq(withdrawalRequests.id, requestId));

    // If it's a credit balance withdrawal, deduct from admin's credit
    if (request.type === 'credit_balance') {
      await this.updateCreditBalance(request.adminId, request.amount, 'subtract');
    } else if (request.type === 'referral_commission') {
      // Mark corresponding commissions as paid
      const commissionAmount = parseFloat(request.amount);
      const commissions = await db.select().from(referralCommissions)
        .where(and(
          eq(referralCommissions.referrerId, request.adminId),
          eq(referralCommissions.status, 'pending')
        ))
        .orderBy(referralCommissions.createdAt);

      let remainingAmount = commissionAmount;
      for (const commission of commissions) {
        if (remainingAmount <= 0) break;
        
        const commissionValue = parseFloat(commission.commissionAmount);
        if (commissionValue <= remainingAmount) {
          // Full commission can be paid
          await db.update(referralCommissions)
            .set({ status: 'paid', processedAt: new Date() })
            .where(eq(referralCommissions.id, commission.id));
          remainingAmount -= commissionValue;
        } else if (remainingAmount > 0) {
          // Partial payment - split the commission
          // Update original commission to paid amount
          await db.update(referralCommissions)
            .set({ 
              commissionAmount: remainingAmount.toFixed(2),
              status: 'paid', 
              processedAt: new Date() 
            })
            .where(eq(referralCommissions.id, commission.id));
          
          // Create new commission record for remaining amount
          const remainingCommission = commissionValue - remainingAmount;
          await db.insert(referralCommissions).values({
            referrerId: commission.referrerId,
            referredId: commission.referredId,
            sourceType: commission.sourceType,
            sourceId: commission.sourceId,
            sourceAmount: commission.sourceAmount,
            commissionRate: commission.commissionRate,
            commissionAmount: remainingCommission.toFixed(2),
            status: 'pending'
          });
          
          remainingAmount = 0;
        }
      }
    }
  }

  async rejectWithdrawalRequest(requestId: number, processedBy: number, rejectionReason: string): Promise<void> {
    await db.update(withdrawalRequests)
      .set({ 
        status: 'rejected', 
        processedAt: new Date(), 
        processedBy,
        rejectionReason 
      })
      .where(eq(withdrawalRequests.id, requestId));
  }

  async convertCommissionToCredit(adminId: number, amount: number): Promise<any> {
    // Get pending commissions for validation
    const commissions = await db.select().from(referralCommissions)
      .where(and(
        eq(referralCommissions.referrerId, adminId),
        eq(referralCommissions.status, 'pending')
      ))
      .orderBy(referralCommissions.createdAt);

    const totalPendingCommissions = commissions.reduce((sum, c) => sum + parseFloat(c.commissionAmount), 0);
    
    if (amount > totalPendingCommissions) {
      throw new Error('Insufficient commission balance');
    }

    // Get current credit balance
    const currentBalance = await this.getCreditBalance(adminId);
    
    // Update admin's credit balance
    await this.updateCreditBalance(adminId, amount.toString(), 'add');
    
    // Process commissions for conversion (handle partial conversions)
    let remainingAmount = amount;
    for (const commission of commissions) {
      if (remainingAmount <= 0) break;
      
      const commissionValue = parseFloat(commission.commissionAmount);
      
      if (commissionValue <= remainingAmount) {
        // Convert entire commission
        await db.update(referralCommissions)
          .set({ status: 'converted_to_credit', processedAt: new Date() })
          .where(eq(referralCommissions.id, commission.id));
        remainingAmount -= commissionValue;
      } else {
        // Partial conversion - split the commission
        // Create a new record for the converted amount
        await db.insert(referralCommissions).values({
          referrerId: commission.referrerId,
          referredId: commission.referredId,
          sourceType: commission.sourceType,
          sourceId: commission.sourceId,
          sourceAmount: commission.sourceAmount,
          commissionRate: commission.commissionRate,
          commissionAmount: remainingAmount.toFixed(2),
          status: 'converted_to_credit',
          createdAt: commission.createdAt,
          processedAt: new Date()
        });
        
        // Update the original commission to show remaining amount
        const remainingCommission = (commissionValue - remainingAmount).toFixed(2);
        await db.update(referralCommissions)
          .set({ commissionAmount: remainingCommission })
          .where(eq(referralCommissions.id, commission.id));
        
        remainingAmount = 0;
      }
    }
    
    const newBalance = (parseFloat(currentBalance) + amount).toFixed(2);
    
    return {
      success: true,
      message: "Commission converted to credit successfully",
      previousBalance: currentBalance,
      newBalance: newBalance,
      convertedAmount: amount.toString()
    };
  }

  // Credit load approval with referral commission (3%)
  async approveCreditLoadRequest(requestId: number, processedBy: number): Promise<void> {
    const [request] = await db.select().from(creditLoadRequests)
      .where(eq(creditLoadRequests.id, requestId));
    
    if (!request) {
      throw new Error("Credit load request not found");
    }

    // Get admin details to check for referrer
    const [admin] = await db.select().from(users)
      .where(eq(users.id, request.adminId));

    // Update admin's credit balance
    await db.update(users)
      .set({ 
        creditBalance: sql`${users.creditBalance} + ${request.amount}` 
      })
      .where(eq(users.id, request.adminId));

    // Create referral commission if admin has a referrer (3% of credit load)
    if (admin?.referredBy) {
      const commissionAmount = this.calculateReferralCommission(request.amount, "3.00");
      await this.createReferralCommission({
        referrerId: admin.referredBy,
        referredId: admin.id,
        sourceType: 'credit_load',
        sourceId: requestId,
        sourceAmount: request.amount,
        commissionRate: "3.00",
        commissionAmount,
        status: 'pending'
      });
    }

    // Mark request as approved
    await db.update(creditLoadRequests)
      .set({ 
        status: 'approved', 
        processedAt: new Date(), 
        processedBy 
      })
      .where(eq(creditLoadRequests.id, requestId));
  }

  async rejectCreditLoadRequest(requestId: number, processedBy: number, rejectionReason: string): Promise<void> {
    await db.update(creditLoadRequests)
      .set({ 
        status: 'rejected', 
        processedAt: new Date(), 
        processedBy,
        rejectionReason 
      })
      .where(eq(creditLoadRequests.id, requestId));
  }

  // Super Admin revenue tracking methods
  async createSuperAdminRevenue(revenue: InsertSuperAdminRevenue): Promise<SuperAdminRevenue> {
    const [createdRevenue] = await db
      .insert(superAdminRevenues)
      .values(revenue)
      .returning();
    return createdRevenue;
  }

  async getSuperAdminRevenues(dateFrom?: string, dateTo?: string, adminId?: number): Promise<SuperAdminRevenue[]> {
    let query = db.select().from(superAdminRevenues);

    const conditions = [];
    
    if (dateFrom && dateTo) {
      conditions.push(
        and(
          gte(superAdminRevenues.dateEAT, dateFrom),
          lte(superAdminRevenues.dateEAT, dateTo)
        )
      );
    } else if (dateFrom) {
      conditions.push(gte(superAdminRevenues.dateEAT, dateFrom));
    } else if (dateTo) {
      conditions.push(lte(superAdminRevenues.dateEAT, dateTo));
    }

    if (adminId) {
      conditions.push(eq(superAdminRevenues.adminId, adminId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(superAdminRevenues.createdAt));
  }

  async getSuperAdminRevenuesByDate(date: string): Promise<SuperAdminRevenue[]> {
    return await db
      .select()
      .from(superAdminRevenues)
      .where(eq(superAdminRevenues.dateEAT, date))
      .orderBy(desc(superAdminRevenues.createdAt));
  }

  async getTotalSuperAdminRevenue(dateFrom?: string, dateTo?: string): Promise<string> {
    let query = db
      .select({ total: sum(superAdminRevenues.amount) })
      .from(superAdminRevenues);

    if (dateFrom && dateTo) {
      query = query.where(
        and(
          gte(superAdminRevenues.dateEAT, dateFrom),
          lte(superAdminRevenues.dateEAT, dateTo)
        )
      );
    } else if (dateFrom) {
      query = query.where(gte(superAdminRevenues.dateEAT, dateFrom));
    } else if (dateTo) {
      query = query.where(lte(superAdminRevenues.dateEAT, dateTo));
    }

    const [result] = await query;
    return result?.total || "0.00";
  }

  // Daily revenue summary methods
  async createOrUpdateDailyRevenueSummary(summary: InsertDailyRevenueSummary): Promise<DailyRevenueSummary> {
    const existing = await this.getDailyRevenueSummary(summary.date);
    
    if (existing) {
      const [updated] = await db
        .update(dailyRevenueSummary)
        .set({
          ...summary,
          updatedAt: new Date(),
        })
        .where(eq(dailyRevenueSummary.date, summary.date))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dailyRevenueSummary)
        .values(summary)
        .returning();
      return created;
    }
  }

  async getDailyRevenueSummary(date: string): Promise<DailyRevenueSummary | undefined> {
    const [summary] = await db
      .select()
      .from(dailyRevenueSummary)
      .where(eq(dailyRevenueSummary.date, date));
    return summary || undefined;
  }

  async getDailyRevenueSummaries(dateFrom?: string, dateTo?: string): Promise<DailyRevenueSummary[]> {
    let query = db.select().from(dailyRevenueSummary);

    if (dateFrom && dateTo) {
      query = query.where(
        and(
          gte(dailyRevenueSummary.date, dateFrom),
          lte(dailyRevenueSummary.date, dateTo)
        )
      );
    } else if (dateFrom) {
      query = query.where(gte(dailyRevenueSummary.date, dateFrom));
    } else if (dateTo) {
      query = query.where(lte(dailyRevenueSummary.date, dateTo));
    }

    return await query.orderBy(desc(dailyRevenueSummary.date));
  }

  // EAT time zone utility methods
  getCurrentEATDate(): string {
    const now = new Date();
    const eatTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
    return eatTime.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  async performDailyReset(): Promise<void> {
    const today = this.getCurrentEATDate();
    
    // Get today's total revenue for super admin
    const totalSuperAdminRevenue = await this.getTotalSuperAdminRevenue(today, today);
    
    // Get total games played today
    const gamesQuery = await db
      .select({ count: count() })
      .from(gameHistory)
      .where(
        eq(
          db.select({ date: "DATE(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa')" }).from(gameHistory),
          today
        )
      );
    
    const totalGames = gamesQuery[0]?.count || 0;
    
    // Calculate total players from today's games
    const playersQuery = await db
      .select({ total: sum(gameHistory.playerCount) })
      .from(gameHistory)
      .where(
        eq(
          db.select({ date: "DATE(completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Addis_Ababa')" }).from(gameHistory),
          today
        )
      );
    
    const totalPlayers = parseInt(playersQuery[0]?.total || "0");
    
    // Create or update daily summary
    await this.createOrUpdateDailyRevenueSummary({
      date: today,
      totalSuperAdminRevenue,
      totalAdminRevenue: "0.00", // Calculate from admin profits
      totalGamesPlayed: totalGames,
      totalPlayersRegistered: totalPlayers,
    });
  }

  // Employee profit margin methods
  async setEmployeeProfitMargin(margin: InsertEmployeeProfitMargin): Promise<EmployeeProfitMargin> {
    const [result] = await db
      .insert(employeeProfitMargins)
      .values(margin)
      .onConflictDoUpdate({
        target: [employeeProfitMargins.employeeId, employeeProfitMargins.shopId],
        set: { profitMargin: margin.profitMargin }
      })
      .returning();
    return result;
  }

  async getEmployeeProfitMarginsByAdmin(adminId: number): Promise<any[]> {
    const result = await db
      .select({
        id: employeeProfitMargins.id,
        employeeId: employeeProfitMargins.employeeId,
        shopId: employeeProfitMargins.shopId,
        profitMargin: employeeProfitMargins.profitMargin,
        employeeName: users.name,
        employeeUsername: users.username,
        shopName: shops.name
      })
      .from(employeeProfitMargins)
      .leftJoin(users, eq(employeeProfitMargins.employeeId, users.id))
      .leftJoin(shops, eq(employeeProfitMargins.shopId, shops.id))
      .where(eq(shops.adminId, adminId));
    return result;
  }

  async updateEmployeeProfitMargin(marginId: number, profitMargin: string, adminId: number): Promise<EmployeeProfitMargin> {
    // Verify ownership through shop admin
    const [result] = await db
      .update(employeeProfitMargins)
      .set({ profitMargin })
      .from(shops)
      .where(
        and(
          eq(employeeProfitMargins.id, marginId),
          eq(employeeProfitMargins.shopId, shops.id),
          eq(shops.adminId, adminId)
        )
      )
      .returning();
    return result;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  // Admin management methods for Super Admin
  async getAdminUsers(): Promise<Array<User & { shopName?: string }>> {
    const adminUsers = await db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      role: users.role,
      name: users.name,
      email: users.email,
      isBlocked: users.isBlocked,
      shopId: users.shopId,
      creditBalance: users.creditBalance,
      accountNumber: users.accountNumber,
      referredBy: users.referredBy,
      createdAt: users.createdAt,
      shopName: shops.name,
    })
    .from(users)
    .leftJoin(shops, eq(users.shopId, shops.id))
    .where(eq(users.role, 'admin'))
    .orderBy(desc(users.createdAt));

    return adminUsers;
  }

  async createAdminUser(adminData: any): Promise<User> {
    const accountNumber = await this.generateAccountNumber();
    
    // Create shop first with auto-generated ID
    const [newShop] = await db.insert(shops).values({
      name: adminData.shopName,
      profitMargin: "20.00",
      superAdminCommission: adminData.commissionRate || "15.00",
      referralCommission: adminData.referralCommissionRate || "5.00", // Use provided rate or default to 5%
      isBlocked: false,
      totalRevenue: "0.00"
    }).returning();

    // Create admin and link to shop
    const [newAdmin] = await db.insert(users).values({
      username: adminData.username,
      password: adminData.password, // Should be hashed in real implementation
      role: 'admin',
      name: adminData.name,
      email: adminData.email || `${adminData.username}@shop.local`,
      shopId: newShop.id,
      creditBalance: adminData.initialCredit || "0.00",
      accountNumber,
      referredBy: adminData.referredBy ? parseInt(adminData.referredBy) : null,
      isBlocked: false,
    }).returning();

    // Update shop to link back to admin
    await db.update(shops)
      .set({ adminId: newAdmin.id })
      .where(eq(shops.id, newShop.id));

    // Create initial referral commission entry if admin has a referrer
    if (adminData.referredBy) {
      const referralCommissionRate = adminData.referralCommissionRate || "5.00"; // Default 5% if not specified
      await db.insert(referralCommissions).values({
        referrerId: parseInt(adminData.referredBy),
        referredId: newAdmin.id,
        sourceType: 'admin_signup',
        sourceId: newAdmin.id,
        sourceAmount: "0.00",
        commissionRate: referralCommissionRate,
        commissionAmount: "0.00",
        status: 'pending'
      });
    }

    return { ...newAdmin, shopName: newShop.name };
  }

  // Referral system methods for Super Admin
  async getAllReferralCommissions(): Promise<any[]> {
    return await db.select({
      id: referralCommissions.id,
      referrerId: referralCommissions.referrerId,
      referrerName: users.name,
      commissionAmount: referralCommissions.commissionAmount,
      sourceAmount: referralCommissions.sourceAmount,
      status: referralCommissions.status,
      createdAt: referralCommissions.createdAt,
      processedAt: referralCommissions.processedAt,
    })
    .from(referralCommissions)
    .leftJoin(users, eq(referralCommissions.referrerId, users.id))
    .orderBy(desc(referralCommissions.createdAt));
  }

  async getReferralSettings(): Promise<any> {
    // In a real implementation, this would come from a settings table
    // For now, returning default values that can be configured
    return {
      referralCommissionRate: "5.00", // 5% commission on referred admin's profits
      minimumPayoutAmount: "100.00", // Minimum amount to withdraw
      autoApproveCommissions: false, // Whether to auto-approve small amounts
    };
  }

  async updateReferralSettings(settings: any): Promise<void> {
    // In a real implementation, this would update a settings table
    // For now, we'll just log the update
    console.log("Referral settings updated:", settings);
  }

  // Block/unblock employees based on admin status
  async blockEmployeesByAdmin(adminId: number): Promise<void> {
    // Get the admin's shop first
    const admin = await this.getUser(adminId);
    if (!admin || !admin.shopId) return;

    // Block all employees in this shop
    await db.update(users)
      .set({ isBlocked: true })
      .where(and(
        eq(users.shopId, admin.shopId),
        eq(users.role, 'employee')
      ));
  }

  async unblockEmployeesByAdmin(adminId: number): Promise<void> {
    // Get the admin's shop first
    const admin = await this.getUser(adminId);
    if (!admin || !admin.shopId) return;

    // Unblock all employees in this shop
    await db.update(users)
      .set({ isBlocked: false })
      .where(and(
        eq(users.shopId, admin.shopId),
        eq(users.role, 'employee')
      ));
  }

  // Custom cartela methods implementation
  async getCustomCartelas(shopId: number): Promise<CustomCartela[]> {
    return await db.select().from(customCartelas)
      .where(eq(customCartelas.shopId, shopId))
      .orderBy(customCartelas.cartelaNumber);
  }

  async getCustomCartela(id: number): Promise<CustomCartela | undefined> {
    const [cartela] = await db.select().from(customCartelas).where(eq(customCartelas.id, id));
    return cartela;
  }

  async getCartelaByNumber(shopId: number, cartelaNumber: number): Promise<any | null> {
    // First check cartelas table (where new cartelas are added)
    const cartelasResults = await db.select().from(cartelas).where(
      and(eq(cartelas.shopId, shopId), eq(cartelas.cartelaNumber, cartelaNumber))
    ).limit(1);
    
    if (cartelasResults.length > 0) {
      const cartela = cartelasResults[0];
      const parsedPattern = typeof cartela.pattern === 'string' ? JSON.parse(cartela.pattern) : cartela.pattern;
      return {
        ...cartela,
        pattern: parsedPattern,
        numbers: Array.isArray(parsedPattern) ? parsedPattern.flat() : [],
      };
    }
    
    // Then check customCartelas table as fallback
    const customResults = await db.select().from(customCartelas).where(
      and(eq(customCartelas.shopId, shopId), eq(customCartelas.cartelaNumber, cartelaNumber))
    ).limit(1);
    
    if (customResults.length === 0) return null;
    
    const cartela = customResults[0];
    return {
      ...cartela,
      pattern: typeof cartela.pattern === 'string' ? JSON.parse(cartela.pattern) : cartela.pattern,
      numbers: cartela.pattern.flat(),
    };
  }

  async createCustomCartela(cartela: InsertCustomCartela): Promise<CustomCartela> {
    const [newCartela] = await db.insert(customCartelas).values(cartela).returning();
    return newCartela;
  }

  async updateCustomCartela(id: number, updates: Partial<InsertCustomCartela>): Promise<CustomCartela | undefined> {
    const [updatedCartela] = await db.update(customCartelas)
      .set(updates)
      .where(eq(customCartelas.id, id))
      .returning();
    return updatedCartela;
  }

  async deleteCustomCartela(id: number): Promise<boolean> {
    const result = await db.delete(customCartelas).where(eq(customCartelas.id, id));
    return result.rowCount > 0;
  }

  async markCartelaByCollector(cartelaId: number, collectorId: number): Promise<void> {
    // Check if cartela is already marked by an employee
    const existingCartela = await db.select().from(cartelas).where(eq(cartelas.id, cartelaId)).limit(1);
    
    if (existingCartela.length > 0 && existingCartela[0].bookedBy !== null) {
      throw new Error('Cartela is already marked by an employee');
    }
    
    await db.update(cartelas)
      .set({
        collectorId,
        markedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(cartelas.id, cartelaId));
  }

  async unmarkCartelaByCollector(cartelaId: number, collectorId: number): Promise<void> {
    await db.update(cartelas)
      .set({
        collectorId: null,
        markedAt: null,
        updatedAt: new Date()
      })
      .where(and(
        eq(cartelas.id, cartelaId),
        eq(cartelas.collectorId, collectorId)
      ));
  }

  async unmarkAllCartelasByCollector(collectorId: number): Promise<void> {
    await db.update(cartelas)
      .set({
        collectorId: null,
        markedAt: null,
        updatedAt: new Date()
      })
      .where(eq(cartelas.collectorId, collectorId));
  }

  async resetShopCartelas(shopId: number): Promise<void> {
    await db.update(cartelas)
      .set({
        collectorId: null,
        markedAt: null,
        isBooked: false,
        bookedBy: null,
        gameId: null,
        updatedAt: new Date()
      })
      .where(eq(cartelas.shopId, shopId));
  }

  async getCollectorStats(collectorId: number): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // Total cartelas marked by this collector
    const totalMarked = await db.select({ count: count() })
      .from(cartelas)
      .where(eq(cartelas.collectorId, collectorId));
    
    // Today's marked cartelas
    const todayMarked = await db.select({ count: count() })
      .from(cartelas)
      .where(and(
        eq(cartelas.collectorId, collectorId),
        gte(cartelas.markedAt, new Date(today))
      ));

    // Get collector's shop to count available cartelas
    const collector = await this.getUser(collectorId);
    if (!collector?.shopId) {
      return { totalMarked: 0, todayMarked: 0, availableCartelas: 0, bookedCartelas: 0 };
    }

    // Available cartelas in the shop
    const availableCartelas = await db.select({ count: count() })
      .from(cartelas)
      .where(and(
        eq(cartelas.shopId, collector.shopId),
        eq(cartelas.isBooked, false),
        eq(cartelas.collectorId, null)
      ));

    // Booked cartelas in the shop
    const bookedCartelas = await db.select({ count: count() })
      .from(cartelas)
      .where(and(
        eq(cartelas.shopId, collector.shopId),
        eq(cartelas.isBooked, true)
      ));

    return {
      totalMarked: totalMarked[0]?.count || 0,
      todayMarked: todayMarked[0]?.count || 0,
      availableCartelas: availableCartelas[0]?.count || 0,
      bookedCartelas: bookedCartelas[0]?.count || 0
    };
  }

  async getCollectorsByEmployee(employeeId: number): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(and(
        eq(users.supervisorId, employeeId),
        eq(users.role, 'collector')
      ));
  }

  async markCartelaByEmployee(cartelaId: number, employeeId: number): Promise<void> {
    // Check if cartela is already marked by a collector
    const existingCartela = await db.select().from(cartelas).where(eq(cartelas.id, cartelaId)).limit(1);
    
    if (existingCartela.length > 0 && existingCartela[0].collectorId !== null) {
      throw new Error('Cartela is already marked by a collector');
    }
    
    await db.update(cartelas)
      .set({
        bookedBy: employeeId,
        isBooked: true,
        updatedAt: new Date()
      })
      .where(eq(cartelas.id, cartelaId));
  }

  async unmarkCartelaByEmployee(cartelaId: number, employeeId: number): Promise<void> {
    await db.update(cartelas)
      .set({
        bookedBy: null,
        isBooked: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(cartelas.id, cartelaId),
        eq(cartelas.bookedBy, employeeId)
      ));
  }

  async resetCartelasForShop(shopId: number): Promise<void> {
    console.log(`🔄 RESET: Clearing all cartela selections for shop ${shopId}`);
    
    // Clear all cartela bookings and selections for this shop
    await db.update(cartelas)
      .set({
        isBooked: false,
        bookedBy: null,
        collectorId: null,
        updatedAt: new Date()
      })
      .where(eq(cartelas.shopId, shopId));
      
    console.log(`✅ RESET: All cartela selections cleared for shop ${shopId}`);
  }
}

export const storage = new DatabaseStorage();
