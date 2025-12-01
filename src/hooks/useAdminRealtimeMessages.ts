import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotificationSound } from "./useNotificationSound";

export const useAdminRealtimeMessages = (onNewMessage?: (transferId: string) => void) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { notify } = useNotificationSound();

  useEffect(() => {
    console.log("Setting up realtime messages for admin");

    // Load initial unread count
    loadUnreadCount();

    // Subscribe to new messages
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
          console.log('New message received by admin:', payload);
          const message = payload.new as any;
          
          // If message is from a user (not admin)
          if (!message.is_admin) {
            setUnreadCount(prev => prev + 1);
            
            // Play sound and vibrate
            notify();
            
            toast.success("Nouveau message client", {
              description: "Un client vous a envoyé un message",
              duration: 5000
            });

            // Trigger callback to open chat
            if (onNewMessage) {
              onNewMessage(message.transfer_id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Admin messages subscription status:', status);
      });

    return () => {
      console.log("Cleaning up admin realtime messages");
      supabase.removeChannel(channel);
    };
  }, [onNewMessage]);

  const loadUnreadCount = async () => {
    // Count all unread messages from users (not admin)
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  return { unreadCount, refreshUnreadCount: loadUnreadCount };
};
