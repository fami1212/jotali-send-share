import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, FileImage, FileDown, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import AdminStats from '@/components/admin/AdminStats';
import AdminFilters from '@/components/admin/AdminFilters';
import ExchangeRateManager from '@/components/admin/ExchangeRateManager';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  approved: number;
  completed: number;
  rejected: number;
  cancelled: number;
  totalAmount: {
    MAD: number;
    CFA: number;
  };
  avgProcessingTime: number;
  urgentTransfers: number;
  todayTransfers: number;
  weekTransfers: number;
  monthTransfers: number;
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
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTransfers, setSelectedTransfers] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    awaiting_admin: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    totalAmount: { MAD: 0, CFA: 0 },
    avgProcessingTime: 0,
    urgentTransfers: 0,
    todayTransfers: 0,
    weekTransfers: 0,
    monthTransfers: 0,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
    setCurrentPage(1); // Reset to first page when filters change
  }, [transfers, searchQuery, currencyFilter, methodFilter, dateFilter]);

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

  const calculateStats = (transfersList: Transfer[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const urgentTransfers = transfersList.filter(t => {
      if (t.status !== 'awaiting_admin' && t.status !== 'pending') return false;
      const createdAt = new Date(t.created_at);
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    }).length;

    const completedWithTime = transfersList.filter(t => t.completed_at);
    const avgProcessingTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, t) => {
          const start = new Date(t.created_at).getTime();
          const end = new Date(t.completed_at!).getTime();
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0) / completedWithTime.length
      : 0;

    const totalAmountMAD = transfersList
      .filter(t => t.from_currency === 'MAD')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalAmountCFA = transfersList
      .filter(t => t.from_currency === 'CFA')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const stats = {
      total: transfersList.length,
      pending: transfersList.filter(t => t.status === 'pending').length,
      awaiting_admin: transfersList.filter(t => t.status === 'awaiting_admin').length,
      approved: transfersList.filter(t => t.status === 'approved').length,
      completed: transfersList.filter(t => t.status === 'completed').length,
      rejected: transfersList.filter(t => t.status === 'rejected').length,
      cancelled: transfersList.filter(t => t.status === 'cancelled').length,
      totalAmount: { MAD: totalAmountMAD, CFA: totalAmountCFA },
      avgProcessingTime,
      urgentTransfers,
      todayTransfers: transfersList.filter(t => new Date(t.created_at) >= today).length,
      weekTransfers: transfersList.filter(t => new Date(t.created_at) >= weekAgo).length,
      monthTransfers: transfersList.filter(t => new Date(t.created_at) >= monthAgo).length,
    };
    setStats(stats);
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

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      if (dateFilter === 'today') {
        filtered = filtered.filter(t => new Date(t.created_at) >= today);
      } else if (dateFilter === 'week') {
        filtered = filtered.filter(t => new Date(t.created_at) >= weekAgo);
      } else if (dateFilter === 'month') {
        filtered = filtered.filter(t => new Date(t.created_at) >= monthAgo);
      } else if (dateFilter === 'urgent') {
        filtered = filtered.filter(t => {
          const createdAt = new Date(t.created_at);
          const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
          return hoursDiff > 24 && (t.status === 'awaiting_admin' || t.status === 'pending');
        });
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(transfer =>
        transfer.reference_number.toLowerCase().includes(query) ||
        transfer.user_email?.toLowerCase().includes(query) ||
        `${transfer.profiles?.first_name} ${transfer.profiles?.last_name}`.toLowerCase().includes(query) ||
        transfer.recipients?.name?.toLowerCase().includes(query) ||
        transfer.recipients?.phone?.includes(query)
      );
    }

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

      if (error) throw error;

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

  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (currencyFilter !== 'all') count++;
    if (methodFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  };

  const handleExportExcel = () => {
    const exportData = filteredTransfers.map(t => ({
      'Référence': t.reference_number,
      'Date': new Date(t.created_at).toLocaleDateString('fr-FR'),
      'Statut': getStatusText(t.status),
      'Client': t.user_email || `${t.profiles?.first_name || ''} ${t.profiles?.last_name || ''}`.trim(),
      'Téléphone': t.profiles?.phone || '-',
      'Pays': t.profiles?.country || '-',
      'Montant envoyé': t.amount,
      'Devise envoyée': t.from_currency,
      'Montant converti': t.converted_amount,
      'Devise reçue': t.to_currency,
      'Taux de change': t.exchange_rate,
      'Frais': t.fees,
      'Total': t.total_amount,
      'Méthode': t.transfer_method === 'bank' ? 'Virement bancaire' : 'Wave',
      'Destinataire': t.recipients?.name || '-',
      'Téléphone destinataire': t.recipients?.phone || '-',
      'Pays destinataire': t.recipients?.country || '-',
      'Notes': t.notes || '-',
      'Notes admin': t.admin_notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transferts');
    
    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key as keyof typeof row]).length)
        )
      )
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `transferts_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "Export Excel réussi",
      description: `${filteredTransfers.length} transferts exportés`,
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Historique des transferts', 14, 22);
    doc.setFontSize(11);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);
    doc.text(`Total: ${filteredTransfers.length} transferts`, 14, 36);

    const tableData = filteredTransfers.map(t => [
      t.reference_number,
      new Date(t.created_at).toLocaleDateString('fr-FR'),
      getStatusText(t.status),
      t.user_email || `${t.profiles?.first_name || ''} ${t.profiles?.last_name || ''}`.trim(),
      `${t.amount} ${t.from_currency}`,
      `${t.converted_amount} ${t.to_currency}`,
      t.transfer_method === 'bank' ? 'Virement' : 'Wave',
    ]);

    autoTable(doc, {
      startY: 42,
      head: [['Référence', 'Date', 'Statut', 'Client', 'Envoyé', 'Reçu', 'Méthode']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`transferts_${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "Export PDF réussi",
      description: `${filteredTransfers.length} transferts exportés`,
    });
  };

  const handleBulkApprove = async () => {
    if (selectedTransfers.size === 0) return;

    try {
      const promises = Array.from(selectedTransfers).map(id =>
        updateTransferStatus(id, 'approved')
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Succès",
        description: `${selectedTransfers.size} transfert(s) approuvé(s)`,
      });
      
      setSelectedTransfers(new Set());
      loadTransfers();
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de l'approbation groupée",
        variant: "destructive",
      });
    }
  };

  const toggleTransferSelection = (transferId: string) => {
    const newSelection = new Set(selectedTransfers);
    if (newSelection.has(transferId)) {
      newSelection.delete(transferId);
    } else {
      newSelection.add(transferId);
    }
    setSelectedTransfers(newSelection);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'awaiting_admin': return 'bg-orange-500/10 text-orange-500';
      case 'approved': return 'bg-blue-500/10 text-blue-500';
      case 'completed': return 'bg-green-500/10 text-green-500';
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

  const isUrgent = (transfer: Transfer) => {
    if (transfer.status !== 'awaiting_admin' && transfer.status !== 'pending') return false;
    const createdAt = new Date(transfer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
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

        <Tabs defaultValue="transfers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="transfers">Transferts</TabsTrigger>
            <TabsTrigger value="rates">Taux de change</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers" className="space-y-6">
            <AdminStats stats={stats} />

            <AdminFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              currencyFilter={currencyFilter}
              setCurrencyFilter={setCurrencyFilter}
              methodFilter={methodFilter}
              setMethodFilter={setMethodFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              onRefresh={loadTransfers}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
              activeFiltersCount={getActiveFiltersCount()}
            />

            {selectedTransfers.size > 0 && (
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {selectedTransfers.size} transfert(s) sélectionné(s)
                  </span>
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" onClick={handleBulkApprove}>
                      Approuver la sélection
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedTransfers(new Set())}>
                      Désélectionner tout
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Aucun transfert trouvé</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTransfers
                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                    .map((transfer) => (
                  <Card key={transfer.id} className={`p-4 hover:shadow-lg transition-shadow relative ${isUrgent(transfer) ? 'border-red-500 border-2' : ''}`}>
                    <div className="absolute top-2 left-2">
                      <Checkbox
                        checked={selectedTransfers.has(transfer.id)}
                        onCheckedChange={() => toggleTransferSelection(transfer.id)}
                      />
                    </div>
                    
                    {isUrgent(transfer) && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500 text-white">Urgent</Badge>
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Référence</p>
                          <p className="font-semibold text-foreground">{transfer.reference_number}</p>
                        </div>
                        <Badge className={getStatusColor(transfer.status)}>
                          {getStatusText(transfer.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Envoyé</p>
                          <p className="font-semibold text-foreground">
                            {transfer.amount.toLocaleString()} {transfer.from_currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reçu</p>
                          <p className="font-semibold text-green-600">
                            {transfer.converted_amount.toLocaleString()} {transfer.to_currency}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Client</p>
                        <p className="text-sm font-medium text-foreground truncate">
                          {transfer.profiles?.first_name && transfer.profiles?.last_name
                            ? `${transfer.profiles.first_name} ${transfer.profiles.last_name}`
                            : transfer.user_email}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Bénéficiaire</p>
                        <p className="text-sm font-medium text-foreground truncate">
                          {transfer.recipients?.name || 'Retrait personnel'}
                        </p>
                      </div>

                      <div className="pt-3 border-t flex gap-2">
                        {transfer.status === 'awaiting_admin' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              onClick={() => updateTransferStatus(transfer.id, 'approved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => updateTransferStatus(transfer.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeter
                            </Button>
                          </>
                        )}
                        {transfer.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="default"
                            className="w-full"
                            onClick={() => updateTransferStatus(transfer.id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marquer terminé
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedTransfer(transfer)}>
                              Détails
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <span>Transfert {transfer.reference_number}</span>
                                <Badge className={getStatusColor(transfer.status)}>
                                  {getStatusText(transfer.status)}
                                </Badge>
                              </DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4 mt-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Montant envoyé</p>
                                  <p className="text-2xl font-bold">{transfer.amount.toLocaleString()} {transfer.from_currency}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Montant reçu</p>
                                  <p className="text-2xl font-bold text-green-600">{transfer.converted_amount.toLocaleString()} {transfer.to_currency}</p>
                                </div>
                              </div>

                              <div className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded">
                                <p className="text-xs font-semibold text-indigo-700 mb-3">CLIENT</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Nom</p>
                                    <p className="font-semibold">{transfer.profiles?.first_name} {transfer.profiles?.last_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Email</p>
                                    <p className="font-semibold text-indigo-700">{transfer.user_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Téléphone</p>
                                    <p className="font-semibold">{transfer.profiles?.phone || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pays</p>
                                    <p className="font-semibold">{transfer.profiles?.country || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                                <p className="text-xs font-semibold text-blue-700 mb-3">BÉNÉFICIAIRE</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Nom</p>
                                    <p className="font-semibold">{transfer.recipients?.name || 'Retrait personnel'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Téléphone</p>
                                    <p className="font-semibold">{transfer.recipients?.phone || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pays</p>
                                    <p className="font-semibold">{transfer.recipients?.country || '-'}</p>
                                  </div>
                                  {transfer.recipients?.bank_account && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Compte bancaire</p>
                                      <p className="font-semibold">{transfer.recipients.bank_account}</p>
                                    </div>
                                  )}
                                  {transfer.recipients?.wave_number && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Numéro Wave</p>
                                      <p className="font-semibold">{transfer.recipients.wave_number}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {transfer.proof_image_url && (
                                <div className="p-4 bg-green-50 rounded-lg">
                                  <p className="text-xs font-semibold text-green-700 mb-2">PREUVE DE PAIEMENT</p>
                                  <a href={transfer.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                    <FileImage className="inline h-4 w-4 mr-1" />
                                    Voir la preuve
                                  </a>
                                </div>
                              )}

                              {transfer.notes && (
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                  <p className="text-xs font-semibold text-yellow-700 mb-2">NOTES CLIENT</p>
                                  <p className="text-sm">{transfer.notes}</p>
                                </div>
                              )}

                              {transfer.admin_notes && (
                                <div className="p-4 bg-purple-50 rounded-lg">
                                  <p className="text-xs font-semibold text-purple-700 mb-2">NOTES ADMIN</p>
                                  <p className="text-sm">{transfer.admin_notes}</p>
                                </div>
                              )}

                              <div className="space-y-3">
                                <Textarea
                                  placeholder="Ajouter une note admin..."
                                  value={adminNotes}
                                  onChange={(e) => setAdminNotes(e.target.value)}
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  {transfer.status === 'awaiting_admin' && (
                                    <>
                                      <Button onClick={() => updateTransferStatus(transfer.id, 'approved', adminNotes)} className="flex-1">
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approuver
                                      </Button>
                                      <Button variant="destructive" onClick={() => updateTransferStatus(transfer.id, 'rejected', adminNotes)} className="flex-1">
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Rejeter
                                      </Button>
                                    </>
                                  )}
                                  {transfer.status === 'approved' && (
                                    <Button onClick={() => updateTransferStatus(transfer.id, 'completed', adminNotes)} className="w-full">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Marquer comme terminé
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              {/* Pagination */}
              {filteredTransfers.length > itemsPerPage && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.ceil(filteredTransfers.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, idx, arr) => (
                        <div key={page} className="flex items-center gap-2">
                          {idx > 0 && arr[idx - 1] !== page - 1 && (
                            <span className="text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTransfers.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(filteredTransfers.length / itemsPerPage)}
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground ml-4">
                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransfers.length)} sur {filteredTransfers.length}
                  </span>
                </div>
              )}
            </>
            )}
          </TabsContent>

          <TabsContent value="rates">
            <ExchangeRateManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
