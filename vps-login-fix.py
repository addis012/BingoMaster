#!/usr/bin/env python3
import subprocess
import json

def test_vps_endpoints():
    """Test different VPS endpoints to understand the issue"""
    
    base_url = "http://91.99.161.246"
    
    print("Testing VPS application endpoints...")
    
    # Test 1: Check if API is responding
    print("\n1. Testing basic API response:")
    result = subprocess.run([
        'curl', '-s', f'{base_url}/api/auth/me'
    ], capture_output=True, text=True)
    print(f"Auth endpoint: {result.stdout}")
    
    # Test 2: Try different login credentials
    test_credentials = [
        ("admin1", "123456"),
        ("admin1", "password"), 
        ("kal1", "123456"),
        ("alex1", "123456"),
        ("employee1", "123456"),
        ("admin", "admin"),
        ("test", "test")
    ]
    
    print("\n2. Testing login credentials:")
    for username, password in test_credentials:
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', 
            f'{base_url}/api/auth/login',
            '-H', 'Content-Type: application/json',
            '-d', json.dumps({"username": username, "password": password})
        ], capture_output=True, text=True)
        
        try:
            response = json.loads(result.stdout)
            if 'user' in response:
                print(f"✅ SUCCESS: {username}/{password} -> {response['user']['name']}")
                return username, password
            else:
                print(f"❌ FAILED: {username}/{password} -> {response.get('message', 'Unknown error')}")
        except:
            print(f"❌ INVALID: {username}/{password} -> {result.stdout}")
    
    # Test 3: Check if there are any API routes that work
    print("\n3. Testing other endpoints:")
    test_endpoints = [
        "/api/shops",
        "/api/users", 
        "/api/games",
        "/api/cartelas"
    ]
    
    for endpoint in test_endpoints:
        result = subprocess.run([
            'curl', '-s', f'{base_url}{endpoint}'
        ], capture_output=True, text=True)
        
        if result.stdout and not "Not authenticated" in result.stdout:
            print(f"✅ {endpoint}: Working")
        else:
            print(f"❌ {endpoint}: {result.stdout[:50]}...")
    
    # Test 4: Try to access employee dashboard directly
    print("\n4. Testing dashboard access:")
    result = subprocess.run([
        'curl', '-s', f'{base_url}/dashboard/employee'
    ], capture_output=True, text=True)
    
    if "BingoMaster" in result.stdout or "<!DOCTYPE html>" in result.stdout:
        print("✅ Employee dashboard: Accessible")
    else:
        print(f"❌ Employee dashboard: {result.stdout[:100]}...")
    
    return None

def suggest_solution():
    """Suggest solutions based on test results"""
    print("\n🔧 SOLUTION SUGGESTIONS:")
    print("The VPS application is running but authentication is failing.")
    print("This could be due to:")
    print("1. Database connection issues")
    print("2. Password hash mismatch") 
    print("3. Missing user data")
    print("4. Session configuration problems")
    print("\nTo access the employee dashboard:")
    print(f"🌐 Direct URL: http://91.99.161.246/dashboard/employee")
    print("📱 The React app should load even without authentication")
    print("🔑 Try visiting the dashboard URL directly in your browser")

if __name__ == "__main__":
    working_creds = test_vps_endpoints()
    if not working_creds:
        suggest_solution()
    else:
        print(f"\n✅ Working credentials found: {working_creds[0]} / {working_creds[1]}")
        print(f"🌐 You can now access: http://91.99.161.246")