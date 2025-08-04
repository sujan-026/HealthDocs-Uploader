#!/usr/bin/env python3
"""
Startup script for the Python FastAPI backend
This script includes debugging and setup validation
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'fastapi', 'uvicorn', 'pandas', 'gspread', 
        'google-generativeai', 'python-multipart', 'python-dotenv'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"   ✅ {package}")
        except ImportError:
            print(f"   ❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️ Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("✅ All dependencies installed")
    return True

def check_environment():
    """Check environment variables"""
    print("\n🔍 Checking environment variables...")
    
    env_file = Path('.env')
    if env_file.exists():
        print("   ✅ .env file found")
    else:
        print("   ⚠️ .env file not found (optional)")
    
    google_api_key = os.getenv('GOOGLE_API_KEY')
    if google_api_key:
        print(f"   ✅ GOOGLE_API_KEY: {google_api_key[:10]}...")
    else:
        print("   ⚠️ GOOGLE_API_KEY not set")
    
    creds_path = os.getenv('GOOGLE_SHEETS_CREDS_PATH', 'dbott-464906-c46c8756b829.json')
    if Path(creds_path).exists():
        print(f"   ✅ Google Sheets credentials: {creds_path}")
    else:
        print(f"   ⚠️ Google Sheets credentials not found: {creds_path}")
    
    return True

def start_server():
    """Start the FastAPI server"""
    print("\n🚀 Starting FastAPI server...")
    print("   Server will run on: http://localhost:8000")
    print("   Press Ctrl+C to stop the server")
    print("   Open another terminal to test with: python test_backend.py")
    print("-" * 50)
    
    try:
        # Import and run the server
        from backend_server import app
        import uvicorn
        
        uvicorn.run(
            app,
            host="localhost",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        return False
    
    return True

def main():
    """Main startup function"""
    print("🏥 Medical Report API - Backend Startup")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        return 1
    
    # Check environment
    check_environment()
    
    # Start server
    if not start_server():
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())