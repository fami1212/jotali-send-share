import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send,
  History, 
  Users, 
  User,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import AnimatedElement from '@/components/AnimatedElement';
import { AnimatedList, AnimatedItem } from '@/components/AnimatedList';

interface Transfer {
  id: string;
  amount: number;
  converted_amount: number;
  from_currency: string;
  to_currency: string;
  status: string;
  created_at: string;
  reference_number: string;
}

const ModernDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTransfers: 0,
    pending: 0,
    completed: 0,
    thisMonth: 0
  });
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [profile, setProfile] = useState<{ first_name: string; last_name: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user?.id)
        .single();
      
      if (profileData) setProfile(profileData);

      // Load transfers
      const { data: transfers } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (transfers) {
        setRecentTransfers(transfers.slice(0, 4));
        
        const now = new Date();
        const thisMonth = transfers.filter(t => {
          const date = new Date(t.created_at);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        setStats({
          totalTransfers: transfers.length,
          pending: transfers.filter(t => ['pending', 'awaiting_admin'].includes(t.status)).length,
          completed: transfers.filter(t => t.status === 'completed').length,
          thisMonth
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Terminé' };
      case 'pending': return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'En attente' };
      case 'awaiting_admin': return { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'En traitement' };
      default: return { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50', label: status };
    }
  };

  const getTransferType = (transfer: Transfer) => {
    return transfer.from_currency === 'MAD' ? 'Envoi' : 'Retrait';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + (currency === 'CFA' ? 'F' : currency);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        
        {/* Header */}
        <AnimatedElement delay={0} direction="down">
          <div className="mb-6">
            <p className="text-slate-500 text-sm">Bonjour,</p>
            <h1 className="text-2xl font-bold text-slate-900">
              {profile?.first_name || 'Bienvenue'} 👋
            </h1>
          </div>
        </AnimatedElement>

        {/* Quick Action */}
        <AnimatedElement delay={1}>
          <Link to="/transfer">
            <Card className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white mb-6 cursor-pointer hover:shadow-lg transition-shadow hover:scale-[1.02] transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Nouveau transfert</p>
                  <p className="text-xl font-bold">Envoyer ou retirer</p>
                </div>
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Send className="w-7 h-7" />
                </div>
              </div>
            </Card>
          </Link>
        </AnimatedElement>

        {/* Stats */}
        <AnimatedList className="grid grid-cols-3 gap-3 mb-6">
          <AnimatedItem>
            <Card className="p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-bold text-slate-900">{stats.totalTransfers}</p>
              <p className="text-xs text-slate-500">Total</p>
            </Card>
          </AnimatedItem>
          <AnimatedItem>
            <Card className="p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-xs text-slate-500">En attente</p>
            </Card>
          </AnimatedItem>
          <AnimatedItem>
            <Card className="p-4 text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-slate-500">Terminés</p>
            </Card>
          </AnimatedItem>
        </AnimatedList>

        {/* Quick Links */}
        <AnimatedList className="grid grid-cols-4 gap-2 mb-6">
          {[
            { icon: Send, label: 'Transfert', href: '/transfer', color: 'bg-blue-500' },
            { icon: History, label: 'Historique', href: '/history', color: 'bg-purple-500' },
            { icon: Users, label: 'Contacts', href: '/recipients', color: 'bg-green-500' },
            { icon: User, label: 'Profil', href: '/profile', color: 'bg-slate-500' }
          ].map((item) => (
            <AnimatedItem key={item.href}>
              <Link to={item.href}>
                <Card className="p-3 text-center hover:shadow-md transition-all cursor-pointer hover:scale-105 transform">
                  <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-medium text-slate-700">{item.label}</p>
                </Card>
              </Link>
            </AnimatedItem>
          ))}
        </AnimatedList>

        {/* Recent Transfers */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Récents</h2>
          <Link to="/history" className="text-sm text-blue-600 font-medium">Voir tout</Link>
        </div>

        {recentTransfers.length > 0 ? (
          <AnimatedList className="space-y-3">
            {recentTransfers.map((transfer) => {
              const statusInfo = getStatusInfo(transfer.status);
              const isEnvoi = transfer.from_currency === 'MAD';
              
              return (
                <AnimatedItem key={transfer.id}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnvoi ? 'bg-blue-100' : 'bg-green-100'}`}>
                        {isEnvoi ? (
                          <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-900">{getTransferType(transfer)}</p>
                          <p className="font-bold text-slate-900">
                            {formatCurrency(transfer.converted_amount, transfer.to_currency)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500">
                            {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          <Badge variant="outline" className={`text-xs ${statusInfo.color} ${statusInfo.bg} border-0`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </AnimatedItem>
              );
            })}
          </AnimatedList>
        ) : (
          <AnimatedElement delay={3}>
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 mb-4">Aucun transfert pour le moment</p>
              <Link to="/transfer">
                <Button className="hover:scale-105 transition-transform">Faire un transfert</Button>
              </Link>
            </Card>
          </AnimatedElement>
        )}
      </div>
    </div>
  );
};

export default ModernDashboard;
