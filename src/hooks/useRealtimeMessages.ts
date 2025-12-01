import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRealtimeMessages = (userId: string | undefined, onNewMessage?: (transferId: string) => void) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime messages for user:", userId);

    // Load initial unread count
    loadUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('New message received:', payload);
          const message = payload.new as any;
          
          // Check if this message is for a transfer involving this user
          const { data: transfer } = await supabase
            .from('transfers')
            .select('user_id')
            .eq('id', message.transfer_id)
            .single();

          // If user is the transfer owner and message is from admin, or vice versa
          const isForThisUser = transfer?.user_id === userId && message.is_admin;
          
          if (isForThisUser) {
            setUnreadCount(prev => prev + 1);
            
            toast.success("Nouveau message", {
              description: message.is_admin ? "L'admin vous a envoyé un message" : "Nouveau message reçu",
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
        console.log('Messages subscription status:', status);
      });

    return () => {
      console.log("Cleaning up realtime messages");
      supabase.removeChannel(channel);
    };
  }, [userId, onNewMessage]);

  const loadUnreadCount = async () => {
    if (!userId) return;

    // Get all transfers for this user
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id')
      .eq('user_id', userId);

    if (!transfers) return;

    const transferIds = transfers.map(t => t.id);

    // Count unread messages for these transfers where sender is admin
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('transfer_id', transferIds)
      .eq('is_admin', true)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  return { unreadCount, refreshUnreadCount: loadUnreadCount };
};
