import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';

interface CameraCaptureProps {
  onPhotoCapture: (file: File) => void;
  disabled?: boolean;
}

export function CameraCapture({ onPhotoCapture, disabled }: CameraCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('Unable to access camera. Please check permissions.');
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataURL);
    stopCamera();
  }, [stopCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    // Convert data URL to File
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `medical-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onPhotoCapture(file);
        toast.success('Photo captured successfully!');
        handleClose();
      }
    }, 'image/jpeg', 0.9);
  }, [capturedImage, onPhotoCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [isStreaming, stopCamera, startCamera]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    startCamera();
  }, [startCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    setIsOpen(false);
  }, [stopCamera]);

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={disabled}
        variant="outline"
        className="flex items-center gap-2"
        aria-label="Take photo of document"
      >
        <Camera className="w-4 h-4" />
        Take Photo
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Capture Document Photo</DialogTitle>
          </DialogHeader>

          <div className="relative">
            {!capturedImage ? (
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-auto max-h-[60vh] object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                
                {isStreaming && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Document frame overlay */}
                    <div className="absolute inset-4 border-2 border-white/50 rounded-lg" />
                    <div className="absolute top-4 left-4 right-4">
                      <p className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                        Position document within the frame
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                  <Button
                    onClick={switchCamera}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    onClick={capturePhoto}
                    disabled={!isStreaming}
                    size="lg"
                    className="bg-primary hover:bg-primary-hover rounded-full w-16 h-16"
                  >
                    <Camera className="w-6 h-6" />
                  </Button>
                  
                  <Button
                    onClick={handleClose}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <img
                    src={capturedImage}
                    alt="Captured document"
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                </div>
                
                <div className="flex justify-center gap-3">
                  <Button
                    onClick={retakePhoto}
                    variant="outline"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  
                  <Button
                    onClick={confirmPhoto}
                    className="bg-success hover:bg-success/90"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Use Photo
                  </Button>
                </div>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}