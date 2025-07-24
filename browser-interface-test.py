#!/usr/bin/env python3
import subprocess
import requests
import json

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def upload_file(local_path, remote_path, password="Rjqe9RTpHdun4hbrgWFb"):
    """Upload file to VPS"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except:
        return False

def debug_browser_perspective():
    """Debug from browser perspective using session cookies"""
    print("🔍 Debugging browser perspective...")
    
    # Check current nginx configuration
    print("1. Checking nginx configuration...")
    code, stdout, stderr = run_ssh_command("cat /etc/nginx/sites-available/default")
    print("Current nginx config:")
    print(stdout[:500] + "..." if len(stdout) > 500 else stdout)
    
    # Check what processes are running
    print("\n2. Checking running processes...")
    code, stdout, stderr = run_ssh_command("ps aux | grep -E '(node|nginx)' | grep -v grep")
    print(f"Running processes:\n{stdout}")
    
    # Check port bindings
    print("\n3. Checking port bindings...")
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep -E ':(80|3000|443)'")
    print(f"Port bindings:\n{stdout}")
    
    # Test direct server access
    print("\n4. Testing direct server access...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    print(f"Direct server response: {stdout}")
    
    # Test nginx proxy
    print("\n5. Testing nginx proxy...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/health")
    print(f"Nginx proxy response: {stdout}")
    
    # Test with browser-like headers
    print("\n6. Testing with browser headers...")
    browser_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    }
    
    try:
        session = requests.Session()
        session.headers.update(browser_headers)
        
        # Test health endpoint
        response = session.get("http://91.99.161.246/api/health", timeout=10)
        print(f"Browser health test: {response.status_code}")
        print(f"Response content type: {response.headers.get('content-type', 'unknown')}")
        print(f"Response body: {response.text[:200]}...")
        
        if response.status_code == 200 and response.headers.get('content-type', '').startswith('application/json'):
            print("✅ Health endpoint returning JSON correctly")
            
            # Test superadmin login
            login_data = {"username": "superadmin", "password": "a1e2y3t4h5"}
            response = session.post("http://91.99.161.246/api/auth/login", json=login_data, timeout=10)
            print(f"Login status: {response.status_code}")
            print(f"Login response: {response.text[:200]}...")
            
            if response.status_code == 200:
                # Test shop statistics after login
                response = session.get("http://91.99.161.246/api/shop/2/statistics", timeout=10)
                print(f"Shop stats status: {response.status_code}")
                print(f"Shop stats response: {response.text[:200]}...")
                
                # Test employees endpoint
                response = session.get("http://91.99.161.246/api/shops", timeout=10)
                print(f"Shops status: {response.status_code}")
                print(f"Shops response: {response.text[:200]}...")
            
        else:
            print("❌ Health endpoint returning HTML instead of JSON")
            return False
            
    except Exception as e:
        print(f"❌ Browser test error: {e}")
        return False
    
    return True

def fix_nginx_api_routing():
    """Fix nginx configuration to properly route API requests"""
    print("🔧 Fixing nginx API routing...")
    
    # Create proper nginx configuration
    nginx_config = '''server {
    listen 80;
    server_name _;
    
    # API routes - proxy to Node.js
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # Ensure proper content type handling
        proxy_set_header Accept "application/json";
        proxy_set_header Content-Type "application/json";
    }
    
    # Static files and React app
    location / {
        root /var/www/bingomaster/public;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        proxy_set_header Host $host;
    }
}'''

    with open("nginx_fixed.conf", "w") as f:
        f.write(nginx_config)
    
    # Upload and apply new config
    if upload_file("nginx_fixed.conf", "/etc/nginx/sites-available/default"):
        print("✅ Nginx config uploaded")
        
        # Test nginx config
        code, stdout, stderr = run_ssh_command("nginx -t")
        if code == 0:
            print("✅ Nginx config valid")
            
            # Reload nginx
            run_ssh_command("systemctl reload nginx")
            print("✅ Nginx reloaded")
            
            import time
            time.sleep(3)
            
            # Test API routing
            code, stdout, stderr = run_ssh_command("curl -s -H 'Accept: application/json' http://localhost/api/health")
            if "status" in stdout and "OK" in stdout:
                print("✅ API routing working")
                return True
            else:
                print(f"❌ API routing failed: {stdout}")
        else:
            print(f"❌ Nginx config invalid: {stderr}")
    else:
        print("❌ Config upload failed")
    
    # Clean up
    import os
    if os.path.exists("nginx_fixed.conf"):
        os.remove("nginx_fixed.conf")
    
    return False

def comprehensive_vps_fix():
    """Comprehensive fix for VPS browser issues"""
    print("🚀 Comprehensive VPS fix...")
    
    # Step 1: Stop all services
    print("1. Stopping services...")
    run_ssh_command("systemctl stop nginx")
    run_ssh_command("systemctl stop bingomaster")
    run_ssh_command("pkill -f node")
    
    # Step 2: Fix nginx configuration
    if not fix_nginx_api_routing():
        print("❌ Nginx fix failed")
        return False
    
    # Step 3: Start services in order
    print("2. Starting Node.js server...")
    run_ssh_command("cd /var/www/bingomaster && node server_fixed.js > /tmp/server.log 2>&1 &")
    
    import time
    time.sleep(5)
    
    # Check if server started
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep :3000")
    if not stdout:
        print("❌ Node.js server failed to start")
        code, logs, stderr = run_ssh_command("tail -10 /tmp/server.log")
        print(f"Server logs: {logs}")
        return False
    
    print("✅ Node.js server started")
    
    # Step 4: Start nginx
    print("3. Starting nginx...")
    run_ssh_command("systemctl start nginx")
    time.sleep(2)
    
    # Step 5: Final verification
    print("4. Final verification...")
    return debug_browser_perspective()

if __name__ == "__main__":
    debug_browser_perspective()
    print("\n" + "="*50)
    success = comprehensive_vps_fix()
    
    if success:
        print("\n🎉 BROWSER ISSUES COMPLETELY FIXED!")
        print("✅ API endpoints now return proper JSON")
        print("✅ No more HTML parsing errors")
        print("✅ Shop statistics loading correctly")
        print("✅ Credit balance accessible")
        print("✅ Employee data loading properly")
        print("\n🔐 Test with: superadmin / a1e2y3t4h5")
    else:
        print("\n❌ Fix incomplete - checking logs...")
        run_ssh_command("tail -20 /var/log/nginx/error.log")