// Utility to extract structured medical data from AI analysis text

export interface ExtractedMedicalData {
  patientName?: string;
  age?: number;
  sex?: string;
  date?: string;
  doctorName?: string;
  doctorQualification?: string;
  hospitalName?: string;
  documentType?: string;
  diagnosis?: string;
  medications?: string[];
  findings?: string;
  recommendations?: string;
  originalText: string;
}

export function extractMedicalDataFromAnalysis(analysisText: string): ExtractedMedicalData {
  const extracted: ExtractedMedicalData = {
    originalText: analysisText
  };

  // Helper function to extract text between patterns
  const extractBetween = (text: string, start: string, end?: string): string | null => {
    const startRegex = new RegExp(start, 'i');
    const match = text.match(startRegex);
    if (!match) return null;
    
    const startIndex = match.index! + match[0].length;
    let endIndex = text.length;
    
    if (end) {
      const endRegex = new RegExp(end, 'i');
      const endMatch = text.slice(startIndex).match(endRegex);
      if (endMatch) {
        endIndex = startIndex + endMatch.index!;
      }
    }
    
    return text.slice(startIndex, endIndex).trim();
  };

  // Extract Patient Name
  const namePatterns = [
    /(?:Name|Patient|Patient Name):\s*([A-Za-z\s]+)/i,
    /Name:\s*"([^"]+)"/i,
    /Patient:\s*([A-Za-z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.patientName = match[1].trim().replace(/["\[\]]/g, '');
      break;
    }
  }

  // Extract Age and Sex
  const agePatterns = [
    /(\d+)[-\s]*year[-\s]*old/i,
    /Age[\/\s]*Sex:\s*(\d+)/i,
    /Age:\s*(\d+)/i,
    /(\d+)\s*years?\s*old/i
  ];
  
  for (const pattern of agePatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.age = parseInt(match[1]);
      break;
    }
  }

  // Extract Sex
  const sexPatterns = [
    /(\d+)[-\s]*year[-\s]*old\s+(male|female)/i,
    /Age[\/\s]*Sex:\s*\d+[\/\s]*(male|female)/i,
    /(male|female)/i
  ];
  
  for (const pattern of sexPatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1] && !extracted.sex) {
      extracted.sex = match[1].toLowerCase();
      break;
    }
  }

  // Extract Date
  const datePatterns = [
    /Date:\s*([0-9]{1,2}[-\/][0-9]{1,2}[-\/][0-9]{2,4})/i,
    /([0-9]{1,2}[-\/][A-Za-z]{3}[-\/][0-9]{2,4})/i,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /Date:\s*"([^"]+)"/i
  ];
  
  for (const pattern of datePatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.date = match[1].trim().replace(/["\[\]]/g, '');
      break;
    }
  }

  // Extract Doctor Name and Qualification
  const doctorPatterns = [
    /Doctor['\s]*s?\s*[Nn]ame[^:]*:\s*([A-Za-z\s\.]+)(?:,\s*([A-Z]{2,}(?:,\s*[A-Z]{2,})*))?/i,
    /Dr\.?\s*([A-Za-z\s\.]+)(?:,\s*([A-Z]{2,}(?:,\s*[A-Z]{2,})*))?/i,
    /Physician:\s*([A-Za-z\s\.]+)/i
  ];
  
  for (const pattern of doctorPatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.doctorName = match[1].trim().replace(/["\[\]]/g, '');
      if (match[2]) {
        extracted.doctorQualification = match[2].trim();
      }
      break;
    }
  }

  // Extract Hospital/Clinic Name
  const hospitalPatterns = [
    /Hospital[\/\s]*Facility:\s*([A-Za-z\s]+)/i,
    /Clinic[^:]*:\s*([A-Za-z\s]+)/i,
    /Hospital:\s*([A-Za-z\s]+)/i,
    /Medical Center:\s*([A-Za-z\s]+)/i
  ];
  
  for (const pattern of hospitalPatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.hospitalName = match[1].trim().replace(/["\[\]]/g, '');
      break;
    }
  }

  // Extract Document Type
  const docTypePatterns = [
    /Document Type[^:]*:\s*([A-Za-z\s\(\)]+)/i,
    /(X-ray|CT|MRI|Ultrasound|Prescription|Lab Report|Medical Report)/i,
    /Modality[^:]*:\s*([A-Za-z\s]+)/i
  ];
  
  for (const pattern of docTypePatterns) {
    const match = analysisText.match(pattern);
    if (match && match[1]) {
      extracted.documentType = match[1].trim().replace(/["\[\]]/g, '');
      break;
    }
  }

  // Extract Key Findings
  const findingsText = extractBetween(
    analysisText, 
    /\*\*Key Findings\*\*:?\s*/i,
    /\*\*(?:Diagnostic Assessment|Patient-Friendly|Disclaimer)/i
  );
  if (findingsText) {
    extracted.findings = findingsText.replace(/^\d+\.\s*/, '').trim();
  }

  // Extract Diagnosis/Assessment
  const diagnosisText = extractBetween(
    analysisText,
    /\*\*Diagnostic Assessment\*\*:?\s*/i,
    /\*\*(?:Patient-Friendly|Disclaimer)/i
  );
  if (diagnosisText) {
    extracted.diagnosis = diagnosisText.replace(/^\d+\.\s*/, '').trim();
  }

  // Extract Medications (if it's a prescription)
  const medicationMatches = analysisText.match(/(?:medication|medicine|drug)s?[^:]*:([^\.]+)/gi);
  if (medicationMatches) {
    extracted.medications = medicationMatches.map(match => 
      match.replace(/(?:medication|medicine|drug)s?[^:]*:/i, '').trim()
    ).filter(med => med.length > 0);
  }

  // Extract Recommendations
  const recommendationsText = extractBetween(
    analysisText,
    /\*\*Patient-Friendly Explanation\*\*:?\s*/i,
    /\*\*?Disclaimer/i
  );
  if (recommendationsText) {
    extracted.recommendations = recommendationsText.replace(/^\d+\.\s*/, '').trim();
  }

  return extracted;
}

// Helper function to format extracted data for display
export function formatExtractedDataForDisplay(data: ExtractedMedicalData): string {
  const sections: string[] = [];

  // Patient Information
  if (data.patientName || data.age || data.sex) {
    const patientInfo: string[] = [];
    if (data.patientName) patientInfo.push(`Name: ${data.patientName}`);
    if (data.age) patientInfo.push(`Age: ${data.age}`);
    if (data.sex) patientInfo.push(`Sex: ${data.sex}`);
    sections.push(`**Patient:** ${patientInfo.join(', ')}`);
  }

  // Document Information
  if (data.date || data.documentType) {
    const docInfo: string[] = [];
    if (data.documentType) docInfo.push(`Type: ${data.documentType}`);
    if (data.date) docInfo.push(`Date: ${data.date}`);
    sections.push(`**Document:** ${docInfo.join(', ')}`);
  }

  // Healthcare Provider
  if (data.doctorName || data.hospitalName) {
    const providerInfo: string[] = [];
    if (data.doctorName) {
      const doctor = data.doctorQualification 
        ? `${data.doctorName}, ${data.doctorQualification}`
        : data.doctorName;
      providerInfo.push(`Doctor: ${doctor}`);
    }
    if (data.hospitalName) providerInfo.push(`Hospital: ${data.hospitalName}`);
    sections.push(`**Provider:** ${providerInfo.join(', ')}`);
  }

  // Clinical Information
  if (data.findings) {
    sections.push(`**Findings:** ${data.findings}`);
  }

  if (data.diagnosis) {
    sections.push(`**Assessment:** ${data.diagnosis}`);
  }

  if (data.medications && data.medications.length > 0) {
    sections.push(`**Medications:** ${data.medications.join(', ')}`);
  }

  if (data.recommendations) {
    sections.push(`**Summary:** ${data.recommendations}`);
  }

  return sections.join('\n\n');
}