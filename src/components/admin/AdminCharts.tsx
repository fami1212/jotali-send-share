import { Card } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Globe, DollarSign, Activity } from 'lucide-react';

interface Transfer {
  id: string;
  amount: number;
  from_currency: string;
  to_currency: string;
  converted_amount: number;
  status: string;
  transfer_method: string;
  created_at: string;
  profiles?: {
    country?: string;
  } | null;
  recipients?: {
    country: string;
  };
}

interface AdminChartsProps {
  transfers: Transfer[];
}

const AdminCharts = ({ transfers }: AdminChartsProps) => {
  // Évolution des transferts par jour (derniers 30 jours)
  const getTransferEvolution = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });

    const transfersByDay = last30Days.map(date => {
      const dayTransfers = transfers.filter(t => 
        t.created_at.split('T')[0] === date
      );
      
      const totalAmount = dayTransfers.reduce((sum, t) => sum + t.amount, 0);
      const count = dayTransfers.length;

      return {
        date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        count,
        amount: Math.round(totalAmount),
        completed: dayTransfers.filter(t => t.status === 'completed').length,
      };
    });

    return transfersByDay;
  };

  // Distribution par pays destinataire
  const getCountryDistribution = () => {
    const countryStats: Record<string, { count: number; amount: number }> = {};

    transfers.forEach(t => {
      const country = t.recipients?.country || 'Non spécifié';
      if (!countryStats[country]) {
        countryStats[country] = { count: 0, amount: 0 };
      }
      countryStats[country].count++;
      countryStats[country].amount += t.amount;
    });

    return Object.entries(countryStats)
      .map(([country, stats]) => ({
        country,
        count: stats.count,
        amount: Math.round(stats.amount),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // Répartition par statut
  const getStatusDistribution = () => {
    const statusLabels: Record<string, string> = {
      pending: 'En attente',
      awaiting_admin: 'Attente admin',
      approved: 'Approuvé',
      completed: 'Terminé',
      rejected: 'Rejeté',
      cancelled: 'Annulé',
    };

    const statusStats: Record<string, number> = {};

    transfers.forEach(t => {
      const status = statusLabels[t.status] || t.status;
      statusStats[status] = (statusStats[status] || 0) + 1;
    });

    return Object.entries(statusStats).map(([status, count]) => ({
      name: status,
      value: count,
    }));
  };

  // Volume par méthode de paiement
  const getMethodDistribution = () => {
    const methodStats: Record<string, { count: number; amount: number }> = {};
    
    const methodLabels: Record<string, string> = {
      bank: 'Virement bancaire',
      wave: 'Wave',
      cash: 'Espèces',
    };

    transfers.forEach(t => {
      const method = methodLabels[t.transfer_method] || t.transfer_method;
      if (!methodStats[method]) {
        methodStats[method] = { count: 0, amount: 0 };
      }
      methodStats[method].count++;
      methodStats[method].amount += t.amount;
    });

    return Object.entries(methodStats).map(([method, stats]) => ({
      method,
      count: stats.count,
      amount: Math.round(stats.amount),
    }));
  };

  // Volume par devise
  const getCurrencyVolume = () => {
    const currencyStats: Record<string, { sent: number; received: number }> = {
      MAD: { sent: 0, received: 0 },
      CFA: { sent: 0, received: 0 },
    };

    transfers.forEach(t => {
      if (t.from_currency === 'MAD') {
        currencyStats.MAD.sent += t.amount;
        currencyStats.CFA.received += t.converted_amount;
      } else {
        currencyStats.CFA.sent += t.amount;
        currencyStats.MAD.received += t.converted_amount;
      }
    });

    return [
      {
        currency: 'MAD',
        envoyé: Math.round(currencyStats.MAD.sent),
        reçu: Math.round(currencyStats.MAD.received),
      },
      {
        currency: 'CFA',
        envoyé: Math.round(currencyStats.CFA.sent),
        reçu: Math.round(currencyStats.CFA.received),
      },
    ];
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const evolutionData = getTransferEvolution();
  const countryData = getCountryDistribution();
  const statusData = getStatusDistribution();
  const methodData = getMethodDistribution();
  const currencyData = getCurrencyVolume();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Évolution des transferts */}
      <Card className="p-6 col-span-1 lg:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Évolution des transferts (30 derniers jours)</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Nombre de transferts" strokeWidth={2} />
            <Line type="monotone" dataKey="completed" stroke="#10b981" name="Terminés" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Distribution par pays */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Top 10 pays destinataires</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={countryData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="country" className="text-xs" angle={-45} textAnchor="end" height={80} />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Bar dataKey="count" fill="#3b82f6" name="Nombre de transferts" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Répartition par statut */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Répartition par statut</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Volume par méthode */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Volume par méthode de paiement</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={methodData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="method" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Bar dataKey="count" fill="#3b82f6" name="Nombre" />
            <Bar dataKey="amount" fill="#10b981" name="Montant total" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Volume par devise */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Volume par devise</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={currencyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="currency" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip 
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            />
            <Legend />
            <Bar dataKey="envoyé" fill="#3b82f6" name="Montant envoyé" />
            <Bar dataKey="reçu" fill="#10b981" name="Montant reçu" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default AdminCharts;
