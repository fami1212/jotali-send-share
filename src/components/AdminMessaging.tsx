import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TransferChat from "./TransferChat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Conversation {
  transfer_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
  reference_number: string;
}

interface AdminMessagingProps {
  onClose?: () => void;
}

const AdminMessaging = ({ onClose }: AdminMessagingProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadConversations = async () => {
    try {
      // Get all transfers with messages and user info
      const { data: transfers, error } = await supabase
        .from('transfers')
        .select(`
          id,
          reference_number,
          user_id,
          created_at,
          profiles!inner (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // For each transfer, get message stats
      const conversationsData = await Promise.all(
        (transfers || []).map(async (transfer) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('transfer_id', transfer.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('transfer_id', transfer.id)
            .eq('is_admin', false)
            .eq('read', false);

          const profile = transfer.profiles as any;
          const lastName = profile?.last_name || '';
          const firstName = profile?.first_name || '';
          const userName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
          
          return {
            transfer_id: transfer.id,
            user_id: transfer.user_id,
            user_name: userName,
            user_email: profile?.email || '',
            last_message: messages?.[0]?.message || null,
            last_message_time: messages?.[0]?.created_at || transfer.created_at,
            unread_count: unreadCount || 0,
            reference_number: transfer.reference_number,
          };
        })
      );

      // Filter only conversations with messages and sort by last message time
      const withMessages = conversationsData
        .filter(c => c.last_message)
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());

      setConversations(withMessages);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (transferId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('transfer_id', transferId)
      .eq('is_admin', false);
    
    loadConversations();
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    markAsRead(conversation.transfer_id);
  };

  if (selectedConversation) {
    return (
      <Card className="flex flex-col h-[500px] md:h-[600px] w-full">
        <div className="flex items-center gap-3 p-4 border-b shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversation(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold">{selectedConversation.user_name}</h3>
            <p className="text-xs text-muted-foreground">
              Transfert: {selectedConversation.reference_number}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <TransferChat transferId={selectedConversation.transfer_id} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[500px] md:h-[600px] w-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Messages clients</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Aucune conversation</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <button
                key={conversation.transfer_id}
                onClick={() => handleSelectConversation(conversation)}
                className="w-full p-4 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.user_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conversation.user_name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {format(new Date(conversation.last_message_time), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1">
                      {conversation.reference_number}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message || 'Pièce jointe'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge 
                          variant="default" 
                          className="shrink-0 h-5 min-w-5 px-1 flex items-center justify-center rounded-full"
                        >
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default AdminMessaging;
