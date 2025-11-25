import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProofStats {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  verificationRate: number;
  avgVerificationTime: number;
  rejectionReasons: { reason: string; count: number }[];
}

export const ProofStatistics = () => {
  const [stats, setStats] = useState<ProofStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // Récupérer toutes les preuves
      const { data: transfers, error } = await supabase
        .from('transfers')
        .select('proof_image_url, proof_verified, proof_verified_at, created_at, proof_admin_comment')
        .not('proof_image_url', 'is', null);

      if (error) throw error;

      const total = transfers?.length || 0;
      const verified = transfers?.filter(t => t.proof_verified === true).length || 0;
      const rejected = transfers?.filter(t => t.proof_verified === false).length || 0;
      const pending = transfers?.filter(t => t.proof_verified === null).length || 0;

      // Calculer le temps moyen de vérification
      const verifiedTransfers = transfers?.filter(t => t.proof_verified !== null && t.proof_verified_at) || [];
      const avgTime = verifiedTransfers.length > 0
        ? verifiedTransfers.reduce((acc, t) => {
            const created = new Date(t.created_at).getTime();
            const verified = new Date(t.proof_verified_at!).getTime();
            return acc + (verified - created);
          }, 0) / verifiedTransfers.length / (1000 * 60 * 60) // Convertir en heures
        : 0;

      // Analyser les raisons de rejet (extraire des commentaires admin)
      const rejectedWithComments = transfers?.filter(
        t => t.proof_verified === false && t.proof_admin_comment
      ) || [];
      
      const reasonsMap = new Map<string, number>();
      rejectedWithComments.forEach(t => {
        const comment = t.proof_admin_comment || "Non spécifié";
        reasonsMap.set(comment, (reasonsMap.get(comment) || 0) + 1);
      });

      const rejectionReasons = Array.from(reasonsMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        total,
        verified,
        rejected,
        pending,
        verificationRate: total > 0 ? (verified / total) * 100 : 0,
        avgVerificationTime: avgTime,
        rejectionReasons
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Preuves</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Preuves uploadées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifiées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">
              Taux: {stats.verificationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Taux: {stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">À vérifier</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temps Moyen de Vérification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.avgVerificationTime.toFixed(1)}h
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Temps moyen entre l'upload et la vérification
          </p>
        </CardContent>
      </Card>

      {stats.rejectionReasons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raisons de Rejet Fréquentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.rejectionReasons.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm flex-1">{item.reason}</span>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
