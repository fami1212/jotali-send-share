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
    balance: 156700 // Simulation du solde comme dans l'image
  });

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
        .eq('user_id', user?.id);

      if (transfers) {
        const sent = transfers
          .filter(t => t.transfer_type === 'send')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const received = transfers
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + t.converted_amount, 0);
        
        const pending = transfers.filter(t => t.status === 'pending' || t.status === 'awaiting_admin').length;

        setStats({
          totalSent: sent,
          totalReceived: received,
          pendingTransfers: pending,
          balance: 156700 // Simulation
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
      title: 'Transfert',
      subtitle: 'Envoyer de l\'argent',
      color: 'bg-gradient-primary',
      link: '/transfer'
    },
    {
      icon: History,
      title: 'Historique',
      subtitle: 'Voir transactions',
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
      icon: CreditCard,
      title: 'Ma carte',
      subtitle: 'Détails compte',
      color: 'bg-purple',
      link: '/profile'
    },
    {
      icon: TrendingUp,
      title: 'Devise',
      subtitle: 'Taux de change',
      color: 'bg-blue',
      link: '#'
    },
    {
      icon: Settings,
      title: 'Paramètres',
      subtitle: 'Configuration',
      color: 'bg-muted',
      link: '/profile'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-white">
            <h1 className="text-2xl font-bold mb-1">
              RECEVEZ VOTRE
            </h1>
            <h2 className="text-xl font-bold mb-1">
              SALAIRE VIA
            </h2>
            <h3 className="text-lg font-bold">
              VOTRE NUMERO
            </h3>
            <h4 className="text-lg font-bold">
              DE COMPTE
            </h4>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Balance Card */}
        <Card className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-strong mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div className="text-sm text-muted-foreground">
              ?
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">Compte principal 🔗</p>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              {formatCurrency(stats.balance)}
            </h2>
            
            <Button 
              asChild
              className="bg-blue text-white hover:bg-blue-dark rounded-full px-6"
            >
              <Link to="/transfer">
                <PlusCircle className="w-5 h-5 mr-2" />
                Déposer de l'argent
              </Link>
            </Button>
          </div>
        </Card>

        {/* Savings Card */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-muted-foreground rounded"></div>
            </div>
            <div>
              <p className="text-sm font-medium">Coffres</p>
              <p className="text-lg font-bold">12.000 F</p>
            </div>
          </div>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {services.map((service, index) => (
            <Link 
              key={index}
              to={service.link}
              className="block transform hover:scale-105 transition-transform"
            >
              <div className="text-center">
                <div className={`w-16 h-16 ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-medium`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-medium text-white mb-1">{service.title}</p>
                <p className="text-xs text-white/70">{service.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium mb-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Votre carte est prête 🎉
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Récupérez votre carte chez un agent Djamo.
            </p>
            <p className="text-xs text-muted-foreground">
              Trouvez-en un proche de vous ici.
            </p>
          </div>
        </Card>

        {/* Bottom Navigation */}
        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium">Vers Principal</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-success font-medium">+91.800 F</span>
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
          </div>
        </Card>

        {/* Notification Badge */}
        {stats.pendingTransfers > 0 && (
          <div className="fixed top-4 right-4">
            <Badge variant="destructive" className="animate-pulse">
              {stats.pendingTransfers} en attente
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernDashboard;