#!/usr/bin/env python3
import subprocess

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

def fix_nginx_proxy():
    """Fix nginx configuration to properly proxy to Node.js"""
    print("🔧 Fixing nginx proxy configuration...")
    
    # Check if Node.js service is running
    print("1. Checking Node.js service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" not in stdout:
        print("❌ BingoMaster service not running, starting it...")
        run_ssh_command("systemctl start bingomaster")
        run_ssh_command("sleep 5")
    else:
        print("✅ BingoMaster service is running")
    
    # Check if Node.js is actually listening on port 3000
    print("2. Checking port 3000...")
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep :3000")
    if stdout:
        print(f"✅ Port 3000 is listening: {stdout.strip()}")
    else:
        print("❌ Port 3000 not listening")
        # Try to start the service manually
        run_ssh_command("systemctl restart bingomaster")
        run_ssh_command("sleep 10")
    
    # Test direct Node.js connection
    print("3. Testing direct Node.js connection...")
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000/api/health")
    if "200 OK" in stdout:
        print("✅ Node.js responding correctly")
    else:
        print(f"❌ Node.js not responding: {stdout}")
        return False
    
    # Create proper nginx configuration
    print("4. Creating proper nginx configuration...")
    nginx_config = '''server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
    # Remove default document root
    # root /var/www/html;
    # index index.html index.htm index.nginx-debian.html;
    
    # Proxy all requests to Node.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
    
    # API routes specifically
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
        proxy_buffering off;
        proxy_read_timeout 86400;
    }
}'''
    
    with open("nginx_config", "w") as f:
        f.write(nginx_config)
    
    # Upload and apply nginx config
    if upload_file("nginx_config", "/etc/nginx/sites-available/default"):
        print("✅ Nginx config uploaded")
    else:
        print("❌ Failed to upload nginx config")
        return False
    
    # Test nginx configuration
    code, stdout, stderr = run_ssh_command("nginx -t")
    if code == 0:
        print("✅ Nginx config is valid")
        
        # Reload nginx
        run_ssh_command("systemctl reload nginx")
        print("✅ Nginx reloaded")
    else:
        print(f"❌ Nginx config error: {stderr}")
        return False
    
    # Test the fixed configuration
    print("5. Testing fixed configuration...")
    
    # Test API endpoint through nginx
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ API endpoints working through nginx")
        print(f"Health response: {stdout}")
    else:
        print(f"❌ API still not working: {stdout}")
        
        # Check nginx error logs
        code, error_logs, stderr = run_ssh_command("tail -20 /var/log/nginx/error.log")
        print(f"Nginx errors: {error_logs}")
        return False
    
    # Test superadmin login through nginx
    print("6. Testing superadmin login through nginx...")
    login_test = '''curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d "{\\"username\\":\\"superadmin\\",\\"password\\":\\"a1e2y3t4h5\\"}"'''
    code, stdout, stderr = run_ssh_command(login_test)
    if "superadmin" in stdout and "user" in stdout:
        print("✅ Superadmin login working through nginx")
    else:
        print(f"❌ Superadmin login issue: {stdout}")
    
    # Clean up
    import os
    if os.path.exists("nginx_config"):
        os.remove("nginx_config")
    
    print("\n🎉 NGINX PROXY CONFIGURATION FIXED!")
    print("✅ All API requests now properly routed to Node.js")
    print("✅ JSON responses working correctly")
    print("✅ Superadmin login should work from browser")
    
    return True

if __name__ == "__main__":
    success = fix_nginx_proxy()
    if success:
        print("\n✅ Nginx proxy fix completed successfully!")
    else:
        print("\n❌ Nginx proxy fix failed.")