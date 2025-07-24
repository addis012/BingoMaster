#!/usr/bin/env python3
import subprocess
import json

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def check_vps_actual_status():
    """Check what's actually running on VPS and why authentication fails"""
    print("🔍 Checking actual VPS status and authentication issues...")
    
    # Check what's actually running
    print("\n1. Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service issue:")
        print(stdout)
    
    # Check if the port is actually open
    print("\n2. Checking port accessibility...")
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep 3000")
    if "3000" in stdout:
        print("✅ Port 3000 is listening")
        print(stdout.strip())
    else:
        print("❌ Port 3000 not listening")
    
    # Check logs for recent errors
    print("\n3. Checking recent logs...")
    code, stdout, stderr = run_ssh_command("journalctl -u bingomaster --no-pager -n 10")
    print("Recent logs:")
    print(stdout)
    
    # Check what's actually in the index.js file
    print("\n4. Checking server file...")
    code, stdout, stderr = run_ssh_command("head -50 /var/www/bingomaster/index.js")
    print("Server file start:")
    print(stdout)
    
    # Test direct HTTP connection
    print("\n5. Testing HTTP directly...")
    code, stdout, stderr = run_ssh_command("curl -v http://localhost:3000/ 2>&1 | head -20")
    print("HTTP test:")
    print(stdout)
    
    # Check nginx status and config
    print("\n6. Checking nginx...")
    code, stdout, stderr = run_ssh_command("systemctl status nginx --no-pager")
    if "active (running)" in stdout:
        print("✅ Nginx is running")
    else:
        print("❌ Nginx issue")
    
    # Check nginx config
    code, stdout, stderr = run_ssh_command("cat /etc/nginx/sites-available/bingomaster")
    print("\nNginx config:")
    print(stdout[:500] + "..." if len(stdout) > 500 else stdout)
    
    # Test the actual frontend
    print("\n7. Testing frontend access...")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/ | head -10")
    print("Frontend test:")
    print(stdout)
    
    print("\n" + "="*60)
    print("🎯 VPS STATUS SUMMARY")
    print("The issue appears to be with request parsing or server configuration")
    print("Let me check if the development environment authentication works differently")

if __name__ == "__main__":
    check_vps_actual_status()