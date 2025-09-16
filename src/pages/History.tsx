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

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  status: string;
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
    loadTransfers();
  }, [user]);

  useEffect(() => {
    filterTransfers();
  }, [transfers, searchTerm, statusFilter]);

  const loadTransfers = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'En attente', variant: 'secondary' as const },
      processing: { label: 'En cours', variant: 'default' as const },
      completed: { label: 'Terminé', variant: 'default' as const },
      failed: { label: 'Échoué', variant: 'destructive' as const },
      cancelled: { label: 'Annulé', variant: 'outline' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Historique des transferts
          </h1>
          <p className="text-muted-foreground">
            Consultez tous vos transferts d'argent
          </p>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par référence ou bénéficiaire"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                {filteredTransfers.length} transfert(s) trouvé(s)
              </span>
            </div>
          </div>
        </Card>

        {/* Transfers List */}
        <div className="space-y-4">
          {filteredTransfers.length > 0 ? (
            filteredTransfers.map((transfer) => (
              <Card key={transfer.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-foreground">
                          {transfer.reference_number}
                        </h3>
                        {getStatusBadge(transfer.status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>
                          {formatCurrency(transfer.amount, transfer.from_currency)} → {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                        </span>
                        <span>•</span>
                        <span>{transfer.recipients?.name}</span>
                        <span>•</span>
                        <span className="capitalize">{transfer.transfer_method === 'bank' ? 'Virement' : 'Wave'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-1">
                      {formatDate(transfer.created_at)}
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Détails
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <ArrowRightLeft className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Aucun transfert trouvé
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? "Essayez de modifier vos filtres de recherche"
                  : "Vous n'avez pas encore effectué de transfert"
                }
              </p>
              <Button asChild>
                <a href="/transfer">Effectuer un transfert</a>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;