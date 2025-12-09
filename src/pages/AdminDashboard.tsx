import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { 
  Search, RefreshCw, Eye, MessageSquare, CheckCircle, XCircle, Send,
  ArrowUpRight, ArrowDownLeft, Phone, Mail, User, Loader2, LogOut,
  Filter, Clock, TrendingUp, FileCheck, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import TransferChat from '@/components/TransferChat';
import { motion, AnimatePresence } from 'framer-motion';

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
  fees: number;
  total_amount: number;
  exchange_rate: number;
  created_at: string;
  user_id: string;
  proof_image_url?: string | null;
  proof_verified?: boolean | null;
  proof_admin_comment?: string | null;
  admin_notes?: string | null;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string;
  client_country: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_country?: string;
  unread_count: number;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifyMessage } = useNotificationSound();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [sendNumberOpen, setSendNumberOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [proofComment, setProofComment] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransfers();
      const channel = supabase
        .channel('admin-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => loadTransfers())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const msg = payload.new as any;
          if (!msg.is_admin) {
            notifyMessage();
            toast.info('Nouveau message client', { duration: 3000 });
          }
          loadTransfers();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      const { data } = await supabase.rpc('is_admin', { user_id_input: user.id });
      if (!data) { toast.error('Accès refusé'); navigate('/dashboard'); return; }
      setIsAdmin(true);
    } catch { navigate('/dashboard'); }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const { data: transfersData } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!transfersData) return;

      const userIds = [...new Set(transfersData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, country')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const recipientIds = transfersData.filter(t => t.recipient_id).map(t => t.recipient_id);
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country, transfer_number')
        .in('id', recipientIds);
      const recipientMap = new Map(recipients?.map(r => [r.id, r]) || []);

      const enriched: Transfer[] = [];
      for (const t of transfersData) {
        const profile = profileMap.get(t.user_id);
        const recipient = t.recipient_id ? recipientMap.get(t.recipient_id) : null;
        
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('transfer_id', t.id)
          .eq('is_admin', false)
          .eq('read', false);

        enriched.push({
          ...t,
          client_first_name: profile?.first_name || '',
          client_last_name: profile?.last_name || '',
          client_email: profile?.email || '',
          client_phone: profile?.phone || '',
          client_country: profile?.country || '',
          recipient_name: recipient?.name,
          recipient_phone: recipient?.transfer_number || recipient?.phone,
          recipient_country: recipient?.country,
          unread_count: count || 0,
        });
      }
      setTransfers(enriched);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(t => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      t.reference_number.toLowerCase().includes(searchLower) ||
      t.client_first_name.toLowerCase().includes(searchLower) ||
      t.client_last_name.toLowerCase().includes(searchLower) ||
      t.client_email.toLowerCase().includes(searchLower) ||
      t.client_phone.includes(search) ||
      (t.recipient_name?.toLowerCase().includes(searchLower)) ||
      (t.recipient_phone?.includes(search));
    
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOperationType = (transfer: Transfer) => {
    if (transfer.from_currency === 'MAD' && transfer.to_currency === 'CFA') {
      return { type: 'send', label: 'Envoi', icon: ArrowUpRight, color: 'bg-emerald-500' };
    }
    return { type: 'withdraw', label: 'Retrait', icon: ArrowDownLeft, color: 'bg-blue-500' };
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      awaiting_admin: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'À valider' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approuvé' },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Terminé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Annulé' },
    };
    return config[status] || config.pending;
  };

  const updateStatus = async () => {
    if (!selectedTransfer || !newStatus) return;
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      if (adminNotes) updates.admin_notes = adminNotes;
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      
      await supabase.from('transfers').update(updates).eq('id', selectedTransfer.id);
      toast.success('Statut mis à jour');
      setStatusDialogOpen(false);
      setNewStatus('');
      setAdminNotes('');
      loadTransfers();
    } catch { toast.error('Erreur'); }
    finally { setUpdating(false); }
  };

  const viewProof = async (transfer: Transfer) => {
    if (!transfer.proof_image_url) return;
    try {
      const { data } = await supabase.storage
        .from('transfer-proofs')
        .createSignedUrl(transfer.proof_image_url, 300);
      if (data?.signedUrl) {
        setProofImageUrl(data.signedUrl);
        setSelectedTransfer(transfer);
        setProofDialogOpen(true);
      }
    } catch { toast.error('Erreur image'); }
  };

  const validateProof = async (isValid: boolean) => {
    if (!selectedTransfer) return;
    setUpdating(true);
    try {
      const updates: any = {
        proof_verified: isValid,
        proof_verified_at: new Date().toISOString(),
        proof_verified_by: user?.id,
      };
      if (proofComment) updates.proof_admin_comment = proofComment;
      if (isValid) updates.status = 'approved';

      await supabase.from('transfers').update(updates).eq('id', selectedTransfer.id);
      
      if (proofComment) {
        await supabase.from('proof_comments').insert({
          transfer_id: selectedTransfer.id,
          user_id: user?.id,
          comment: proofComment,
          is_admin: true,
        });
      }
      
      toast.success(isValid ? 'Preuve validée' : 'Preuve rejetée');
      setProofDialogOpen(false);
      setProofComment('');
      loadTransfers();
    } catch { toast.error('Erreur'); }
    finally { setUpdating(false); }
  };

  const sendWaveNumber = async () => {
    if (!selectedTransfer || !waveNumber.trim()) return;
    setUpdating(true);
    try {
      const message = `✅ Votre transfert est prêt!\n\nNuméro ${selectedTransfer.transfer_method}: ${waveNumber}\nMontant: ${selectedTransfer.converted_amount.toLocaleString()} ${selectedTransfer.to_currency}`;
      
      await supabase.from('messages').insert({
        transfer_id: selectedTransfer.id,
        sender_id: user?.id,
        message,
        is_admin: true,
      });
      
      await supabase.from('transfers').update({ 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      }).eq('id', selectedTransfer.id);
      
      toast.success('Numéro envoyé');
      setSendNumberOpen(false);
      setWaveNumber('');
      loadTransfers();
    } catch { toast.error('Erreur'); }
    finally { setUpdating(false); }
  };

  const stats = {
    total: transfers.length,
    pending: transfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length,
    completed: transfers.filter(t => t.status === 'completed').length,
    proofs: transfers.filter(t => t.proof_image_url && t.proof_verified === null).length,
    unreadMessages: transfers.reduce((acc, t) => acc + t.unread_count, 0),
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const TransferCard = ({ transfer }: { transfer: Transfer }) => {
    const op = getOperationType(transfer);
    const status = getStatusConfig(transfer.status);
    const OpIcon = op.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
        onClick={() => { setSelectedTransfer(transfer); setDetailsOpen(true); }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${op.color} flex items-center justify-center`}>
              <OpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">
                {transfer.client_first_name} {transfer.client_last_name}
              </p>
              <p className="text-xs text-slate-500">{transfer.reference_number}</p>
            </div>
          </div>
          <Badge className={`${status.bg} ${status.text} border-0 text-xs`}>
            {status.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-slate-900">
              {transfer.amount.toLocaleString()} {transfer.from_currency}
            </p>
            <p className="text-sm text-slate-500">
              → {transfer.converted_amount.toLocaleString()} {transfer.to_currency}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {transfer.proof_image_url && transfer.proof_verified === null && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileCheck className="w-4 h-4 text-blue-600" />
              </div>
            )}
            {transfer.unread_count > 0 && (
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{transfer.unread_count}</span>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{format(new Date(transfer.created_at), 'dd MMM HH:mm', { locale: fr })}</span>
          {transfer.recipient_name && (
            <span>→ {transfer.recipient_name}</span>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span 
              className="text-xl font-black"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              JOTALI
            </span>
            <Badge variant="secondary" className="text-[10px]">Admin</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 pb-24 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'bg-slate-100', textColor: 'text-slate-700' },
            { label: 'À traiter', value: stats.pending, color: 'bg-amber-100', textColor: 'text-amber-700' },
            { label: 'Preuves', value: stats.proofs, color: 'bg-blue-100', textColor: 'text-blue-700' },
            { label: 'Messages', value: stats.unreadMessages, color: 'bg-red-100', textColor: 'text-red-700' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-3 text-center`}>
              <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className="text-[10px] text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-slate-200 rounded-xl h-11"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white border-slate-200 rounded-xl h-11">
              <Filter className="w-4 h-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="awaiting_admin">À valider</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadTransfers} className="h-11 w-11 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Transfer List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Aucun transfert trouvé
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <TransferCard key={transfer.id} transfer={transfer} />
            ))}
          </div>
        )}
      </main>

      {/* Transfer Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
          {selectedTransfer && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg">
                    {selectedTransfer.reference_number}
                  </SheetTitle>
                  <Badge className={`${getStatusConfig(selectedTransfer.status).bg} ${getStatusConfig(selectedTransfer.status).text} border-0`}>
                    {getStatusConfig(selectedTransfer.status).label}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Client Info */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">CLIENT</p>
                  <p className="font-semibold text-slate-900">
                    {selectedTransfer.client_first_name} {selectedTransfer.client_last_name}
                  </p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> {selectedTransfer.client_email}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4" /> {selectedTransfer.client_phone || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Transfer Details */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">TRANSFERT</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Montant envoyé</span>
                      <span className="font-semibold">{selectedTransfer.amount.toLocaleString()} {selectedTransfer.from_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Montant reçu</span>
                      <span className="font-semibold">{selectedTransfer.converted_amount.toLocaleString()} {selectedTransfer.to_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Frais</span>
                      <span className="font-semibold">{selectedTransfer.fees?.toLocaleString() || 0} {selectedTransfer.from_currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Méthode</span>
                      <span className="font-semibold">{selectedTransfer.transfer_method}</span>
                    </div>
                  </div>
                </div>

                {/* Recipient */}
                {selectedTransfer.recipient_name && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">BÉNÉFICIAIRE</p>
                    <p className="font-semibold text-slate-900">{selectedTransfer.recipient_name}</p>
                    <p className="text-sm text-slate-600">{selectedTransfer.recipient_phone}</p>
                    <p className="text-sm text-slate-600">{selectedTransfer.recipient_country}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() => { setDetailsOpen(false); setChatOpen(true); }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                    {selectedTransfer.unread_count > 0 && (
                      <Badge className="ml-2 bg-red-500">{selectedTransfer.unread_count}</Badge>
                    )}
                  </Button>
                  
                  {selectedTransfer.proof_image_url && (
                    <Button
                      variant="outline"
                      className="h-12 rounded-xl"
                      onClick={() => { setDetailsOpen(false); viewProof(selectedTransfer); }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preuve
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => { setDetailsOpen(false); setSendNumberOpen(true); }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer N°
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() => { setDetailsOpen(false); setStatusDialogOpen(true); }}
                  >
                    Statut
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Chat Sheet */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
          {selectedTransfer && (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedTransfer.client_first_name} {selectedTransfer.client_last_name}</p>
                  <p className="text-xs text-slate-500">{selectedTransfer.reference_number}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex-1">
                <TransferChat transferId={selectedTransfer.id} isAdmin={true} embedded />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes (optionnel)"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button onClick={updateStatus} disabled={!newStatus || updating} className="w-full h-12 rounded-xl">
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-lg mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Preuve de paiement</DialogTitle>
          </DialogHeader>
          {proofImageUrl && (
            <img src={proofImageUrl} alt="Preuve" className="w-full rounded-xl" />
          )}
          <Textarea
            placeholder="Commentaire (optionnel)"
            value={proofComment}
            onChange={(e) => setProofComment(e.target.value)}
            className="rounded-xl"
          />
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="destructive"
              onClick={() => validateProof(false)}
              disabled={updating}
              className="h-12 rounded-xl"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeter
            </Button>
            <Button
              onClick={() => validateProof(true)}
              disabled={updating}
              className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Number Dialog */}
      <Dialog open={sendNumberOpen} onOpenChange={setSendNumberOpen}>
        <DialogContent className="mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Envoyer le numéro</DialogTitle>
            <DialogDescription>
              Envoyez le numéro {selectedTransfer?.transfer_method} au client
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Numéro Wave/OM"
            value={waveNumber}
            onChange={(e) => setWaveNumber(e.target.value)}
            className="h-12 rounded-xl text-lg text-center"
          />
          <DialogFooter>
            <Button
              onClick={sendWaveNumber}
              disabled={!waveNumber.trim() || updating}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer et terminer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;