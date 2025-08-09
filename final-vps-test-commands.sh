#!/bin/bash
# Final VPS Test Commands for MongoDB-only BingoMaster

echo "🧪 Testing your BingoMaster MongoDB VPS deployment..."

# Test 1: Check if server file is complete
echo "1. Checking server file..."
if [ -f "/var/www/bingomaster-mongo/server/index.js" ]; then
    lines=$(wc -l < /var/www/bingomaster-mongo/server/index.js)
    echo "   Server file exists with $lines lines"
    if [ $lines -gt 100 ]; then
        echo "   ✅ Server file appears complete"
    else
        echo "   ❌ Server file seems truncated"
    fi
else
    echo "   ❌ Server file not found"
fi

# Test 2: Check environment file
echo "2. Checking environment configuration..."
if [ -f "/var/www/bingomaster-mongo/.env" ]; then
    echo "   ✅ Environment file exists"
    if grep -q "mongodb+srv" /var/www/bingomaster-mongo/.env; then
        echo "   ✅ MongoDB URI configured"
    else
        echo "   ❌ MongoDB URI not found in .env"
    fi
else
    echo "   ❌ Environment file missing"
fi

# Test 3: Test server startup
echo "3. Testing server startup (will run for 10 seconds)..."
cd /var/www/bingomaster-mongo
timeout 10s node server/index.js &
sleep 5

# Test 4: Check if server is responding
echo "4. Testing server health check..."
response=$(curl -s http://localhost:3000/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ Server responding"
    echo "   Response: $response"
else
    echo "   ❌ Server not responding"
fi

# Test 5: Check nginx configuration
echo "5. Testing Nginx configuration..."
nginx -t 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Nginx configuration valid"
else
    echo "   ❌ Nginx configuration has issues"
fi

# Test 6: Test external access
echo "6. Testing external access..."
external_response=$(curl -s http://91.99.161.246/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ External access working"
    echo "   Response: $external_response"
else
    echo "   ❌ External access failed"
fi

echo ""
echo "📋 Test Results Summary:"
echo "   Server file: $([ -f "/var/www/bingomaster-mongo/server/index.js" ] && echo "✅" || echo "❌")"
echo "   Environment: $([ -f "/var/www/bingomaster-mongo/.env" ] && echo "✅" || echo "❌")"
echo "   Local access: $(curl -s http://localhost:3000/health >/dev/null 2>&1 && echo "✅" || echo "❌")"
echo "   External access: $(curl -s http://91.99.161.246/health >/dev/null 2>&1 && echo "✅" || echo "❌")"

echo ""
echo "🚀 If all tests pass, start production service with:"
echo "   systemctl start bingomaster-mongo"
echo "   systemctl status bingomaster-mongo"
echo ""
echo "🌐 Access your app at: http://91.99.161.246"
echo "🔐 Login: superadmin / password"