# BingoMaster Database Setup

When you pull this code to a new Replit environment, the database will be empty and none of the login credentials will work. Follow these steps to set up the database with all required users:

## Quick Setup

1. **Make sure you have a PostgreSQL database provisioned** (Replit will create one automatically)

2. **Run the database setup script:**
   ```bash
   node setup-database.js
   ```

3. **Push the database schema:**
   ```bash
   npm run db:push
   ```

That's it! Your database is now set up with all the required users and shops.

## Login Credentials

After running the setup script, you can log in with these credentials:

### Admin Users
- **superadmin** / **a1e2y3t4h5** (Super Admin - full system access)
- **admin** / **123456** (Shop Admin - manages shops and employees)

### Employee Users  
- **adad** / **123456** (Employee - can run games and manage collectors)
- **alex1** / **123456** (Employee - can run games and manage collectors)
- **kal1** / **123456** (Employee - can run games and manage collectors)

### Collector Users
- **collector1** / **123456** (Collector under adad)
- **collector2** / **123456** (Collector under adad)
- **collector3** / **123456** (Collector under alex1)
- **collector4** / **123456** (Collector under kal1)

## What the Setup Script Does

1. **Clears existing data** - Removes any old users and shops
2. **Creates shops** - Sets up 4 shops (Main Shop, Branch A, Branch B, Adad Shop)
3. **Creates users** - Adds all 9 users with proper password hashes
4. **Sets up hierarchy** - Establishes supervisor relationships between employees and collectors
5. **Configures balances** - Sets initial credit balances and commission rates

## Manual Database Reset

If you need to reset the database manually:

```sql
-- Clear all users and shops
TRUNCATE TABLE users RESTART IDENTITY CASCADE; 
TRUNCATE TABLE shops RESTART IDENTITY CASCADE;

-- Then run the setup script again
node setup-database.js
```

## Important Notes

- **Passwords are hashed** - The setup script uses bcrypt to properly hash all passwords
- **Database schema required** - Make sure to run `npm run db:push` after setup
- **Fresh environment** - This setup is needed every time you clone to a new Replit
- **Environment variables** - DATABASE_URL must be set (Replit does this automatically)

## Troubleshooting

**"DATABASE_URL not set" error:**
- Make sure you have a PostgreSQL database provisioned in your Replit

**"Permission denied" error:**
- Run: `chmod +x setup-database.js`

**Users still can't log in:**
- Make sure you ran `npm run db:push` after the setup script
- Check that the schema tables exist: `SELECT * FROM users LIMIT 1;`

**Need to add more users:**
- Edit the `setup-database.js` file and add more users to the INSERT statement
- Hash new passwords using bcrypt before adding them