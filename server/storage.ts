import { 
  users, shops, games, gamePlayers, transactions, commissionPayments, gameHistory,
  creditTransfers, creditLoads, referralCommissions, withdrawalRequests,
  type User, type InsertUser, type Shop, type InsertShop, 
  type Game, type InsertGame, type GamePlayer, type InsertGamePlayer,
  type Transaction, type InsertTransaction, type CommissionPayment, type InsertCommissionPayment,
  type GameHistory, type InsertGameHistory, type CreditTransfer, type InsertCreditTransfer,
  type CreditLoad, type InsertCreditLoad, type ReferralCommission, type InsertReferralCommission,
  type WithdrawalRequest, type InsertWithdrawalRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, gte, lte, sum, count } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
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
  
  // Game History methods
  createGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  getGameHistory(shopId: number, startDate?: Date, endDate?: Date): Promise<GameHistory[]>;
  
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
      winnerName: gameHistory.winnerName,
      completedAt: gameHistory.completedAt,
      winnerId: games.winnerId,
      winningCartela: gamePlayers.cartelaNumbers
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

  async getShopStats(shopId: number, startDate?: Date, endDate?: Date): Promise<{
    totalRevenue: string;
    totalGames: number;
    totalPlayers: number;
  }> {
    let transactionQuery = db.select({
      total: sum(transactions.amount).as('total')
    }).from(transactions).where(and(
      eq(transactions.shopId, shopId),
      eq(transactions.type, 'entry_fee')
    ));

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
        eq(transactions.type, 'entry_fee'),
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

  async getCreditTransfers(adminId: number): Promise<CreditTransfer[]> {
    return await db.select().from(creditTransfers)
      .where(or(
        eq(creditTransfers.fromAdminId, adminId),
        eq(creditTransfers.toAdminId, adminId)
      ))
      .orderBy(desc(creditTransfers.createdAt));
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

    const profits = await this.calculateProfitSharing(totalCollected, game.shopId);
    
    // CORRECT LOGIC: Deduct super admin's commission from admin's credit balance
    // Admin keeps their profit but pays super admin commission from their credit
    await this.updateCreditBalance(shop.adminId!, profits.superAdminCommission, 'subtract');
    
    // Update shop revenue (this represents the money actually collected)
    const newTotalRevenue = (parseFloat(shop.totalRevenue || "0") + parseFloat(totalCollected)).toFixed(2);
    console.log(`Updating shop ${game.shopId} revenue to ${newTotalRevenue}`);
    
    // Create transaction records
    await this.createTransaction({
      gameId,
      shopId: game.shopId,
      employeeId: game.employeeId,
      adminId: shop.adminId!,
      type: 'game_collection',
      amount: totalCollected,
      description: `Game ${gameId} collection by employee`,
    });

    await this.createTransaction({
      gameId,
      shopId: game.shopId,
      employeeId: null,
      adminId: shop.adminId!,
      type: 'super_admin_commission',
      amount: `-${profits.superAdminCommission}`,
      description: `Super admin commission deducted for game ${gameId}`,
    });

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
}

export const storage = new DatabaseStorage();
