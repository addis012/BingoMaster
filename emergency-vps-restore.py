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

def emergency_vps_restore():
    """Emergency restore VPS service"""
    print("🚨 Emergency VPS service restore...")
    
    # Check service status
    print("1. Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    print(f"Service status: {stdout}")
    
    # Check logs for errors
    print("2. Checking error logs...")
    code, stdout, stderr = run_ssh_command("journalctl -u bingomaster --no-pager -n 20")
    print(f"Recent logs: {stdout}")
    
    # Check if server file has syntax errors
    print("3. Checking server file...")
    code, stdout, stderr = run_ssh_command("node -c /var/www/bingomaster/index.js")
    if code == 0:
        print("✅ Server file syntax is OK")
    else:
        print(f"❌ Server syntax error: {stderr}")
    
    # Try to restart the service
    print("4. Restarting service...")
    run_ssh_command("systemctl restart bingomaster")
    run_ssh_command("sleep 5")
    
    # Check if it's running
    code, stdout, stderr = run_ssh_command("systemctl is-active bingomaster")
    if "active" in stdout:
        print("✅ Service restarted successfully")
    else:
        print("❌ Service failed to start")
        
        # Try manual start for debugging
        print("5. Trying manual start...")
        code, stdout, stderr = run_ssh_command("cd /var/www/bingomaster && timeout 10s node index.js")
        print(f"Manual start output: {stdout}")
        print(f"Manual start errors: {stderr}")
    
    # Test basic HTTP
    print("6. Testing HTTP response...")
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000/")
    if "200 OK" in stdout:
        print("✅ HTTP is responding")
    else:
        print(f"❌ HTTP issue: {stdout}")
    
    # Test health endpoint
    print("7. Testing health endpoint...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    if "status" in stdout:
        print("✅ Health endpoint working")
        print(f"Health response: {stdout}")
    else:
        print(f"❌ Health endpoint issue: {stdout}")

if __name__ == "__main__":
    emergency_vps_restore()