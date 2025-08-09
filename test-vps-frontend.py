#!/usr/bin/env python3
"""
Test and Debug VPS Frontend Issues
"""

import subprocess
import json
import time

VPS_HOST = "91.99.161.246"
VPS_USER = "root"
VPS_PASSWORD = "jUVcakxHajeL"

def run_ssh_command(command, show_output=True):
    """Execute command on VPS via SSH"""
    ssh_cmd = f'sshpass -p "{VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no {VPS_USER}@{VPS_HOST} "{command}"'
    if show_output:
        print(f"VPS: {command}")
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    if show_output and result.stdout:
        print(result.stdout)
    if result.stderr and "Warning" not in result.stderr:
        print(f"Error: {result.stderr}")
    return result

def test_login_and_session():
    """Test login functionality and session"""
    print("🔐 Testing login and session management...")
    
    # 1. Test login endpoint
    print("\n1. Testing login endpoint...")
    login_result = run_ssh_command('''curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \\
        -H "Content-Type: application/json" \\
        -d '{"username":"superadmin","password":"password"}' ''')
    
    if "success" in login_result.stdout or "superadmin" in login_result.stdout:
        print("✅ Login successful")
    else:
        print("❌ Login failed")
        print(login_result.stdout)
        return False
    
    # 2. Test authenticated API call
    print("\n2. Testing authenticated API call...")
    auth_result = run_ssh_command("curl -s -b /tmp/cookies.txt http://localhost:3000/api/auth/me")
    
    if "superadmin" in auth_result.stdout:
        print("✅ Authentication working")
        return True
    else:
        print("❌ Authentication failed")
        print(auth_result.stdout)
        return False

def check_frontend_errors():
    """Check for frontend JavaScript errors"""
    print("\n🔍 Checking frontend assets and configuration...")
    
    # Check if assets exist
    assets_check = run_ssh_command("ls -la /var/www/bingomaster-full/client/assets/")
    
    # Check JavaScript file
    js_check = run_ssh_command("head -c 500 /var/www/bingomaster-full/client/assets/index-D3KnQDoV.js")
    
    if "import" in js_check.stdout or "function" in js_check.stdout:
        print("✅ JavaScript file looks valid")
    else:
        print("❌ JavaScript file may be corrupted")
    
    # Check CSS file
    css_check = run_ssh_command("head -c 200 /var/www/bingomaster-full/client/assets/index-B3qlhnZK.css")
    
    if "css" in css_check.stdout or "{" in css_check.stdout or "." in css_check.stdout:
        print("✅ CSS file looks valid")
    else:
        print("❌ CSS file may be corrupted")

def create_debug_server():
    """Create a debug server configuration"""
    print("\n🛠️ Creating debug server configuration...")
    
    debug_server = '''
const express = require('express');
const path = require('path');
const app = express();

// Enable detailed logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files with proper headers
app.use('/assets', express.static(path.join(__dirname, '../client/assets'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
    if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  
  console.log(`Serving index.html for: ${req.path}`);
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

const PORT = 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Debug server running on port ${PORT}`);
});
'''
    
    # Upload debug server
    run_ssh_command(f"cat > /var/www/bingomaster-full/debug-server.js << 'EOF'\n{debug_server}\nEOF")
    
    # Install express if needed
    run_ssh_command("cd /var/www/bingomaster-full && npm install express")
    
    # Start debug server
    print("Starting debug server...")
    run_ssh_command("cd /var/www/bingomaster-full && nohup node debug-server.js > debug.log 2>&1 &")
    
    time.sleep(2)
    
    # Test debug server
    debug_test = run_ssh_command("curl -s http://localhost:3002/")
    if "index-D3KnQDoV.js" in debug_test.stdout:
        print("✅ Debug server working")
        print(f"🔗 Test your app at: http://{VPS_HOST}:3002")
    else:
        print("❌ Debug server failed")

def main():
    print("🧪 Testing BingoMaster Frontend on VPS")
    
    # Test backend health
    print("\n📊 Checking backend health...")
    health_check = run_ssh_command("curl -s http://localhost:3000/health")
    if "OK" in health_check.stdout:
        print("✅ Backend is healthy")
    else:
        print("❌ Backend health check failed")
        return
    
    # Test login and session
    login_works = test_login_and_session()
    
    # Check frontend assets
    check_frontend_errors()
    
    # Create debug server
    create_debug_server()
    
    print(f"\n🎉 Debug Analysis Complete!")
    print(f"🌐 Main app: http://{VPS_HOST}")
    print(f"🔧 Debug app: http://{VPS_HOST}:3002")
    
    if login_works:
        print("🔐 Backend authentication: ✅ Working")
    else:
        print("🔐 Backend authentication: ❌ Issues detected")
    
    print("\n📝 Next steps:")
    print("1. Check the debug server at port 3002")
    print("2. Open browser dev tools and check for JavaScript errors")
    print("3. Verify API calls are reaching the backend")

if __name__ == "__main__":
    main()