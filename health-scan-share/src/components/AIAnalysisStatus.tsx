import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, CheckCircle, AlertCircle } from 'lucide-react';

interface AIAnalysisStatusProps {
  status: 'analyzing' | 'storing' | 'completed' | 'failed';
  confidence?: number;
  extractedFields?: number;
}

export function AIAnalysisStatus({ status, confidence, extractedFields }: AIAnalysisStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'storing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Brain className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'analyzing':
        return 'AI analyzing document...';
      case 'storing':
        return 'Storing extracted data...';
      case 'completed':
        return 'AI analysis completed';
      case 'failed':
        return 'AI analysis failed';
      default:
        return 'Ready for analysis';
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'analyzing':
      case 'storing':
        return 'secondary' as const;
      case 'completed':
        return 'default' as const;
      case 'failed':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Badge variant={getStatusVariant()} className="flex items-center gap-2 w-fit">
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      
      {status === 'completed' && (
        <div className="text-xs text-muted-foreground space-y-1">
          {confidence && (
            <div className="flex items-center gap-2">
              <span>Confidence:</span>
              <Badge variant="outline" className="text-xs">
                {Math.round(confidence * 100)}%
              </Badge>
            </div>
          )}
          {extractedFields && (
            <div className="flex items-center gap-2">
              <span>Fields extracted:</span>
              <Badge variant="outline" className="text-xs">
                {extractedFields} fields
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}