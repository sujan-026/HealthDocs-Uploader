#!/usr/bin/env python3
"""
Test script for the Python FastAPI backend
Run this after starting the backend server to verify it's working correctly
"""

import requests
import sys
import time

BACKEND_URL = "http://localhost:8000"

def test_health_endpoint():
    """Test the health check endpoint"""
    try:
        print("🏥 Testing health endpoint...")
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        response.raise_for_status()
        data = response.json()
        
        print(f"✅ Health check passed!")
        print(f"   Status: {data.get('status', 'unknown')}")
        print(f"   Google Sheets: {'✅' if data.get('google_sheets') else '❌'}")
        print(f"   Gemini AI: {'✅' if data.get('gemini_ai') else '❌'}")
        return True
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection failed - Is the backend running on {BACKEND_URL}?")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_root_endpoint():
    """Test the root endpoint"""
    try:
        print("\n📍 Testing root endpoint...")
        response = requests.get(f"{BACKEND_URL}/", timeout=10)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Root endpoint working: {data.get('message', 'No message')}")
        return True
    except Exception as e:
        print(f"❌ Root endpoint failed: {e}")
        return False

def test_patient_data_endpoint():
    """Test the patient data endpoint with a sample ABHA ID"""
    try:
        print("\n👤 Testing patient data endpoint...")
        # Using the sample ABHA ID from the fallback data
        test_abha_id = "12345678901233"
        response = requests.get(f"{BACKEND_URL}/api/patient/{test_abha_id}", timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('patient_info') and data.get('summary_text'):
            print(f"✅ Patient data endpoint working!")
            print(f"   Patient Info Preview: {data['patient_info'][:50]}...")
            print(f"   Summary Preview: {data['summary_text'][:50]}...")
            return True
        else:
            print(f"⚠️ Patient data endpoint returned unexpected format")
            return False
    except Exception as e:
        print(f"❌ Patient data endpoint failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting Python Backend Test Suite")
    print("=" * 50)
    
    start_time = time.time()
    tests_passed = 0
    total_tests = 3
    
    # Run tests
    if test_root_endpoint():
        tests_passed += 1
    
    if test_health_endpoint():
        tests_passed += 1
    
    if test_patient_data_endpoint():
        tests_passed += 1
    
    # Results
    elapsed_time = time.time() - start_time
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tests_passed}/{total_tests} tests passed")
    print(f"⏱️ Total time: {elapsed_time:.2f} seconds")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend is ready for React integration.")
        print("\n🔗 Next Steps:")
        print("1. Start React frontend: cd health-scan-share && npm run dev")
        print("2. Open browser: http://localhost:5173")
        print("3. Click 'Debug Backend' button to test connection")
        print("4. Enter ABHA ID: 12345678901233")
        return 0
    else:
        print("⚠️ Some tests failed. Check the backend configuration.")
        print("\n🔧 Troubleshooting:")
        print("- Ensure all dependencies are installed: pip install -r requirements.txt")
        print("- Check .env file has GOOGLE_API_KEY")
        print("- Verify Google Sheets credentials file exists")
        return 1

if __name__ == "__main__":
    sys.exit(main())