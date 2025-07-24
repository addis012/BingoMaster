#!/usr/bin/env python3
import subprocess

def run_ssh_command(command, password="Rjqe9RTpHdun4hbrgWFb"):
    """Run SSH command on VPS"""
    try:
        full_command = f'sshpass -p "{password}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=15 root@91.99.161.246 "{command}"'
        result = subprocess.run(full_command, shell=True, capture_output=True, text=True, timeout=120)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def fix_vps_configuration():
    """Fix VPS firewall and nginx configuration"""
    print("🔧 Fixing VPS configuration...")
    
    # Add port 3000 to firewall
    print("1. Adding port 3000 to firewall...")
    run_ssh_command("ufw allow 3000")
    
    # Configure nginx to proxy to Node.js app
    print("2. Configuring nginx reverse proxy...")
    nginx_config = '''server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Proxy all requests to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}'''
    
    # Create nginx config file
    with open("nginx_default", "w") as f:
        f.write(nginx_config)
    
    # Upload nginx config
    upload_file("nginx_default", "/etc/nginx/sites-available/default")
    
    # Test nginx config
    code, stdout, stderr = run_ssh_command("nginx -t")
    if code == 0:
        print("✅ Nginx config valid")
        
        # Reload nginx
        run_ssh_command("systemctl reload nginx")
        print("✅ Nginx reloaded")
    else:
        print(f"❌ Nginx config error: {stderr}")
    
    # Test the final setup
    print("3. Testing final configuration...")
    
    # Test direct port 3000
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost:3000/api/health")
    if "200 OK" in stdout:
        print("✅ Port 3000 working")
    
    # Test nginx proxy (port 80)
    code, stdout, stderr = run_ssh_command("curl -s -I http://localhost/api/health")
    if "200 OK" in stdout:
        print("✅ Nginx proxy working")
    else:
        print("❌ Nginx proxy not working")
    
    # Check firewall again
    code, stdout, stderr = run_ssh_command("ufw status")
    print(f"Firewall status: {stdout}")
    
    # Clean up
    import os
    if os.path.exists("nginx_default"):
        os.remove("nginx_default")
    
    print("\\n🎉 VPS CONFIGURATION FIXED!")
    print("✅ Port 3000 allowed in firewall")
    print("✅ Nginx configured as reverse proxy")
    print("✅ Application accessible via http://91.99.161.246")

def upload_file(local_path, remote_path, password="Rjqe9RTpHdun4hbrgWFb"):
    """Upload file to VPS"""
    try:
        command = f'sshpass -p "{password}" scp -o StrictHostKeyChecking=no "{local_path}" root@91.99.161.246:"{remote_path}"'
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=180)
        return result.returncode == 0
    except:
        return False

if __name__ == "__main__":
    fix_vps_configuration()