#!/usr/bin/env python3
import requests
import json

def test_vps_final():
    """Simple final test of VPS deployment"""
    base_url = "http://91.99.161.246"
    
    print("🧪 Final VPS Test...")
    
    try:
        # Test 1: Health check
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health OK - Users: {data.get('users')}, Cartelas: {data.get('cartelas')}")
        else:
            print(f"❌ Health failed: {response.status_code}")
            return False
        
        # Test 2: Superadmin login
        print("2. Testing superadmin login...")
        session = requests.Session()
        login_data = {"username": "superadmin", "password": "a1e2y3t4h5"}
        response = session.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✅ Superadmin login working - Role: {user_data.get('user', {}).get('role')}")
        else:
            print(f"❌ Superadmin login failed: {response.status_code} - {response.text}")
        
        # Test 3: Adad login and cartelas
        print("3. Testing adad with cartelas...")
        session2 = requests.Session()
        login_data = {"username": "adad", "password": "123456"}
        response = session2.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            print("✅ Adad login working")
            
            # Test cartelas
            response = session2.get(f"{base_url}/api/cartelas/5", timeout=10)
            if response.status_code == 200:
                cartelas = response.json()
                undefined_count = sum(1 for c in cartelas if c.get('number') is None)
                print(f"✅ Cartelas working - {len(cartelas)} total, {undefined_count} undefined")
            else:
                print(f"❌ Cartelas failed: {response.status_code}")
        else:
            print(f"❌ Adad login failed: {response.status_code}")
        
        print("\n🎯 VPS DEPLOYMENT STATUS")
        print("=" * 50)
        print("🌍 URL: http://91.99.161.246")
        print("📱 Employee: http://91.99.161.246/dashboard/employee")
        print("🏢 Admin: http://91.99.161.246/dashboard/admin")
        print("\n🔐 CREDENTIALS:")
        print("• superadmin / a1e2y3t4h5")
        print("• adad / 123456")
        print("• collector1-4 / 123456")
        
        return True
        
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    test_vps_final()