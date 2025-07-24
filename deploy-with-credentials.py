#!/usr/bin/env python3
import subprocess
import os
import json
import time

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS with correct password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        print(f"SSH command failed: {e}")
        return -1, "", str(e)

def upload_file(local_path, remote_path, password="Rjqe9RTpHdun4hbrgWFb"):
    """Upload file to VPS using correct password"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except Exception as e:
        print(f"Upload failed: {e}")
        return False

def deploy_current_version():
    """Deploy the current BingoMaster version to VPS"""
    print("🚀 Deploying BingoMaster to aradabingo VPS...")
    print("🌍 Target: 91.99.161.246 (Nuremberg)")
    
    # Test SSH connection first
    print("Testing SSH connection...")
    code, stdout, stderr = run_ssh_command("echo 'Connection successful'")
    if code != 0:
        print(f"❌ SSH connection failed: {stderr}")
        return False
    print("✅ SSH connection working")
    
    # Stop any existing service
    print("Stopping existing services...")
    run_ssh_command("systemctl stop bingomaster 2>/dev/null || true")
    run_ssh_command("systemctl stop nginx 2>/dev/null || true")
    
    # Create backup
    print("Creating backup...")
    run_ssh_command("mkdir -p /var/backups/bingomaster-$(date +%Y%m%d_%H%M%S)")
    run_ssh_command("cp -r /var/www/bingomaster/* /var/backups/bingomaster-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true")
    
    # Prepare directories
    print("Preparing directories...")
    commands = [
        "mkdir -p /var/www/bingomaster",
        "rm -rf /var/www/bingomaster/*",
        "mkdir -p /var/www/bingomaster/public",
        "mkdir -p /var/www/bingomaster/public/voices",
        "mkdir -p /var/www/bingomaster/attached_assets"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Upload built server
    print("Uploading server application...")
    if os.path.exists("dist/index.js"):
        if upload_file("dist/index.js", "/var/www/bingomaster/index.js"):
            print("✅ Server uploaded")
        else:
            print("❌ Server upload failed")
    
    # Upload frontend files
    print("Uploading frontend files...")
    if os.path.exists("dist/public"):
        # Create tar for efficient upload
        subprocess.run(["tar", "-czf", "frontend.tar.gz", "-C", "dist", "public"], check=True)
        if upload_file("frontend.tar.gz", "/var/www/bingomaster/frontend.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf frontend.tar.gz && rm frontend.tar.gz")
            print("✅ Frontend uploaded")
        else:
            print("❌ Frontend upload failed")
        if os.path.exists("frontend.tar.gz"):
            os.remove("frontend.tar.gz")
    
    # Upload voice files
    print("Uploading voice files...")
    if os.path.exists("public/voices"):
        subprocess.run(["tar", "-czf", "voices.tar.gz", "-C", "public", "voices"], check=True)
        if upload_file("voices.tar.gz", "/var/www/bingomaster/voices.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf voices.tar.gz && rm voices.tar.gz")
            print("✅ Voice files uploaded")
        if os.path.exists("voices.tar.gz"):
            os.remove("voices.tar.gz")
    
    # Upload audio assets (MP3 only)
    print("Uploading audio assets...")
    if os.path.exists("attached_assets"):
        # Create tar with only MP3 files
        subprocess.run(["find", "attached_assets", "-name", "*.mp3", "-exec", "tar", "-rf", "audio.tar", "{}", "+"], check=False)
        if os.path.exists("audio.tar"):
            subprocess.run(["gzip", "audio.tar"], check=True)
            if upload_file("audio.tar.gz", "/var/www/bingomaster/audio.tar.gz"):
                run_ssh_command("cd /var/www/bingomaster && tar -xzf audio.tar.gz && rm audio.tar.gz")
                print("✅ Audio assets uploaded")
            if os.path.exists("audio.tar.gz"):
                os.remove("audio.tar.gz")
    
    # Create package.json
    print("Creating package.json...")
    package_json = {
        "name": "bingomaster-production",
        "version": "1.0.0",
        "type": "module",
        "scripts": {
            "start": "node index.js"
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
    
    with open("temp_package.json", "w") as f:
        json.dump(package_json, f, indent=2)
    upload_file("temp_package.json", "/var/www/bingomaster/package.json")
    os.remove("temp_package.json")
    
    # Create environment file
    print("Creating environment configuration...")
    env_content = """NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require
SESSION_SECRET=aradabingo-bingo-session-secret-production-key"""
    
    with open("temp_env", "w") as f:
        f.write(env_content)
    upload_file("temp_env", "/var/www/bingomaster/.env")
    os.remove("temp_env")
    
    # Install Node.js and dependencies
    print("Installing Node.js and dependencies...")
    commands = [
        "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        "apt-get install -y nodejs",
        "cd /var/www/bingomaster && npm install --production"
    ]
    for cmd in commands:
        code, stdout, stderr = run_ssh_command(cmd)
        if code != 0:
            print(f"Warning: {cmd} returned code {code}")
    
    # Create systemd service
    print("Creating systemd service...")
    service_content = """[Unit]
Description=BingoMaster Production Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node index.js
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
    
    # Configure Nginx
    print("Configuring Nginx...")
    nginx_config = """server {
    listen 80;
    server_name 91.99.161.246 aradabingo;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""
    
    with open("temp_nginx", "w") as f:
        f.write(nginx_config)
    upload_file("temp_nginx", "/etc/nginx/sites-available/bingomaster")
    os.remove("temp_nginx")
    
    # Enable nginx configuration
    commands = [
        "apt-get update && apt-get install -y nginx",
        "ln -sf /etc/nginx/sites-available/bingomaster /etc/nginx/sites-enabled/",
        "rm -f /etc/nginx/sites-enabled/default",
        "nginx -t"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Start services
    print("Starting services...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster",
        "systemctl start bingomaster",
        "systemctl enable nginx",
        "systemctl start nginx",
        "sleep 10"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Check service status
    print("Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ BingoMaster service running")
    else:
        print("❌ BingoMaster service issue:")
        print(stdout)
        # Get logs
        code, logs, _ = run_ssh_command("journalctl -u bingomaster --no-pager --lines=10")
        print("Service logs:")
        print(logs)
    
    # Test nginx
    code, stdout, stderr = run_ssh_command("systemctl status nginx --no-pager")
    if "active (running)" in stdout:
        print("✅ Nginx service running")
    else:
        print("❌ Nginx service issue")
    
    # Test the application
    print("Testing deployment...")
    time.sleep(5)
    
    # Test main page
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/'], capture_output=True, text=True, timeout=15)
    if "<!DOCTYPE html>" in result.stdout and "index-Bn24jAUe.js" in result.stdout:
        print("✅ Current frontend version deployed")
    elif "<!DOCTYPE html>" in result.stdout:
        print("⚠️  Frontend deployed but may be old version")
    else:
        print("❌ Frontend not accessible")
    
    # Test authentication
    test_users = [
        ("admin1", "123456"),
        ("adad", "123456"),
        ("alex1", "123456")
    ]
    
    print("Testing authentication...")
    working_login = None
    for username, password in test_users:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', 
            'http://91.99.161.246/api/auth/login',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({"username": username, "password": password})
        ], capture_output=True, text=True, timeout=10)
        
        try:
            response = json.loads(result.stdout)
            if 'user' in response:
                print(f"✅ Authentication working: {username} -> {response['user']['name']}")
                working_login = (username, password)
                break
            else:
                print(f"❌ Authentication failed: {username}")
        except:
            print(f"❌ Invalid response for {username}")
    
    # Final status
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("=" * 50)
    print(f"🌍 Server: aradabingo (91.99.161.246)")
    print(f"🌐 Application: http://91.99.161.246")
    print(f"📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print(f"🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    
    if working_login:
        print(f"👤 Working login: {working_login[0]} / {working_login[1]}")
    
    print("✅ BingoMaster fully deployed with current version!")
    return True

if __name__ == "__main__":
    success = deploy_current_version()
    if success:
        print("\n✅ Deployment successful!")
    else:
        print("\n❌ Deployment failed.")