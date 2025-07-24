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

def verify_vps_issues():
    """Login to VPS and verify actual issues"""
    print("🔍 Logging into VPS to verify actual issues...")
    
    # Check what's actually running
    print("\n1. Checking actual server status...")
    code, stdout, stderr = run_ssh_command("systemctl status bingomaster --no-pager")
    if "active (running)" in stdout:
        print("✅ Service is running")
    else:
        print("❌ Service issue")
        return
    
    # Test superadmin login with curl session
    print("\n2. Testing superadmin login with session cookies...")
    
    # Create session and login
    login_command = '''
    curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{"username":"superadmin","password":"a1e2y3t4h5"}'
    '''
    code, stdout, stderr = run_ssh_command(login_command)
    print(f"Superadmin login response: {stdout}")
    
    # Test session persistence
    session_test = "curl -s -b /tmp/cookies.txt http://localhost:3000/api/auth/me"
    code, stdout, stderr = run_ssh_command(session_test)
    print(f"Session test: {stdout}")
    
    # Test adad login and check for cartela issues
    print("\n3. Testing adad login and cartela data...")
    
    adad_login = '''
    curl -s -c /tmp/adad_cookies.txt -X POST http://localhost:3000/api/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{"username":"adad","password":"123456"}'
    '''
    code, stdout, stderr = run_ssh_command(adad_login)
    print(f"Adad login response: {stdout}")
    
    # Check cartelas with session
    cartela_test = "curl -s -b /tmp/adad_cookies.txt http://localhost:3000/api/cartelas/5"
    code, stdout, stderr = run_ssh_command(cartela_test)
    
    # Parse and analyze cartela data
    try:
        cartelas = json.loads(stdout)
        if isinstance(cartelas, list) and len(cartelas) > 0:
            first_few = cartelas[:3]
            print(f"Cartelas found: {len(cartelas)}")
            for cartela in first_few:
                number = cartela.get('number', 'UNDEFINED')
                id_val = cartela.get('id', 'UNDEFINED')
                print(f"   Cartela ID: {id_val}, Number: {number}")
            
            # Check for undefined values
            undefined_count = sum(1 for c in cartelas if c.get('number') is None or str(c.get('number')) == 'undefined')
            if undefined_count > 0:
                print(f"❌ Found {undefined_count} cartelas with undefined numbers!")
            else:
                print("✅ No undefined cartela numbers found")
        else:
            print("❌ No cartelas returned or invalid format")
    except Exception as e:
        print(f"❌ Error parsing cartelas: {e}")
        print(f"Raw response: {stdout[:200]}...")
    
    # Check collectors for adad specifically
    print("\n4. Testing collectors visibility for adad...")
    
    collectors_test = "curl -s -b /tmp/adad_cookies.txt http://localhost:3000/api/employees/14/collectors"
    code, stdout, stderr = run_ssh_command(collectors_test)
    
    try:
        collectors = json.loads(stdout)
        if isinstance(collectors, list):
            print(f"Collectors for adad (ID 14): {len(collectors)}")
            for collector in collectors:
                print(f"   • {collector['username']} (ID: {collector['id']}, Supervisor: {collector.get('supervisorId')})")
        else:
            print(f"❌ Invalid collectors response: {stdout}")
    except Exception as e:
        print(f"❌ Error parsing collectors: {e}")
        print(f"Raw response: {stdout}")
    
    # Check all collectors in system
    print("\n5. Checking all collectors in system...")
    all_collectors_test = "curl -s -b /tmp/adad_cookies.txt http://localhost:3000/api/collectors"
    code, stdout, stderr = run_ssh_command(all_collectors_test)
    
    try:
        all_collectors = json.loads(stdout)
        if isinstance(all_collectors, list):
            print(f"Total collectors in system: {len(all_collectors)}")
            for collector in all_collectors:
                supervisor_id = collector.get('supervisorId', 'None')
                print(f"   • {collector['username']} supervising under ID {supervisor_id}")
        else:
            print(f"❌ Invalid all collectors response: {stdout}")
    except Exception as e:
        print(f"❌ Error parsing all collectors: {e}")
    
    # Check actual server logs for errors
    print("\n6. Checking recent server logs for errors...")
    logs_command = "journalctl -u bingomaster --no-pager -n 20 | grep -E '(error|Error|ERROR|undefined|null)'"
    code, stdout, stderr = run_ssh_command(logs_command)
    if stdout.strip():
        print("Recent errors found:")
        print(stdout)
    else:
        print("No recent errors in logs")
    
    # Check if cartela data is actually properly structured in memory
    print("\n7. Testing cartela structure directly...")
    structure_test = '''curl -s http://localhost:3000/api/cartelas/5 | head -c 500'''
    code, stdout, stderr = run_ssh_command(structure_test)
    print(f"Raw cartela structure: {stdout}")
    
    # Clean up cookies
    run_ssh_command("rm -f /tmp/cookies.txt /tmp/adad_cookies.txt")
    
    print("\n" + "="*60)
    print("🎯 VPS VERIFICATION SUMMARY")
    print("Issues found need to be addressed:")
    print("1. Superadmin login verification")
    print("2. Cartela undefined values investigation") 
    print("3. Collector count for adad user")

if __name__ == "__main__":
    verify_vps_issues()