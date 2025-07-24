#!/usr/bin/env python3
import requests
import json

def test_vps_working():
    """Simple test of VPS working status"""
    base_url = "http://91.99.161.246:3000"
    
    print("🧪 Testing VPS deployment...")
    
    try:
        # Test health endpoint
        print("1. Testing health endpoint...")
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print("✅ Health endpoint working")
            print(f"   Users: {health_data.get('users')}")
            print(f"   Cartelas: {health_data.get('cartelas')}")
            print(f"   Collectors: {health_data.get('collectors')}")
            print(f"   Adad collectors: {health_data.get('adadCollectors')}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
            return False
        
        # Test superadmin login
        print("2. Testing superadmin login...")
        login_data = {"username": "superadmin", "password": "a1e2y3t4h5"}
        session = requests.Session()
        response = session.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            user_data = response.json()
            print("✅ Superadmin login working")
            print(f"   User: {user_data.get('user', {}).get('username')}")
            print(f"   Role: {user_data.get('user', {}).get('role')}")
        else:
            print(f"❌ Superadmin login failed: {response.status_code}")
        
        # Test adad login
        print("3. Testing adad login...")
        login_data = {"username": "adad", "password": "123456"}
        session2 = requests.Session()
        response = session2.post(f"{base_url}/api/auth/login", json=login_data, timeout=10)
        if response.status_code == 200:
            print("✅ Adad login working")
            
            # Test adad collectors
            print("4. Testing adad collectors...")
            response = session2.get(f"{base_url}/api/employees/14/collectors", timeout=10)
            if response.status_code == 200:
                collectors = response.json()
                print(f"✅ Adad has {len(collectors)} collectors")
                for c in collectors:
                    print(f"   • {c.get('username')}: {c.get('name')}")
            else:
                print(f"❌ Collector test failed: {response.status_code}")
            
            # Test cartelas
            print("5. Testing cartelas...")
            response = session2.get(f"{base_url}/api/cartelas/5", timeout=10)
            if response.status_code == 200:
                cartelas = response.json()
                print(f"✅ Found {len(cartelas)} cartelas for shop 5")
                
                # Check for undefined values
                undefined_count = sum(1 for c in cartelas if c.get('number') is None)
                if undefined_count == 0:
                    print("✅ No undefined cartela numbers")
                else:
                    print(f"❌ {undefined_count} undefined cartela numbers found")
            else:
                print(f"❌ Cartela test failed: {response.status_code}")
        else:
            print(f"❌ Adad login failed: {response.status_code}")
        
        print("\n✅ VPS testing completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ VPS test error: {e}")
        return False

if __name__ == "__main__":
    test_vps_working()