import { useState, useEffect } from 'react';
import { ArrowRightLeft, Search, Filter, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { Link } from 'react-router-dom';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  status: string;
  transfer_type?: string;
  transfer_method: string;
  created_at: string;
  completed_at?: string;
  recipients?: {
    name: string;
    phone: string;
  };
}

const History = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<Transfer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    if (user) {
      loadTransfers();
    }
  }, [user]);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter]);

  const loadTransfers = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          recipients (
            name,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Transfers loaded:', data);
      if (data) {
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransfers = () => {
    let filtered = transfers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(transfer => 
        transfer.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.recipients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(transfer => transfer.status === statusFilter);
    }

    setFilteredTransfers(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'awaiting_admin': return 'bg-info/10 text-info border-info/20';
      case 'approved': return 'bg-success/10 text-success border-success/20';
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'cancelled': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CFA' ? 'XOF' : 'MAD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="hidden md:block">
          <Navbar />
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-md md:max-w-4xl pb-24">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Historique 📋
          </h1>
          <p className="text-slate-600">
            Consultez vos transferts
          </p>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <Navbar />
        </div>
        
        <div className="hidden md:block mb-8 mt-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Historique des transferts
          </h1>
          <p className="text-slate-600">
            Consultez tous vos transferts d'argent
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6 border-0">
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Rechercher par référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-2 border-slate-200 text-slate-800 bg-white"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl border-2 border-slate-200 bg-white">
                <Filter className="w-4 h-4 mr-2 text-slate-500" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="awaiting_admin">Attente admin</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-center">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {filteredTransfers.length} transfert(s)
              </Badge>
            </div>
          </div>
        </Card>

        {/* Transfers List */}
        <div className="space-y-3">
          {filteredTransfers.length > 0 ? (
            filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0 hover:shadow-strong transition-all duration-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-medium flex-shrink-0">
                      <ArrowRightLeft className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <h3 className="font-semibold text-slate-800 text-sm">
                          {transfer.reference_number}
                        </h3>
                        <Badge className={`text-xs ${getStatusColor(transfer.status)}`}>
                          {getStatusText(transfer.status)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs text-slate-600">
                        <div className="break-words">
                          {formatCurrency(transfer.amount, transfer.from_currency)} → {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                        </div>
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="truncate max-w-[150px]">{transfer.recipients?.name || 'Retrait personnel'}</span>
                          <span>•</span>
                          <span className="capitalize">{transfer.transfer_method === 'bank' ? 'Virement' : 'Wave'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 md:gap-2">
                    <div className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(transfer.created_at)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-8 px-3 text-slate-600 hover:text-primary"
                      onClick={() => setSelectedTransfer(transfer)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Détails</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-medium text-center border-0">
              <ArrowRightLeft className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Aucun transfert trouvé
              </h3>
              <p className="text-slate-600 mb-6 text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Vous n'avez pas encore effectué de transfert"
                }
              </p>
              <Button asChild className="bg-gradient-primary hover:opacity-90 text-white shadow-medium">
                <Link to="/transfer">Effectuer un transfert</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
      
      {/* Transfer Details Dialog */}
      <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              Détails du transfert
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransfer && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-600">Référence</span>
                  <span className="font-semibold text-slate-800">{selectedTransfer.reference_number}</span>
                </div>
                
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-600">Statut</span>
                  <Badge className={getStatusColor(selectedTransfer.status)}>
                    {getStatusText(selectedTransfer.status)}
                  </Badge>
                </div>
                
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-600">Montant envoyé</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(selectedTransfer.amount, selectedTransfer.from_currency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-600">Montant reçu</span>
                    <span className="font-semibold text-success">
                      {formatCurrency(selectedTransfer.converted_amount, selectedTransfer.to_currency)}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-600">Destinataire</span>
                    <span className="font-semibold text-slate-800 text-right">
                      {selectedTransfer.recipients?.name || 'Retrait personnel'}
                    </span>
                  </div>
                  
                  {selectedTransfer.recipients?.phone && (
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-slate-600">Téléphone</span>
                      <span className="font-semibold text-slate-800">
                        {selectedTransfer.recipients.phone}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-slate-600">Méthode</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {selectedTransfer.transfer_method === 'bank' ? 'Virement bancaire' : 'Wave'}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm text-slate-600">Date de création</span>
                    <span className="font-semibold text-slate-800 text-right text-xs">
                      {formatDate(selectedTransfer.created_at)}
                    </span>
                  </div>
                  
                  {selectedTransfer.completed_at && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-slate-600">Date de finalisation</span>
                      <span className="font-semibold text-slate-800 text-right text-xs">
                        {formatDate(selectedTransfer.completed_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                onClick={() => setSelectedTransfer(null)}
                className="w-full bg-gradient-primary hover:opacity-90 text-white"
              >
                Fermer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default History;