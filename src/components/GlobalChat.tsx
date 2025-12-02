import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import ClientMessaging from './ClientMessaging';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAdminRealtimeMessages } from '@/hooks/useAdminRealtimeMessages';
import { useTransferNotifications } from '@/hooks/useTransferNotifications';
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

  // Real-time transfer notifications for users
  useTransferNotifications(isAdmin ? undefined : user?.id);

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

  // Don't show global chat for admins
  if (!user || isAdmin) return null;

  return (
    <>
      {/* WhatsApp-style Floating Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50"
        >
          <Button
            onClick={() => openChat('')}
            className="h-14 w-14 rounded-full shadow-xl relative bg-emerald-500 hover:bg-emerald-600 hover:scale-105 transition-transform"
          >
            <MessageCircle className="w-6 h-6" />
            
            {/* Pulse animation for unread */}
            {userUnreadCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0.3, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-emerald-400 -z-10"
              />
            )}
            
            {userUnreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white"
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
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 md:w-[400px] h-[70vh] max-h-[600px] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
          >
            <ClientMessaging onClose={closeChat} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalChat;