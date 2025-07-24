#!/usr/bin/env python3
import subprocess
import json
import requests

def test_vps_comprehensive():
    """Test all VPS functionality comprehensively"""
    print("🧪 Testing VPS comprehensive functionality...")
    
    # Test 1: Superadmin login
    print("\n1. Testing superadmin login...")
    try:
        response = requests.post('http://91.99.161.246/api/auth/login', 
                               json={"username": "superadmin", "password": "a1e2y3t4h5"},
                               timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'user' in data and data['user']['role'] == 'superadmin':
                print("✅ Superadmin login WORKS with password: a1e2y3t4h5")
            else:
                print("❌ Superadmin login failed - wrong response")
        else:
            print(f"❌ Superadmin login failed - status {response.status_code}")
    except Exception as e:
        print(f"❌ Superadmin login error: {e}")
    
    # Test 2: Employee login and cartelas
    print("\n2. Testing employee login and cartelas...")
    session = requests.Session()
    try:
        # Login as adad
        response = session.post('http://91.99.161.246/api/auth/login',
                              json={"username": "adad", "password": "123456"},
                              timeout=10)
        if response.status_code == 200:
            print("✅ Employee adad login works")
            
            # Test cartelas for shop 5
            response = session.get('http://91.99.161.246/api/cartelas/5', timeout=10)
            if response.status_code == 200:
                cartelas = response.json()
                if isinstance(cartelas, list) and len(cartelas) > 0:
                    first_cartela = cartelas[0]
                    if 'number' in first_cartela and first_cartela['number'] is not None:
                        print(f"✅ Cartelas work: {len(cartelas)} cartelas, first cartela number: {first_cartela['number']}")
                    else:
                        print(f"❌ Cartelas undefined: {first_cartela}")
                else:
                    print(f"❌ No cartelas found")
            else:
                print(f"❌ Cartelas request failed - status {response.status_code}")
        else:
            print(f"❌ Employee login failed - status {response.status_code}")
    except Exception as e:
        print(f"❌ Employee test error: {e}")
    
    # Test 3: Collectors with authentication
    print("\n3. Testing collectors with admin authentication...")
    admin_session = requests.Session()
    try:
        # Login as admin
        response = admin_session.post('http://91.99.161.246/api/auth/login',
                                    json={"username": "admin", "password": "123456"},
                                    timeout=10)
        if response.status_code == 200:
            print("✅ Admin login works")
            
            # Test collectors endpoint
            response = admin_session.get('http://91.99.161.246/api/collectors', timeout=10)
            if response.status_code == 200:
                collectors = response.json()
                if isinstance(collectors, list) and len(collectors) >= 4:
                    print(f"✅ Collectors work: {len(collectors)} collectors found")
                    for i, collector in enumerate(collectors[:4]):
                        print(f"   • {collector['username']} (ID: {collector['id']}, Supervisor: {collector.get('supervisorId', 'None')})")
                else:
                    print(f"❌ Insufficient collectors: {len(collectors) if isinstance(collectors, list) else 'Not a list'}")
            else:
                print(f"❌ Collectors request failed - status {response.status_code}")
        else:
            print(f"❌ Admin login failed - status {response.status_code}")
    except Exception as e:
        print(f"❌ Collectors test error: {e}")
    
    # Test 4: All collector logins
    print("\n4. Testing all 4 collector logins...")
    collector_names = ['collector1', 'collector2', 'collector3', 'collector4']
    for collector_name in collector_names:
        try:
            response = requests.post('http://91.99.161.246/api/auth/login',
                                   json={"username": collector_name, "password": "123456"},
                                   timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'user' in data and data['user']['role'] == 'collector':
                    print(f"✅ {collector_name} login works")
                else:
                    print(f"❌ {collector_name} wrong role")
            else:
                print(f"❌ {collector_name} login failed - status {response.status_code}")
        except Exception as e:
            print(f"❌ {collector_name} login error: {e}")
    
    # Test 5: Health endpoint comprehensive
    print("\n5. Testing system health...")
    try:
        response = requests.get('http://91.99.161.246/api/health', timeout=10)
        if response.status_code == 200:
            health = response.json()
            print(f"✅ System health: {health['users']} users, {health['collectors']} collectors, {health['cartelas']} cartelas")
            print(f"   Version: {health['version']}")
            print(f"   Hostname: {health['hostname']}")
        else:
            print(f"❌ Health check failed - status {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    print("\n" + "="*60)
    print("🎯 VPS Test Summary:")
    print("🌍 Server: aradabingo (91.99.161.246)")
    print("🌐 Application: http://91.99.161.246")
    print("📱 Employee Dashboard: http://91.99.161.246/dashboard/employee")
    print("🏢 Admin Dashboard: http://91.99.161.246/dashboard/admin")
    print("🔐 Credentials:")
    print("   • admin / 123456 (Admin)")
    print("   • superadmin / a1e2y3t4h5 (Super Admin)")
    print("   • adad / 123456 (Employee)")
    print("   • alex1 / 123456 (Employee)")
    print("   • kal1 / 123456 (Employee)")
    print("   • collector1 / 123456 (Collector)")
    print("   • collector2 / 123456 (Collector)")
    print("   • collector3 / 123456 (Collector)")
    print("   • collector4 / 123456 (Collector)")

if __name__ == "__main__":
    test_vps_comprehensive()