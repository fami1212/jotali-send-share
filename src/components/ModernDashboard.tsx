import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  PlusCircle, 
  History, 
  Users, 
  Settings, 
  Bell,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

interface DashboardStats {
  totalSent: number;
  totalReceived: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalTransactions: number;
  thisMonthTransfers: number;
  avgTransferAmount: number;
}

interface Transfer {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  reference_number: string;
  to_currency: string;
  transfer_type: string;
}

const ModernDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSent: 0,
    totalReceived: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    totalTransactions: 0,
    thisMonthTransfers: 0,
    avgTransferAmount: 0,
  });
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    try {
      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (transfers && transfers.length > 0) {
        // Récupérer les 5 derniers transferts
        setRecentTransfers(transfers.slice(0, 5));
        
        const sent = transfers
          .filter(t => t.transfer_type === 'transfer')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const received = transfers
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + Number(t.converted_amount), 0);
        
        const pending = transfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length;
        const completed = transfers.filter(t => t.status === 'completed').length;
        
        // Transferts ce mois
        const now = new Date();
        const thisMonth = transfers.filter(t => {
          const date = new Date(t.created_at);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        
        // Calculer le montant moyen par transfert
        const avgTransferAmount = transfers.length > 0 
          ? transfers.reduce((sum, t) => sum + Number(t.amount), 0) / transfers.length 
          : 0;

        setStats({
          totalSent: sent,
          totalReceived: received,
          pendingTransfers: pending,
          completedTransfers: completed,
          totalTransactions: transfers.length,
          thisMonthTransfers: thisMonth,
          avgTransferAmount,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
    }).format(amount);
  };

  const services = [
    {
      icon: ArrowUpRight,
      title: 'Nouveau transfert',
      subtitle: 'Envoyer ou retirer',
      color: 'bg-gradient-primary',
      link: '/transfer'
    },
    {
      icon: History,
      title: 'Historique',
      subtitle: 'Mes transactions',
      color: 'bg-gradient-secondary',
      link: '/history'
    },
    {
      icon: Users,
      title: 'Bénéficiaires',
      subtitle: 'Gérer contacts',
      color: 'bg-gradient-accent',
      link: '/recipients'
    },
    {
      icon: Settings,
      title: 'Profil',
      subtitle: 'Mon compte',
      color: 'bg-gradient-hero',
      link: '/profile'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-24 md:pb-6">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-slate-800">
            <h1 className="text-2xl font-bold mb-1">
              Bonjour ! 👋
            </h1>
            <p className="text-lg font-medium text-slate-600">
              Tableau de bord
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-primary hover:bg-primary/10">
            <Bell className="w-6 h-6" />
            {stats.pendingTransfers > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full animate-pulse" />
            )}
          </Button>
        </div>

        {/* Stats Card - Hero */}
        <Card className="bg-gradient-primary backdrop-blur-sm p-8 rounded-3xl shadow-strong mb-6 border-0 text-white">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-medium">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/80 mb-1">Montant moyen par transfert</p>
                <h2 className="text-4xl font-bold text-white">
                  {formatCurrency(stats.avgTransferAmount)}
                </h2>
                <p className="text-xs text-white/70 mt-1">Basé sur {stats.totalTransactions} transferts</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              asChild
              className="flex-1 bg-white text-primary hover:bg-white/90 rounded-2xl px-6 font-medium shadow-medium"
            >
              <Link to="/transfer">
                <PlusCircle className="w-5 h-5 mr-2" />
                Nouveau transfert
              </Link>
            </Button>
            <Button 
              asChild
              variant="outline"
              className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl px-6 font-medium"
            >
              <Link to="/history">
                <History className="w-5 h-5 mr-2" />
                Historique
              </Link>
            </Button>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Total envoyé</CardTitle>
                <ArrowUpRight className="w-4 h-4 text-destructive" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalSent)}</div>
              <p className="text-xs text-slate-500 mt-1">{stats.totalTransactions} transactions</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Reçu</CardTitle>
                <ArrowDownLeft className="w-4 h-4 text-success" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalReceived)}</div>
              <p className="text-xs text-slate-500 mt-1">{stats.completedTransfers} terminés</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">En attente</CardTitle>
                <Clock className="w-4 h-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-slate-800">{stats.pendingTransfers}</div>
              <p className="text-xs text-slate-500 mt-1">À traiter</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">Ce mois</CardTitle>
                <Activity className="w-4 h-4 text-info" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-2xl font-bold text-slate-800">{stats.thisMonthTransfers}</div>
              <p className="text-xs text-slate-500 mt-1">Transactions</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Transactions */}
          <Card className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-medium border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center justify-between">
                <span>Transactions récentes</span>
                <Link to="/history" className="text-sm text-primary hover:underline font-normal">
                  Voir tout
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTransfers.length > 0 ? (
                <div className="space-y-3">
                  {recentTransfers.map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transfer.status === 'completed' ? 'bg-success/10' : 
                          transfer.status === 'pending' ? 'bg-warning/10' : 'bg-slate-200'
                        }`}>
                          {transfer.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          ) : transfer.status === 'pending' ? (
                            <Clock className="w-5 h-5 text-warning" />
                          ) : (
                            <DollarSign className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{transfer.reference_number}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">
                          {formatCurrency(Number(transfer.amount))}
                        </p>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${
                            transfer.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                            transfer.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {transfer.status === 'completed' ? 'Terminé' : 
                           transfer.status === 'pending' ? 'En attente' : transfer.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune transaction récente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions & Info */}
          <div className="space-y-4">
            {/* Services Grid */}
            <Card className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-medium border-0">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-800">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Link 
                    to="/transfer"
                    className="flex flex-col items-center p-4 bg-gradient-primary rounded-xl hover:opacity-90 transition-all shadow-medium text-white"
                  >
                    <ArrowUpRight className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Transfert</span>
                  </Link>
                  <Link 
                    to="/recipients"
                    className="flex flex-col items-center p-4 bg-gradient-secondary rounded-xl hover:opacity-90 transition-all shadow-medium text-white"
                  >
                    <Users className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Bénéficiaires</span>
                  </Link>
                  <Link 
                    to="/history"
                    className="flex flex-col items-center p-4 bg-gradient-accent rounded-xl hover:opacity-90 transition-all shadow-medium text-white"
                  >
                    <History className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Historique</span>
                  </Link>
                  <Link 
                    to="/profile"
                    className="flex flex-col items-center p-4 bg-gradient-hero rounded-xl hover:opacity-90 transition-all shadow-medium text-white"
                  >
                    <Settings className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Profil</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
              <div className="text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  Compte sécurisé 🔒
                </h3>
                <p className="text-xs text-slate-600 mb-3">
                  Tous vos transferts sont protégés par un cryptage de niveau bancaire.
                </p>
                <p className="text-xs text-slate-500">
                  Assistance disponible 24h/7j
                </p>
              </div>
            </Card>

            {/* Savings Card */}
            <Card className="bg-gradient-secondary backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-medium">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/90">Épargne</p>
                    <p className="text-2xl font-bold text-white">12.000 F</p>
                  </div>
                </div>
                <Button 
                  size="sm"
                  className="bg-white text-primary hover:bg-white/90 rounded-xl"
                >
                  Ajouter
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;