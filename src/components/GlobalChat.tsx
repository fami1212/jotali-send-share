import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import ClientMessaging from './ClientMessaging';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAdminRealtimeMessages } from '@/hooks/useAdminRealtimeMessages';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const GlobalChat = () => {
  const { user } = useAuth();
  const { isOpen, transferId, openChat, closeChat } = useChat();
  const [isAdmin, setIsAdmin] = useState(false);
  const [latestTransferId, setLatestTransferId] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase.rpc('is_admin', { user_id_input: user.id });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const loadLatestTransfer = async () => {
      if (!user || isAdmin) return;
      
      const { data } = await supabase
        .from('transfers')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setLatestTransferId(data.id);
      }
    };
    loadLatestTransfer();
  }, [user, isAdmin]);

  const handleNewMessage = (newTransferId: string) => {
    openChat(newTransferId);
  };

  const { unreadCount: userUnreadCount } = useRealtimeMessages(
    isAdmin ? undefined : user?.id,
    handleNewMessage
  );

  const { unreadCount: adminUnreadCount } = useAdminRealtimeMessages(
    isAdmin ? handleNewMessage : undefined
  );

  const unreadCount = isAdmin ? adminUnreadCount : userUnreadCount;

  // Don't show global chat for admins - they use the admin dashboard
  if (!user || isAdmin) return null;

  // Regular users get the messaging interface with all conversations
  return (
    <>
      {/* Floating Button for Users */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-20 md:bottom-6 right-6 z-50"
        >
          <Button
            onClick={() => openChat('')}
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg relative"
          >
            <MessageCircle className="w-6 h-6" />
            {userUnreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
              >
                {userUnreadCount > 9 ? '9+' : userUnreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      )}

      {/* Client Messaging Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 md:bottom-6 right-6 z-50 w-[90vw] md:w-[450px] max-w-[450px] shadow-2xl rounded-lg overflow-hidden"
          >
            <ClientMessaging onClose={closeChat} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalChat;
