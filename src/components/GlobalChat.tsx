import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import FloatingChat from './FloatingChat';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useAdminRealtimeMessages } from '@/hooks/useAdminRealtimeMessages';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const displayTransferId = transferId || latestTransferId;

  if (!user || !displayTransferId) return null;

  return (
    <FloatingChat
      transferId={displayTransferId}
      isOpen={isOpen}
      onClose={closeChat}
      onOpen={() => openChat(displayTransferId)}
      unreadCount={unreadCount}
    />
  );
};

export default GlobalChat;
