// Service to communicate with Python FastAPI backend
// In development, use Vite proxy. In production, use environment variable or default
const BACKEND_BASE_URL = import.meta.env.DEV 
  ? '' // Use Vite proxy in development (routes to /api)
  : (import.meta.env.VITE_PYTHON_BACKEND_URL || 'http://localhost:8000');

interface PatientDataResponse {
  patient_info: string;
  summary_text: string;
}

interface ImageAnalysisResponse {
  analysis: string;
  success: boolean;
  error?: string;
}

interface ReportGenerationResponse {
  report: string;
  success: boolean;
  error?: string;
  database_update_status?: string;
  pdf_path?: string;
}

interface HealthCheckResponse {
  status: string;
  google_sheets: boolean;
  gemini_ai: boolean;
  timestamp: number;
}

class PythonBackendService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = BACKEND_BASE_URL;
  }

  /**
   * Fetch patient data by ABHA ID
   */
  async fetchPatientData(abhaId: string): Promise<PatientDataResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/patient/${abhaId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PatientDataResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching patient data:', error);
      throw new Error(`Failed to fetch patient data: ${error.message}`);
    }
  }

  /**
   * Analyze a single medical image
   */
  async analyzeImage(imageFile: File): Promise<ImageAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch(`${this.baseUrl}/api/analyze-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ImageAnalysisResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive medical report with patient data and image analyses
   */
  async generateComprehensiveReport(
    abhaId: string,
    imageFiles: File[]
  ): Promise<ReportGenerationResponse> {
    try {
      const formData = new FormData();
      formData.append('abha_id', abhaId);
      
      // Add all image files
      imageFiles.forEach((file, index) => {
        formData.append('files', file);
      });

      const response = await fetch(`${this.baseUrl}/api/generate-report`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ReportGenerationResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive medical report with patient data and pre-analyzed image data
   */
  async generateComprehensiveReportFromAnalysis(
    abhaId: string,
    imageAnalyses: string[]
  ): Promise<ReportGenerationResponse> {
    try {
      const formData = new FormData();
      formData.append('abha_id', abhaId);
      
      // Add all image analyses
      imageAnalyses.forEach((analysis, index) => {
        formData.append('image_analyses', analysis);
      });

      const response = await fetch(`${this.baseUrl}/api/generate-report-from-analysis`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ReportGenerationResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error generating report from analysis:', error);
      throw new Error(`Failed to generate report from analysis: ${error.message}`);
    }
  }

  /**
   * Check backend health and service status
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: HealthCheckResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking backend health:', error);
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  }

  /**
   * Test if backend is reachable
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`Testing connection to: ${this.baseUrl}`);
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
      });
      console.log(`Connection test response status: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Download generated PDF report
   */
  async downloadPDF(pdfPath: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/download-pdf/${encodeURIComponent(pdfPath)}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw new Error(`Failed to download PDF: ${error.message}`);
    }
  }
}

// Export singleton instance
export const pythonBackendService = new PythonBackendService();

// Export types for use in components
export type {
  PatientDataResponse,
  ImageAnalysisResponse,
  ReportGenerationResponse,
  HealthCheckResponse,
};