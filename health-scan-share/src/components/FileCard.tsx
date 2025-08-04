import React from 'react';
import { FileText, Image, File, CheckCircle, AlertCircle, Loader2, X, Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Document } from '@/types/records';
import { ExtractedMedicalData } from '@/utils/extractMedicalData';

interface FileCardProps {
  document: Document;
  onRemove?: (id: string) => void;
  onMetadataEdit?: (document: Document) => void;
}

export function FileCard({ document, onRemove, onMetadataEdit }: FileCardProps) {
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-destructive" />;
    }
    if (fileType.includes('image')) {
      return <Image className="w-8 h-8 text-accent" />;
    }
    return <File className="w-8 h-8 text-muted-foreground" />;
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary">Queued</Badge>;
      case 'uploading':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading
          </Badge>
        );
      case 'extracting':
        return (
          <Badge variant="secondary" className="gap-1">
            <Brain className="w-3 h-3" />
            <Loader2 className="w-3 h-3 animate-spin" />
            AI Analyzing
          </Badge>
        );
      case 'done':
        return (
          <Badge className="bg-success hover:bg-success/80 gap-1">
            <CheckCircle className="w-3 h-3" />
            Done
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Error
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canEdit = document.status === 'done' && document.metadata;
  const canRemove = document.status !== 'uploading';

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      document.status === 'error' && "border-destructive/50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className="flex-shrink-0 mt-1">
            {getFileIcon(document.fileType)}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate" title={document.filename}>
                  {document.filename}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(document.fileSize)}
                </p>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(document.status)}
                {canRemove && onRemove && (
                  <Button
                    onClick={() => onRemove(document.id)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {document.status === 'uploading' && document.uploadProgress !== undefined && (
              <div className="space-y-1">
                <Progress value={document.uploadProgress} className="h-1" />
                <p className="text-xs text-muted-foreground">
                  {Math.round(document.uploadProgress)}% uploaded
                </p>
              </div>
            )}

            {/* Metadata Preview */}
            {document.metadata && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {/* Show extracted data if available */}
                  {document.extractedData ? (
                    <>
                      {(() => {
                        const extractedData = document.extractedData as ExtractedMedicalData;
                        return (
                          <>
                            {extractedData.patientName && (
                              <p><span className="font-medium">Patient:</span> {extractedData.patientName}</p>
                            )}
                            {extractedData.doctorName && (
                              <p><span className="font-medium">Doctor:</span> {extractedData.doctorName}</p>
                            )}
                            {extractedData.documentType && (
                              <p><span className="font-medium">Type:</span> {extractedData.documentType}</p>
                            )}
                            {extractedData.date && (
                              <p><span className="font-medium">Date:</span> {extractedData.date}</p>
                            )}
                            {extractedData.age && (
                              <p><span className="font-medium">Age:</span> {extractedData.age} years</p>
                            )}
                            {extractedData.findings && (
                              <p className="mt-1">
                                <span className="font-medium">Key Finding:</span> 
                                <span className="ml-1 text-wrap">
                                  {extractedData.findings.substring(0, 80)}
                                  {extractedData.findings.length > 80 ? '...' : ''}
                                </span>
                              </p>
                            )}
                          </>
                        );
                      })()}
                      <Badge variant="outline" className="mt-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                        Python AI Analyzed
                      </Badge>
                    </>
                  ) : (
                    /* Fallback to basic metadata */
                    <>
                      {document.metadata.doctorName && (
                        <p><span className="font-medium">Doctor:</span> {document.metadata.doctorName}</p>
                      )}
                      {document.metadata.date && (
                        <p><span className="font-medium">Date:</span> {document.metadata.date}</p>
                      )}
                      {document.metadata.documentType && (
                        <p><span className="font-medium">Type:</span> {document.metadata.documentType}</p>
                      )}
                    </>
                  )}
                </div>
                
                {canEdit && onMetadataEdit && (
                  <Button
                    onClick={() => onMetadataEdit(document)}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                  >
                    {document.extractedData ? 'View Extracted Data' : 'Edit Details'}
                  </Button>
                )}
              </div>
            )}

            {/* Error Message */}
            {document.status === 'error' && (
              <p className="text-xs text-destructive">
                Upload failed. Please try again.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}