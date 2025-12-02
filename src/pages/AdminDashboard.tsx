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
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  User,
  Loader2,
  LogOut,
  Filter,
  Clock,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  MapPin,
  CreditCard,
  Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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

  // Déterminer le type basé sur les devises
  const getOperationType = (transfer: Transfer) => {
    if (transfer.from_currency === 'MAD' && transfer.to_currency === 'CFA') {
      return { type: 'send', label: 'Envoi', icon: ArrowUpRight, color: 'bg-emerald-500' };
    }
    return { type: 'withdraw', label: 'Retrait', icon: ArrowDownLeft, color: 'bg-blue-500' };
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'En attente' },
      awaiting_admin: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'À valider' },
      approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Approuvé' },
      completed: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Terminé' },
      rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejeté' },
      cancelled: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Annulé' },
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
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">J</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 dark:text-white">Jotali Admin</h1>
              <p className="text-xs text-slate-500">Gestion des transferts</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }} className="text-slate-600 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" />Déconnexion
          </Button>
        </div>
      </header>

      <main className="px-4 lg:px-8 py-6 max-w-[1600px] mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md bg-white dark:bg-slate-800/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400">À traiter</p>
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Preuves</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.proofs}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">Terminés</p>
                  <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, téléphone, email, référence..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <SelectValue placeholder="Tous les statuts" />
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
              <Button variant="outline" onClick={loadTransfers} disabled={loading} className="border-slate-200 dark:border-slate-700">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transfers List */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="text-slate-500 mt-4">Chargement des transferts...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">Aucun transfert trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTransfers.map((transfer) => {
              const opType = getOperationType(transfer);
              const statusConfig = getStatusConfig(transfer.status);
              const OpIcon = opType.icon;
              
              return (
                <Card key={transfer.id} className="border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header avec badges */}
                    <div className="flex flex-wrap items-center gap-2 p-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <Badge className={`${opType.color} text-white border-0 px-3 py-1`}>
                        <OpIcon className="w-3.5 h-3.5 mr-1.5" />
                        {opType.label}
                      </Badge>
                      <code className="text-xs font-medium px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                        {transfer.reference_number}
                      </code>
                      <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0`}>
                        {statusConfig.label}
                      </Badge>
                      {transfer.unread_count > 0 && (
                        <Badge variant="destructive" className="rounded-full animate-pulse">
                          {transfer.unread_count} nouveau{transfer.unread_count > 1 ? 'x' : ''}
                        </Badge>
                      )}
                      {transfer.proof_image_url && transfer.proof_verified === null && (
                        <Badge className="bg-orange-500 text-white border-0">⚡ Preuve à valider</Badge>
                      )}
                      <span className="text-xs text-slate-500 ml-auto">
                        {format(new Date(transfer.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>

                    {/* Contenu principal */}
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Client */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />Client
                          </h4>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {transfer.client_first_name || transfer.client_last_name 
                                ? `${transfer.client_first_name} ${transfer.client_last_name}`.trim()
                                : 'Non renseigné'}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {transfer.client_phone || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{transfer.client_email || 'N/A'}</span>
                            </div>
                            {transfer.client_country && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {transfer.client_country}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bénéficiaire */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />Bénéficiaire
                          </h4>
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-1.5">
                            {transfer.recipient_name ? (
                              <>
                                <p className="font-semibold text-slate-900 dark:text-white">{transfer.recipient_name}</p>
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {transfer.recipient_phone || 'N/A'}
                                </div>
                                {transfer.recipient_country && (
                                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    {transfer.recipient_country}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-slate-500 italic">Non renseigné</p>
                            )}
                          </div>
                        </div>

                        {/* Montant */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" />Transaction
                          </h4>
                          <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl p-3 space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm text-slate-500">Envoyé</span>
                              <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {transfer.amount.toLocaleString()} {transfer.from_currency}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-sm text-slate-500">Reçu</span>
                              <span className="text-lg font-bold text-primary">
                                {transfer.converted_amount.toLocaleString()} {transfer.to_currency}
                              </span>
                            </div>
                            <Separator className="my-2" />
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>Méthode</span>
                              <Badge variant="secondary" className="capitalize">{transfer.transfer_method}</Badge>
                            </div>
                            {transfer.fees > 0 && (
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>Frais</span>
                                <span>{transfer.fees.toLocaleString()} {transfer.from_currency}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button 
                          size="sm" 
                          variant={transfer.unread_count > 0 ? 'default' : 'outline'}
                          onClick={() => { setSelectedTransfer(transfer); setChatOpen(true); }}
                          className="gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Chat
                          {transfer.unread_count > 0 && (
                            <Badge variant="secondary" className="ml-1 bg-white/20 text-white">{transfer.unread_count}</Badge>
                          )}
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { setSelectedTransfer(transfer); setDetailsOpen(true); }}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Détails
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => { setSelectedTransfer(transfer); setNewStatus(transfer.status); setStatusDialogOpen(true); }}
                        >
                          Changer statut
                        </Button>

                        {transfer.proof_image_url && (
                          <Button 
                            size="sm" 
                            variant={transfer.proof_verified === null ? 'default' : 'outline'} 
                            onClick={() => viewProof(transfer)}
                            className={transfer.proof_verified === null ? 'bg-orange-500 hover:bg-orange-600' : ''}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Voir preuve
                          </Button>
                        )}

                        {(transfer.status === 'approved' || transfer.status === 'awaiting_admin') && (
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 gap-2 ml-auto"
                            onClick={() => { setSelectedTransfer(transfer); setSendNumberOpen(true); }}
                          >
                            <Send className="w-4 h-4" />
                            Envoyer N°
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-800/50">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Chat avec {selectedTransfer?.client_first_name} {selectedTransfer?.client_last_name}
            </DialogTitle>
            <DialogDescription>
              Réf: {selectedTransfer?.reference_number}
            </DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <TransferChat 
              transferId={selectedTransfer.id} 
              isAdmin={true}
              embedded={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du transfert</DialogTitle>
            <DialogDescription>{selectedTransfer?.reference_number}</DialogDescription>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-slate-500">Client</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                    <p><strong>Nom:</strong> {selectedTransfer.client_first_name} {selectedTransfer.client_last_name}</p>
                    <p><strong>Email:</strong> {selectedTransfer.client_email || 'N/A'}</p>
                    <p><strong>Téléphone:</strong> {selectedTransfer.client_phone || 'N/A'}</p>
                    <p><strong>Pays:</strong> {selectedTransfer.client_country || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-slate-500">Bénéficiaire</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                    <p><strong>Nom:</strong> {selectedTransfer.recipient_name || 'N/A'}</p>
                    <p><strong>Numéro:</strong> {selectedTransfer.recipient_phone || 'N/A'}</p>
                    <p><strong>Pays:</strong> {selectedTransfer.recipient_country || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-slate-500">Transaction</h4>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <p><strong>Montant envoyé:</strong> {selectedTransfer.amount.toLocaleString()} {selectedTransfer.from_currency}</p>
                  <p><strong>Montant reçu:</strong> {selectedTransfer.converted_amount.toLocaleString()} {selectedTransfer.to_currency}</p>
                  <p><strong>Taux:</strong> {selectedTransfer.exchange_rate}</p>
                  <p><strong>Frais:</strong> {selectedTransfer.fees?.toLocaleString() || 0} {selectedTransfer.from_currency}</p>
                  <p><strong>Total:</strong> {selectedTransfer.total_amount?.toLocaleString()} {selectedTransfer.from_currency}</p>
                  <p><strong>Méthode:</strong> {selectedTransfer.transfer_method}</p>
                  <p><strong>Statut:</strong> {getStatusConfig(selectedTransfer.status).label}</p>
                  <p><strong>Date:</strong> {format(new Date(selectedTransfer.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                </div>
              </div>
              {selectedTransfer.admin_notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-500">Notes admin</h4>
                  <p className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-sm">{selectedTransfer.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
            <DialogDescription>Transfert: {selectedTransfer?.reference_number}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="awaiting_admin">À valider</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Textarea 
              placeholder="Notes admin (optionnel)" 
              value={adminNotes} 
              onChange={(e) => setAdminNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Annuler</Button>
            <Button onClick={updateStatus} disabled={updating}>
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preuve de paiement</DialogTitle>
            <DialogDescription>
              {selectedTransfer?.reference_number} - {selectedTransfer?.client_first_name} {selectedTransfer?.client_last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {proofImageUrl && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2">
                <img src={proofImageUrl} alt="Preuve" className="max-h-[50vh] mx-auto object-contain rounded-lg" />
              </div>
            )}
            <Textarea 
              placeholder="Commentaire (optionnel - sera visible par le client)" 
              value={proofComment} 
              onChange={(e) => setProofComment(e.target.value)}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setProofDialogOpen(false)}>Fermer</Button>
            <Button variant="destructive" onClick={() => validateProof(false)} disabled={updating}>
              <XCircle className="w-4 h-4 mr-2" />Rejeter
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => validateProof(true)} disabled={updating}>
              <CheckCircle className="w-4 h-4 mr-2" />Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Number Dialog */}
      <Dialog open={sendNumberOpen} onOpenChange={setSendNumberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le numéro {selectedTransfer?.transfer_method}</DialogTitle>
            <DialogDescription>
              Client: {selectedTransfer?.client_first_name} {selectedTransfer?.client_last_name}
              <br />
              Montant: {selectedTransfer?.converted_amount.toLocaleString()} {selectedTransfer?.to_currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input 
              placeholder={`Numéro ${selectedTransfer?.transfer_method}`}
              value={waveNumber} 
              onChange={(e) => setWaveNumber(e.target.value)}
              className="text-lg"
            />
            <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              ⚠️ Le transfert sera automatiquement marqué comme complété
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendNumberOpen(false)}>Annuler</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={sendWaveNumber} 
              disabled={updating || !waveNumber.trim()}
            >
              {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
