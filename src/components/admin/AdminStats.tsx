import { TrendingUp, Clock, DollarSign, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface AdminStatsProps {
  stats: {
    total: number;
    pending: number;
    awaiting_admin: number;
    approved: number;
    completed: number;
    rejected: number;
    cancelled: number;
    totalAmount: {
      MAD: number;
      CFA: number;
    };
    avgProcessingTime: number;
    urgentTransfers: number;
    todayTransfers: number;
    weekTransfers: number;
    monthTransfers: number;
  };
}

const AdminStats = ({ stats }: AdminStatsProps) => {
  const statCards = [
    {
      title: "Transferts en attente",
      value: stats.awaiting_admin,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Nécessitent votre attention"
    },
    {
      title: "Transferts urgents",
      value: stats.urgentTransfers,
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "> 24h d'attente"
    },
    {
      title: "Aujourd'hui",
      value: stats.todayTransfers,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Nouveaux transferts"
    },
    {
      title: "Cette semaine",
      value: stats.weekTransfers,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Total hebdomadaire"
    },
    {
      title: "Volume MAD",
      value: `${stats.totalAmount.MAD.toLocaleString('fr-FR')} MAD`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Ce mois"
    },
    {
      title: "Volume CFA",
      value: `${stats.totalAmount.CFA.toLocaleString('fr-FR')} F`,
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Ce mois"
    },
    {
      title: "Complétés",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      description: "Total réussis"
    },
    {
      title: "Temps moyen",
      value: `${Math.round(stats.avgProcessingTime)}h`,
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "Traitement"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStats;
