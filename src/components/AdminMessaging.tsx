import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, MessageCircle, Search, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TransferChat from "./TransferChat";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Conversation {
  transfer_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  last_message: string | null;
  last_message_time: string;
  unread_count: number;
  reference_number: string;
  status: string;
  has_messages: boolean;
}

interface AdminMessagingProps {
  onClose?: () => void;
}

const AdminMessaging = ({ onClose }: AdminMessagingProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

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

  useEffect(() => {
    filterConversations();
  }, [conversations, searchTerm, statusFilter, dateFilter]);

  const loadConversations = async () => {
    try {
      // Get all transfers with user info
      const { data: transfers, error: transfersError } = await supabase
        .from('transfers')
        .select('id, reference_number, user_id, created_at, status')
        .order('created_at', { ascending: false });

      if (transfersError) throw transfersError;

      if (!transfers || transfers.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get user profiles
      const userIds = [...new Set(transfers.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

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
            .eq('is_admin', false)
            .eq('read', false);

          const profile = profileMap.get(transfer.user_id);
          const lastName = profile?.last_name || '';
          const firstName = profile?.first_name || '';
          const userName = `${firstName} ${lastName}`.trim() || 'Utilisateur';
          
          return {
            transfer_id: transfer.id,
            user_id: transfer.user_id,
            user_name: userName,
            user_email: profile?.email || '',
            user_phone: profile?.phone || '',
            last_message: messages?.[0]?.message || null,
            last_message_time: messages?.[0]?.created_at || transfer.created_at,
            unread_count: unreadCount || 0,
            reference_number: transfer.reference_number,
            status: transfer.status,
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

  const filterConversations = () => {
    let filtered = conversations;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(c => {
        const msgDate = new Date(c.last_message_time);
        switch (dateFilter) {
          case "today":
            return msgDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return msgDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return msgDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredConversations(filtered);
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
      case 'awaiting_admin': return 'Attente admin';
      case 'approved': return 'Approuvé';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[500px] md:h-[600px] w-full">
        <TransferChat transferId={selectedConversation.transfer_id} onClose={() => setSelectedConversation(null)} />
      </div>
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

      {/* Filters */}
      <div className="p-4 border-b space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou référence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="awaiting_admin">Attente admin</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchTerm || statusFilter !== "all" || dateFilter !== "all") && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filteredConversations.length} résultat(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateFilter("all");
              }}
            >
              Réinitialiser
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                ? "Aucun résultat trouvé"
                : "Aucun transfert"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
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
                        {format(new Date(conversation.last_message_time), 'dd/MM HH:mm', { locale: fr })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {conversation.user_email}
                      {conversation.user_phone && ` • ${conversation.user_phone}`}
                    </p>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground">
                        {conversation.reference_number}
                      </p>
                      <Badge className={`text-xs ${getStatusColor(conversation.status)}`}>
                        {getStatusText(conversation.status)}
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

export default AdminMessaging;
