#!/usr/bin/env python3
import subprocess
import os
import json
import tarfile

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        print(f"SSH command failed: {e}")
        return -1, "", str(e)

def upload_file(local_path, remote_path, password="akunamatata"):
    """Upload file to VPS using scp"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except Exception as e:
        print(f"Upload failed: {e}")
        return False

def create_deployment_package():
    """Create complete deployment package with current version"""
    print("📦 Creating complete deployment package...")
    
    # Create fresh build directory
    if os.path.exists("vps_complete_deploy"):
        subprocess.run(["rm", "-rf", "vps_complete_deploy"], check=True)
    os.makedirs("vps_complete_deploy", exist_ok=True)
    
    # Package the built application
    print("Building application files...")
    
    # Create tar of dist directory (built application)
    if os.path.exists("dist"):
        with tarfile.open("vps_complete_deploy/app.tar.gz", "w:gz") as tar:
            tar.add("dist", arcname=".")
        print("✅ Built application packaged")
    
    # Create tar of public assets (voices, etc.)
    if os.path.exists("public"):
        with tarfile.open("vps_complete_deploy/public.tar.gz", "w:gz") as tar:
            tar.add("public", arcname="public")
        print("✅ Public assets packaged")
    
    # Create tar of audio assets 
    if os.path.exists("attached_assets"):
        with tarfile.open("vps_complete_deploy/assets.tar.gz", "w:gz") as tar:
            # Only add MP3 files to save space
            for root, dirs, files in os.walk("attached_assets"):
                for file in files:
                    if file.endswith('.mp3'):
                        file_path = os.path.join(root, file)
                        tar.add(file_path, arcname=file_path)
        print("✅ Audio assets packaged")
    
    # Create production package.json
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
    
    with open("vps_complete_deploy/package.json", "w") as f:
        json.dump(package_json, f, indent=2)
    
    # Create production environment
    env_content = """NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://neondb_owner:JN1b4fJNqZeL@ep-weathered-firefly-a6fgdijr.us-west-2.aws.neon.tech/bingomaster_db?sslmode=require
SESSION_SECRET=bingo-session-secret-key-longer-for-security-production"""
    
    with open("vps_complete_deploy/.env", "w") as f:
        f.write(env_content)
    
    print("✅ Deployment package ready")
    return True

def deploy_current_version():
    """Deploy the current version to VPS"""
    print("🚀 Deploying current BingoMaster version to VPS...")
    
    # Create deployment package
    if not create_deployment_package():
        print("❌ Failed to create deployment package")
        return False
    
    # Stop the service
    print("Stopping current service...")
    run_ssh_command("systemctl stop bingomaster")
    
    # Backup current deployment
    print("Creating backup...")
    commands = [
        "mkdir -p /var/www/bingomaster-backup-$(date +%Y%m%d_%H%M%S)",
        "cp -r /var/www/bingomaster/* /var/www/bingomaster-backup-$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Clear and prepare directory
    print("Preparing deployment directory...")
    commands = [
        "rm -rf /var/www/bingomaster/*",
        "mkdir -p /var/www/bingomaster"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Upload core files
    print("Uploading application files...")
    files_to_upload = [
        ("vps_complete_deploy/package.json", "/var/www/bingomaster/package.json"),
        ("vps_complete_deploy/.env", "/var/www/bingomaster/.env")
    ]
    
    for local_file, remote_file in files_to_upload:
        if upload_file(local_file, remote_file):
            print(f"✅ Uploaded {local_file}")
        else:
            print(f"❌ Failed to upload {local_file}")
    
    # Upload and extract application
    if os.path.exists("vps_complete_deploy/app.tar.gz"):
        if upload_file("vps_complete_deploy/app.tar.gz", "/var/www/bingomaster/app.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf app.tar.gz && rm app.tar.gz")
            print("✅ Application files deployed")
    
    # Upload and extract public assets
    if os.path.exists("vps_complete_deploy/public.tar.gz"):
        if upload_file("vps_complete_deploy/public.tar.gz", "/var/www/bingomaster/public.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf public.tar.gz && rm public.tar.gz")
            print("✅ Public assets deployed")
    
    # Upload and extract audio assets
    if os.path.exists("vps_complete_deploy/assets.tar.gz"):
        if upload_file("vps_complete_deploy/assets.tar.gz", "/var/www/bingomaster/assets.tar.gz"):
            run_ssh_command("cd /var/www/bingomaster && tar -xzf assets.tar.gz && rm assets.tar.gz")
            print("✅ Audio assets deployed")
    
    # Install dependencies
    print("Installing dependencies...")
    run_ssh_command("cd /var/www/bingomaster && npm install --production")
    
    # Create systemd service
    print("Configuring system service...")
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
    
    with open("temp_service_file", "w") as f:
        f.write(service_content)
    
    upload_file("temp_service_file", "/etc/systemd/system/bingomaster.service")
    os.remove("temp_service_file")
    
    # Start the service
    print("Starting BingoMaster service...")
    commands = [
        "systemctl daemon-reload",
        "systemctl enable bingomaster",
        "systemctl start bingomaster",
        "sleep 10"
    ]
    for cmd in commands:
        run_ssh_command(cmd)
    
    # Check service status
    print("Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager -l")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service not running properly:")
        print(stdout)
        # Get logs
        code, logs, _ = run_ssh_command("journalctl -u bingomaster --no-pager --lines=20")
        print("Service logs:")
        print(logs)
    
    # Test the application
    print("Testing deployed application...")
    import time
    time.sleep(5)
    
    # Test main page
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/'], capture_output=True, text=True, timeout=10)
    if "<!DOCTYPE html>" in result.stdout:
        print("✅ Main page accessible")
    else:
        print("❌ Main page not accessible")
    
    # Test employee dashboard
    result = subprocess.run(['curl', '-s', 'http://91.99.161.246/dashboard/employee'], capture_output=True, text=True, timeout=10)
    if "<!DOCTYPE html>" in result.stdout:
        print("✅ Employee dashboard accessible")
    else:
        print("❌ Employee dashboard not accessible")
    
    # Test API endpoints
    health_result = subprocess.run(['curl', '-s', 'http://91.99.161.246/api/health'], capture_output=True, text=True, timeout=10)
    if health_result.stdout and "status" in health_result.stdout:
        print("✅ API endpoints responding")
    else:
        print("❌ API endpoints not responding")
    
    # Clean up deployment files
    subprocess.run(["rm", "-rf", "vps_complete_deploy"], capture_output=True)
    
    print("\n🎉 DEPLOYMENT COMPLETE!")
    print("🌐 BingoMaster is now running the current version")
    print("📱 Access: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin: http://91.99.161.246/dashboard/admin")
    
    return True

if __name__ == "__main__":
    success = deploy_current_version()
    if success:
        print("\n✅ VPS updated with current version successfully!")
    else:
        print("\n❌ VPS update failed.")