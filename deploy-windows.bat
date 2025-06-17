@echo off
echo Bingo App Deployment from Windows
echo.

echo Step 1: Connecting to server and setting up environment...
ssh root@91.99.161.246 "apt update && apt upgrade -y"

echo Step 2: Installing Node.js...
ssh root@91.99.161.246 "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && apt-get install -y nodejs"

echo Step 3: Installing PostgreSQL...
ssh root@91.99.161.246 "apt install postgresql postgresql-contrib -y"

echo Step 4: Installing PM2 and Nginx...
ssh root@91.99.161.246 "npm install -g pm2 && apt install nginx -y"

echo Step 5: Setting up database...
ssh root@91.99.161.246 "sudo -u postgres psql -c \"CREATE DATABASE bingo_app;\" && sudo -u postgres psql -c \"CREATE USER bingo_user WITH PASSWORD 'BingoSecure2024!';\" && sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE bingo_app TO bingo_user;\""

echo Step 6: Creating application directory...
ssh root@91.99.161.246 "mkdir -p /var/www/bingo-app"

echo Step 7: Creating environment file...
ssh root@91.99.161.246 "echo 'NODE_ENV=production' > /var/www/bingo-app/.env && echo 'PORT=5000' >> /var/www/bingo-app/.env && echo 'DATABASE_URL=postgresql://bingo_user:BingoSecure2024!@localhost:5432/bingo_app' >> /var/www/bingo-app/.env"

echo.
echo ===============================================
echo Basic server setup completed!
echo Next: Upload your application files
echo ===============================================
pause