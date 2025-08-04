import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface VoiceRecorderProps {
  onVoiceNote: (audioBlob: Blob, duration: number) => void;
  disabled?: boolean;
}

const MAX_DURATION = 60; // 60 seconds max

export function VoiceRecorder({ onVoiceNote, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      // Try to use webm/opus, fallback to other formats
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];

      let mimeType = 'audio/wav'; // fallback
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 0.1;
          
          // Auto-stop at max duration
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          
          return newDuration;
        });
      }, 100);

      toast.success('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      toast.error('Unable to access microphone. Please check permissions.');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 0.1;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return newDuration;
        });
      }, 100);
    }
  }, [isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const playRecording = useCallback(() => {
    if (audioRef.current && recordedBlob) {
      audioRef.current.play();
      setIsPlaying(true);
      
      // Update playback time
      const updateTime = () => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      };
      
      audioRef.current.addEventListener('timeupdate', updateTime);
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setPlaybackTime(0);
        audioRef.current?.removeEventListener('timeupdate', updateTime);
      });
    }
  }, [recordedBlob]);

  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const discardRecording = useCallback(() => {
    setRecordedBlob(null);
    setDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  }, []);

  const sendRecording = useCallback(() => {
    if (recordedBlob && duration > 0) {
      onVoiceNote(recordedBlob, duration);
      toast.success('Voice note added!');
      discardRecording();
    }
  }, [recordedBlob, duration, onVoiceNote, discardRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (duration / MAX_DURATION) * 100;
  const playbackPercentage = recordedBlob ? (playbackTime / duration) * 100 : 0;

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Voice Note</h3>
            <span className="text-sm text-muted-foreground">
              Max {MAX_DURATION}s
            </span>
          </div>

          {/* Recording Controls */}
          {!recordedBlob && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Button
                  onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : startRecording}
                  disabled={disabled}
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className={cn(
                    "w-20 h-20 rounded-full",
                    isRecording && "recording-pulse"
                  )}
                  aria-label={isRecording ? "Pause recording" : "Start recording"}
                >
                  {isRecording ? (
                    isPaused ? <Mic className="w-8 h-8" /> : <Pause className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                
                {isRecording && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              {isRecording && (
                <div className="w-full space-y-2">
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>{formatTime(duration)}</span>
                    <Button
                      onClick={stopRecording}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Playback Controls */}
          {recordedBlob && (
            <div className="space-y-4">
              <div className="w-full space-y-2">
                <Progress value={playbackPercentage} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(playbackTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  onClick={isPlaying ? pausePlayback : playRecording}
                  variant="outline"
                  size="sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  onClick={discardRecording}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={sendRecording}
                  className="bg-success hover:bg-success/90"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          )}

          <audio ref={audioRef} className="hidden" />
        </div>
      </CardContent>
    </Card>
  );
}