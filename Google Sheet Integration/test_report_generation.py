#!/usr/bin/env python3
"""
Test script for the new report generation endpoint
"""

import requests
import json

def test_report_generation():
    """Test the new report generation endpoint"""
    
    # Test data
    abha_id = "12345678901233"  # Use the test ABHA ID from the fallback data
    image_analyses = [
        """**Document Classification & Patient Details**

**A. Patient Information (If Available)**
Name: John Doe
Age/Sex: 45-year-old male
Date: 15-Mar-2024
Doctor's name and qualification: Dr. Smith, MBBS, MD

**B. Document Type Identification**
Classify the file into one of these categories: Medical Image (X-ray)

**Report Information**
Doctor/Clinic Name: City General Hospital
Date: 15-Mar-2024
Hospital/Facility: City General Hospital
Patient Details: 45-year-old male

**Image Type & Region**
Modality: X-ray
Anatomical region: Chest
Positioning: PA view

**Key Findings**
1. Normal cardiac silhouette
2. Clear lung fields bilaterally
3. No evidence of pneumothorax or pleural effusion
4. Normal mediastinal contours
5. No significant bony abnormalities

**Diagnostic Assessment**
Normal chest X-ray with no acute cardiopulmonary abnormalities detected.

**Patient-Friendly Explanation**
Your chest X-ray shows normal findings. Your heart and lungs appear healthy with no signs of infection, fluid, or other concerning abnormalities.

***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*""",
        
        """**Document Classification & Patient Details**

**A. Patient Information (If Available)**
Name: John Doe
Age/Sex: 45-year-old male
Date: 16-Mar-2024
Doctor's name and qualification: Dr. Johnson, MBBS, PhD

**B. Document Type Identification**
Classify the file into one of these categories: Lab Report

**Report Information**
Doctor/Clinic Name: City Lab Services
Date: 16-Mar-2024
Hospital/Facility: City Lab Services
Patient Details: 45-year-old male

**Key Findings**
1. Hemoglobin: 14.2 g/dL (Normal: 12.0-16.0)
2. White Blood Cell Count: 7.5 x 10^9/L (Normal: 4.0-11.0)
3. Platelet Count: 250 x 10^9/L (Normal: 150-450)
4. Blood Glucose: 95 mg/dL (Normal: 70-100)
5. Creatinine: 0.9 mg/dL (Normal: 0.7-1.3)

**Diagnostic Assessment**
All laboratory values are within normal reference ranges. No significant abnormalities detected.

**Patient-Friendly Explanation**
Your blood test results are all normal. Your body's systems are functioning well with no signs of infection, anemia, or other health concerns.

***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*"""
    ]
    
    # Test the new endpoint
    url = "http://localhost:8000/api/generate-report-from-analysis"
    
    form_data = {
        'abha_id': abha_id,
    }
    
    # Add image analyses
    for i, analysis in enumerate(image_analyses):
        form_data[f'image_analyses'] = analysis
    
    try:
        print("🧪 Testing report generation endpoint...")
        print(f"📋 ABHA ID: {abha_id}")
        print(f"📊 Number of image analyses: {len(image_analyses)}")
        
        response = requests.post(url, data=form_data)
        
        print(f"📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Report generation successful!")
            print(f"📄 Report length: {len(data.get('report', ''))} characters")
            print(f"💾 Database update status: {data.get('database_update_status', 'Unknown')}")
            
            # Print first 500 characters of the report
            report = data.get('report', '')
            print(f"\n📋 Report Preview (first 500 chars):")
            print("-" * 50)
            print(report[:500] + "..." if len(report) > 500 else report)
            print("-" * 50)
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception occurred: {e}")

if __name__ == "__main__":
    test_report_generation() 