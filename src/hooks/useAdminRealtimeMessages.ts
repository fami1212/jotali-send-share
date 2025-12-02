import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationSound } from "./useNotificationSound";

export const useAdminRealtimeMessages = (onNewMessage?: (transferId: string) => void) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { notify } = useNotificationSound();

  useEffect(() => {
    loadUnreadCount();

    const channel = supabase
      .channel('admin-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const message = payload.new as any;
          
          if (!message.is_admin) {
            setUnreadCount(prev => prev + 1);
            notify();
            
            toast.success("Nouveau message client", {
              description: "Un client vous a envoyé un message",
              duration: 5000
            });

            if (onNewMessage) {
              onNewMessage(message.transfer_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewMessage]);

  const loadUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  return { unreadCount, refreshUnreadCount: loadUnreadCount };
};
