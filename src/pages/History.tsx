import { useState, useEffect } from 'react';
import { ArrowRightLeft, Search, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Mobile-first design */}
      <div className="container mx-auto px-4 py-6 max-w-md md:max-w-4xl">
        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Historique
          </h1>
          <p className="text-white/70">
            Consultez vos transferts
          </p>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <Navbar />
        </div>
        
        <div className="hidden md:block mb-8 mt-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Historique des transferts
          </h1>
          <p className="text-muted-foreground">
            Consultez tous vos transferts d'argent
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6">
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
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
              <Badge variant="outline" className="bg-white/50">
                {filteredTransfers.length} transfert(s)
              </Badge>
            </div>
          </div>
        </Card>

        {/* Transfers List */}
        <div className="space-y-3">
          {filteredTransfers.length > 0 ? (
            filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-soft">
                      <ArrowRightLeft className="w-5 h-5 text-white" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {transfer.reference_number}
                        </h3>
                        <Badge className={`text-xs ${getStatusColor(transfer.status)}`}>
                          {getStatusText(transfer.status)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>
                          {formatCurrency(transfer.amount, transfer.from_currency)} → {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="truncate">{transfer.recipients?.name}</span>
                          <span>•</span>
                          <span className="capitalize">{transfer.transfer_method === 'bank' ? 'Virement' : 'Wave'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-2">
                      {formatDate(transfer.created_at)}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-8 px-2">
                      <Eye className="w-3 h-3 mr-1" />
                      Détails
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-medium text-center">
              <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun transfert trouvé
              </h3>
              <p className="text-muted-foreground mb-6 text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Vous n'avez pas encore effectué de transfert"
                }
              </p>
              <Button asChild className="bg-gradient-primary hover:opacity-90">
                <Link to="/transfer">Effectuer un transfert</Link>
              </Button>
            </Card>
          )}
        </div>

        {/* Mobile Bottom Spacing */}
        <div className="h-20 md:h-0"></div>
      </div>
    </div>
  );
};

export default History;