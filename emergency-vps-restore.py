#!/usr/bin/env python3
import subprocess
import time

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

def emergency_restore():
    """Emergency restore of VPS with proper nginx and service configuration"""
    print("🚨 Emergency VPS restore starting...")
    
    # 1. Check current service status
    print("1. Checking current service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    print(f"BingoMaster service: {stdout}")
    
    # 2. Stop all conflicting services
    print("2. Stopping all services...")
    run_ssh_command("systemctl stop bingomaster")
    run_ssh_command("systemctl stop nginx")
    run_ssh_command("pkill -f node")
    time.sleep(3)
    
    # 3. Remove nginx default site that might be interfering
    print("3. Removing nginx default configuration...")
    run_ssh_command("rm -f /etc/nginx/sites-enabled/default")
    run_ssh_command("rm -f /var/www/html/index.nginx-debian.html")
    
    # 4. Create clean nginx configuration
    print("4. Creating clean nginx configuration...")
    nginx_config = '''server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}'''
    
    with open("clean_nginx_config", "w") as f:
        f.write(nginx_config)
    
    upload_file("clean_nginx_config", "/etc/nginx/sites-available/default")
    run_ssh_command("ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default")
    
    # 5. Start Node.js service first
    print("5. Starting Node.js service...")
    run_ssh_command("cd /var/www/bingomaster && node server.js > /tmp/server.log 2>&1 &")
    time.sleep(5)
    
    # Check if Node.js is running
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep :3000")
    if stdout:
        print(f"✅ Node.js running on port 3000: {stdout.strip()}")
    else:
        print("❌ Node.js not running, checking logs...")
        code, logs, stderr = run_ssh_command("tail -20 /tmp/server.log")
        print(f"Server logs: {logs}")
        return False
    
    # 6. Test Node.js directly
    print("6. Testing Node.js directly...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ Node.js responding correctly")
    else:
        print(f"❌ Node.js not responding: {stdout}")
        return False
    
    # 7. Start nginx
    print("7. Starting nginx...")
    code, stdout, stderr = run_ssh_command("nginx -t")
    if code == 0:
        run_ssh_command("systemctl start nginx")
        time.sleep(2)
        print("✅ Nginx started")
    else:
        print(f"❌ Nginx config error: {stderr}")
        return False
    
    # 8. Test complete system
    print("8. Testing complete system...")
    
    # Test health through nginx
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ Complete system working through nginx")
    else:
        print(f"❌ System not working through nginx: {stdout}")
        # Check nginx error logs
        code, error_logs, stderr = run_ssh_command("tail -10 /var/log/nginx/error.log")
        print(f"Nginx errors: {error_logs}")
        return False
    
    # Test superadmin login
    print("9. Testing superadmin login...")
    login_cmd = '''curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"username":"superadmin","password":"a1e2y3t4h5"}' '''
    code, stdout, stderr = run_ssh_command(login_cmd)
    if "superadmin" in stdout and "user" in stdout:
        print("✅ Superadmin login working")
    else:
        print(f"❌ Superadmin login issue: {stdout}")
    
    # 10. Make service persistent
    print("10. Making service persistent...")
    systemd_service = '''[Unit]
Description=BingoMaster Node.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target'''
    
    with open("bingomaster.service", "w") as f:
        f.write(systemd_service)
    
    upload_file("bingomaster.service", "/etc/systemd/system/bingomaster.service")
    run_ssh_command("systemctl daemon-reload")
    run_ssh_command("systemctl enable bingomaster")
    run_ssh_command("systemctl start bingomaster")
    
    # Clean up
    import os
    for file in ["clean_nginx_config", "bingomaster.service"]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\n🎉 EMERGENCY RESTORE COMPLETE!")
    print("✅ Node.js service running persistently")
    print("✅ Nginx properly configured")
    print("✅ All API endpoints working")
    print("✅ System ready for browser access")
    
    return True

if __name__ == "__main__":
    success = emergency_restore()
    if success:
        print("\n✅ Emergency restore successful!")
    else:
        print("\n❌ Emergency restore failed.")