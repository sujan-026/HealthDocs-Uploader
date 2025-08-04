import React from 'react';
import { useForm } from 'react-hook-form';
import { X, Save } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Document, DocumentMetadata } from '@/types/records';
import { toast } from 'react-hot-toast';
import { ExtractedDataCard } from '@/components/ExtractedDataCard';
import { ExtractedMedicalData } from '@/utils/extractMedicalData';

interface MetadataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSave: (documentId: string, metadata: DocumentMetadata) => void;
}

const documentTypes = [
  'Lab Report',
  'Prescription',
  'Medical Certificate',
  'Discharge Summary',
  'X-Ray',
  'MRI Scan',
  'CT Scan',
  'Ultrasound',
  'ECG Report',
  'Blood Test',
  'Vaccination Record',
  'Insurance Document',
  'Other',
];

export function MetadataDrawer({ isOpen, onClose, document, onSave }: MetadataDrawerProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<DocumentMetadata>({
    defaultValues: document?.metadata || {},
  });

  // Reset form when document changes
  React.useEffect(() => {
    if (document?.metadata) {
      reset(document.metadata);
    } else if (document?.extractedData) {
      // Auto-populate form with extracted data
      const extractedData = document.extractedData as ExtractedMedicalData;
      reset({
        doctorName: extractedData.doctorName || '',
        date: extractedData.date || '',
        documentType: extractedData.documentType || '',
        recordId: document.metadata?.recordId || `PY-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        extractedText: extractedData.originalText || '',
      });
    } else {
      reset({});
    }
  }, [document, reset]);

  const onSubmit = (data: DocumentMetadata) => {
    if (!document) return;
    
    onSave(document.id, data);
    toast.success('Document details saved!');
    console.log(data);
    onClose();
  };

  const handleDocumentTypeChange = (value: string) => {
    setValue('documentType', value);
  };

  if (!document) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Document Details</SheetTitle>
          <SheetDescription>
            Review and edit the extracted information for {document.filename}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          {/* Show extracted data if available */}
          {document.extractedData && (
            <ExtractedDataCard 
              data={document.extractedData as ExtractedMedicalData} 
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doctorName">Doctor Name</Label>
              <Input
                id="doctorName"
                {...register('doctorName')}
                placeholder="Dr. John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Document Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={watch('documentType') || ''}
                onValueChange={handleDocumentTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recordId">Record/Reference ID</Label>
              <Input
                id="recordId"
                {...register('recordId')}
                placeholder="REF-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extractedText">Additional Notes</Label>
              <Textarea
                id="extractedText"
                {...register('extractedText')}
                placeholder="Any additional information about this document..."
                rows={10}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-success hover:bg-success/90"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}