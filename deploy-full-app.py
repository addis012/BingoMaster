#!/usr/bin/env python3
import subprocess
import os
import zipfile
import json

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

def create_production_bundle():
    """Create production-ready bundle"""
    print("🏗️ Creating production bundle...")
    
    # Build client
    print("Building client...")
    result = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Client build failed: {result.stderr}")
        return False
    
    # Build server  
    print("Building server...")
    result = subprocess.run(["npm", "run", "build:server"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Server build failed: {result.stderr}")
        return False
    
    print("✅ Build completed")
    return True

def deploy_full_bingomaster():
    """Deploy complete BingoMaster application"""
    print("🚀 Deploying full BingoMaster application...")
    
    # Step 1: Build the application
    if not create_production_bundle():
        return False
    
    # Step 2: Stop current service
    print("Stopping current service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Step 3: Create application structure
    print("Setting up application directories...")
    commands = [
        "rm -rf /var/www/bingomaster/*",
        "mkdir -p /var/www/bingomaster/dist",
        "mkdir -p /var/www/bingomaster/server",
        "mkdir -p /var/www/bingomaster/public/voices",
        "mkdir -p /var/www/bingomaster/attached_assets"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Step 4: Upload built files
    print("Uploading application files...")
    
    # Upload package.json
    if os.path.exists("package.json"):
        upload_file("package.json", "/var/www/bingomaster/package.json")
        print("✅ Package.json uploaded")
    
    # Upload built server
    if os.path.exists("server/index.js"):
        upload_file("server/index.js", "/var/www/bingomaster/server/index.js")
        print("✅ Server uploaded")
    
    # Upload client dist folder
    if os.path.exists("dist"):
        # Create a zip of dist folder
        subprocess.run(["zip", "-r", "dist.zip", "dist/"], capture_output=True)
        if upload_file("dist.zip", "/var/www/bingomaster/dist.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o dist.zip && rm dist.zip")
            print("✅ Client files uploaded")
        os.remove("dist.zip")
    
    # Upload voice files
    if os.path.exists("public/voices"):
        print("Uploading voice files...")
        subprocess.run(["zip", "-r", "voices.zip", "public/voices/"], capture_output=True)
        if upload_file("voices.zip", "/var/www/bingomaster/voices.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o voices.zip && rm voices.zip")
            print("✅ Voice files uploaded")
        os.remove("voices.zip")
    
    # Upload attached assets
    if os.path.exists("attached_assets"):
        print("Uploading attached assets...")
        subprocess.run(["zip", "-r", "assets.zip", "attached_assets/"], capture_output=True)
        if upload_file("assets.zip", "/var/www/bingomaster/assets.zip"):
            run_ssh_command("cd /var/www/bingomaster && unzip -o assets.zip && rm assets.zip")
            print("✅ Attached assets uploaded")
        os.remove("assets.zip")
    
    # Step 5: Install dependencies
    print("Installing production dependencies...")
    run_ssh_command("cd /var/www/bingomaster && npm install --production")
    
    # Step 6: Set up environment
    print("Setting up environment...")
    env_content = '''NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/bingomaster
SESSION_SECRET=bingo-session-secret-key-longer-for-security-production'''
    
    with open('temp_env', 'w') as f:
        f.write(env_content)
    upload_file('temp_env', '/var/www/bingomaster/.env')
    os.remove('temp_env')
    
    # Step 7: Update systemd service with environment
    print("Updating systemd service...")
    service_content = '''[Unit]
Description=BingoMaster Node.js Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node server/index.js
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
    
    # Step 8: Start the service
    print("Starting BingoMaster service...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster",
        "systemctl start bingomaster",
        "sleep 3"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Step 9: Check service status
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ BingoMaster service running")
    else:
        print("❌ Service not running properly")
        print(f"Status: {stdout}")
        return False
    
    # Step 10: Test the application
    print("Testing application...")
    import time
    time.sleep(3)
    
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000")
    if "200 OK" in stdout or "302" in stdout:
        print("✅ Application responding")
    else:
        print(f"❌ Application not responding: {stdout}")
        return False
    
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("🌐 Access: http://91.99.161.246")
    print("👤 Username: admin1")
    print("🔑 Password: 123456")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    
    return True

if __name__ == "__main__":
    success = deploy_full_bingomaster()
    if success:
        print("\n✅ BingoMaster is fully deployed and running!")
    else:
        print("\n❌ Deployment failed. Check logs above.")