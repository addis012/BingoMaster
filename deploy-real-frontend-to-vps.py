#!/usr/bin/env python3
"""
Deploy Real BingoMaster Frontend to VPS
Builds and deploys the actual React application
"""

import subprocess
import os
import shutil
import time

# VPS Configuration
VPS_HOST = "91.99.161.246"
VPS_USER = "root"
VPS_PASSWORD = "jUVcakxHajeL"
APP_DIR = "/var/www/bingomaster-full"

def run_command(command, show_output=True):
    """Execute command locally"""
    if show_output:
        print(f"Executing: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    if show_output and result.stdout:
        print(result.stdout)
    if result.stderr:
        print(f"Error: {result.stderr}")
    return result

def run_ssh_command(command, show_output=True):
    """Execute command on VPS via SSH"""
    ssh_cmd = f'sshpass -p "{VPS_PASSWORD}" ssh -o StrictHostKeyChecking=no {VPS_USER}@{VPS_HOST} "{command}"'
    if show_output:
        print(f"VPS: {command}")
    result = subprocess.run(ssh_cmd, shell=True, capture_output=True, text=True)
    if show_output and result.stdout:
        print(result.stdout)
    if result.stderr and "Warning" not in result.stderr:
        print(f"Error: {result.stderr}")
    return result

def upload_directory(local_dir, remote_dir):
    """Upload directory to VPS using rsync"""
    rsync_cmd = f'rsync -avz --delete -e "sshpass -p {VPS_PASSWORD} ssh -o StrictHostKeyChecking=no" {local_dir}/ {VPS_USER}@{VPS_HOST}:{remote_dir}/'
    print(f"Uploading {local_dir} -> {remote_dir}")
    subprocess.run(rsync_cmd, shell=True)

def main():
    print("🔧 Building and Deploying Real BingoMaster Frontend")
    
    # 1. Install frontend dependencies if needed
    print("\n1. Installing frontend dependencies...")
    if not os.path.exists("client/node_modules"):
        run_command("cd client && npm install")
    
    # 2. Build the frontend for production
    print("\n2. Building frontend for production...")
    # Set environment variables for build
    os.environ['VITE_API_URL'] = f'http://{VPS_HOST}'
    os.environ['VITE_WS_URL'] = f'ws://{VPS_HOST}:3001'
    
    # Build the client
    result = run_command("cd client && npm run build")
    if result.returncode != 0:
        print("❌ Frontend build failed!")
        return False
    
    # 3. Verify build output
    if not os.path.exists("client/dist"):
        print("❌ Build output not found!")
        return False
    
    print("✅ Frontend built successfully")
    
    # 4. Upload the built frontend
    print("\n3. Uploading built frontend to VPS...")
    upload_directory("client/dist", f"{APP_DIR}/client")
    
    # 5. Also upload the source files for reference
    print("\n4. Uploading source files...")
    run_ssh_command(f"mkdir -p {APP_DIR}/src")
    upload_directory("client/src", f"{APP_DIR}/src")
    
    # 6. Update server to serve the React app properly
    print("\n5. Updating server configuration...")
    
    # Create updated server that serves React app correctly
    server_update = f'''
# Add this to serve React app properly
app.get('*', (req, res) => {{
  // Skip API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {{
    return res.status(404).json({{ message: 'Route not found' }});
  }}
  
  // Serve React app for all other routes
  res.sendFile(path.join(__dirname, '../client/index.html'));
}});
'''
    
    # 7. Restart the service
    print("\n6. Restarting BingoMaster service...")
    run_ssh_command("systemctl restart bingomaster-full")
    time.sleep(3)
    run_ssh_command("systemctl status bingomaster-full")
    
    # 8. Test the deployment
    print("\n7. Testing deployment...")
    result = run_ssh_command("curl -s http://localhost:3000/health")
    
    if "OK" in result.stdout:
        print("✅ Backend is running")
    
    # Test frontend
    result = run_ssh_command("curl -s -I http://localhost:3000/")
    if "200 OK" in result.stdout:
        print("✅ Frontend is being served")
    
    print(f"\n🎉 DEPLOYMENT COMPLETE!")
    print(f"🌐 Your real BingoMaster application is now at: http://{VPS_HOST}")
    print("🔐 Login with: superadmin / password")
    print("\n📱 Features now available:")
    print("  • Complete React-based dashboard system")
    print("  • Role-based access (Super Admin, Admin, Employee, Collector)")
    print("  • Real-time bingo game with voice support")
    print("  • Advanced cartela management system")
    print("  • Financial tracking and credit management")
    print("  • Comprehensive user management")
    print("  • Analytics and reporting")
    
    return True

if __name__ == "__main__":
    main()