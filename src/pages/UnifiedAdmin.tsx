import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye, Download, FileText, Search, Filter, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import AdminStats from '@/components/admin/AdminStats';
import AdminFilters from '@/components/admin/AdminFilters';
import ExchangeRateManager from '@/components/admin/ExchangeRateManager';
import AdminCharts from '@/components/admin/AdminCharts';
import { format } from 'date-fns';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  created_at: string;
  proof_image_url: string | null;
  user_id: string;
  transfer_method: string;
  admin_notes?: string;
  proof_verified: boolean | null;
  proof_verified_at?: string;
  proof_admin_comment?: string;
  converted_amount: number;
  exchange_rate: number;
  total_amount: number;
  fees: number;
  recipient_id?: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
  } | null;
  recipients?: {
    name: string;
    phone: string;
    country: string;
    bank_account?: string;
    wave_number?: string;
  };
}

const UnifiedAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [proofsTransfers, setProofsTransfers] = useState<Transfer[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Proof filters
  const [proofSearchTerm, setProofSearchTerm] = useState('');
  const [proofStatusFilter, setProofStatusFilter] = useState('all');
  const [proofVerifiedFilter, setProofVerifiedFilter] = useState('all');
  
  // Dialogs
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [proofComment, setProofComment] = useState('');
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationType, setValidationType] = useState<'verify' | 'invalid'>('verify');

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadTransfers();
      loadProofs();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter, currencyFilter, methodFilter, dateFilter]);

  useEffect(() => {
    filterProofs();
  }, [proofsTransfers, proofSearchTerm, proofStatusFilter, proofVerifiedFilter]);

  const checkAdminStatus = async () => {
    if (!user?.id) {
      navigate('/auth');
      return;
    }

    try {
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
      navigate('/dashboard');
    }
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const { data: transfersData, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(transfersData?.map(t => t.user_id).filter(Boolean) || [])];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone, country, email')
          .in('user_id', userIds);
        if (!profilesError) {
          profiles = data || [];
        }
      }

      const recipientIds = [...new Set(transfersData?.map(t => t.recipient_id).filter(Boolean) || [])];
      let recipients: any[] = [];
      if (recipientIds.length > 0) {
        const { data, error: recipientsError } = await supabase
          .from('recipients')
          .select('id, name, phone, country, bank_account, wave_number')
          .in('id', recipientIds);
        if (!recipientsError) {
          recipients = data || [];
        }
      }

      const enhancedTransfers = transfersData?.map(transfer => {
        const userProfile = profiles?.find(p => p.user_id === transfer.user_id);
        const recipient = recipients?.find(r => r.id === transfer.recipient_id);
        
        return {
          ...transfer,
          profiles: userProfile || null,
          recipients: recipient || undefined,
        };
      }) || [];

      setTransfers(enhancedTransfers);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors du chargement des transferts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProofs = async () => {
    try {
      const { data: transfersData, error } = await supabase
        .from('transfers')
        .select('*')
        .neq('proof_image_url', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proofs:', error);
        throw error;
      }

      if (!transfersData || transfersData.length === 0) {
        setProofsTransfers([]);
        return;
      }

      const userIds = [...new Set(transfersData.map(t => t.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, country')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      const recipientIds = [...new Set(transfersData.map(t => t.recipient_id).filter(Boolean))];
      let recipients: any[] = [];
      if (recipientIds.length > 0) {
        const { data: recipientsData, error: recipientsError } = await supabase
          .from('recipients')
          .select('id, name, phone, country, bank_account, wave_number')
          .in('id', recipientIds);
        
        if (recipientsError) {
          console.error('Error fetching recipients:', recipientsError);
        }
        recipients = recipientsData || [];
      }

      const transfersWithProfiles = transfersData.map(transfer => ({
        ...transfer,
        profiles: profilesData?.find(p => p.user_id === transfer.user_id) || null,
        recipients: recipients?.find(r => r.id === transfer.recipient_id) || undefined
      }));

      setProofsTransfers(transfersWithProfiles);
    } catch (error) {
      console.error('Error loading proofs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les preuves",
        variant: "destructive",
      });
    }
  };

  const filterTransfers = () => {
    let filtered = [...transfers];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    if (currencyFilter !== 'all') {
      filtered = filtered.filter(t => t.from_currency === currencyFilter);
    }
    if (methodFilter !== 'all') {
      filtered = filtered.filter(t => t.transfer_method === methodFilter);
    }
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.reference_number.toLowerCase().includes(query) ||
        t.profiles?.email?.toLowerCase().includes(query) ||
        `${t.profiles?.first_name} ${t.profiles?.last_name}`.toLowerCase().includes(query)
      );
    }

    setFilteredTransfers(filtered);
  };

  const filterProofs = () => {
    let filtered = [...proofsTransfers];

    if (proofSearchTerm) {
      filtered = filtered.filter(t => 
        t.reference_number.toLowerCase().includes(proofSearchTerm.toLowerCase()) ||
        t.profiles?.email?.toLowerCase().includes(proofSearchTerm.toLowerCase()) ||
        `${t.profiles?.first_name} ${t.profiles?.last_name}`.toLowerCase().includes(proofSearchTerm.toLowerCase())
      );
    }
    if (proofStatusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === proofStatusFilter);
    }
    if (proofVerifiedFilter !== 'all') {
      if (proofVerifiedFilter === 'verified') {
        filtered = filtered.filter(t => t.proof_verified === true);
      } else if (proofVerifiedFilter === 'invalid') {
        filtered = filtered.filter(t => t.proof_verified === false);
      } else if (proofVerifiedFilter === 'pending') {
        filtered = filtered.filter(t => t.proof_verified === null);
      }
    }

    setFilteredProofs(filtered);
  };

  const updateTransferStatus = async (transferId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (adminNotes) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('transfers')
        .update(updateData)
        .eq('id', transferId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Statut mis à jour avec succès",
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

  const validateProof = async (transfer: Transfer, isValid: boolean) => {
    try {
      const { error } = await supabase
        .from('transfers')
        .update({
          proof_verified: isValid,
          proof_verified_at: new Date().toISOString(),
          proof_verified_by: user?.id,
          proof_admin_comment: proofComment || null,
        })
        .eq('id', transfer.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `Preuve ${isValid ? 'vérifiée' : 'marquée comme invalide'} avec succès`,
      });

      loadProofs();
      setValidationDialogOpen(false);
      setProofComment('');
      setSelectedTransfer(null);
    } catch (error: any) {
      console.error('Error validating proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la validation",
        variant: "destructive",
      });
    }
  };

  const viewProof = async (transfer: Transfer) => {
    if (!transfer.proof_image_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .createSignedUrl(transfer.proof_image_url, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        setSelectedImage(data.signedUrl);
      }
    } catch (error: any) {
      console.error('Error viewing proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la visualisation",
        variant: "destructive",
      });
    }
  };

  const downloadProof = async (transfer: Transfer) => {
    if (!transfer.proof_image_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .download(transfer.proof_image_url);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preuve-${transfer.reference_number}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Succès",
        description: "Preuve téléchargée avec succès",
      });
    } catch (error: any) {
      console.error('Error downloading proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "secondary", label: "En attente" },
      approved: { variant: "default", label: "Approuvé" },
      completed: { variant: "default", label: "Terminé" },
      rejected: { variant: "destructive", label: "Rejeté" },
      cancelled: { variant: "outline", label: "Annulé" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProofVerifiedBadge = (verified: boolean | null) => {
    if (verified === true) {
      return <Badge className="bg-success text-white">Vérifié</Badge>;
    } else if (verified === false) {
      return <Badge variant="destructive">Invalide</Badge>;
    } else {
      return <Badge variant="secondary">En attente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <div className="animate-pulse">Chargement...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl pb-24 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            Panneau d'administration 🎛️
          </h1>
          <p className="text-slate-600">
            Gérez tous les transferts et preuves de paiement
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="transfers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-medium">
            <TabsTrigger value="transfers" className="rounded-xl">Transferts</TabsTrigger>
            <TabsTrigger value="proofs" className="rounded-xl">Preuves</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-xl">Statistiques</TabsTrigger>
            <TabsTrigger value="rates" className="rounded-xl">Taux</TabsTrigger>
          </TabsList>

          {/* Transfers Tab */}
          <TabsContent value="transfers" className="space-y-6">
            {/* Simple Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-slate-800">{transfers.length}</div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">En attente</div>
                <div className="text-2xl font-bold text-warning">
                  {transfers.filter(t => t.status === 'pending').length}
                </div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Approuvés</div>
                <div className="text-2xl font-bold text-success">
                  {transfers.filter(t => t.status === 'approved' || t.status === 'completed').length}
                </div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Rejetés</div>
                <div className="text-2xl font-bold text-destructive">
                  {transfers.filter(t => t.status === 'rejected').length}
                </div>
              </Card>
            </div>
            
            {/* Filters */}
            <Card className="bg-white/95 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-medium border-0">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-2 border-slate-200"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[180px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="w-full md:w-[150px] rounded-xl">
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="MAD">MAD</SelectItem>
                      <SelectItem value="CFA">CFA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-full md:w-[150px] rounded-xl">
                      <SelectValue placeholder="Méthode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                      <SelectItem value="orange">Orange Money</SelectItem>
                      <SelectItem value="bank">Virement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTransfers.map((transfer) => (
                <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0 hover:shadow-strong transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-primary">
                        {transfer.reference_number}
                      </span>
                      {getStatusBadge(transfer.status)}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Client</span>
                        <span className="font-medium text-slate-800">
                          {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Montant</span>
                        <span className="font-medium text-slate-800">
                          {transfer.amount} {transfer.from_currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Date</span>
                        <span className="font-medium text-slate-800">
                          {format(new Date(transfer.created_at), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setSelectedTransfer(transfer);
                          setAdminNotes(transfer.admin_notes || '');
                        }}
                        size="sm"
                        className="flex-1 rounded-xl"
                      >
                        Gérer
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Proofs Tab */}
          <TabsContent value="proofs" className="space-y-6">
            {/* Proof Filters */}
            <Card className="bg-white/95 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-medium border-0">
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Rechercher par référence ou utilisateur..."
                      value={proofSearchTerm}
                      onChange={(e) => setProofSearchTerm(e.target.value)}
                      className="pl-10 rounded-xl border-2 border-slate-200"
                    />
                  </div>
                  <Select value={proofStatusFilter} onValueChange={setProofStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px] rounded-xl">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="completed">Terminé</SelectItem>
                      <SelectItem value="rejected">Rejeté</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={proofVerifiedFilter} onValueChange={setProofVerifiedFilter}>
                    <SelectTrigger className="w-full md:w-[200px] rounded-xl">
                      <SelectValue placeholder="Vérification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="verified">Vérifiés</SelectItem>
                      <SelectItem value="invalid">Invalides</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Proof Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Total</div>
                <div className="text-2xl font-bold text-slate-800">{proofsTransfers.length}</div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Vérifiés</div>
                <div className="text-2xl font-bold text-success">
                  {proofsTransfers.filter(t => t.proof_verified === true).length}
                </div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">Invalides</div>
                <div className="text-2xl font-bold text-destructive">
                  {proofsTransfers.filter(t => t.proof_verified === false).length}
                </div>
              </Card>
              <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
                <div className="text-sm text-slate-600 mb-1">En attente</div>
                <div className="text-2xl font-bold text-warning">
                  {proofsTransfers.filter(t => t.proof_verified === null).length}
                </div>
              </Card>
            </div>

            {/* Proofs Grid */}
            {filteredProofs.length === 0 ? (
              <Card className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-medium border-0">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-info" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      Aucune preuve trouvée
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 max-w-md mx-auto">
                      Les preuves de paiement apparaîtront ici une fois que les utilisateurs les auront uploadées depuis leur historique de transferts.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto text-left">
                      <p className="text-xs font-semibold text-slate-700 mb-2">📝 Comment les utilisateurs uploadent-ils les preuves ?</p>
                      <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                        <li>Accéder à <span className="font-medium">Historique</span></li>
                        <li>Sélectionner un transfert</li>
                        <li>Cliquer sur <span className="font-medium">"Ajouter une preuve"</span></li>
                        <li>Télécharger la capture d'écran du paiement</li>
                      </ol>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                      Note: Seuls les transferts en attente ou approuvés peuvent recevoir des preuves
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProofs.map((transfer) => (
                  <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0 hover:shadow-strong transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">
                          {transfer.reference_number}
                        </span>
                        <div className="flex gap-2">
                          {getStatusBadge(transfer.status)}
                          {getProofVerifiedBadge(transfer.proof_verified)}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Client</span>
                          <span className="font-medium text-slate-800">
                            {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Montant</span>
                          <span className="font-medium text-slate-800">
                            {transfer.amount} {transfer.from_currency}
                          </span>
                        </div>
                        {transfer.proof_admin_comment && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-slate-600 mb-1">Commentaire:</p>
                            <p className="text-xs text-slate-800">{transfer.proof_admin_comment}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => viewProof(transfer)}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        <Button
                          onClick={() => downloadProof(transfer)}
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Télécharger
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setValidationType('verify');
                            setProofComment(transfer.proof_admin_comment || '');
                            setValidationDialogOpen(true);
                          }}
                          size="sm"
                          className="flex-1 rounded-xl bg-success hover:bg-success/90"
                          disabled={transfer.proof_verified === true}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Vérifier
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedTransfer(transfer);
                            setValidationType('invalid');
                            setProofComment(transfer.proof_admin_comment || '');
                            setValidationDialogOpen(true);
                          }}
                          size="sm"
                          variant="destructive"
                          className="flex-1 rounded-xl"
                          disabled={transfer.proof_verified === false}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Invalider
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            {/* Admin Stats */}
            <AdminStats stats={{
              total: transfers.length,
              pending: transfers.filter(t => t.status === 'pending').length,
              awaiting_admin: transfers.filter(t => t.status === 'awaiting_admin').length,
              approved: transfers.filter(t => t.status === 'approved').length,
              completed: transfers.filter(t => t.status === 'completed').length,
              rejected: transfers.filter(t => t.status === 'rejected').length,
              cancelled: transfers.filter(t => t.status === 'cancelled').length,
              totalAmount: {
                MAD: transfers.filter(t => t.from_currency === 'MAD').reduce((sum, t) => sum + Number(t.amount), 0),
                CFA: transfers.filter(t => t.from_currency === 'CFA').reduce((sum, t) => sum + Number(t.amount), 0),
              },
              avgProcessingTime: 2.5,
              urgentTransfers: transfers.filter(t => {
                const now = new Date();
                const transferDate = new Date(t.created_at);
                const diffHours = (now.getTime() - transferDate.getTime()) / (1000 * 60 * 60);
                return t.status === 'pending' && diffHours > 24;
              }).length,
              todayTransfers: transfers.filter(t => {
                const today = new Date();
                const transferDate = new Date(t.created_at);
                return transferDate.toDateString() === today.toDateString();
              }).length,
              weekTransfers: transfers.filter(t => {
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const transferDate = new Date(t.created_at);
                return transferDate >= weekAgo;
              }).length,
              monthTransfers: transfers.filter(t => {
                const now = new Date();
                const transferDate = new Date(t.created_at);
                return transferDate.getMonth() === now.getMonth() && transferDate.getFullYear() === now.getFullYear();
              }).length,
            }} />
            
            {/* Admin Charts */}
            <AdminCharts transfers={transfers} />
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates">
            <ExchangeRateManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Transfer Management Dialog */}
      <Dialog open={!!selectedTransfer && !validationDialogOpen} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gérer le transfert - {selectedTransfer?.reference_number}</DialogTitle>
          </DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Client</p>
                  <p className="font-medium">{selectedTransfer.profiles?.first_name} {selectedTransfer.profiles?.last_name}</p>
                </div>
                <div>
                  <p className="text-slate-600">Email</p>
                  <p className="font-medium">{selectedTransfer.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-slate-600">Montant</p>
                  <p className="font-medium">{selectedTransfer.amount} {selectedTransfer.from_currency}</p>
                </div>
                <div>
                  <p className="text-slate-600">Statut</p>
                  {getStatusBadge(selectedTransfer.status)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Notes administrateur</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajouter des notes..."
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => updateTransferStatus(selectedTransfer.id, 'approved')}
                  className="flex-1 rounded-xl bg-success hover:bg-success/90"
                  disabled={selectedTransfer.status === 'approved'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
                <Button
                  onClick={() => updateTransferStatus(selectedTransfer.id, 'completed')}
                  className="flex-1 rounded-xl"
                  disabled={selectedTransfer.status === 'completed'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Terminer
                </Button>
                <Button
                  onClick={() => updateTransferStatus(selectedTransfer.id, 'rejected')}
                  variant="destructive"
                  className="flex-1 rounded-xl"
                  disabled={selectedTransfer.status === 'rejected'}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {validationType === 'verify' ? 'Vérifier la preuve' : 'Marquer comme invalide'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Transfert: <span className="font-medium text-slate-800">{selectedTransfer?.reference_number}</span>
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Commentaire {validationType === 'invalid' && '(requis)'}
              </label>
              <Textarea
                value={proofComment}
                onChange={(e) => setProofComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="rounded-xl"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setValidationDialogOpen(false)}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                Annuler
              </Button>
              <Button
                onClick={() => selectedTransfer && validateProof(selectedTransfer, validationType === 'verify')}
                className={`flex-1 rounded-xl ${validationType === 'verify' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
                disabled={validationType === 'invalid' && !proofComment.trim()}
              >
                {validationType === 'verify' ? 'Vérifier' : 'Marquer invalide'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Image Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preuve de paiement</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="overflow-auto">
              <img 
                src={selectedImage} 
                alt="Preuve de paiement" 
                className="w-full h-auto rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default UnifiedAdmin;