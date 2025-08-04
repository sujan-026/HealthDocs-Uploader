#!/usr/bin/env python3
"""
Test script for image-to-report conversion using actual image files
"""

import requests
import os
from PIL import Image
import io

def create_test_image():
    """Create a simple test image for testing"""
    # Create a simple test image
    img = Image.new('RGB', (300, 200), color='white')
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def test_image_to_report():
    """Test the complete image-to-report conversion flow"""
    
    # Test data
    abha_id = "12345678901233"  # Use the test ABHA ID from the fallback data
    
    # Create test image
    test_image_data = create_test_image()
    
    # Test the complete flow
    url = "http://localhost:8000/api/generate-report"
    
    files = [
        ('files', ('test_image1.png', test_image_data, 'image/png')),
        ('files', ('test_image2.png', test_image_data, 'image/png'))
    ]
    
    data = {
        'abha_id': abha_id
    }
    
    try:
        print("🧪 Testing complete image-to-report conversion...")
        print(f"📋 ABHA ID: {abha_id}")
        print(f"📊 Number of test images: 2")
        
        response = requests.post(url, data=data, files=files)
        
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Image-to-report conversion successful!")
            print(f"📄 Report length: {len(response_data.get('report', ''))} characters")
            print(f"💾 Database update status: {response_data.get('database_update_status', 'Unknown')}")
            
            # Print first 500 characters of the report
            report = response_data.get('report', '')
            print(f"\n📋 Report Preview (first 500 chars):")
            print("-" * 50)
            print(report[:500] + "..." if len(report) > 500 else report)
            print("-" * 50)
            
            return True
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")
        return False

if __name__ == "__main__":
    success = test_image_to_report()
    if success:
        print("\n🎉 Image-to-report conversion is working correctly!")
    else:
        print("\n❌ Image-to-report conversion failed!") 