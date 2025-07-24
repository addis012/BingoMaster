#!/usr/bin/env python3
import subprocess

def test_vps():
    """Test VPS connection and basic functionality"""
    password = "akunamatata"
    
    print("Testing VPS connection...")
    
    # Test SSH connection
    try:
        result = subprocess.run([
            'sshpass', '-p', password, 'ssh', 
            '-o', 'StrictHostKeyChecking=no',
            '-o', 'ConnectTimeout=5',
            'root@91.99.161.246', 
            'echo "Connection successful"'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("✅ SSH connection working")
        else:
            print(f"❌ SSH failed: {result.stderr}")
            return False
    except:
        print("❌ SSH connection failed")
        return False
    
    # Test basic commands
    try:
        result = subprocess.run([
            'sshpass', '-p', password, 'ssh',
            '-o', 'StrictHostKeyChecking=no',
            'root@91.99.161.246',
            'whoami && pwd && ls -la /var/www/'
        ], capture_output=True, text=True, timeout=10)
        
        print("Basic info:", result.stdout)
    except:
        print("❌ Basic commands failed")
        
    return True

if __name__ == "__main__":
    test_vps()