import { useCallback, useRef } from 'react';

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create a pleasant notification sound (two-tone chime)
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);

        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };

      // Play a pleasant two-tone chime (like iPhone message)
      playTone(880, 0, 0.15);      // A5
      playTone(1175, 0.08, 0.2);   // D6

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  const playMessageSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // WhatsApp-like pop sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.05);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

    } catch (error) {
      console.error('Error playing message sound:', error);
    }
  }, []);

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (error) {
        console.error('Error triggering vibration:', error);
      }
    }
  }, []);

  const notify = useCallback(() => {
    playNotificationSound();
    vibrate();
  }, [playNotificationSound, vibrate]);

  const notifyMessage = useCallback(() => {
    playMessageSound();
    vibrate();
  }, [playMessageSound, vibrate]);

  return { playNotificationSound, playMessageSound, vibrate, notify, notifyMessage };
};