import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  status: string;
  created_at: string;
  proof_image_url: string | null;
  transfer_method: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  } | null;
}

const AdminProofsManager = () => {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadTransfersWithProofs();
  }, []);

  const loadTransfersWithProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select('*')
        .not('proof_image_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load profile data separately for each transfer
      const transfersWithProfiles = await Promise.all(
        (data || []).map(async (transfer) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email, phone')
            .eq('user_id', transfer.user_id)
            .single();
          
          return {
            ...transfer,
            profiles: profile
          };
        })
      );

      setTransfers(transfersWithProfiles);
    } catch (error) {
      console.error('Error loading transfers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les preuves",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProofImageUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('transfer-proofs')
      .getPublicUrl(path);
    
    return data.publicUrl;
  };

  const handleViewProof = async (path: string) => {
    const url = await getProofImageUrl(path);
    setSelectedImage(url);
  };

  const handleDownloadProof = async (path: string, reference: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('transfer-proofs')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof_${reference}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading proof:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la preuve",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { label: string; className: string } } = {
      pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      approved: { label: 'Approuvé', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      completed: { label: 'Terminé', className: 'bg-green-100 text-green-800 border-green-300' },
      rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-800 border-red-300' },
    };

    const variant = variants[status] || variants.pending;

    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement des preuves...</p>
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Aucune preuve de paiement disponible</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {transfers.map((transfer) => (
          <Card key={transfer.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary">
                    {transfer.reference_number}
                  </span>
                  {getStatusBadge(transfer.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Client</p>
                    <p className="font-medium">
                      {transfer.profiles?.first_name} {transfer.profiles?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{transfer.profiles?.email}</p>
                    <p className="text-xs text-muted-foreground">{transfer.profiles?.phone}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Montant</p>
                    <p className="font-medium">
                      {transfer.amount} {transfer.from_currency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Méthode: {transfer.transfer_method}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Créé le {new Date(transfer.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                {transfer.proof_image_url && (
                  <>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProof(transfer.proof_image_url!)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Preuve de paiement - {transfer.reference_number}</DialogTitle>
                        </DialogHeader>
                        {selectedImage && (
                          <div className="mt-4">
                            <img 
                              src={selectedImage} 
                              alt="Preuve de paiement" 
                              className="w-full h-auto rounded-lg border"
                            />
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadProof(transfer.proof_image_url!, transfer.reference_number)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Télécharger
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminProofsManager;
