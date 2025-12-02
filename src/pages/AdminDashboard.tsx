import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  MessageSquare, 
  CheckCircle, 
  XCircle,
  Send,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  User,
  Loader2,
  LogOut,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TransferChat from '@/components/TransferChat';

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
  proof_admin_comment?: string | null;
  admin_notes?: string | null;
  // Client info
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone: string;
  // Recipient info
  recipient_name?: string;
  recipient_phone?: string;
  recipient_country?: string;
  // Messaging
  unread_count: number;
}

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialogs
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [sendNumberOpen, setSendNumberOpen] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState('');
  
  // Form states
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadTransfers())
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

      // Get profiles
      const userIds = [...new Set(transfersData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get recipients
      const recipientIds = transfersData.filter(t => t.recipient_id).map(t => t.recipient_id);
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id, name, phone, country, transfer_number')
        .in('id', recipientIds);
      const recipientMap = new Map(recipients?.map(r => [r.id, r]) || []);

      // Enrich transfers
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      pending: { bg: 'bg-yellow-500', label: 'En attente' },
      awaiting_admin: { bg: 'bg-blue-500', label: 'À valider' },
      approved: { bg: 'bg-green-500', label: 'Approuvé' },
      completed: { bg: 'bg-emerald-600', label: 'Terminé' },
      rejected: { bg: 'bg-red-500', label: 'Rejeté' },
      cancelled: { bg: 'bg-gray-500', label: 'Annulé' },
    };
    const c = config[status] || config.pending;
    return <Badge className={`${c.bg} text-white`}>{c.label}</Badge>;
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
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
            <span className="font-bold text-lg">Admin Jotali</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
            <LogOut className="w-4 h-4 mr-2" />Déconnexion
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-4 text-center bg-yellow-50 dark:bg-yellow-950">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">À traiter</div>
          </Card>
          <Card className="p-4 text-center bg-blue-50 dark:bg-blue-950">
            <div className="text-2xl font-bold text-blue-600">{stats.proofs}</div>
            <div className="text-xs text-muted-foreground">Preuves</div>
          </Card>
          <Card className="p-4 text-center bg-green-50 dark:bg-green-950">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Terminés</div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher nom, téléphone, email, référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="awaiting_admin">À valider</SelectItem>
              <SelectItem value="approved">Approuvé</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="rejected">Rejeté</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadTransfers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Transfers List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun transfert trouvé</div>
        ) : (
          <div className="space-y-3">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="p-4">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant={transfer.transfer_type === 'send' ? 'default' : 'secondary'}>
                    {transfer.transfer_type === 'send' ? (
                      <><ArrowUpRight className="w-3 h-3 mr-1" />Envoi</>
                    ) : (
                      <><ArrowDownLeft className="w-3 h-3 mr-1" />Retrait</>
                    )}
                  </Badge>
                  <span className="font-mono text-sm">{transfer.reference_number}</span>
                  {getStatusBadge(transfer.status)}
                  {transfer.unread_count > 0 && (
                    <Badge variant="destructive" className="rounded-full">{transfer.unread_count} msg</Badge>
                  )}
                  {transfer.proof_image_url && transfer.proof_verified === null && (
                    <Badge className="bg-orange-500 text-white">Preuve à valider</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(transfer.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  {/* Client */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />CLIENT
                    </div>
                    <div className="font-semibold">{transfer.client_first_name} {transfer.client_last_name}</div>
                    <div className="text-sm flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />{transfer.client_phone || 'N/A'}
                    </div>
                    <div className="text-sm flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />{transfer.client_email || 'N/A'}
                    </div>
                  </div>

                  {/* Beneficiary */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">BÉNÉFICIAIRE</div>
                    {transfer.recipient_name ? (
                      <>
                        <div className="font-semibold">{transfer.recipient_name}</div>
                        <div className="text-sm flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />{transfer.recipient_phone || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">{transfer.recipient_country}</div>
                      </>
                    ) : (
                      <div className="text-muted-foreground text-sm">Non renseigné</div>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="bg-primary/5 rounded-lg p-3">
                    <div className="text-xs font-medium text-muted-foreground mb-2">MONTANT</div>
                    <div className="text-lg font-bold">{transfer.amount.toLocaleString()} {transfer.from_currency}</div>
                    <div className="text-primary font-semibold">→ {transfer.converted_amount.toLocaleString()} {transfer.to_currency}</div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">{transfer.transfer_method}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setChatOpen(true); }}>
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Chat {transfer.unread_count > 0 && `(${transfer.unread_count})`}
                  </Button>
                  
                  <Button size="sm" variant="outline" onClick={() => { setSelectedTransfer(transfer); setNewStatus(transfer.status); setStatusDialogOpen(true); }}>
                    Statut
                  </Button>

                  {transfer.proof_image_url && (
                    <Button size="sm" variant={transfer.proof_verified === null ? 'default' : 'outline'} onClick={() => viewProof(transfer)}>
                      <Eye className="w-4 h-4 mr-1" />Preuve
                    </Button>
                  )}

                  {(transfer.status === 'approved' || transfer.status === 'awaiting_admin') && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelectedTransfer(transfer); setSendNumberOpen(true); }}>
                      <Send className="w-4 h-4 mr-1" />Envoyer N°
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
          {selectedTransfer && (
            <TransferChat 
              transferId={selectedTransfer.id} 
              isAdmin={true}
              onClose={() => setChatOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="awaiting_admin">À valider</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Notes (optionnel)" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Annuler</Button>
            <Button onClick={updateStatus} disabled={updating}>{updating ? 'Mise à jour...' : 'Confirmer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preuve de paiement - {selectedTransfer?.reference_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {proofImageUrl && (
              <img src={proofImageUrl} alt="Preuve" className="max-h-[50vh] mx-auto object-contain rounded-lg" />
            )}
            <Textarea placeholder="Commentaire (optionnel)" value={proofComment} onChange={(e) => setProofComment(e.target.value)} />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProofDialogOpen(false)}>Fermer</Button>
            <Button variant="destructive" onClick={() => validateProof(false)} disabled={updating}>
              <XCircle className="w-4 h-4 mr-1" />Rejeter
            </Button>
            <Button onClick={() => validateProof(true)} disabled={updating}>
              <CheckCircle className="w-4 h-4 mr-1" />Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Number Dialog */}
      <Dialog open={sendNumberOpen} onOpenChange={setSendNumberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le numéro {selectedTransfer?.transfer_method}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Numéro Wave/OM" value={waveNumber} onChange={(e) => setWaveNumber(e.target.value)} />
            <p className="text-sm text-muted-foreground">Le transfert sera marqué comme complété.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendNumberOpen(false)}>Annuler</Button>
            <Button onClick={sendWaveNumber} disabled={updating || !waveNumber.trim()}>
              {updating ? 'Envoi...' : 'Envoyer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
