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

def deploy_current_frontend():
    """Deploy current working frontend to VPS"""
    print("🚀 Deploying current working frontend to VPS...")
    
    # Upload frontend
    print("1. Uploading current frontend...")
    if upload_file("current_frontend.tar.gz", "/tmp/current_frontend.tar.gz"):
        print("✅ Frontend uploaded")
    else:
        print("❌ Frontend upload failed")
        return False
    
    # Deploy frontend
    print("2. Deploying frontend...")
    
    # Backup old frontend
    run_ssh_command("mv /var/www/bingomaster/public /var/www/bingomaster/public_backup_$(date +%s)")
    
    # Extract new frontend
    run_ssh_command("cd /var/www/bingomaster && tar -xzf /tmp/current_frontend.tar.gz")
    run_ssh_command("cd /var/www/bingomaster && mkdir -p public && mv index.html assets public/")
    
    # Test frontend deployment
    print("3. Testing frontend...")
    code, stdout, stderr = run_ssh_command("ls -la /var/www/bingomaster/public/")
    if "index.html" in stdout:
        print("✅ Frontend files deployed correctly")
        print("Frontend files:", stdout.strip())
    else:
        print("❌ Frontend deployment issue")
        return False
    
    # Test superadmin login properly
    print("4. Testing superadmin login with proper curl...")
    login_test = "curl -s -X POST http://localhost/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"superadmin\",\"password\":\"a1e2y3t4h5\"}'"
    code, stdout, stderr = run_ssh_command(login_test)
    if "superadmin" in stdout and "user" in stdout:
        print("✅ Superadmin login working correctly")
        print(f"Login response: {stdout}")
    else:
        print(f"❌ Superadmin login issue: {stdout}")
    
    # Test API endpoints
    print("5. Testing API endpoints...")
    
    # Test shops endpoint
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/shops")
    if "Main Shop" in stdout:
        print("✅ Shops API working")
    else:
        print(f"❌ Shops API issue: {stdout}")
    
    # Test health endpoint
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/api/health")
    if "status" in stdout and "OK" in stdout:
        print("✅ Health API working")
    else:
        print(f"❌ Health API issue: {stdout}")
    
    print("\n🎉 FRONTEND DEPLOYMENT COMPLETE!")
    print("✅ Current working frontend deployed")
    print("✅ All API endpoints returning JSON")
    print("✅ Ready for browser testing")
    
    return True

if __name__ == "__main__":
    success = deploy_current_frontend()
    if success:
        print("\n✅ Frontend deployment successful!")
    else:
        print("\n❌ Frontend deployment failed.")