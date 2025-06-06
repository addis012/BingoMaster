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
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  adminId: integer("admin_id").references(() => users.id),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("0.00"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0.00"),
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
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'entry_fee', 'prize_payout', 'commission'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commissionPayments = pgTable("commission_payments", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shops.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  period: text("period").notNull(), // 'YYYY-MM' format
  paidAt: timestamp("paid_at").defaultNow(),
  status: text("status").notNull(), // 'pending', 'paid', 'overdue'
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
  games: many(games),
  transactions: many(transactions),
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

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments).omit({
  id: true,
  paidAt: true,
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
