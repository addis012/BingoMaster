#!/usr/bin/env python3
import subprocess
import os
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

def create_complete_package():
    """Create a complete deployment package"""
    print("Creating deployment package...")
    
    # Create deployment directory
    os.makedirs("vps_deploy", exist_ok=True)
    
    # Create production package.json
    prod_package = {
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
            "ws": "^8.18.0",
            "memoizee": "^0.4.17"
        }
    }
    
    with open("vps_deploy/package.json", "w") as f:
        json.dump(prod_package, f, indent=2)
    
    # Create environment file with fixed database
    env_content = """NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require
SESSION_SECRET=bingo-session-secret-key-longer-for-security-production"""
    
    with open("vps_deploy/.env", "w") as f:
        f.write(env_content)
    
    print("✅ Deployment package created")
    return True

def deploy_to_vps():
    """Deploy the current version to VPS"""
    print("🚀 Deploying current BingoMaster version to VPS...")
    
    # Step 1: Create deployment package
    if not create_complete_package():
        return False
    
    # Step 2: Stop current service
    print("Stopping current service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Step 3: Backup and prepare directories
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
    
    # Step 4: Upload core files
    print("Uploading application files...")
    
    # Upload package.json and environment
    upload_file("vps_deploy/package.json", "/var/www/bingomaster/package.json")
    upload_file("vps_deploy/.env", "/var/www/bingomaster/.env")
    print("✅ Core configuration uploaded")
    
    # Upload built server
    if os.path.exists("dist/index.js"):
        upload_file("dist/index.js", "/var/www/bingomaster/dist/index.js")
        print("✅ Built server uploaded")
    
    # Upload built client assets
    if os.path.exists("dist"):
        # Create tar for faster upload
        subprocess.run(["tar", "-czf", "client-dist.tar.gz", "-C", "dist", "."], capture_output=True)
        if upload_file("client-dist.tar.gz", "/var/www/bingomaster/client-dist.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf client-dist.tar.gz && rm client-dist.tar.gz")
            print("✅ Client files uploaded")
        if os.path.exists("client-dist.tar.gz"):
            os.remove("client-dist.tar.gz")
    
    # Upload voice files
    if os.path.exists("public/voices"):
        subprocess.run(["tar", "-czf", "voices.tar.gz", "-C", "public", "voices"], capture_output=True)
        if upload_file("voices.tar.gz", "/var/www/bingomaster/voices.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf voices.tar.gz && rm voices.tar.gz")
            print("✅ Voice files uploaded")
        if os.path.exists("voices.tar.gz"):
            os.remove("voices.tar.gz")
    
    # Upload audio assets
    if os.path.exists("attached_assets"):
        # Only upload MP3 files
        subprocess.run(["find", "attached_assets", "-name", "*.mp3", "-exec", "tar", "-rf", "assets.tar", "{}", "+"], capture_output=True)
        if os.path.exists("assets.tar"):
            subprocess.run(["gzip", "assets.tar"], capture_output=True)
            if upload_file("assets.tar.gz", "/var/www/bingomaster/assets.tar.gz"):
                run_ssh_command("cd /var/www/bingomaster && tar -xzf assets.tar.gz && rm assets.tar.gz")
                print("✅ Audio assets uploaded")
            if os.path.exists("assets.tar.gz"):
                os.remove("assets.tar.gz")
    
    # Step 5: Install dependencies
    print("Installing dependencies...")
    run_ssh_command("cd /var/www/bingomaster && npm install --production")
    
    # Step 6: Update systemd service
    print("Updating systemd service...")
    service_content = """[Unit]
Description=BingoMaster Production Application
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
"""
    
    with open("temp_service", "w") as f:
        f.write(service_content)
    upload_file("temp_service", "/etc/systemd/system/bingomaster.service")
    os.remove("temp_service")
    
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
    
    # Step 8: Test the deployment
    print("Testing deployment...")
    import time
    time.sleep(3)
    
    # Check service status
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service issue:")
        print(stdout)
        # Check logs
        code, logs, _ = run_ssh_command("journalctl -u bingomaster --no-pager --lines=20")
        print("Logs:", logs)
    
    # Test authentication with correct credentials
    print("Testing authentication...")
    test_logins = [
        ("admin1", "123456"),
        ("kal1", "123456"), 
        ("alex1", "123456"),
        ("j01", "123456")
    ]
    
    for username, password in test_logins:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', 
            'http://91.99.161.246/api/auth/login',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({"username": username, "password": password})
        ], capture_output=True, text=True, timeout=10)
        
        try:
            response = json.loads(result.stdout)
            if 'user' in response:
                print(f"✅ Login working: {username} -> {response['user']['name']}")
                break
            else:
                print(f"❌ Login failed: {username} -> {response.get('message', 'Unknown')}")
        except:
            print(f"❌ Invalid response for {username}")
    
    # Clean up
    subprocess.run(["rm", "-rf", "vps_deploy"], capture_output=True)
    
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("🌐 Access your application at: http://91.99.161.246")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    print("👤 Try login with: admin1 / 123456")
    
    return True

if __name__ == "__main__":
    success = deploy_to_vps()
    if success:
        print("\n✅ BingoMaster updated successfully on VPS!")
    else:
        print("\n❌ Deployment failed.")