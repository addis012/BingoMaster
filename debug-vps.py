#!/usr/bin/env python3
import subprocess

def run_ssh_command(command, password="akunamatata"):
    """Run SSH command on VPS with password"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=60)
        return result.returncode, result.stdout, result.stderr
    except:
        return -1, "", "Failed"

def debug_vps():
    """Debug VPS deployment issues"""
    print("🔍 Debugging VPS deployment...")
    
    # Check service status
    print("\n1. Service status:")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    print(stdout)
    
    # Check service logs
    print("\n2. Service logs:")
    code, stdout, stderr = run_ssh_command("journalctl -u bingomaster --no-pager --lines=20")
    print(stdout)
    
    # Check if files exist
    print("\n3. File structure:")
    code, stdout, stderr = run_ssh_command("ls -la /var/www/bingomaster/")
    print(stdout)
    
    # Check if built server exists
    print("\n4. Built server:")
    code, stdout, stderr = run_ssh_command("ls -la /var/www/bingomaster/dist/")
    print(stdout)
    
    # Try manual start
    print("\n5. Manual start test:")
    code, stdout, stderr = run_ssh_command("cd /var/www/bingomaster && timeout 5 node dist/index.js 2>&1 || echo 'Manual start failed'")
    print(stdout)
    
    # Check Node.js version
    print("\n6. Node.js version:")
    code, stdout, stderr = run_ssh_command("node --version && npm --version")
    print(stdout)
    
    # Check package.json
    print("\n7. Package.json:")
    code, stdout, stderr = run_ssh_command("cat /var/www/bingomaster/package.json")
    print(stdout)

if __name__ == "__main__":
    debug_vps()