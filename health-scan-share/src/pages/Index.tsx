import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, FileText, Upload as UploadIcon, Mic, Camera, CheckCircle, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import hospitalLogo from '@/assets/hospital-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UploadZone } from '@/components/UploadZone';
import { CameraCapture } from '@/components/CameraCapture';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { FileCard } from '@/components/FileCard';
import { MetadataDrawer } from '@/components/MetadataDrawer';
import { toast, Toaster } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Document, DocumentMetadata, VoiceNote, ABHAVerificationRequest } from '@/types/records';
import { verifyABHAId, verifyPhoneOTP, sendPhoneOTP } from '@/lib/abha';

import { pythonBackendService, PatientDataResponse } from '@/services/pythonBackendService';
import { testBackendConnection } from '@/utils/testBackendConnection';
import { extractMedicalDataFromAnalysis, formatExtractedDataForDisplay, ExtractedMedicalData } from '@/utils/extractMedicalData';
import { testMedicalDataExtraction } from '@/utils/testExtraction';

interface VerificationForm {
  identifier: string;
  otp?: string;
}

export default function Index() {
  // Authentication state
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'abha' | 'phone'>('abha');

  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isMetadataDrawerOpen, setIsMetadataDrawerOpen] = useState(false);

  // Python backend integration state
  const [abhaId, setAbhaId] = useState<string>('');
  const [patientData, setPatientData] = useState<PatientDataResponse | null>(null);
  const [parsedPatientInfo, setParsedPatientInfo] = useState<any>(null);
  const [parsedMedicalHistory, setParsedMedicalHistory] = useState<any>(null);
  const [isLoadingPatientData, setIsLoadingPatientData] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<VerificationForm>();

  const identifierValue = watch('identifier');

  // Check backend connectivity on mount
  React.useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const isConnected = await pythonBackendService.testConnection();
        setBackendConnected(isConnected);
        if (isConnected) {
          console.log('✅ Python backend connected successfully');
        } else {
          console.warn('⚠️ Python backend not reachable');
        }
      } catch (error) {
        console.error('Backend connectivity check failed:', error);
        setBackendConnected(false);
      }
    };

    // Delay the connection check to avoid immediate CSP issues
    const timer = setTimeout(checkBackendConnection, 1000);
    return () => clearTimeout(timer);
  }, []);

  function parsePatientInfo(raw) {
    const out = {};
  
    raw                       // the string you logged
      .split(/\r?\n/)         // break into individual lines (\n or \r\n)
      .map(l => l.trim())     // trim whitespace
      .filter(Boolean)        // drop blank lines
      .forEach(line => {
        /*  Matches ALL of these:
            **Abha Id:** 1234
            Abha Id: 1234
            **Abha Id**: 1234        (just in case)
        -------------------------------------------------
        ^(\*\*)?        optional leading **
        (.+?)           the key (non-greedy)
        :               the colon that separates key & value
        (\*\*)?         optional trailing ** (for "**Key:**" vs "**Key**:")
        \s*             any spaces after the colon
        (.+)$           the value (rest of the line)
        */
        const m = line.match(/^(\*\*)?(.+?):(\*\*)?\s*(.+)$/);
        if (!m) return;            // skip if the line doesn’t match
  
        const keyRaw = m[2].trim();      // e.g. "Abha Id"
        const value  = m[4].trim();      // e.g. "1234"
  
        // sanitise the key so it’s a nice JS identifier
        const key = keyRaw
          .replace(/\s+/g, '_')          // spaces → underscores
          .replace(/[^a-zA-Z0-9_]/g, '') // drop other punctuation
          .toLowerCase();                // abha_id
  
        out[key] = value;
      });
  
    return out;
  }
  

  // Python backend handlers
  const handleFetchPatientData = useCallback(async (abhaIdValue: string) => {
    if (!abhaIdValue.trim()) {
      toast.error('Please enter an ABHA ID');
      return;
    }

    setIsLoadingPatientData(true);
          try {
        const data = await pythonBackendService.fetchPatientData(abhaIdValue.trim());
        console.log("data", data.patient_info);
        
        // Parse patient info
        const patient = parsePatientInfo(data.patient_info);
        console.log("patient", patient);
        
        // Parse medical history (assuming similar format)
        const medicalHistory = parsePatientInfo(data.summary_text);
        console.log("medicalHistory", medicalHistory);
        
        setPatientData(data);
        setParsedPatientInfo(patient);
        setParsedMedicalHistory(medicalHistory);
        setAbhaId(abhaIdValue.trim());
        toast.success('Patient data loaded successfully from Python backend!');
      } catch (error: any) {
      console.error('Error fetching patient data:', error);
      toast.error(`Failed to fetch patient data: ${error?.message || error}`);
      setPatientData(null);
    } finally {
      setIsLoadingPatientData(false);
    }
  }, []);

  // Verification handlers
  const handleVerification = useCallback(async (data: VerificationForm) => {
    setIsVerifying(true);

    try {
      if (verificationMethod === 'abha') {
        if (requiresOTP && data.otp) {
          // Handle ABHA OTP verification (if implemented)
          toast.error('ABHA OTP verification not yet implemented');
          return;
        } else {
          const result = await verifyABHAId(data.identifier);
          if (result.success) {
            setPatientId(`patient_${data.identifier}`);
            setIsVerified(true);
            toast.success('ABHA ID verified successfully!');
          } else {
            if (result.requiresOTP) {
              setRequiresOTP(true);
              setVerificationMethod('phone');
              setValue('identifier', '');
              toast.error(result.message);
            } else {
              toast.error(result.message);
            }
          }
        }
      } else {
        // Phone OTP verification
        if (!data.otp) {
          // Send OTP
          const sent = await sendPhoneOTP(data.identifier);
          if (sent) {
            setRequiresOTP(true);
            toast.success('OTP sent to your phone');
          } else {
            toast.error('Failed to send OTP');
          }
        } else {
          // Verify OTP
          const result = await verifyPhoneOTP(data.identifier, data.otp);
          if (result.success) {
            setPatientId(`patient_phone_${data.identifier}`);
            setIsVerified(true);
            toast.success('Phone number verified successfully!');
          } else {
            toast.error(result.message);
          }
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, [verificationMethod, requiresOTP, setValue]);

  // File upload handlers - Python backend only
  const handleFilesAdded = useCallback(async (files: File[]) => {
    if (!abhaId) {
      toast.error('Please enter an ABHA ID first to use Python backend analysis');
      return;
    }

    if (!backendConnected) {
      toast.error('Python backend is not connected. Please check the connection.');
      return;
    }

    for (const file of files) {
      const newDoc: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        patientId: patientId || `patient_${abhaId}`,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: 'queued',
        file: file, // Store the actual file for report generation
        createdAt: new Date(),
      };

      setDocuments(prev => [...prev, newDoc]);

      // Check if file is an image for medical document analysis
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        try {
          // Update status to uploading
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === newDoc.id
                ? { ...doc, status: 'uploading', uploadProgress: 0 }
                : doc
            )
          );

          // Simulate upload progress
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
              clearInterval(progressInterval);
            } else {
              setDocuments(prev =>
                prev.map(doc =>
                  doc.id === newDoc.id
                    ? { ...doc, uploadProgress: Math.min(progress, 100) }
                    : doc
                )
              );
            }
          }, 150);

          // Complete upload and start AI analysis with Python backend
          setTimeout(async () => {
            setDocuments(prev =>
              prev.map(doc =>
                doc.id === newDoc.id
                  ? { ...doc, status: 'extracting', uploadProgress: 100 }
                  : doc
              )
            );

            try {
              toast.loading('Analyzing medical document with Python backend AI...', { id: newDoc.id });

              // Use Python backend for image analysis
              console.log('Using Python backend for image analysis...');
              const pythonAnalysis = await pythonBackendService.analyzeImage(file);
              console.log("pythonAnalysis from backend", pythonAnalysis.analysis);

              if (!pythonAnalysis.success) {
                throw new Error(pythonAnalysis.error || 'Python backend analysis failed');
              }

              // Extract structured medical data from analysis
              const extractedData: ExtractedMedicalData = extractMedicalDataFromAnalysis(pythonAnalysis.analysis);
              console.log("Extracted medical data:", extractedData);

              // Create metadata from extracted structured data
              const aiMetadata: DocumentMetadata = {
                doctorName: extractedData.doctorName || 'AI Analysis',
                date: extractedData.date || new Date().toISOString().split('T')[0],
                documentType: extractedData.documentType || 'Medical Document (Python AI)',
                recordId: `PY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                extractedText: formatExtractedDataForDisplay(extractedData),
                fullAnalysis: pythonAnalysis.analysis, // Store the full analysis text for report generation
              };

              // Update document with AI-extracted metadata
              setDocuments(prev =>
                prev.map(doc =>
                  doc.id === newDoc.id
                    ? { ...doc, status: 'done', metadata: aiMetadata }
                    : doc
                )
              );

              // Show success message with extracted info
              const extractionSummary = [];
              if (extractedData.patientName) extractionSummary.push(`Patient: ${extractedData.patientName}`);
              if (extractedData.documentType) extractionSummary.push(`Type: ${extractedData.documentType}`);
              if (extractedData.doctorName) extractionSummary.push(`Doctor: ${extractedData.doctorName}`);

              const summaryText = extractionSummary.length > 0
                ? `\n\nExtracted: ${extractionSummary.join(' | ')}`
                : '';

              toast.success(
                `Medical document analyzed successfully with Python backend AI!${summaryText}`,
                {
                  id: newDoc.id,
                  duration: 8000
                }
              );

              // Show metadata drawer with extracted information
              const updatedDoc = {
                ...newDoc,
                status: 'done' as const,
                metadata: aiMetadata,
                extractedData // Store the extracted data with the document
              };
              setSelectedDocument(updatedDoc);
              setIsMetadataDrawerOpen(true);

            } catch (analysisError: any) {
              console.error('Python backend AI analysis failed:', analysisError);

              // Update document with error status
              const errorMetadata: DocumentMetadata = {
                doctorName: 'Analysis Failed',
                date: new Date().toISOString().split('T')[0],
                documentType: 'Medical Document',
                recordId: `ERROR-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
                extractedText: `Python backend analysis failed: ${analysisError?.message || analysisError}. Manual review required.`,
              };

              setDocuments(prev =>
                prev.map(doc =>
                  doc.id === newDoc.id
                    ? { ...doc, status: 'done', metadata: errorMetadata }
                    : doc
                )
              );

              toast.error(`AI analysis failed: ${analysisError?.message || analysisError}. Please check backend connection.`, { id: newDoc.id });
            }
          }, 1000);

        } catch (error: any) {
          console.error('File processing error:', error);
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === newDoc.id
                ? { ...doc, status: 'error' }
                : doc
            )
          );
          toast.error(`Error processing file: ${error?.message || error}`);
        }
      } else {
        // Handle non-image files
        toast('⚠️ Only image files can be analyzed. Non-image files are uploaded for reference only.');

        const basicMetadata: DocumentMetadata = {
          doctorName: 'No Analysis',
          date: new Date().toISOString().split('T')[0],
          documentType: 'Document (Non-image)',
          recordId: `REF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          extractedText: 'Non-image file uploaded. No AI analysis performed.',
        };

        setDocuments(prev =>
          prev.map(doc =>
            doc.id === newDoc.id
              ? { ...doc, status: 'done', metadata: basicMetadata }
              : doc
          )
        );
      }
    }
  }, [patientId, abhaId, backendConnected]);

  const handleVoiceNote = useCallback(async (audioBlob: Blob, duration: number) => {
    if (!patientId) return;

    const newVoiceNote: VoiceNote = {
      id: `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patientId,
      duration,
      status: 'uploading',
      uploadProgress: 0,
      languageHint: 'en',
      createdAt: new Date(),
    };

    setVoiceNotes(prev => [...prev, newVoiceNote]);

    // Simulate upload and processing
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        clearInterval(progressInterval);

        setVoiceNotes(prev =>
          prev.map(note =>
            note.id === newVoiceNote.id
              ? {
                  ...note,
                  status: 'done',
                  uploadProgress: 100,
                  transcript: 'This is a sample transcript of the voice note. The actual transcription would be processed by AI.'
                }
              : note
          )
        );
      } else {
        setVoiceNotes(prev =>
          prev.map(note =>
            note.id === newVoiceNote.id
              ? { ...note, uploadProgress: Math.min(progress, 100) }
              : note
          )
        );
      }
    }, 300);
  }, [patientId]);

  const handleRemoveDocument = useCallback((docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast.success('Document removed');
  }, []);

  const handleMetadataEdit = useCallback((document: Document) => {
    setSelectedDocument(document);
    setIsMetadataDrawerOpen(true);
  }, []);

  const handleMetadataSave = useCallback((documentId: string, metadata: DocumentMetadata) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === documentId
          ? { ...doc, metadata }
          : doc
      )
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <img
                  src={hospitalLogo}
                  alt="Hospital Logo"
                  className="w-8 h-8"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold">HealthDocs Uploader</h1>
                <p className="text-sm text-muted-foreground">Secure medical document submission</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* ABHA ID Section */}
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-3 text-blue-900">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                Patient Data Lookup
                {backendConnected ? (
                  <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">✓ Backend Connected</span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">✗ Backend Offline</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="abha-input" className="text-sm font-semibold text-gray-700">
                  Enter ABHA ID to fetch patient data
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="abha-input"
                    type="text"
                    placeholder="Enter your ABHA ID"
                    value={abhaId}
                    onChange={(e) => setAbhaId(e.target.value)}
                    disabled={isLoadingPatientData}
                    className="flex-1 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <Button
                    onClick={() => handleFetchPatientData(abhaId)}
                    disabled={isLoadingPatientData || !backendConnected || !abhaId.trim()}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {isLoadingPatientData ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </div>
                    ) : (
                      'Fetch Data'
                    )}
                  </Button>
                </div>
              </div>

              {patientData && (
                <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xl text-blue-900 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      Patient Information
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        Patient Details
                      </h5>
                      {parsedPatientInfo ? (
                        <div className="space-y-3">
                          {Object.entries(parsedPatientInfo).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <span className="text-sm font-semibold text-gray-700 capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-sm text-gray-900 font-medium">{value as string}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap bg-white p-4 rounded-lg border border-gray-200 shadow-sm">{patientData.patient_info}</div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h5 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        Medical History
                      </h5>
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="text-sm prose prose-sm max-w-none">
                          <ReactMarkdown 
                            components={{
                              h1: ({children}) => <h1 className="text-lg font-bold text-blue-900 mb-4 border-b border-blue-200 pb-2">{children}</h1>,
                              h2: ({children}) => <h2 className="text-base font-semibold text-blue-800 mb-3 border-b border-blue-100 pb-1">{children}</h2>,
                              h3: ({children}) => <h3 className="text-sm font-medium text-blue-700 mb-2">{children}</h3>,
                              p: ({children}) => <p className="text-sm text-gray-700 mb-4 leading-relaxed">{children}</p>,
                              ul: ({children}) => <ul className="text-sm text-gray-700 mb-4 space-y-2 ml-4">{children}</ul>,
                              li: ({children}) => <li className="text-sm text-gray-700 mb-2 flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                <span>{children}</span>
                              </li>,
                              strong: ({children}) => <strong className="font-semibold text-gray-900 mr-2 bg-blue-100 px-2 py-1 rounded">{children}</strong>,
                              em: ({children}) => <em className="italic text-gray-700 bg-gray-100 px-2 py-1 rounded">{children}</em>,
                              hr: () => <hr className="my-6 border-blue-200" />,
                            }}
                          >
                            {patientData.summary_text.replace(/\\n/g, '\n\n')}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!backendConnected && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Backend Connection Required:</strong> The Python backend must be running to fetch patient data.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Section */}
          <Card className="border-2 border-green-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
              <CardTitle className="flex items-center gap-3 text-green-900">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UploadIcon className="w-5 h-5 text-green-600" />
                </div>
                Upload Medical Documents
                {backendConnected && abhaId && (
                  <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">✓ Python AI Ready</span>
                )}
                {(!backendConnected || !abhaId) && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">⚠ Requires ABHA ID & Backend</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {(!backendConnected || !abhaId) && (
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">
                    Requirements for AI Analysis:
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      Enter a valid ABHA ID above
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      Python backend must be connected (green status)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      Only image files (.jpg, .png, .jpeg) can be analyzed
                    </li>
                  </ul>
                </div>
              )}
              <UploadZone onFilesAdded={handleFilesAdded} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 flex justify-center items-center">
                  <CameraCapture onPhotoCapture={(file) => handleFilesAdded([file])} />
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-purple-200">
                  <VoiceRecorder onVoiceNote={handleVoiceNote} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          {documents.length > 0 && (
            <Card className="border-2 border-orange-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200">
                <CardTitle className="flex items-center gap-3 text-orange-900">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  Uploaded Documents ({documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <FileCard
                      key={doc.id}
                      document={doc}
                      onRemove={handleRemoveDocument}
                      onMetadataEdit={handleMetadataEdit}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Notes */}
          {voiceNotes.length > 0 && (
            <Card className="border-2 border-purple-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
                <CardTitle className="flex items-center gap-3 text-purple-900">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mic className="w-5 h-5 text-purple-600" />
                  </div>
                  Voice Notes ({voiceNotes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {voiceNotes.map((note) => (
                    <div key={note.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full">
                          <Mic className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Voice Note ({Math.round(note.duration)}s)
                          </p>
                          {note.transcript && (
                            <p className="text-xs text-gray-600 truncate max-w-xs mt-1">
                              {note.transcript}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-medium">
                        {note.status === 'done' ? (
                          <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full">Processed</span>
                        ) : (
                          <span className="text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Processing...</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Python Backend Comprehensive Report */}
          {backendConnected && abhaId && (
            <Card className="border-2 border-indigo-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-200">
                <CardTitle className="flex items-center gap-3 text-indigo-900">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>
                  Generate Comprehensive Medical Report
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Create a detailed medical report with patient data and analyzed images in a structured table format. Automatically generates and downloads a PDF report with your original medical images included.
                  </p>
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl">
                    <p className="text-sm text-indigo-800 font-medium">
                      <strong>Note:</strong> Uses the Python backend to generate a comprehensive report with patient demographics, medical history, current visit details, and image analysis findings in a professional table format. A PDF version with your original medical images will be automatically downloaded.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const processedImages = documents.filter(doc =>
                        doc.status === 'done' &&
                        doc.fileType.startsWith('image/')
                      );

                      if (processedImages.length === 0) {
                        toast.error('No images analyzed by Python backend available for report generation');
                        return;
                      }

                      try {
                        toast.loading('Generating comprehensive medical report...', { id: 'report-generation' });

                        // Get the actual image files and analyses from the documents
                        const imageFiles: File[] = [];
                        const imageAnalyses: string[] = [];
                        
                        for (const doc of processedImages) {
                          if (doc.file) {
                            imageFiles.push(doc.file);
                          }
                          if (doc.metadata?.fullAnalysis) {
                            imageAnalyses.push(doc.metadata.fullAnalysis);
                          } else if (doc.metadata?.extractedText) {
                            // Fallback to extracted text if full analysis is not available
                            imageAnalyses.push(doc.metadata.extractedText);
                          }
                        }

                        // Call the Python backend to generate the comprehensive report
                        // Use the endpoint that accepts actual files to include images in PDF
                        const reportResponse = await pythonBackendService.generateComprehensiveReport(
                          abhaId,
                          imageFiles
                        );
                        console.log("reportResponse", reportResponse);

                        if (!reportResponse.success) {
                          throw new Error(reportResponse.error || 'Report generation failed');
                        }

                        // Show success message with database update status
                        const updateStatus = reportResponse.database_update_status || 'Unknown';
                        toast.success(
                          `✅ Comprehensive report generated successfully!\n` +
                          `• Patient ABHA ID: ${abhaId}\n` +
                          `• Analyzed Images: ${processedImages.length}\n` +
                          `• Database Update: ${updateStatus}`,
                          { id: 'report-generation', duration: 8000 }
                        );

                        // Download PDF if generated
                        if (reportResponse.pdf_path) {
                          try {
                            await pythonBackendService.downloadPDF(reportResponse.pdf_path);
                            toast.success('📄 PDF report downloaded successfully!', { duration: 5000 });
                          } catch (error) {
                            console.error('PDF download failed:', error);
                            toast.error('Failed to download PDF report', { duration: 5000 });
                          }
                        }

                        // Update the documents with the generated report information
                        setDocuments(prev =>
                          prev.map(doc => {
                            if (processedImages.some(img => img.id === doc.id)) {
                              return {
                                ...doc,
                                metadata: {
                                  ...doc.metadata,
                                  extractedText: doc.metadata?.extractedText + '\n\n---\n\n**Comprehensive Report Generated:**\n' + reportResponse.report.substring(0, 200) + '...',
                                  generatedReport: reportResponse.report,
                                  reportGeneratedAt: new Date().toISOString()
                                }
                              };
                            }
                            return doc;
                          })
                        );

                      } catch (error: any) {
                        console.error('Error generating report:', error);
                        toast.error(
                          `Failed to generate report: ${error?.message || error}`,
                          { id: 'report-generation' }
                        );
                      }
                    }}
                    className="w-full"
                    disabled={documents.filter(doc =>
                      doc.status === 'done' &&
                      doc.fileType.startsWith('image/') &&
                      doc.metadata?.extractedText
                    ).length === 0}
                  >
                    Generate Medical Report ({documents.filter(doc =>
                      doc.status === 'done' &&
                      doc.fileType.startsWith('image/') &&
                      doc.metadata?.extractedText
                    ).length} images ready)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Privacy Notice */}
          <Card className="mt-8 bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Privacy & Security</p>
                  <p className="text-muted-foreground">
                    All data is encrypted in transit and at rest. Only your healthcare provider can access these records.
                    Your information is protected under HIPAA compliance standards.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Metadata Drawer */}
      <MetadataDrawer
        isOpen={isMetadataDrawerOpen}
        onClose={() => setIsMetadataDrawerOpen(false)}
        document={selectedDocument}
        onSave={handleMetadataSave}
      />
    </div>
  );
}