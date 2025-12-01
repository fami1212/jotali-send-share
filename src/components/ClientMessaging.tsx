import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TransferChat from "./TransferChat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Transfer {
  id: string;
  reference_number: string;
  status: string;
  created_at: string;
  from_currency: string;
  to_currency: string;
  amount: number;
}

interface Conversation {
  transfer: Transfer;
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
  has_messages: boolean;
}

interface ClientMessagingProps {
  onClose?: () => void;
}

const ClientMessaging = ({ onClose }: ClientMessagingProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadConversations();

      // Subscribe to new messages
      const channel = supabase
        .channel('client-all-messages')
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
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      // Get all user's transfers
      const { data: transfers, error: transfersError } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transfersError) throw transfersError;

      if (!transfers || transfers.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // For each transfer, get message stats
      const conversationsData = await Promise.all(
        transfers.map(async (transfer) => {
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
            .eq('is_admin', true)
            .eq('read', false);

          return {
            transfer,
            last_message: messages?.[0]?.message || null,
            last_message_time: messages?.[0]?.created_at || transfer.created_at,
            unread_count: unreadCount || 0,
            has_messages: messages && messages.length > 0,
          };
        })
      );

      // Sort by last message time
      const sorted = conversationsData.sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setConversations(sorted);
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
      .eq('is_admin', true);
    
    loadConversations();
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    markAsRead(conversation.transfer.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning';
      case 'awaiting_admin': return 'bg-info/10 text-info';
      case 'approved': return 'bg-success/10 text-success';
      case 'completed': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'awaiting_admin': return 'Attente validation';
      case 'approved': return 'Approuvé';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[500px] md:h-[600px] w-full">
        <TransferChat transferId={selectedConversation.transfer.id} onClose={() => setSelectedConversation(null)} />
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-[500px] md:h-[600px] w-full">
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Mes messages</h3>
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
            <p className="text-muted-foreground">Aucun transfert</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <button
                key={conversation.transfer.id}
                onClick={() => handleSelectConversation(conversation)}
                className="w-full p-4 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      JT
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">
                        {conversation.transfer.reference_number}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {format(new Date(conversation.last_message_time), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground">
                        {conversation.transfer.from_currency} → {conversation.transfer.to_currency}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(conversation.transfer.status)}`}>
                        {getStatusText(conversation.transfer.status)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.has_messages 
                          ? (conversation.last_message || 'Pièce jointe')
                          : 'Aucun message'}
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

export default ClientMessaging;
