# WebSocket Connection Fix Instructions

## Problem Identified
Your BingoMaster app is trying to connect via WebSocket but the configuration is incorrect:
- WebSocket server runs on `/ws` path at port 5000
- No HTTPS/SSL configured yet (port 443 not listening)
- Nginx needs proper WebSocket proxying configuration

## Immediate Fix Options

### Option 1: Update Nginx Configuration (Recommended)
Replace your current nginx configuration with the corrected version:

```bash
# On your VPS, update nginx config
sudo cp nginx_websocket_fix.conf /etc/nginx/sites-available/bingomaster
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Temporary HTTP WebSocket Fix
If you need immediate functionality without SSL:

1. **Update your app configuration** to use HTTP WebSocket:
   - Change any `wss://` references to `ws://`
   - Ensure WebSocket connects to `ws://yourdomain.com/ws`

2. **Verify your app is running on port 5000**:
   ```bash
   pm2 status
   curl http://localhost:5000
   ```

## WebSocket URL Patterns

Your BingoMaster app uses this WebSocket connection pattern:
```javascript
// From client/src/lib/websocket.ts
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws?gameId=${gameId}`;
```

This means:
- HTTP site: `ws://yourdomain.com/ws?gameId=123`
- HTTPS site: `wss://yourdomain.com/ws?gameId=123`

## Complete SSL Setup (For Production)

### 1. Install SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. Update Nginx Configuration
The `nginx_websocket_fix.conf` includes both HTTP and HTTPS configurations.

### 3. Force HTTPS Redirect
After SSL is installed, add this to the HTTP server block:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Verification Steps

### 1. Check WebSocket Server
```bash
# Verify your app is running
pm2 logs bingomaster

# Check if WebSocket endpoint responds
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:5000/ws
```

### 2. Test Nginx Proxy
```bash
# Test nginx configuration
sudo nginx -t

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### 3. Browser Testing
1. Open browser developer tools (F12)
2. Go to Network tab
3. Filter by "WS" (WebSocket)
4. Try to start a game and check if WebSocket connection establishes

## Quick Commands for Your VPS

```bash
# 1. Update nginx config
sudo cp nginx_websocket_fix.conf /etc/nginx/sites-available/bingomaster
sudo nginx -t
sudo systemctl reload nginx

# 2. Restart your application
pm2 restart bingomaster

# 3. Check logs
pm2 logs bingomaster --lines 20
sudo tail -f /var/log/nginx/error.log

# 4. Test WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:5000/ws
```

## Expected Results
After fixing the configuration:
- WebSocket connections should establish successfully
- Real-time game features should work (number calling, winner announcements)
- No more `wss://localhost/v2` connection errors
- Browser console should show "WebSocket connected" messages

## Troubleshooting
If WebSocket still doesn't work:

1. **Check firewall**:
   ```bash
   sudo ufw status
   ```

2. **Verify port binding**:
   ```bash
   netstat -tlnp | grep :5000
   ```

3. **Check application logs**:
   ```bash
   pm2 logs bingomaster --lines 50
   ```

4. **Test direct connection**:
   ```bash
   curl http://localhost:5000/ws
   ```