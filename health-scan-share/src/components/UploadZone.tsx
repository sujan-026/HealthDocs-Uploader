import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Image, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';

interface UploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/dicom': ['.dcm', '.dicom'],
};

export function UploadZone({ onFilesAdded, disabled }: UploadZoneProps) {
  const [isCompressing, setIsCompressing] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setIsCompressing(true);
    const processedFiles: File[] = [];

    try {
      for (const file of files) {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large. Maximum size is 25MB.`);
          continue;
        }

        // Compress images if needed
        if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
          try {
            const compressedFile = await imageCompression(file, {
              maxSizeMB: 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            });
            processedFiles.push(compressedFile);
            toast.success(`${file.name} compressed from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
          } catch (error) {
            console.error('Image compression failed:', error);
            processedFiles.push(file);
          }
        } else {
          processedFiles.push(file);
        }
      }

      if (processedFiles.length > 0) {
        onFilesAdded(processedFiles);
      }
    } finally {
      setIsCompressing(false);
    }
  }, [onFilesAdded]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e: any) => e.message).join(', ');
        toast.error(`${rejection.file.name}: ${errors}`);
      });
    }

    if (acceptedFiles.length > 0) {
      processFiles(acceptedFiles);
    }
  }, [processFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    disabled: disabled || isCompressing,
  });

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-destructive" />;
    if (type.includes('image')) return <Image className="w-6 h-6 text-accent" />;
    return <File className="w-6 h-6 text-muted-foreground" />;
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragActive && "border-primary bg-primary/10",
        disabled && "opacity-50 cursor-not-allowed",
        isCompressing && "opacity-75"
      )}
      role="button"
      tabIndex={0}
      aria-label="Upload medical documents"
    >
      <input {...getInputProps()} aria-describedby="upload-instructions" />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={cn(
          "p-4 rounded-full transition-colors",
          isDragActive ? "bg-primary/20" : "bg-muted"
        )}>
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isDragActive ? "text-primary" : "text-muted-foreground"
          )} />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {isCompressing ? "Processing files..." : 
             isDragActive ? "Drop files here" : "Upload medical documents"}
          </h3>
          
          <p id="upload-instructions" className="text-sm text-muted-foreground max-w-md mx-auto">
            Drag & drop your medical records, or{" "}
            <span className="text-primary font-medium">browse files</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <FileText className="w-3 h-3" />
            PDF
          </div>
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <FileText className="w-3 h-3" />
            DOC
          </div>
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <Image className="w-3 h-3" />
            JPG/PNG
          </div>
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <File className="w-3 h-3" />
            DICOM
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Maximum file size: 25MB
        </p>
      </div>
    </div>
  );
}