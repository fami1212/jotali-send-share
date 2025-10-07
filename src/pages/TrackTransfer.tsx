import { useState } from 'react';
import { Search, CheckCircle2, Clock, XCircle, AlertCircle, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TrackTransfer = () => {
  const [reference, setReference] = useState('');
  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const searchTransfer = async () => {
    if (!reference.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un numéro de référence",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          profiles:user_id (first_name, last_name, email),
          recipients (name, country)
        `)
        .eq('reference_number', reference.toUpperCase())
        .single();

      if (error) throw error;

      if (data) {
        setTransfer(data);
      } else {
        toast({
          title: "Non trouvé",
          description: "Aucun transfert trouvé avec cette référence",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher le transfert",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-success" />;
      case 'pending':
      case 'awaiting_admin':
        return <Clock className="w-6 h-6 text-warning" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-destructive" />;
      default:
        return <Package className="w-6 h-6 text-info" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'En attente',
      awaiting_admin: 'En attente de validation',
      approved: 'Approuvé',
      completed: 'Terminé',
      rejected: 'Rejeté',
      cancelled: 'Annulé',
    };
    return statusMap[status] || status;
  };

  const timeline = transfer ? [
    {
      status: 'Transfert créé',
      date: new Date(transfer.created_at),
      completed: true,
    },
    {
      status: 'En attente de validation',
      date: transfer.status !== 'pending' ? new Date(transfer.updated_at) : null,
      completed: ['awaiting_admin', 'approved', 'completed'].includes(transfer.status),
    },
    {
      status: 'Approuvé',
      date: transfer.status === 'completed' ? new Date(transfer.completed_at || transfer.updated_at) : null,
      completed: transfer.status === 'completed',
    },
    {
      status: 'Transfert terminé',
      date: transfer.completed_at ? new Date(transfer.completed_at) : null,
      completed: transfer.status === 'completed',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Navbar />
      </div>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl mb-20 md:mb-0">
        <h1 className="text-3xl font-bold mb-8">Suivre un transfert</h1>

        {/* Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recherche par référence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Ex: TR20251007XXXXX"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="flex-1"
              />
              <Button onClick={searchTransfer} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transfer Details */}
        {transfer && (
          <>
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Détails du transfert</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(transfer.status)}
                    <span className="font-semibold">{getStatusText(transfer.status)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Référence</p>
                    <p className="font-semibold">{transfer.reference_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date de création</p>
                    <p className="font-semibold">
                      {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant envoyé</p>
                    <p className="font-semibold">{transfer.amount} {transfer.from_currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant reçu</p>
                    <p className="font-semibold">{transfer.converted_amount} {transfer.to_currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Méthode</p>
                    <p className="font-semibold capitalize">{transfer.transfer_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bénéficiaire</p>
                    <p className="font-semibold">{transfer.recipients?.name || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Historique du transfert</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            item.completed ? 'bg-success' : 'bg-muted'
                          }`}
                        />
                        {index < timeline.length - 1 && (
                          <div
                            className={`w-0.5 h-12 ${
                              item.completed ? 'bg-success' : 'bg-muted'
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <p className={`font-semibold ${item.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.status}
                        </p>
                        {item.date && (
                          <p className="text-sm text-muted-foreground">
                            {item.date.toLocaleDateString('fr-FR')} à{' '}
                            {item.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default TrackTransfer;
