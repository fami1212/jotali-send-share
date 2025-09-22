import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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
  TrendingUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

interface DashboardStats {
  totalSent: number;
  totalReceived: number;
  pendingTransfers: number;
  balance: number;
}

const ModernDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSent: 0,
    totalReceived: 0,
    pendingTransfers: 0,
    balance: 50000 // Solde de départ par défaut
  });
  const [lastTransfer, setLastTransfer] = useState<any>(null);

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
        // Récupérer le dernier transfert
        setLastTransfer(transfers[0]);
        
        const sent = transfers
          .filter(t => t.transfer_type === 'transfer')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const received = transfers
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + t.converted_amount, 0);
        
        const pending = transfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length;
        
        // Calculer le solde dynamique - commencer avec un solde de base
        const baseBalance = 50000; // Solde fictif de départ
        const completedTransfers = transfers.filter(t => t.status === 'completed');
        const balance = completedTransfers.reduce((sum, t) => {
          // Les retraits/échanges sont des sorties d'argent
          if (t.transfer_type === 'withdrawal' || t.transfer_type === 'exchange') {
            return sum - t.amount;
          }
          // Les transferts vers bénéficiaires sont aussi des sorties
          if (t.transfer_type === 'transfer') {
            return sum - t.amount;
          }
          return sum;
        }, baseBalance);

        setStats({
          totalSent: sent,
          totalReceived: received,
          pendingTransfers: pending,
          balance: Math.max(balance, 0) // Ne jamais avoir un solde négatif
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-md pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-slate-800">
            <h1 className="text-2xl font-bold mb-1">
              Bonjour ! 👋
            </h1>
            <p className="text-lg font-medium text-slate-600">
              Gérez vos transferts facilement
            </p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-600 hover:text-primary hover:bg-primary/10">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-strong mb-6 border-0">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-slate-500">
              💰
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-1">Solde disponible</p>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">
              {formatCurrency(stats.balance)}
            </h2>
            
            <Button 
              asChild
              className="bg-gradient-primary hover:opacity-90 text-white rounded-2xl px-6 font-medium shadow-medium"
            >
              <Link to="/transfer">
                <PlusCircle className="w-5 h-5 mr-2" />
                Nouveau transfert
              </Link>
            </Button>
          </div>
        </Card>

        {/* Savings Card */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6 border-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medium">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Épargne</p>
              <p className="text-xl font-bold text-slate-800">12.000 F</p>
            </div>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {services.map((service, index) => (
            <Link 
              key={index}
              to={service.link}
              className="block transform hover:scale-105 transition-all duration-200"
            >
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium text-center border-0 hover:shadow-strong">
                <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-medium`}>
                  <service.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{service.title}</p>
                <p className="text-xs text-slate-500">{service.subtitle}</p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6 border-0">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Votre compte est sécurisé 🔒
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Tous vos transferts sont protégés par un cryptage de niveau bancaire.
            </p>
            <p className="text-xs text-slate-500">
              Assistance disponible 24h/7j
            </p>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-accent rounded-full flex items-center justify-center shadow-medium">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Dernier transfert</p>
                {lastTransfer ? (
                  <p className="text-xs text-slate-500">
                    {new Date(lastTransfer.created_at).toLocaleDateString()} - {lastTransfer.reference_number}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Aucun transfert récent</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {lastTransfer ? (
                <>
                  <span className={`font-semibold ${lastTransfer.status === 'completed' ? 'text-success' : 'text-orange-600'}`}>
                    {formatCurrency(lastTransfer.amount)}
                  </span>
                  <Badge className={`ml-2 text-xs ${lastTransfer.status === 'completed' ? 'bg-success/10 text-success' : 'bg-orange-100 text-orange-600'}`}>
                    {lastTransfer.status === 'completed' ? 'Terminé' : 'En attente'}
                  </Badge>
                </>
              ) : (
                <span className="text-slate-400">-</span>
              )}
            </div>
          </div>
        </Card>

        {/* Notification Badge */}
        {stats.pendingTransfers > 0 && (
          <div className="fixed top-4 right-4 z-40">
            <Badge className="bg-destructive text-destructive-foreground animate-pulse shadow-medium">
              {stats.pendingTransfers} en attente
            </Badge>
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default ModernDashboard;