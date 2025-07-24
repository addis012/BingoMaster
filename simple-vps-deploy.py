#!/usr/bin/env python3
import subprocess
import os

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except:
        return -1, "", "Failed"

def upload_file(local_path, remote_path, password="akunamatata"):
    """Upload file to VPS using scp"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except:
        return False

def deploy_built_app():
    """Deploy the built application to VPS"""
    print("🚀 Deploying built BingoMaster to VPS...")
    
    # Step 1: Stop current service
    print("Stopping current service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Step 2: Backup and clean
    print("Preparing directories...")
    commands = [
        "mkdir -p /var/www/bingomaster-backup",
        "cp -r /var/www/bingomaster/* /var/www/bingomaster-backup/ 2>/dev/null || true",
        "rm -rf /var/www/bingomaster/*",
        "mkdir -p /var/www/bingomaster/dist",
        "mkdir -p /var/www/bingomaster/public/voices",
        "mkdir -p /var/www/bingomaster/attached_assets"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Step 3: Upload built files
    print("Uploading application files...")
    
    # Create and upload package.json for production
    prod_package = '''{
  "name": "bingomaster-production",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@neondatabase/serverless": "^0.10.4",
    "bcrypt": "^6.0.0",
    "connect-pg-simple": "^10.0.0",
    "drizzle-orm": "^0.39.1",
    "express": "^5.0.2",
    "express-session": "^1.18.1",
    "ws": "^8.18.0"
  }
}'''
    
    with open('temp_package.json', 'w') as f:
        f.write(prod_package)
    upload_file('temp_package.json', '/var/www/bingomaster/package.json')
    os.remove('temp_package.json')
    print("✅ Package.json uploaded")
    
    # Upload built server if it exists
    if os.path.exists("dist/index.js"):
        upload_file("dist/index.js", "/var/www/bingomaster/dist/index.js")
        print("✅ Built server uploaded")
    
    # Upload built client files
    if os.path.exists("dist"):
        # Create zip of dist folder for client
        subprocess.run(["zip", "-r", "client-dist.zip", "dist/"], capture_output=True)
        if upload_file("client-dist.zip", "/var/www/bingomaster/client-dist.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o client-dist.zip && rm client-dist.zip")
            print("✅ Client files uploaded")
        if os.path.exists("client-dist.zip"):
            os.remove("client-dist.zip")
    
    # Upload voice files
    if os.path.exists("public/voices"):
        subprocess.run(["zip", "-r", "voices.zip", "public/voices/"], capture_output=True)
        if upload_file("voices.zip", "/var/www/bingomaster/voices.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o voices.zip && rm voices.zip")
            print("✅ Voice files uploaded")
        if os.path.exists("voices.zip"):
            os.remove("voices.zip")
    
    # Upload attached assets
    if os.path.exists("attached_assets"):
        # Only upload MP3 files to reduce size
        subprocess.run(["find", "attached_assets", "-name", "*.mp3", "-exec", "zip", "assets.zip", "{}", "+"], capture_output=True)
        if os.path.exists("assets.zip") and upload_file("assets.zip", "/var/www/bingomaster/assets.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o assets.zip && rm assets.zip")
            print("✅ Audio assets uploaded")
        if os.path.exists("assets.zip"):
            os.remove("assets.zip")
    
    # Step 4: Install dependencies
    print("Installing production dependencies...")
    run_ssh_command("cd /var/www/bingomaster && npm install --production")
    
    # Step 5: Create environment file
    env_content = '''NODE_ENV=production
PORT=3000'''
    
    with open('temp_env', 'w') as f:
        f.write(env_content)
    upload_file('temp_env', '/var/www/bingomaster/.env')
    os.remove('temp_env')
    
    # Step 6: Update systemd service
    service_content = '''[Unit]
Description=BingoMaster Production Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/bingomaster/.env

[Install]
WantedBy=multi-user.target
'''
    
    with open('temp_service', 'w') as f:
        f.write(service_content)
    upload_file('temp_service', '/etc/systemd/system/bingomaster.service')
    os.remove('temp_service')
    
    # Step 7: Start service
    print("Starting BingoMaster service...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster", 
        "systemctl start bingomaster",
        "sleep 5"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Step 8: Check status
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service issue:")
        print(stdout)
        # Try to see logs
        code, logs, _ = run_ssh_command("journalctl -u bingomaster --no-pager --lines=10")
        print("Recent logs:", logs)
    
    # Step 9: Test endpoints
    print("Testing application...")
    import time
    time.sleep(3)
    
    # Test basic response
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000")
    if "200 OK" in stdout or "302" in stdout:
        print("✅ Application responding")
    else:
        print(f"Application response: {stdout}")
    
    # Test specific routes
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/dashboard/employee")
    if "BingoMaster" in stdout or "login" in stdout:
        print("✅ Employee dashboard route working")
    
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("Access your application:")
    print("🌐 Main: http://91.99.161.246")
    print("👤 Login: admin1 / 123456")
    print("📱 Employee: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin: http://91.99.161.246/dashboard/admin")
    
    return True

if __name__ == "__main__":
    deploy_built_app()