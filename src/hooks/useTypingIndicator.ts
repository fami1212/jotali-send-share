import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingIndicator = (transferId: string, userId: string | undefined) => {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [otherTypingName, setOtherTypingName] = useState<string>('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  useEffect(() => {
    if (!transferId || !userId) return;

    const channel = supabase.channel(`typing:${transferId}`);

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== userId) {
          setIsOtherTyping(true);
          setOtherTypingName(payload.payload.name || 'Someone');
          
          // Clear typing after 3 seconds of no updates
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        }
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        if (payload.payload.user_id !== userId) {
          setIsOtherTyping(false);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [transferId, userId]);

  const sendTyping = useCallback(async (name: string) => {
    if (!transferId || !userId) return;
    
    const now = Date.now();
    // Throttle typing events to once per second
    if (now - lastTypingRef.current < 1000) return;
    lastTypingRef.current = now;

    const channel = supabase.channel(`typing:${transferId}`);
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId, name }
    });
  }, [transferId, userId]);

  const sendStopTyping = useCallback(async () => {
    if (!transferId || !userId) return;

    const channel = supabase.channel(`typing:${transferId}`);
    await channel.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { user_id: userId }
    });
  }, [transferId, userId]);

  return { isOtherTyping, otherTypingName, sendTyping, sendStopTyping };
};
