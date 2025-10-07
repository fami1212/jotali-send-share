import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, DollarSign, Users, Clock } from 'lucide-react';

interface Stats {
  totalTransfers: number;
  totalAmount: number;
  totalRecipients: number;
  averageAmount: number;
}

export const UserStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTransfers: 0,
    totalAmount: 0,
    totalRecipients: 0,
    averageAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get transfers
      const { data: transfers } = await supabase
        .from('transfers')
        .select('amount, from_currency')
        .eq('user_id', user.id);

      // Get recipients
      const { data: recipients } = await supabase
        .from('recipients')
        .select('id')
        .eq('user_id', user.id);

      const totalTransfers = transfers?.length || 0;
      const totalAmount = transfers?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalRecipients = recipients?.length || 0;
      const averageAmount = totalTransfers > 0 ? totalAmount / totalTransfers : 0;

      setStats({
        totalTransfers,
        totalAmount,
        totalRecipients,
        averageAmount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total des transferts',
      value: stats.totalTransfers,
      icon: TrendingUp,
      color: 'text-blue',
    },
    {
      title: 'Montant total envoyé',
      value: `${stats.totalAmount.toFixed(2)} MAD`,
      icon: DollarSign,
      color: 'text-success',
    },
    {
      title: 'Bénéficiaires',
      value: stats.totalRecipients,
      icon: Users,
      color: 'text-purple',
    },
    {
      title: 'Montant moyen',
      value: `${stats.averageAmount.toFixed(2)} MAD`,
      icon: Clock,
      color: 'text-warning',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
