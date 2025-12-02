import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence mode="wait">
      {isRecording ? (
        <motion.div
          key="recording"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="w-2 h-2 bg-red-500 rounded-full"
            />
            <span className="text-sm text-red-600 font-medium">{formatTime(recordingTime)}</span>
          </div>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-10 w-10 rounded-full"
            onClick={stopRecording}
          >
            <Square className="w-4 h-4" />
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="idle"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white shrink-0"
            onClick={startRecording}
            disabled={disabled}
          >
            <Mic className="w-5 h-5 text-slate-500" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceRecorder;
