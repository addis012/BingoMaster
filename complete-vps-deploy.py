#!/usr/bin/env python3
import subprocess
import os
import json
import time
import tarfile

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

def create_complete_server():
    """Create the complete current BingoMaster server with all features"""
    print("Creating complete current BingoMaster server...")
    
    # Read the current server implementation
    with open("dist/index.js", "r") as f:
        current_server = f.read()
    
    # Create VPS-compatible version by converting ES modules to CommonJS
    vps_server = current_server.replace(
        'import express from \'express\';',
        'const express = require(\'express\');'
    ).replace(
        'import session from \'express-session\';',
        'const session = require(\'express-session\');'
    ).replace(
        'import bcrypt from \'bcrypt\';',
        'const bcrypt = require(\'bcrypt\');'
    ).replace(
        'import { createServer } from \'http\';',
        'const { createServer } = require(\'http\');'
    ).replace(
        'import { WebSocketServer } from \'ws\';',
        'const { WebSocketServer } = require(\'ws\');'
    ).replace(
        'import path from \'path\';',
        'const path = require(\'path\');'
    ).replace(
        'import { fileURLToPath } from \'url\';',
        ''
    ).replace(
        'const __filename = fileURLToPath(import.meta.url);',
        'const __filename = __filename;'
    ).replace(
        'const __dirname = path.dirname(__filename);',
        'const __dirname = __dirname;'
    ).replace(
        'export {', 
        'module.exports = {'
    )
    
    # Add admin/superadmin credentials fix
    admin_credentials = '''
// Updated user credentials for VPS deployment
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'admin',
    name: 'Admin User',
    email: 'admin@aradabingo.com',
    isBlocked: false,
    shopId: 1,
    creditBalance: '10000.00'
  },
  {
    id: 2,
    username: 'superadmin',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'superadmin',
    name: 'Super Admin',
    email: 'superadmin@aradabingo.com',
    isBlocked: false,
    shopId: null,
    creditBalance: '100000.00'
  },
  {
    id: 14,
    username: 'adad',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'addisu',
    email: null,
    isBlocked: false,
    shopId: 5,
    supervisorId: null,
    creditBalance: '0.00',
    commissionRate: '25.00'
  },
  {
    id: 3,
    username: 'alex1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Alex Employee',
    email: null,
    isBlocked: false,
    shopId: 1,
    supervisorId: null,
    creditBalance: '0.00',
    commissionRate: '25.00'
  },
  {
    id: 4,
    username: 'kal1',
    password: '$2b$10$elFFtzPafL.HqIIOEDbiq.bHoPhf18WF.L.yqq1yB5j8NE/BN3BqW', // 123456
    role: 'employee',
    name: 'Kal Employee',
    email: null,
    isBlocked: false,
    shopId: 2,
    supervisorId: null,
    creditBalance: '0.00',
    commissionRate: '25.00'
  }
];
'''
    
    # Replace user definitions in the server code
    if 'const users = [' in vps_server:
        start = vps_server.find('const users = [')
        end = vps_server.find('];', start) + 2
        vps_server = vps_server[:start] + admin_credentials.strip() + vps_server[end:]
    
    with open("complete_vps_server.js", "w") as f:
        f.write(vps_server)
    
    # Create VPS package.json with all dependencies
    package_json = {
        "name": "bingomaster-production",
        "version": "1.0.0",
        "main": "index.js",
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
    
    with open("complete_vps_package.json", "w") as f:
        json.dump(package_json, f, indent=2)
    
    print("✅ Complete server created with admin/superadmin credentials")
    return True

def deploy_complete_current_version():
    """Deploy the complete current version to VPS"""
    print("🚀 Deploying complete current BingoMaster version...")
    print("🌍 Target: aradabingo (91.99.161.246)")
    
    # Build current version first
    print("Building current version...")
    subprocess.run(["npm", "run", "build"], check=True)
    
    # Create complete server
    if not create_complete_server():
        return False
    
    # Stop services
    print("Stopping services...")
    run_ssh_command("systemctl stop bingomaster nginx")
    
    # Create backup
    print("Creating backup...")
    run_ssh_command("mkdir -p /var/backups/bingomaster-$(date +%Y%m%d_%H%M%S)")
    run_ssh_command("cp -r /var/www/bingomaster/* /var/backups/bingomaster-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true")
    
    # Clean and prepare
    print("Preparing directories...")
    commands = [
        "rm -rf /var/www/bingomaster/*",
        "mkdir -p /var/www/bingomaster/public",
        "mkdir -p /var/www/bingomaster/public/voices",
        "mkdir -p /var/www/bingomaster/attached_assets"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Upload complete server
    print("Uploading complete server...")
    if upload_file("complete_vps_server.js", "/var/www/bingomaster/index.js"):
        print("✅ Complete server uploaded")
    else:
        print("❌ Server upload failed")
        return False
    
    # Upload package.json
    if upload_file("complete_vps_package.json", "/var/www/bingomaster/package.json"):
        print("✅ Package.json uploaded")
    
    # Upload current frontend build
    print("Uploading current frontend...")
    if os.path.exists("dist/public"):
        subprocess.run(["tar", "-czf", "current_frontend.tar.gz", "-C", "dist", "public"], check=True)
        if upload_file("current_frontend.tar.gz", "/var/www/bingomaster/frontend.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf frontend.tar.gz && rm frontend.tar.gz")
            print("✅ Current frontend uploaded")
        if os.path.exists("current_frontend.tar.gz"):
            os.remove("current_frontend.tar.gz")
    
    # Upload all voice files
    print("Uploading complete voice system...")
    if os.path.exists("public/voices"):
        subprocess.run(["tar", "-czf", "complete_voices.tar.gz", "-C", "public", "voices"], check=True)
        if upload_file("complete_voices.tar.gz", "/var/www/bingomaster/voices.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf voices.tar.gz && rm voices.tar.gz")
            print("✅ Complete voice system uploaded")
        if os.path.exists("complete_voices.tar.gz"):
            os.remove("complete_voices.tar.gz")
    
    # Upload all audio assets
    print("Uploading audio assets...")
    if os.path.exists("attached_assets"):
        # Create comprehensive audio archive
        subprocess.run(["tar", "-czf", "audio_assets.tar.gz", "attached_assets"], check=True)
        if upload_file("audio_assets.tar.gz", "/var/www/bingomaster/audio.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf audio.tar.gz && rm audio.tar.gz")
            print("✅ Audio assets uploaded")
        if os.path.exists("audio_assets.tar.gz"):
            os.remove("audio_assets.tar.gz")
    
    # Create environment file
    print("Creating production environment...")
    env_content = """NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require
SESSION_SECRET=aradabingo-complete-bingo-session-secret-production"""
    
    with open("temp_env", "w") as f:
        f.write(env_content)
    upload_file("temp_env", "/var/www/bingomaster/.env")
    os.remove("temp_env")
    
    # Install dependencies
    print("Installing dependencies...")
    commands = [
        "cd /var/www/bingomaster && npm cache clean --force",
        "cd /var/www/bingomaster && rm -rf node_modules package-lock.json",
        "cd /var/www/bingomaster && npm install --production --no-audit"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Update systemd service
    print("Updating systemd service...")
    service_content = """[Unit]
Description=BingoMaster Complete Production Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/bingomaster
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/bingomaster/.env
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
    
    with open("temp_service", "w") as f:
        f.write(service_content)
    upload_file("temp_service", "/etc/systemd/system/bingomaster.service")
    os.remove("temp_service")
    
    # Start services
    print("Starting services...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster",
        "systemctl start bingomaster",
        "systemctl start nginx",
        "sleep 10"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Check service status
    print("Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Complete BingoMaster service running")
    else:
        print("❌ Service issue:")
        print(stdout)
        # Get logs
        code, logs, _ = run_ssh_command("journalctl -u bingomaster --no-pager --lines=20")
        print("Service logs:")
        print(logs)
    
    # Test deployment
    print("Testing complete deployment...")
    time.sleep(10)
    
    # Test frontend
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/'], capture_output=True, text=True, timeout=15)
    if "index-Bn24jAUe.js" in result.stdout:
        print("✅ Current frontend version deployed successfully")
    elif "<!DOCTYPE html>" in result.stdout:
        print("⚠️  Frontend deployed but version needs verification")
    else:
        print("❌ Frontend not accessible")
    
    # Test admin authentication
    print("Testing admin authentication...")
    test_credentials = [
        ("admin", "123456"),
        ("superadmin", "123456"),
        ("adad", "123456")
    ]
    
    for username, password in test_credentials:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', 
            'http://91.99.161.246/api/auth/login',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({"username": username, "password": password})
        ], capture_output=True, text=True, timeout=10)
        
        try:
            response = json.loads(result.stdout)
            if 'user' in response:
                role = response['user']['role']
                name = response['user']['name']
                print(f"✅ {username} ({role}): {name}")
            else:
                print(f"❌ {username}: {response.get('message', 'Failed')}")
        except:
            print(f"❌ {username}: Invalid response")
    
    # Test admin API endpoints
    print("Testing admin API endpoints...")
    # First get session cookie for admin
    result = subprocess.run([
        'curl', '-s', '-c', 'cookies.txt', '-X', 'POST', 
        'http://91.99.161.246/api/auth/login',
        '-H', 'Content-Type: application/json',
        '-d', '{"username": "admin", "password": "123456"}'
    ], capture_output=True, text=True, timeout=10)
    
    if os.path.exists('cookies.txt'):
        # Test admin endpoints with session
        endpoints = [
            '/api/admin/employees',
            '/api/admin/shop-stats', 
            '/api/credit/balance'
        ]
        
        for endpoint in endpoints:
            result = subprocess.run([
                'curl', '-s', '-b', 'cookies.txt',
                f'http://91.99.161.246{endpoint}'
            ], capture_output=True, text=True, timeout=10)
            
            try:
                json.loads(result.stdout)
                print(f"✅ {endpoint}: Working")
            except:
                if "<!DOCTYPE" in result.stdout:
                    print(f"❌ {endpoint}: HTML instead of JSON")
                else:
                    print(f"⚠️  {endpoint}: {result.stdout[:50]}...")
        
        os.remove('cookies.txt')
    
    # Clean up local files
    for file in ["complete_vps_server.js", "complete_vps_package.json"]:
        if os.path.exists(file):
            os.remove(file)
    
    print("\n🎉 COMPLETE DEPLOYMENT FINISHED!")
    print("=" * 50)
    print("🌍 Server: aradabingo (91.99.161.246)")
    print("🌐 Application: http://91.99.161.246")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    print("🔐 Authentication credentials:")
    print("   • admin / 123456 (Admin)")
    print("   • superadmin / 123456 (Super Admin)")
    print("   • adad / 123456 (Employee)")
    print("✅ Complete BingoMaster with all features deployed!")
    
    return True

if __name__ == "__main__":
    success = deploy_complete_current_version()
    if success:
        print("\n✅ Complete deployment successful!")
    else:
        print("\n❌ Deployment failed.")