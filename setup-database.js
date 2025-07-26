#!/usr/bin/env node

/**
 * Database Setup Script for BingoMaster
 * 
 * This script initializes the database with the required users and shops
 * when you pull the code to a new Replit environment.
 * 
 * Run this script after pulling the code to set up all login credentials.
 */

const bcrypt = require('bcrypt');
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

// Neon WebSocket configuration
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function setupDatabase() {
  console.log('🔧 Setting up BingoMaster database...');

  try {
    // Hash the passwords
    console.log('🔐 Generating password hashes...');
    const password123456 = await hashPassword('123456');
    const passwordSuperAdmin = await hashPassword('a1e2y3t4h5');

    console.log('✅ Password hashes generated');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE shops RESTART IDENTITY CASCADE');
    
    console.log('✅ Existing data cleared');

    // Insert shops first
    console.log('🏪 Creating shops...');
    const shopQuery = `
      INSERT INTO shops (id, name, address, admin_id, profit_margin) VALUES
      (2, 'Main Shop', 'Addis Ababa', 1, '30.00'),
      (3, 'Branch Shop A', 'Bahir Dar', 1, '25.00'),
      (4, 'Branch Shop B', 'Dire Dawa', 1, '25.00'),
      (5, 'Adad Shop', 'Hawassa', 1, '30.00')
    `;
    await pool.query(shopQuery);
    console.log('✅ Shops created');

    // Insert users with correct password hashes
    console.log('👥 Creating users...');
    const userQuery = `
      INSERT INTO users (
        id, username, password, role, name, shop_id, supervisor_id, 
        credit_balance, commission_rate, created_at, email, is_blocked
      ) VALUES
      (1, 'admin', $1, 'admin', 'Administrator', 2, NULL, '50000.00', '15.00', NOW(), NULL, false),
      (2, 'superadmin', $2, 'superadmin', 'Super Admin', NULL, NULL, '500000.00', '5.00', NOW(), NULL, false),
      (14, 'adad', $3, 'employee', 'addisu', 5, NULL, '0.00', '25.00', NOW(), NULL, false),
      (15, 'collector1', $4, 'collector', 'Collector 1', 5, 14, NULL, '30.00', NOW(), NULL, false),
      (16, 'collector2', $5, 'collector', 'Collector 2', 5, 14, NULL, '30.00', NOW(), NULL, false),
      (17, 'collector3', $6, 'collector', 'Collector 3', 5, 18, NULL, '30.00', NOW(), NULL, false),
      (18, 'alex1', $7, 'employee', 'Alex Employee', 5, NULL, '0.00', '25.00', NOW(), NULL, false),
      (19, 'collector4', $8, 'collector', 'Collector 4', 5, 20, NULL, '30.00', NOW(), NULL, false),
      (20, 'kal1', $9, 'employee', 'Kal Employee', 5, NULL, '0.00', '25.00', NOW(), NULL, false)
    `;

    await pool.query(userQuery, [
      password123456,    // admin
      passwordSuperAdmin, // superadmin
      password123456,    // adad
      password123456,    // collector1
      password123456,    // collector2
      password123456,    // collector3
      password123456,    // alex1
      password123456,    // collector4
      password123456     // kal1
    ]);

    console.log('✅ Users created');

    // Verify the setup
    console.log('🔍 Verifying setup...');
    const result = await pool.query('SELECT username, role, name FROM users ORDER BY id');
    
    console.log('\n📋 Created Users:');
    console.log('='.repeat(50));
    result.rows.forEach(user => {
      console.log(`• ${user.username.padEnd(12)} (${user.role.padEnd(10)}) - ${user.name}`);
    });

    console.log('\n🔐 Login Credentials:');
    console.log('='.repeat(50));
    console.log('• superadmin / a1e2y3t4h5 (Super Admin)');
    console.log('• admin / 123456 (Admin)');
    console.log('• adad / 123456 (Employee)');
    console.log('• collector1 / 123456 (Collector under adad)');
    console.log('• collector2 / 123456 (Collector under adad)');
    console.log('• collector3 / 123456 (Collector under alex1)');
    console.log('• collector4 / 123456 (Collector under kal1)');
    console.log('• alex1 / 123456 (Employee)');
    console.log('• kal1 / 123456 (Employee)');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('🌐 You can now log in to your BingoMaster application.');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();