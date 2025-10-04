import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, FileImage, Search, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface Transfer {
  id: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  exchange_rate: number;
  transfer_type: string;
  transfer_method: string;
  status: string;
  reference_number: string;
  notes?: string;
  proof_image_url?: string;
  admin_notes?: string;
  created_at: string;
  completed_at?: string;
  user_id: string;
  recipient_id: string;
  fees: number;
  total_amount: number;
  recipients?: {
    name: string;
    phone: string;
    country: string;
    bank_account?: string;
    wave_number?: string;
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    country?: string;
  } | null;
  user_email?: string;
}

interface Stats {
  total: number;
  pending: number;
  awaiting_admin: number;
  completed: number;
  totalAmount: number;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    awaiting_admin: 0,
    completed: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransfers();
    }
  }, [isAdmin, statusFilter]);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchQuery]);

  const checkAdminStatus = async () => {
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    try {
      // Call the is_admin function using RPC
      const { data, error } = await supabase.rpc('is_admin', { 
        user_id_input: user.id 
      });

      if (error) throw error;

      if (data === true) {
        setIsAdmin(true);
      } else {
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas les privilèges d'administrateur",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier les privilèges administrateur",
        variant: "destructive",
      });
      navigate('/dashboard');
    }
  };

  const loadTransfers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: transfersData, error } = await query;

      if (error) throw error;

      console.log('Transfers loaded:', transfersData?.length);

      // Get user profiles
      const userIds = [...new Set(transfersData?.map(t => t.user_id).filter(Boolean) || [])];
      console.log('User IDs to fetch:', userIds);
      
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone, country, email')
          .in('user_id', userIds);
        
        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        } else {
          profiles = data || [];
        }
      }

      console.log('Profiles loaded:', profiles.length, profiles);

      // Get recipients
      const recipientIds = [...new Set(transfersData?.map(t => t.recipient_id).filter(Boolean) || [])];
      console.log('Recipient IDs to fetch:', recipientIds);
      
      let recipients: any[] = [];
      if (recipientIds.length > 0) {
        const { data, error: recipientsError } = await supabase
          .from('recipients')
          .select('id, name, phone, country, bank_account, wave_number')
          .in('id', recipientIds);

        if (recipientsError) {
          console.error('Error loading recipients:', recipientsError);
        } else {
          recipients = data || [];
        }
      }
      
      console.log('Recipients loaded:', recipients.length, recipients);

      // Merge data
      const enhancedTransfers = transfersData?.map(transfer => {
        const userProfile = profiles?.find(p => p.user_id === transfer.user_id);
        const recipient = recipients?.find(r => r.id === transfer.recipient_id);
        
        console.log(`Transfer ${transfer.reference_number}:`, {
          userProfile,
          recipient
        });
        
        return {
          ...transfer,
          profiles: userProfile ? {
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            phone: userProfile.phone,
            country: userProfile.country,
          } : null,
          recipients: recipient ? {
            name: recipient.name,
            phone: recipient.phone,
            country: recipient.country,
            bank_account: recipient.bank_account,
            wave_number: recipient.wave_number,
          } : undefined,
          user_email: userProfile?.email || 'N/A'
        };
      }) || [];

      console.log('Enhanced transfers:', enhancedTransfers);
      setTransfers(enhancedTransfers);
      calculateStats(enhancedTransfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des transferts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (transfers: Transfer[]) => {
    const stats = {
      total: transfers.length,
      pending: transfers.filter(t => t.status === 'pending').length,
      awaiting_admin: transfers.filter(t => t.status === 'awaiting_admin').length,
      completed: transfers.filter(t => t.status === 'completed').length,
      totalAmount: transfers.reduce((sum, t) => sum + Number(t.amount), 0),
    };
    setStats(stats);
  };

  const filterTransfers = () => {
    if (!searchQuery.trim()) {
      setFilteredTransfers(transfers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = transfers.filter(transfer => 
      transfer.reference_number.toLowerCase().includes(query) ||
      transfer.user_email?.toLowerCase().includes(query) ||
      `${transfer.profiles?.first_name} ${transfer.profiles?.last_name}`.toLowerCase().includes(query) ||
      transfer.recipients?.name?.toLowerCase().includes(query) ||
      transfer.recipients?.phone?.includes(query)
    );
    setFilteredTransfers(filtered);
  };

  const updateTransferStatus = async (transferId: string, newStatus: string, notes?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (notes) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('transfers')
        .update(updateData)
        .eq('id', transferId);

      if (error) {
        throw error;
      }

      toast({
        title: "Statut mis à jour",
        description: "Le statut du transfert a été mis à jour avec succès",
      });

      loadTransfers();
      setSelectedTransfer(null);
      setAdminNotes('');
    } catch (error: any) {
      console.error('Error updating transfer:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la mise à jour",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'awaiting_admin': return 'bg-blue-500/10 text-blue-500';
      case 'approved': return 'bg-green-500/10 text-green-500';
      case 'completed': return 'bg-green-600/10 text-green-600';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      case 'cancelled': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'awaiting_admin': return 'Attente admin';
      case 'approved': return 'Approuvé';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Administration
          </h1>
          <p className="text-muted-foreground">
            Gérer les transferts et demandes des utilisateurs
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 shadow-strong">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90 mb-1">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 opacity-80" />
            </div>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-4 shadow-strong">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90 mb-1">En attente admin</p>
                <p className="text-2xl font-bold">{stats.awaiting_admin}</p>
              </div>
              <Clock className="w-8 h-8 opacity-80" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 shadow-strong">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90 mb-1">En attente</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 opacity-80" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 shadow-strong">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90 mb-1">Terminés</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 opacity-80" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 shadow-strong">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs opacity-90 mb-1">Montant total</p>
                <p className="text-lg font-bold">
                  {new Intl.NumberFormat('fr-FR', {
                    notation: 'compact',
                    maximumFractionDigits: 1
                  }).format(stats.totalAmount)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par référence, email, nom, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les transferts</SelectItem>
              <SelectItem value="awaiting_admin">En attente admin</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="approved">Approuvés</SelectItem>
              <SelectItem value="completed">Terminés</SelectItem>
              <SelectItem value="rejected">Rejetés</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : filteredTransfers.length === 0 ? (
          <div className="text-center py-12">
            <Card className="bg-white/95 backdrop-blur-sm p-12 text-center shadow-medium border-0">
              {transfers.length === 0 ? (
                <>
                  <XCircle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Aucun transfert trouvé</h3>
                  <p className="text-sm text-muted-foreground">
                    {statusFilter !== 'all' 
                      ? 'Essayez de modifier le filtre de statut'
                      : 'Aucun transfert en attente de traitement'}
                  </p>
                </>
              ) : (
                <>
                  <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Aucun résultat trouvé</h3>
                  <p className="text-sm text-muted-foreground">
                    Essayez de modifier votre recherche ou vos filtres
                  </p>
                </>
              )}
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm shadow-medium border-0 hover:shadow-strong transition-all hover:scale-[1.02] flex flex-col">
                <div className="p-5 flex flex-col flex-1">
                  {/* Header with status and type */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Référence</p>
                      <h3 className="text-sm font-bold text-foreground mb-2 truncate">
                        {transfer.reference_number}
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {transfer.transfer_type === 'transfer' ? 'Envoi' : 
                           transfer.transfer_type === 'withdrawal' ? 'Retrait' :
                           transfer.transfer_type === 'exchange' ? 'Échange' : 'Transfert'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-muted-foreground">Envoyé</p>
                      <p className="text-lg font-bold text-foreground">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: transfer.from_currency === 'CFA' ? 'XOF' : 'MAD',
                        }).format(transfer.amount)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">Reçu</p>
                      <p className="text-sm font-semibold text-green-600">
                        {new Intl.NumberFormat('fr-FR', {
                          style: 'currency',
                          currency: transfer.to_currency === 'CFA' ? 'XOF' : 'MAD',
                        }).format(transfer.converted_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Client and Recipient info */}
                  <div className="space-y-2 mb-4 text-sm flex-1">
                    <div>
                      <p className="text-xs text-muted-foreground">Client</p>
                      <p className="font-semibold text-foreground truncate">
                        {transfer.profiles?.first_name && transfer.profiles?.last_name 
                          ? `${transfer.profiles.first_name} ${transfer.profiles.last_name}`
                          : 'Non renseigné'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Bénéficiaire</p>
                      <p className="font-semibold text-foreground truncate">
                        {transfer.recipients?.name || 'Retrait personnel'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    {transfer.status === 'awaiting_admin' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateTransferStatus(transfer.id, 'approved')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateTransferStatus(transfer.id, 'rejected')}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeter
                        </Button>
                      </div>
                    )}
                    {transfer.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => updateTransferStatus(transfer.id, 'completed')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Terminé
                      </Button>
                    )}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full" size="sm">
                          Voir les détails
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 flex-wrap">
                          <span>Transfert {transfer.reference_number}</span>
                          <Badge className={getStatusColor(transfer.status)}>
                            {getStatusText(transfer.status)}
                          </Badge>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4 mt-4">
                        {/* Amounts section */}
                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Montant envoyé</p>
                              <p className="text-2xl font-bold text-foreground">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: transfer.from_currency === 'CFA' ? 'XOF' : 'MAD',
                                }).format(transfer.amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Montant reçu</p>
                              <p className="text-2xl font-bold text-green-600">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: transfer.to_currency === 'CFA' ? 'XOF' : 'MAD',
                                }).format(transfer.converted_amount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Client info */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded">
                          <p className="text-xs font-semibold text-indigo-700 mb-3">👤 INFORMATIONS DU CLIENT (ENVOYEUR)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Nom complet</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.profiles?.first_name && transfer.profiles?.last_name 
                                  ? `${transfer.profiles.first_name} ${transfer.profiles.last_name}`
                                  : 'Non renseigné'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Email</p>
                              <p className="font-semibold text-indigo-700 text-sm break-all">
                                {transfer.user_email || 'Non renseigné'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.profiles?.phone || 'Non renseigné'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pays</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.profiles?.country || 'Non renseigné'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Recipient info */}
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                          <p className="text-xs font-semibold text-blue-700 mb-3">📩 INFORMATIONS DU BÉNÉFICIAIRE</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Nom complet</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.recipients?.name || 'Retrait personnel'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.recipients?.phone || '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Pays</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.recipients?.country || '-'}
                              </p>
                            </div>
                            {transfer.transfer_method === 'bank' && transfer.recipients?.bank_account && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Compte bancaire</p>
                                <p className="font-semibold text-green-700 text-sm">
                                  {transfer.recipients.bank_account}
                                </p>
                              </div>
                            )}
                            {transfer.transfer_method === 'wave' && transfer.recipients?.wave_number && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Numéro Wave</p>
                                <p className="font-semibold text-green-700 text-sm">
                                  {transfer.recipients.wave_number}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transaction details */}
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <p className="text-xs font-semibold text-foreground mb-3">💰 DÉTAILS DE LA TRANSACTION</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Méthode</p>
                              <p className="font-semibold text-foreground text-sm">
                                {transfer.transfer_method === 'bank' ? 'Virement bancaire' : 'Wave'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Frais</p>
                              <p className="font-semibold text-foreground text-sm">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: transfer.from_currency === 'CFA' ? 'XOF' : 'MAD',
                                }).format(transfer.fees)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Montant total</p>
                              <p className="font-semibold text-foreground text-sm">
                                {new Intl.NumberFormat('fr-FR', {
                                  style: 'currency',
                                  currency: transfer.from_currency === 'CFA' ? 'XOF' : 'MAD',
                                }).format(transfer.total_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Date de création</p>
                              <p className="font-semibold text-foreground text-sm">
                                {new Date(transfer.created_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {transfer.completed_at && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Date de complétion</p>
                                <p className="font-semibold text-green-700 text-sm">
                                  {new Date(transfer.completed_at).toLocaleString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Taux de change</p>
                              <p className="font-semibold text-foreground text-sm">
                                1 {transfer.from_currency} = {transfer.exchange_rate} {transfer.to_currency}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {transfer.notes && (
                          <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                            <p className="text-xs font-semibold text-amber-800 mb-1">📝 Note du client:</p>
                            <p className="text-sm text-amber-900">{transfer.notes}</p>
                          </div>
                        )}

                        {transfer.admin_notes && (
                          <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <p className="text-xs font-semibold text-blue-800 mb-1">📋 Note admin:</p>
                            <p className="text-sm text-blue-900">{transfer.admin_notes}</p>
                          </div>
                        )}

                        {/* Proof image */}
                        {transfer.proof_image_url && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-2">Justificatif de paiement</p>
                            <img 
                              src={`${supabase.storage.from('transfer-proofs').getPublicUrl(transfer.proof_image_url).data.publicUrl}`}
                              alt="Justificatif" 
                              className="w-full h-auto rounded-lg border"
                            />
                          </div>
                        )}

                        {/* Actions */}
                        {transfer.status === 'awaiting_admin' && (
                          <div className="flex flex-col gap-3 pt-4 border-t">
                            <Textarea
                              placeholder="Ajouter une note administrative..."
                              value={selectedTransfer?.id === transfer.id ? adminNotes : ''}
                              onChange={(e) => {
                                setSelectedTransfer(transfer);
                                setAdminNotes(e.target.value);
                              }}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => updateTransferStatus(transfer.id, 'approved', adminNotes)}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approuver
                              </Button>
                              <Button
                                onClick={() => updateTransferStatus(transfer.id, 'rejected', adminNotes)}
                                variant="destructive"
                                className="flex-1"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Rejeter
                              </Button>
                            </div>
                          </div>
                        )}

                        {transfer.status === 'approved' && (
                          <div className="flex flex-col gap-3 pt-4 border-t">
                            <Textarea
                              placeholder="Ajouter une note pour la complétion..."
                              value={selectedTransfer?.id === transfer.id ? adminNotes : ''}
                              onChange={(e) => {
                                setSelectedTransfer(transfer);
                                setAdminNotes(e.target.value);
                              }}
                              rows={2}
                            />
                            <Button
                              onClick={() => updateTransferStatus(transfer.id, 'completed', adminNotes)}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marquer comme terminé
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;