#!/usr/bin/env python3
import subprocess
import sys
import time

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        # Use sshpass to provide password non-interactively
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

def check_vps_status():
    """Check VPS application status"""
    print("🔍 Checking VPS application status...")
    
    # Check if application is running
    print("\n1. Checking application process:")
    code, stdout, stderr = run_ssh_command("ps aux | grep -E '(node|npm|bingomaster)' | grep -v grep")
    if code == 0:
        print(f"✅ Application processes:\n{stdout}")
    else:
        print(f"❌ No application processes found")
    
    # Check systemd service
    print("\n2. Checking systemd service:")
    code, stdout, stderr = run_ssh_command("systemctl is-active bingomaster 2>/dev/null || echo 'Service not found'")
    print(f"Service status: {stdout.strip()}")
    
    # Check if app directory exists
    print("\n3. Checking application directory:")
    code, stdout, stderr = run_ssh_command("ls -la /var/www/bingomaster/ 2>/dev/null || echo 'Directory not found'")
    if "package.json" in stdout:
        print("✅ Application directory exists with package.json")
    else:
        print("❌ Application directory missing or incomplete")
    
    # Check nginx status
    print("\n4. Checking Nginx:")
    code, stdout, stderr = run_ssh_command("systemctl is-active nginx")
    print(f"Nginx status: {stdout.strip()}")
    
    # Check if port 3000 is listening
    print("\n5. Checking port 3000:")
    code, stdout, stderr = run_ssh_command("netstat -tulnp | grep :3000 || echo 'Port 3000 not listening'")
    print(f"Port 3000: {stdout.strip()}")
    
    # Test HTTP response
    print("\n6. Testing HTTP response:")
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000 | head -1 || echo 'No response'")
    print(f"HTTP response: {stdout.strip()}")

if __name__ == "__main__":
    check_vps_status()