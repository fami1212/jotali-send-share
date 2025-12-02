import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, MessageCircle, CheckCheck, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TransferChat from "./TransferChat";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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
  last_message_is_admin: boolean;
  last_message_read: boolean;
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

      const channel = supabase
        .channel('client-all-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
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
            last_message_is_admin: messages?.[0]?.is_admin || false,
            last_message_read: messages?.[0]?.read || false,
          };
        })
      );

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm', { locale: fr });
    if (isYesterday(date)) return 'Hier';
    return format(date, 'dd/MM', { locale: fr });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      'pending': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      'awaiting_admin': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Validation' },
      'processing': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En cours' },
      'completed': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Terminé' },
      'rejected': { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
    };
    return configs[status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
  };

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-full w-full">
        <TransferChat 
          transferId={selectedConversation.transfer.id} 
          onClose={() => setSelectedConversation(null)} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* WhatsApp-style Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Messages</h3>
          <p className="text-xs text-emerald-100">{conversations.length} conversation(s)</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-slate-600 font-medium">Aucune conversation</p>
            <p className="text-sm text-slate-400">Vos messages apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <AnimatePresence>
              {conversations.map((conversation, index) => {
                const statusConfig = getStatusBadge(conversation.transfer.status);
                
                return (
                  <motion.button
                    key={conversation.transfer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full p-4 hover:bg-slate-50 transition-colors text-left ${
                      conversation.unread_count > 0 ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold">
                          JS
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-slate-900">
                            Jotali Support
                          </span>
                          <span className={`text-xs ${conversation.unread_count > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                            {formatDate(conversation.last_message_time)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs text-slate-500">#{conversation.transfer.reference_number}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            {/* Read status for sent messages */}
                            {!conversation.last_message_is_admin && conversation.has_messages && (
                              conversation.last_message_read ? (
                                <CheckCheck className="w-4 h-4 text-blue-500 shrink-0" />
                              ) : (
                                <Check className="w-4 h-4 text-slate-400 shrink-0" />
                              )
                            )}
                            <p className={`text-sm truncate ${
                              conversation.unread_count > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'
                            }`}>
                              {conversation.has_messages 
                                ? (conversation.last_message || '📎 Pièce jointe')
                                : 'Démarrer une conversation'}
                            </p>
                          </div>
                          
                          {conversation.unread_count > 0 && (
                            <Badge className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ClientMessaging;