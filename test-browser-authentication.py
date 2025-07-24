#!/usr/bin/env python3
import subprocess
import requests
import json

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def test_browser_authentication():
    """Test actual browser authentication patterns"""
    print("🔍 Testing browser-style authentication on VPS...")
    
    # Test via browser-like requests (using python requests to mimic browser)
    try:
        # Create session like browser
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json'
        })
        
        # Test superadmin login (browser style)
        print("\n1. Testing superadmin login (browser style)...")
        login_data = {
            "username": "superadmin",
            "password": "a1e2y3t4h5"
        }
        
        response = session.post('http://91.99.161.246:3000/api/auth/login', json=login_data, timeout=10)
        print(f"Superadmin login status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            # Test session persistence
            me_response = session.get('http://91.99.161.246:3000/api/auth/me', timeout=10)
            print(f"Session check: {me_response.status_code} - {me_response.text}")
        
        # Test adad login
        print("\n2. Testing adad login (browser style)...")
        adad_session = requests.Session()
        adad_session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json'
        })
        
        adad_data = {
            "username": "adad", 
            "password": "123456"
        }
        
        adad_response = adad_session.post('http://91.99.161.246:3000/api/auth/login', json=adad_data, timeout=10)
        print(f"Adad login status: {adad_response.status_code}")
        print(f"Response: {adad_response.text}")
        
        if adad_response.status_code == 200:
            # Test collectors for adad
            collectors_response = adad_session.get('http://91.99.161.246:3000/api/employees/14/collectors', timeout=10)
            print(f"Collectors check: {collectors_response.status_code}")
            print(f"Collectors: {collectors_response.text}")
            
            # Test cartelas for adad
            cartelas_response = adad_session.get('http://91.99.161.246:3000/api/cartelas/5', timeout=10)
            print(f"Cartelas check: {cartelas_response.status_code}")
            
            if cartelas_response.status_code == 200:
                cartelas = cartelas_response.json()
                print(f"Cartelas count: {len(cartelas)}")
                if len(cartelas) > 0:
                    first_few = cartelas[:3]
                    for cartela in first_few:
                        print(f"   Cartela ID: {cartela.get('id')}, Number: {cartela.get('number')}")
        
    except Exception as e:
        print(f"❌ Browser test failed: {e}")
        
        # Fallback to direct VPS curl test with better format
        print("\n3. Testing with VPS curl (escaped quotes)...")
        
        # Test with different curl format
        curl_test = """curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"superadmin","password":"a1e2y3t4h5"}'"""
        code, stdout, stderr = run_ssh_command(curl_test)
        print(f"VPS curl test: {stdout}")
        
        # Test health again
        health_test = "curl -s http://localhost:3000/api/health"
        code, stdout, stderr = run_ssh_command(health_test)
        try:
            health = json.loads(stdout)
            print(f"\nHealth summary:")
            print(f"   Users: {health.get('users')}")
            print(f"   Collectors: {health.get('collectors')}")
            print(f"   Adad collectors: {health.get('adadCollectors')}")
            print(f"   Cartelas: {health.get('cartelas')}")
        except:
            print(f"Health response: {stdout}")

if __name__ == "__main__":
    test_browser_authentication()