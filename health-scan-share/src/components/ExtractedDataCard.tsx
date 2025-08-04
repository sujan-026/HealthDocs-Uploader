import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Calendar, Stethoscope, FileText, Heart, Pill } from 'lucide-react';
import { ExtractedMedicalData } from '@/utils/extractMedicalData';

interface ExtractedDataCardProps {
  data: ExtractedMedicalData;
  className?: string;
}

export function ExtractedDataCard({ data, className = '' }: ExtractedDataCardProps) {
  const hasPatientInfo = data.patientName || data.age || data.sex;
  const hasDocumentInfo = data.date || data.documentType;
  const hasProviderInfo = data.doctorName || data.hospitalName;
  const hasClinicalInfo = data.findings || data.diagnosis || data.medications;

  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <FileText className="w-5 h-5" />
          Extracted Medical Information
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Patient Information */}
        {hasPatientInfo && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="w-4 h-4" />
              Patient Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 ml-6">
              {data.patientName && (
                <div className="text-sm">
                  <span className="font-medium text-gray-600">Name:</span>
                  <div className="text-gray-800">{data.patientName}</div>
                </div>
              )}
              {data.age && (
                <div className="text-sm">
                  <span className="font-medium text-gray-600">Age:</span>
                  <div className="text-gray-800">{data.age} years</div>
                </div>
              )}
              {data.sex && (
                <div className="text-sm">
                  <span className="font-medium text-gray-600">Sex:</span>
                  <div className="text-gray-800 capitalize">{data.sex}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Information */}
        {hasDocumentInfo && (
          <>
            {hasPatientInfo && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="w-4 h-4" />
                Document Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                {data.documentType && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Type:</span>
                    <div>
                      <Badge variant="secondary" className="mt-1">
                        {data.documentType}
                      </Badge>
                    </div>
                  </div>
                )}
                {data.date && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Date:</span>
                    <div className="text-gray-800">{data.date}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Healthcare Provider */}
        {hasProviderInfo && (
          <>
            {(hasPatientInfo || hasDocumentInfo) && <Separator />}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Stethoscope className="w-4 h-4" />
                Healthcare Provider
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-6">
                {data.doctorName && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Doctor:</span>
                    <div className="text-gray-800">
                      {data.doctorName}
                      {data.doctorQualification && (
                        <span className="text-gray-600 text-xs ml-1">
                          ({data.doctorQualification})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {data.hospitalName && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Hospital:</span>
                    <div className="text-gray-800">{data.hospitalName}</div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Clinical Information */}
        {hasClinicalInfo && (
          <>
            {(hasPatientInfo || hasDocumentInfo || hasProviderInfo) && <Separator />}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Heart className="w-4 h-4" />
                Clinical Information
              </div>
              
              <div className="ml-6 space-y-3">
                {data.findings && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Key Findings:</span>
                    <div className="text-gray-800 mt-1 text-xs leading-relaxed bg-white p-2 rounded border">
                      {data.findings}
                    </div>
                  </div>
                )}

                {data.diagnosis && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Assessment:</span>
                    <div className="text-gray-800 mt-1 text-xs leading-relaxed bg-white p-2 rounded border">
                      {data.diagnosis}
                    </div>
                  </div>
                )}

                {data.medications && data.medications.length > 0 && (
                  <div className="text-sm">
                    <div className="flex items-center gap-2 font-medium text-gray-600 mb-1">
                      <Pill className="w-3 h-3" />
                      Medications:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.medications.map((med, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {med}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {data.recommendations && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Summary:</span>
                    <div className="text-gray-800 mt-1 text-xs leading-relaxed bg-white p-2 rounded border">
                      {data.recommendations}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Show a message if no data was extracted */}
        {!hasPatientInfo && !hasDocumentInfo && !hasProviderInfo && !hasClinicalInfo && (
          <div className="text-center py-6 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No structured data could be extracted from this document.</p>
            <p className="text-xs mt-1">The original analysis is available in the metadata.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}