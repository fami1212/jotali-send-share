import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Search, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import TransferChat from '@/components/TransferChat';

interface Conversation {
  transfer_id: string;
  reference_number: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: string;
}

interface MessagesModuleProps {
  onRefresh: () => void;
}

const MessagesModule = ({ onRefresh }: MessagesModuleProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('admin-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const filtered = conversations.filter(c =>
      c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      c.client_email.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredConversations(filtered);
  }, [search, conversations]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Get all transfers with messages
      const { data: transfers } = await supabase
        .from('transfers')
        .select('id, reference_number, status, user_id')
        .order('updated_at', { ascending: false });

      if (!transfers) return;

      // Get profiles
      const userIds = [...new Set(transfers.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get messages for each transfer
      const conversationsData: Conversation[] = [];

      for (const transfer of transfers) {
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('transfer_id', transfer.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (messages && messages.length > 0) {
          const profile = profileMap.get(transfer.user_id);
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('transfer_id', transfer.id)
            .eq('is_admin', false)
            .eq('read', false);

          conversationsData.push({
            transfer_id: transfer.id,
            reference_number: transfer.reference_number,
            client_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client' : 'Client',
            client_email: profile?.email || '',
            client_phone: profile?.phone || '',
            last_message: messages[0].message || '[Pièce jointe]',
            last_message_time: messages[0].created_at,
            unread_count: count || 0,
            status: transfer.status,
          });
        }
      }

      // Sort by unread first, then by last message time
      conversationsData.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setConversations(conversationsData);
      setFilteredConversations(conversationsData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (transferId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      awaiting_admin: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      completed: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'En attente',
      awaiting_admin: 'À valider',
      approved: 'Approuvé',
      completed: 'Terminé',
      rejected: 'Rejeté',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  // Show chat when conversation is selected
  if (selectedConversation) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-background">
          <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar>
            <AvatarFallback>{selectedConversation.client_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{selectedConversation.client_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {selectedConversation.reference_number} • {selectedConversation.client_email}
            </div>
          </div>
          {getStatusBadge(selectedConversation.status)}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <TransferChat
            transferId={selectedConversation.transfer_id}
            isAdmin={true}
            onClose={() => setSelectedConversation(null)}
            embedded={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, email, référence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Conversations List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-2 pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune conversation</div>
          ) : (
            filteredConversations.map((conversation) => (
              <Card
                key={conversation.transfer_id}
                className={`p-3 cursor-pointer hover:shadow-md transition-all ${
                  conversation.unread_count > 0 ? 'border-primary/50 bg-primary/5' : ''
                }`}
                onClick={() => handleSelectConversation(conversation)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="text-sm">
                      {conversation.client_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-medium truncate ${conversation.unread_count > 0 ? 'text-foreground' : ''}`}>
                        {conversation.client_name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true, locale: fr })}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground truncate mb-1">
                      {conversation.reference_number}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conversation.unread_count > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {conversation.last_message}
                      </span>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center text-xs rounded-full">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{conversation.client_email}</span>
                      {conversation.client_phone && (
                        <>
                          <Phone className="w-3 h-3 ml-2" />
                          <span>{conversation.client_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MessagesModule;
