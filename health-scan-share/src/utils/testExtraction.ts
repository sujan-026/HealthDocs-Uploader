// Test the medical data extraction functionality

import { extractMedicalDataFromAnalysis, formatExtractedDataForDisplay } from './extractMedicalData';

// Sample AI analysis text that might come from the Python backend
export const sampleAnalysisTexts = {
  xray: `
**Report Information**: 
Doctor/Clinic Name: Dr. Sarah Johnson, MD
Date: 15-Mar-2024
Hospital/Facility: City General Hospital
Patient Details: John Smith, 45-year-old male

**Document Type Identification**
Medical Image (X-ray)

**Image Type & Region**: 
Chest X-ray, frontal view (PA), proper positioning

**Key Findings**: 
The chest X-ray shows clear lung fields bilaterally with no evidence of pneumonia, pleural effusion, or pneumothorax. The heart size appears normal. The diaphragms are well-defined and at normal levels. No focal consolidation or mass lesions are observed. The bony structures appear intact with no obvious fractures.

**Diagnostic Assessment**: 
Normal chest X-ray. No acute cardiopulmonary abnormalities detected.

**Patient-Friendly Explanation**: 
Your chest X-ray looks completely normal. Your lungs are clear, your heart size is normal, and there are no signs of infection, fluid, or other problems. This is a good result.

***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*
  `,

  prescription: `
**Report Information**: 
Doctor/Clinic Name: Dr. Michael Chen, MBBS, MD
Date: 22-Feb-2024
Hospital/Facility: Metro Health Clinic
Patient Details: Mary Johnson, 32-year-old female

**Document Type Identification**
Prescription (Digital)

**Medications:**
1. Amoxicillin 500mg - Take 1 tablet three times daily for 7 days
2. Ibuprofen 200mg - Take 1 tablet twice daily as needed for pain
3. Vitamin D3 1000 IU - Take 1 tablet daily

**Patient-Friendly Explanation**: 
This prescription includes an antibiotic (Amoxicillin) to treat your infection, a pain reliever (Ibuprofen) for discomfort, and a vitamin supplement. Please complete the full course of antibiotics even if you feel better.

***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*
  `,

  labReport: `
**Report Information**: 
Doctor/Clinic Name: Dr. Lisa Wang, MD, PhD
Date: 10-Mar-2024
Hospital/Facility: Advanced Diagnostics Lab
Patient Details: Robert Brown, 58-year-old male

**Document Type Identification**
Lab Report (Blood tests)

**Key Findings**: 
Complete Blood Count (CBC):
- Hemoglobin: 14.2 g/dL (Normal: 13.5-17.5)
- White Blood Cell Count: 6,800/μL (Normal: 4,000-11,000)
- Platelet Count: 285,000/μL (Normal: 150,000-400,000)

Lipid Panel:
- Total Cholesterol: 220 mg/dL (Borderline High: 200-239)
- LDL Cholesterol: 145 mg/dL (Borderline High: 130-159)
- HDL Cholesterol: 42 mg/dL (Low: <40)
- Triglycerides: 180 mg/dL (Borderline High: 150-199)

**Diagnostic Assessment**: 
Blood counts are within normal limits. Lipid profile shows borderline high cholesterol levels that may benefit from dietary modifications and possible medication.

**Patient-Friendly Explanation**: 
Your blood counts look good. However, your cholesterol levels are slightly elevated, which means you should focus on a heart-healthy diet and regular exercise. Your doctor may discuss medication options with you.

***Disclaimer:** This AI-generated analysis is for informational purposes only and is NOT a substitute for professional medical advice, diagnosis, or treatment. A qualified healthcare professional must perform the final interpretation.*
  `
};

// Function to test the extraction with sample data
export function testMedicalDataExtraction() {
  console.log('🧪 Testing Medical Data Extraction');
  console.log('==================================');

  Object.entries(sampleAnalysisTexts).forEach(([type, text]) => {
    console.log(`\n📄 Testing ${type.toUpperCase()} extraction:`);
    console.log('-'.repeat(40));
    
    const extracted = extractMedicalDataFromAnalysis(text);
    console.log('Extracted Data:', extracted);
    
    const formatted = formatExtractedDataForDisplay(extracted);
    console.log('\nFormatted Display:');
    console.log(formatted);
    
    console.log('\n' + '='.repeat(50));
  });
}

// Export for use in browser console
(window as any).testMedicalDataExtraction = testMedicalDataExtraction;
(window as any).sampleAnalysisTexts = sampleAnalysisTexts;