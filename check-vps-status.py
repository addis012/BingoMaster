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

def check_vps_status():
    """Check comprehensive VPS status"""
    print("🔍 Checking VPS status...")
    
    # Check service status
    print("1. Service status:")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    print(stdout)
    
    # Check if server is listening on port 3000
    print("2. Port 3000 status:")
    code, stdout, stderr = run_ssh_command("netstat -tlnp | grep :3000")
    if stdout:
        print(f"✅ Port 3000 is listening: {stdout}")
    else:
        print("❌ Port 3000 not listening")
    
    # Check firewall status
    print("3. Firewall status:")
    code, stdout, stderr = run_ssh_command("ufw status")
    print(stdout)
    
    # Check nginx status and config
    print("4. Nginx status:")
    code, stdout, stderr = run_ssh_command("systemctl status nginx --no-pager")
    print(stdout)
    
    # Test local connection
    print("5. Local HTTP test:")
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000/api/health")
    if "200 OK" in stdout:
        print("✅ Local HTTP working")
    else:
        print(f"❌ Local HTTP issue: {stdout}")
    
    # Test local health endpoint
    print("6. Local health endpoint:")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    print(f"Health response: {stdout}")
    
    # Check nginx config for proxy
    print("7. Nginx config:")
    code, stdout, stderr = run_ssh_command("cat /etc/nginx/sites-available/default | grep -A 10 location")
    print(stdout)

if __name__ == "__main__":
    check_vps_status()