# Complete BingoMaster VPS Deployment Manual

## Issues Identified from Your Logs

1. **Database Connection Failed**: ECONNREFUSED errors indicate PostgreSQL isn't accessible
2. **Login Failures**: 500 errors on login attempts due to database issues
3. **WebSocket Errors**: Trying to connect to `wss://localhost/v2` instead of correct path
4. **Authentication Issues**: All API calls returning 401 "Not authenticated"

## Step-by-Step Fix Guide

### Step 1: Fix Database Connection

#### Check PostgreSQL Status
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Reset Database Configuration
```bash
# Switch to postgres user
sudo -u postgres psql

# Drop and recreate database (WARNING: This deletes all data)
DROP DATABASE IF EXISTS aradabingo;
DROP USER IF EXISTS aradabingo_user;

# Create fresh database
CREATE DATABASE aradabingo;
CREATE USER aradabingo_user WITH PASSWORD 'SecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE aradabingo TO aradabingo_user;
ALTER USER aradabingo_user CREATEDB;
\q
```

#### Update Environment Variables
```bash
cd /opt/aradabingo

# Create correct .env file
cat > .env << EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://aradabingo_user:SecurePassword123!@localhost:5432/aradabingo
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
CORS_ORIGIN=https://aradabingo.com
COOKIE_SECURE=false
TRUST_PROXY=true
EOF
```

### Step 2: Install Missing Dependencies

#### Install TypeScript and Required Packages
```bash
cd /opt/aradabingo

# Install global dependencies
sudo npm install -g typescript tsx

# Install project dependencies
npm install

# Install missing dependencies that might be needed
npm install @types/node @types/express bcrypt drizzle-orm @neondatabase/serverless
```

### Step 3: Deploy Database Schema

```bash
cd /opt/aradabingo

# Deploy schema to database
npm run db:push

# Verify database connection
node -e "
const { Pool } = require('@neondatabase/serverless');
const pool = new Pool({ 
  connectionString: 'postgresql://aradabingo_user:SecurePassword123!@localhost:5432/aradabingo' 
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('Database Error:', err.message);
  } else {
    console.log('Database Connected Successfully:', res.rows[0]);
  }
  pool.end();
});
"
```

### Step 4: Create Initial Super Admin User

```bash
cd /opt/aradabingo

# Create super admin setup script
cat > create_admin.js << 'EOF'
const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcrypt');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://aradabingo_user:SecurePassword123!@localhost:5432/aradabingo'
});

async function createSuperAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const result = await pool.query(`
      INSERT INTO users (username, password, name, email, role, account_number, credit_balance) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (username) DO UPDATE SET 
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        email = EXCLUDED.email
      RETURNING id, username, role
    `, ['superadmin', hashedPassword, 'Super Admin', 'admin@aradabingo.com', 'super_admin', 'ADM000001', '0.00']);
    
    console.log('Super Admin Created:', result.rows[0]);
    
    // Also create a test admin and employee
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminResult = await pool.query(`
      INSERT INTO users (username, password, name, email, role, account_number, credit_balance, shop_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password
      RETURNING id, username, role
    `, ['admin1', adminPassword, 'Test Admin', 'admin1@test.com', 'admin', 'ADM000002', '500.00', 1]);
    
    console.log('Test Admin Created:', adminResult.rows[0]);
    
    await pool.end();
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createSuperAdmin();
EOF

# Run the script
node create_admin.js
```

### Step 5: Fix PM2 Configuration

```bash
cd /opt/aradabingo

# Stop current PM2 process
pm2 stop aradabingo
pm2 delete aradabingo

# Create corrected ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aradabingo',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with new configuration
pm2 start ecosystem.config.js --env production
pm2 save
```

### Step 6: Fix Nginx Configuration

```bash
# Backup current config
sudo cp /etc/nginx/sites-available/aradabingo /etc/nginx/sites-available/aradabingo.backup

# Create corrected nginx config
sudo tee /etc/nginx/sites-available/aradabingo << 'EOF'
server {
    listen 80;
    server_name aradabingo.com www.aradabingo.com 91.99.161.246;
    
    client_max_body_size 10M;
    
    # Main application proxy
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60;
    }

    # WebSocket proxy for real-time features
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
EOF

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Verification and Testing

#### Test Database Connection
```bash
cd /opt/aradabingo
psql -h localhost -U aradabingo_user -d aradabingo -c "SELECT COUNT(*) FROM users;"
```

#### Test Application Direct Access
```bash
curl -v http://localhost:5000/api/auth/me
```

#### Check Application Status
```bash
pm2 status
pm2 logs aradabingo --lines 20
```

#### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "superadmin", "password": "admin123"}' \
  -v
```

### Step 8: Troubleshooting Commands

#### Check All Services
```bash
# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Nginx
sudo systemctl status nginx
sudo nginx -t

# Application
pm2 status
curl http://localhost:5000

# Ports
netstat -tlnp | grep -E ':(80|5000|5432)'
```

#### View All Logs
```bash
# Application logs
pm2 logs aradabingo --lines 50

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Step 9: SSL Setup (After Basic Setup Works)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d aradabingo.com -d www.aradabingo.com

# Update environment for HTTPS
sed -i 's/COOKIE_SECURE=false/COOKIE_SECURE=true/' /opt/aradabingo/.env
pm2 restart aradabingo
```

## Expected Results After Fix

1. **Database**: Connection successful, users table populated
2. **Login**: Super admin login works with username: `superadmin`, password: `admin123`
3. **WebSocket**: Real-time features work correctly
4. **API**: All endpoints respond properly
5. **Browser**: Application loads and functions correctly

## Emergency Reset Commands

If everything fails, use these commands to start fresh:

```bash
# Stop everything
pm2 stop all
pm2 delete all
sudo systemctl stop nginx

# Reset database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS aradabingo;"
sudo -u postgres psql -c "CREATE DATABASE aradabingo;"
sudo -u postgres psql -c "CREATE USER aradabingo_user WITH PASSWORD 'SecurePassword123!';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE aradabingo TO aradabingo_user;"

# Redeploy
cd /opt/aradabingo
npm run db:push
node create_admin.js
pm2 start ecosystem.config.js
sudo systemctl start nginx
```

## Login Credentials After Setup

- **Super Admin**: username `superadmin`, password `admin123`
- **Test Admin**: username `admin1`, password `admin123`

Run through this manual step by step, and your BingoMaster application should work correctly on your VPS.