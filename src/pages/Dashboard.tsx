import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, Send, Users, Clock, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface DashboardStats {
  totalTransfers: number;
  completedTransfers: number;
  totalAmount: number;
  pendingTransfers: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTransfers: 0,
    completedTransfers: 0,
    totalAmount: 0,
    pendingTransfers: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState({ cfaToMad: 0.00165, madToCfa: 606.06 });

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadExchangeRates();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load transfer statistics  
      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id || '');

      if (transfers) {
        const totalTransfers = transfers.length;
        const completedTransfers = transfers.filter(t => t.status === 'completed').length;
        const pendingTransfers = transfers.filter(t => t.status === 'pending').length;
        const totalAmount = transfers
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        setStats({
          totalTransfers,
          completedTransfers,
          totalAmount,
          pendingTransfers,
        });

        // Get recent transfers
        const recent = transfers
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        
        setRecentTransfers(recent);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const { data: rates } = await supabase
        .from('exchange_rates')
        .select('*');

      if (rates) {
        const cfaToMad = rates.find(r => r.from_currency === 'CFA' && r.to_currency === 'MAD')?.rate || 0.00165;
        const madToCfa = rates.find(r => r.from_currency === 'MAD' && r.to_currency === 'CFA')?.rate || 606.06;
        
        setExchangeRate({ cfaToMad, madToCfa });
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CFA' ? 'XOF' : 'MAD',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'En attente', class: 'bg-warning/20 text-warning-foreground' },
      processing: { label: 'En cours', class: 'bg-info/20 text-info-foreground' },
      completed: { label: 'Terminé', class: 'bg-success/20 text-success-foreground' },
      failed: { label: 'Échoué', class: 'bg-destructive/20 text-destructive-foreground' },
      cancelled: { label: 'Annulé', class: 'bg-muted/20 text-muted-foreground' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, gérez vos transferts d'argent en toute simplicité
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-gradient-primary text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Action rapide</p>
                <h3 className="text-xl font-bold">Nouveau transfert</h3>
              </div>
              <Send className="w-8 h-8 text-white/80" />
            </div>
            <Button asChild className="w-full mt-4 bg-white text-primary hover:bg-white/90">
              <Link to="/transfer">
                <Plus className="w-4 h-4 mr-2" />
                Commencer
              </Link>
            </Button>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">Taux de change</p>
                <h3 className="text-lg font-semibold">CFA ⟷ MAD</h3>
              </div>
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">1 000 CFA</span>
                <span className="font-medium">{(1000 * exchangeRate.cfaToMad).toFixed(2)} MAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">100 MAD</span>
                <span className="font-medium">{(100 * exchangeRate.madToCfa).toFixed(0)} CFA</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm">Gestion</p>
                <h3 className="text-lg font-semibold">Bénéficiaires</h3>
              </div>
              <Users className="w-6 h-6 text-primary" />
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/recipients">Gérer les bénéficiaires</Link>
            </Button>
          </Card>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center">
            <ArrowRightLeft className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-foreground">{stats.totalTransfers}</h3>
            <p className="text-muted-foreground text-sm">Transferts total</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
            </div>
            <h3 className="text-2xl font-bold text-foreground">{stats.completedTransfers}</h3>
            <p className="text-muted-foreground text-sm">Terminés</p>
          </Card>

          <Card className="p-6 text-center">
            <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-foreground">{stats.pendingTransfers}</h3>
            <p className="text-muted-foreground text-sm">En attente</p>
          </Card>

          <Card className="p-6 text-center">
            <div className="w-8 h-8 bg-info/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-info font-bold text-sm">€</span>
            </div>
            <h3 className="text-2xl font-bold text-foreground">
              {stats.totalAmount.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm">Montant total</p>
          </Card>
        </div>

        {/* Recent Transfers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">Transferts récents</h3>
            <Button asChild variant="outline" size="sm">
              <Link to="/history">Voir tout</Link>
            </Button>
          </div>

          {recentTransfers.length > 0 ? (
            <div className="space-y-4">
              {recentTransfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{transfer.reference_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(transfer.amount, transfer.from_currency)} → {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(transfer.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ArrowRightLeft className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun transfert pour le moment</p>
              <Button asChild className="mt-4">
                <Link to="/transfer">Effectuer votre premier transfert</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;