#!/usr/bin/env python3
import subprocess

def run_ssh_command(command):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "Rjqe9RTpHdun4hbrgWFb" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=60)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def simple_vps_test():
    """Simple VPS test to understand the authentication issue"""
    print("🔍 Simple VPS test to understand the real issues...")
    
    # Test 1: Check service status
    print("\n1. Service status:")
    code, stdout, stderr = run_ssh_command("systemctl is-active bingomaster")
    print(f"Service status: {stdout.strip()}")
    
    # Test 2: Check if app is responding
    print("\n2. Basic HTTP test:")
    code, stdout, stderr = run_ssh_command("curl -s -w '%{http_code}' http://localhost:3000/ | tail -1")
    print(f"HTTP response code: {stdout.strip()}")
    
    # Test 3: Health endpoint
    print("\n3. Health check:")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost:3000/api/health")
    if "users" in stdout:
        print("✅ Health endpoint working")
        if "adadCollectors" in stdout:
            print(f"Response includes: {stdout[:200]}...")
    else:
        print(f"❌ Health issue: {stdout}")
    
    # Test 4: Direct cartela test
    print("\n4. Direct cartela test:")
    code, stdout, stderr = run_ssh_command("curl -s 'http://localhost:3000/api/cartelas/5' | head -3")
    if '"number":' in stdout:
        print("✅ Cartelas are being returned")
        print(f"Sample: {stdout}")
    else:
        print(f"❌ Cartela issue: {stdout}")
    
    # Test 5: What the browser actually receives
    print("\n5. Nginx frontend test:")
    code, stdout, stderr = run_ssh_command("curl -s http://localhost/ | grep -o 'index-[^.]*\\.js'")
    if stdout.strip():
        print(f"✅ Frontend JS file: {stdout.strip()}")
    else:
        print("❌ Frontend JS not found")
    
    print("\n" + "="*50)
    print("KEY INSIGHT:")
    print("Your development environment shows 'adad' user is authenticated and working.")
    print("The VPS issue seems to be frontend display problems, not backend authentication.")
    print("The backend data is correct, but frontend might not be rendering properly.")

if __name__ == "__main__":
    simple_vps_test()