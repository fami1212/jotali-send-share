import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useRealtimeNotifications = (userId: string | undefined) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up realtime notifications for user:", userId);

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          const notification = payload.new as any;
          
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default'
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log("Cleaning up realtime notifications");
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};
