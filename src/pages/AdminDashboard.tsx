import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import AdminSidebar from '@/components/admin/AdminSidebar';
import TransfersModule from '@/components/admin/TransfersModule';
import ProofsModule from '@/components/admin/ProofsModule';
import MessagesModule from '@/components/admin/MessagesModule';
import { Loader2 } from 'lucide-react';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  converted_amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  transfer_type: string;
  transfer_method: string;
  created_at: string;
  user_id: string;
  proof_image_url?: string | null;
  proof_verified?: boolean | null;
  admin_notes?: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  recipient_name?: string;
  recipient_number?: string;
  recipient_country?: string;
  unread_count: number;
  last_message?: string;
}

interface Proof {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  proof_image_url: string;
  proof_verified?: boolean | null;
  proof_admin_comment?: string | null;
  created_at: string;
  client_name: string;
  client_email: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('transfers');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Stats for sidebar badges
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingProofs, setPendingProofs] = useState(0);
  const [pendingTransfers, setPendingTransfers] = useState(0);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
      setupRealtimeSubscriptions();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('is_admin', { user_id_input: user.id });
      if (error) throw error;

      if (!data) {
        toast.error('Accès refusé');
        navigate('/dashboard');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/dashboard');
    }
  };

  const setupRealtimeSubscriptions = () => {
    const transfersChannel = supabase
      .channel('admin-transfers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => {
        loadAllData();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('admin-messages-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(transfersChannel);
      supabase.removeChannel(messagesChannel);
    };
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadTransfers(), loadProofs(), loadUnreadCount()]);
    setLoading(false);
  };

  const loadTransfers = async () => {
    try {
      // Load transfers
      const { data: transfersData, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load profiles
      const userIds = [...new Set(transfersData?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Load recipients
      const recipientIds = transfersData?.filter(t => t.recipient_id).map(t => t.recipient_id) || [];
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country, transfer_number')
        .in('id', recipientIds);

      const recipientMap = new Map(recipients?.map(r => [r.id, r]) || []);

      // Get unread counts for each transfer
      const enrichedTransfers: Transfer[] = [];

      for (const transfer of transfersData || []) {
        const profile = profileMap.get(transfer.user_id);
        const recipient = transfer.recipient_id ? recipientMap.get(transfer.recipient_id) : null;

        // Get unread message count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('transfer_id', transfer.id)
          .eq('is_admin', false)
          .eq('read', false);

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('message')
          .eq('transfer_id', transfer.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        enrichedTransfers.push({
          ...transfer,
          client_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client' : 'Client',
          client_email: profile?.email || '',
          client_phone: profile?.phone || '',
          recipient_name: recipient?.name,
          recipient_number: recipient?.transfer_number || recipient?.phone,
          recipient_country: recipient?.country,
          unread_count: count || 0,
          last_message: lastMsg?.message,
        });
      }

      setTransfers(enrichedTransfers);
      setPendingTransfers(enrichedTransfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast.error('Erreur lors du chargement');
    }
  };

  const loadProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .not('proof_image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load profiles
      const userIds = [...new Set(data?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedProofs: Proof[] = (data || []).map(t => {
        const profile = profileMap.get(t.user_id);
        return {
          id: t.id,
          reference_number: t.reference_number,
          amount: t.amount,
          from_currency: t.from_currency,
          to_currency: t.to_currency,
          status: t.status,
          proof_image_url: t.proof_image_url!,
          proof_verified: t.proof_verified,
          proof_admin_comment: t.proof_admin_comment,
          created_at: t.created_at,
          client_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Client' : 'Client',
          client_email: profile?.email || '',
        };
      });

      setProofs(enrichedProofs);
      setPendingProofs(enrichedProofs.filter(p => p.proof_verified === null).length);
    } catch (error) {
      console.error('Error loading proofs:', error);
    }
  };

  const loadUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', false)
      .eq('read', false);

    setUnreadMessages(count || 0);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadMessages={unreadMessages}
        pendingProofs={pendingProofs}
        pendingTransfers={pendingTransfers}
      />

      <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'transfers' && (
            <TransfersModule
              transfers={transfers}
              loading={loading}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'proofs' && (
            <ProofsModule
              proofs={proofs}
              loading={loading}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesModule onRefresh={loadUnreadCount} />
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
