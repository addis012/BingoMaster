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

def test_vps_directly():
    """Test VPS by logging in directly"""
    print("🔍 Testing VPS directly via SSH...")
    
    # Check if service is running
    print("\n1. Checking service status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service not running properly")
        print(f"Status: {stdout}")
    
    # Test superadmin login directly on VPS
    print("\n2. Testing superadmin login directly on VPS...")
    test_command = '''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"superadmin","password":"a1e2y3t4h5"}' '''
    code, stdout, stderr = run_ssh_command(test_command)
    print(f"Superadmin login response: {stdout}")
    
    # Test adad login and cartelas directly on VPS
    print("\n3. Testing adad login and cartelas directly on VPS...")
    test_command = '''curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"adad","password":"123456"}' '''
    code, stdout, stderr = run_ssh_command(test_command)
    print(f"Adad login response: {stdout}")
    
    # Test cartelas for shop 5 directly on VPS
    print("\n4. Testing cartelas for shop 5 directly on VPS...")
    test_command = "curl -s http://localhost:3000/api/cartelas/5"
    code, stdout, stderr = run_ssh_command(test_command)
    print(f"Cartelas response (first 200 chars): {stdout[:200]}...")
    
    # Test collectors directly on VPS
    print("\n5. Testing collectors directly on VPS...")
    test_command = "curl -s http://localhost:3000/api/users"
    code, stdout, stderr = run_ssh_command(test_command)
    
    try:
        users_data = json.loads(stdout)
        collectors = [u for u in users_data if u.get('role') == 'collector']
        print(f"Found {len(collectors)} collectors:")
        for collector in collectors:
            print(f"  • {collector['username']} (ID: {collector['id']}, Supervisor: {collector.get('supervisorId')})")
    except:
        print(f"Users response error: {stdout[:200]}...")
    
    # Check what's actually in the server file
    print("\n6. Checking actual server file content...")
    code, stdout, stderr = run_ssh_command("head -20 /var/www/bingomaster/index.js")
    print(f"Server file first 20 lines:\n{stdout}")
    
    # Check server logs
    print("\n7. Checking recent server logs...")
    code, stdout, stderr = run_ssh_command("journalctl -u bingomaster --no-pager -n 10")
    print(f"Recent logs:\n{stdout}")

if __name__ == "__main__":
    test_vps_directly()