export interface Patient {
  id: string;
  abhaId?: string;
  phoneNumber?: string;
  verified: boolean;
}

export interface Document {
  id: string;
  patientId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'queued' | 'uploading' | 'extracting' | 'done' | 'error';
  uploadProgress?: number;
  presignedKey?: string;
  metadata?: DocumentMetadata;
  extractedData?: any; // Will contain ExtractedMedicalData from utils
  file?: File; // Store the actual file for report generation
  createdAt: Date;
}

export interface DocumentMetadata {
  doctorName?: string;
  date?: string;
  documentType?: string;
  recordId?: string;
  extractedText?: string;
  fullAnalysis?: string; // Full AI analysis text for report generation
  generatedReport?: string; // Generated comprehensive report
  reportGeneratedAt?: string; // Timestamp when report was generated
}

export interface VoiceNote {
  id: string;
  patientId: string;
  duration: number;
  status: 'recording' | 'uploading' | 'processing' | 'done' | 'error';
  uploadProgress?: number;
  presignedKey?: string;
  languageHint?: string;
  transcript?: string;
  createdAt: Date;
}

export interface ABHAVerificationRequest {
  abhaId: string;
  otp?: string;
}

export interface UploadRequest {
  presignedUrl: string;
  docId: string;
  fields: Record<string, string>;
}

export interface DocumentCompleteRequest {
  patientId: string;
  docId: string;
  docType: string;
  presignedKey: string;
}

export interface VoiceNoteRequest {
  patientId: string;
  presignedKey: string;
  languageHint: string;
  duration: number;
}