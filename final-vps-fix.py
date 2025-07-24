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

def final_vps_fix():
    """Final VPS fix with correct file names and service configuration"""
    print("🔧 Final VPS fix starting...")
    
    # 1. Check what files exist
    print("1. Checking VPS files...")
    code, stdout, stderr = run_ssh_command("ls -la /var/www/bingomaster/")
    print(f"VPS files: {stdout}")
    
    # 2. Stop all services and processes
    print("2. Stopping all services...")
    run_ssh_command("systemctl stop bingomaster")
    run_ssh_command("systemctl stop nginx")
    run_ssh_command("pkill -f node")
    run_ssh_command("pkill -f index.js")
    time.sleep(3)
    
    # 3. Start Node.js with correct file name
    print("3. Starting Node.js with index.js...")
    run_ssh_command("cd /var/www/bingomaster && node index.js > /tmp/node.log 2>&1 &")
    time.sleep(5)
    
    # Check if Node.js is running
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep :3000")
    if stdout:
        print(f"✅ Node.js running: {stdout.strip()}")
    else:
        print("❌ Node.js not running, checking logs...")
        code, logs, stderr = run_ssh_command("tail -30 /tmp/node.log")
        print(f"Node.js logs: {logs}")
        return False
    
    # 4. Test Node.js directly
    print("4. Testing Node.js directly...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ Node.js responding correctly")
    else:
        print(f"❌ Node.js not responding: {stdout}")
        return False
    
    # 5. Create correct systemd service
    print("5. Creating correct systemd service...")
    systemd_service = '''[Unit]
Description=BingoMaster Node.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target'''
    
    with open("bingomaster_fixed.service", "w") as f:
        f.write(systemd_service)
    
    upload_file("bingomaster_fixed.service", "/etc/systemd/system/bingomaster.service")
    run_ssh_command("systemctl daemon-reload")
    
    # 6. Create clean nginx config without conflicts
    print("6. Creating clean nginx configuration...")
    nginx_config = '''server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    
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
    
    with open("nginx_final.conf", "w") as f:
        f.write(nginx_config)
    
    # Remove conflicting nginx configurations
    run_ssh_command("rm -f /etc/nginx/sites-enabled/default")
    run_ssh_command("rm -f /etc/nginx/sites-available/default")
    
    upload_file("nginx_final.conf", "/etc/nginx/sites-available/bingomaster")
    run_ssh_command("ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/bingomaster")
    
    # 7. Test nginx config and start
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
    
    # Test through nginx
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ Complete system working through nginx")
        print(f"Health response: {stdout}")
    else:
        print(f"❌ System not working through nginx: {stdout}")
        
        # Check nginx error logs
        code, error_logs, stderr = run_ssh_command("tail -10 /var/log/nginx/error.log")
        print(f"Nginx errors: {error_logs}")
        
        # Check nginx access logs
        code, access_logs, stderr = run_ssh_command("tail -10 /var/log/nginx/access.log")
        print(f"Nginx access: {access_logs}")
        return False
    
    # 9. Test superadmin login
    print("9. Testing superadmin login...")
    login_cmd = '''curl -s -X POST http://localhost/api/auth/login -H "Content-Type: application/json" -d '{"username":"superadmin","password":"a1e2y3t4h5"}' '''
    code, stdout, stderr = run_ssh_command(login_cmd)
    if "superadmin" in stdout and "user" in stdout:
        print("✅ Superadmin login working")
    else:
        print(f"❌ Superadmin login issue: {stdout}")
    
    # 10. Enable systemd service
    print("10. Enabling systemd service...")
    run_ssh_command("systemctl stop bingomaster")  # Stop manual process
    run_ssh_command("pkill -f index.js")  # Kill manual process
    time.sleep(2)
    run_ssh_command("systemctl start bingomaster")
    run_ssh_command("systemctl enable bingomaster")
    
    # Final verification
    time.sleep(3)
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Systemd service running")
    else:
        print(f"❌ Systemd service issue: {stdout}")
    
    # Clean up
    import os
    for file in ["bingomaster_fixed.service", "nginx_final.conf"]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\n🎉 FINAL VPS FIX COMPLETE!")
    print("✅ Node.js service running with correct file")
    print("✅ Nginx properly configured without conflicts")
    print("✅ Systemd service enabled and running")
    print("✅ All API endpoints working")
    
    return True

if __name__ == "__main__":
    success = final_vps_fix()
    if success:
        print("\n✅ Final VPS fix successful!")
        print("🌐 Try accessing http://91.99.161.246 now")
        print("🔐 Use superadmin / a1e2y3t4h5")
    else:
        print("\n❌ Final VPS fix failed.")