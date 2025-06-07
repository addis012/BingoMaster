import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'super_admin', 'admin', 'employee'
  name: text("name").notNull(),
  email: text("email"),
  isBlocked: boolean("is_blocked").default(false),
  shopId: integer("shop_id").references(() => shops.id),
  creditBalance: decimal("credit_balance", { precision: 12, scale: 2 }).default("0.00"), // Admin credit balance
  accountNumber: text("account_number").unique(), // Unique bank-like account number for Admins
  referredBy: integer("referred_by").references(() => users.id), // Admin who referred this admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adminId: integer("admin_id").references(() => users.id),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("20.00"), // Admin cut from employee collections
  superAdminCommission: decimal("super_admin_commission", { precision: 5, scale: 2 }).default("25.00"), // Super admin cut from admin
  referralCommission: decimal("referral_commission", { precision: 5, scale: 2 }).default("3.00"), // Referral bonus percentage
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  status: text("status").notNull(), // 'waiting', 'active', 'completed', 'cancelled'
  prizePool: decimal("prize_pool", { precision: 10, scale: 2 }).default("0.00"),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).notNull(),
  calledNumbers: jsonb("called_numbers").$type<string[]>().default([]),
  winnerId: integer("winner_id").references(() => gamePlayers.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gamePlayers = pgTable("game_players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  playerName: text("player_name").notNull(),
  cartelaNumbers: jsonb("cartela_numbers").$type<number[]>().notNull(),
  entryFee: decimal("entry_fee", { precision: 10, scale: 2 }).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id),
  shopId: integer("shop_id").references(() => shops.id),
  employeeId: integer("employee_id").references(() => users.id),
  adminId: integer("admin_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'entry_fee', 'prize_payout', 'admin_profit', 'super_admin_commission', 'credit_load', 'credit_transfer', 'referral_bonus'
  description: text("description"),
  referenceId: text("reference_id"), // For tracking external payments like Telebirr
  fromUserId: integer("from_user_id").references(() => users.id), // For credit transfers
  toUserId: integer("to_user_id").references(() => users.id), // For credit transfers
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").references(() => games.id).notNull(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  totalCollected: decimal("total_collected", { precision: 10, scale: 2 }).notNull(),
  prizeAmount: decimal("prize_amount", { precision: 10, scale: 2 }).notNull(),
  adminProfit: decimal("admin_profit", { precision: 10, scale: 2 }).notNull(),
  superAdminCommission: decimal("super_admin_commission", { precision: 10, scale: 2 }).notNull(),
  playerCount: integer("player_count").notNull(),
  winnerName: text("winner_name"),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const commissionPayments = pgTable("commission_payments", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull(), // 'YYYY-MM' format
  paidAt: timestamp("paid_at").defaultNow(),
  status: text("status").notNull(), // 'pending', 'paid', 'overdue'
});

// Credit transfers between admins
export const creditTransfers = pgTable("credit_transfers", {
  id: serial("id").primaryKey(),
  fromAdminId: integer("from_admin_id").references(() => users.id).notNull(),
  toAdminId: integer("to_admin_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("completed"), // 'pending', 'completed', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit load requests and confirmations
export const creditLoads = pgTable("credit_loads", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // 'telebirr', 'bank_transfer', 'cash'
  referenceNumber: text("reference_number"), // External payment reference
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'rejected'
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by").references(() => users.id), // Super admin who processed
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  shop: one(shops, {
    fields: [users.shopId],
    references: [shops.id],
  }),
  managedShop: one(shops, {
    fields: [users.id],
    references: [shops.adminId],
  }),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
  games: many(games),
  transactions: many(transactions),
  creditTransfersFrom: many(creditTransfers, { relationName: "fromAdmin" }),
  creditTransfersTo: many(creditTransfers, { relationName: "toAdmin" }),
  creditLoads: many(creditLoads),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  admin: one(users, {
    fields: [shops.adminId],
    references: [users.id],
  }),
  employees: many(users),
  games: many(games),
  transactions: many(transactions),
  commissionPayments: many(commissionPayments),
}));

export const gamesRelations = relations(games, ({ one, many }) => ({
  shop: one(shops, {
    fields: [games.shopId],
    references: [shops.id],
  }),
  employee: one(users, {
    fields: [games.employeeId],
    references: [users.id],
  }),
  players: many(gamePlayers),
  winner: one(gamePlayers, {
    fields: [games.winnerId],
    references: [gamePlayers.id],
  }),
  transactions: many(transactions),
}));

export const gamePlayersRelations = relations(gamePlayers, ({ one }) => ({
  game: one(games, {
    fields: [gamePlayers.gameId],
    references: [games.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  game: one(games, {
    fields: [transactions.gameId],
    references: [games.id],
  }),
  shop: one(shops, {
    fields: [transactions.shopId],
    references: [shops.id],
  }),
  employee: one(users, {
    fields: [transactions.employeeId],
    references: [users.id],
  }),
}));

export const commissionPaymentsRelations = relations(commissionPayments, ({ one }) => ({
  shop: one(shops, {
    fields: [commissionPayments.shopId],
    references: [shops.id],
  }),
}));

export const gameHistoryRelations = relations(gameHistory, ({ one }) => ({
  game: one(games, {
    fields: [gameHistory.gameId],
    references: [games.id],
  }),
  shop: one(shops, {
    fields: [gameHistory.shopId],
    references: [shops.id],
  }),
  employee: one(users, {
    fields: [gameHistory.employeeId],
    references: [users.id],
  }),
}));

export const creditTransfersRelations = relations(creditTransfers, ({ one }) => ({
  fromAdmin: one(users, {
    fields: [creditTransfers.fromAdminId],
    references: [users.id],
    relationName: "fromAdmin",
  }),
  toAdmin: one(users, {
    fields: [creditTransfers.toAdminId], 
    references: [users.id],
    relationName: "toAdmin",
  }),
}));

export const creditLoadsRelations = relations(creditLoads, ({ one }) => ({
  admin: one(users, {
    fields: [creditLoads.adminId],
    references: [users.id],
  }),
  processor: one(users, {
    fields: [creditLoads.processedBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertShopSchema = createInsertSchema(shops).omit({
  id: true,
  createdAt: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertGamePlayerSchema = createInsertSchema(gamePlayers).omit({
  id: true,
  registeredAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: z.string(),
});

export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments, {
  amount: z.string(),
});

export const insertGameHistorySchema = createInsertSchema(gameHistory, {
  totalRevenue: z.string(),
  prizeAmount: z.string(),
  adminProfit: z.string(),
  superAdminCommission: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type InsertGamePlayer = z.infer<typeof insertGamePlayerSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type CommissionPayment = typeof commissionPayments.$inferSelect;
export type InsertCommissionPayment = z.infer<typeof insertCommissionPaymentSchema>;
export type GameHistory = typeof gameHistory.$inferSelect;
export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;

// Credit system types
export const insertCreditTransferSchema = createInsertSchema(creditTransfers, {
  amount: z.string(),
});

export const insertCreditLoadSchema = createInsertSchema(creditLoads, {
  amount: z.string(),
});

export type CreditTransfer = typeof creditTransfers.$inferSelect;
export type InsertCreditTransfer = z.infer<typeof insertCreditTransferSchema>;
export type CreditLoad = typeof creditLoads.$inferSelect;
export type InsertCreditLoad = z.infer<typeof insertCreditLoadSchema>;
