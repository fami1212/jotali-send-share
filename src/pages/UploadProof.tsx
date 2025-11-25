import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  status: string;
  created_at: string;
  proof_image_url: string | null;
}

const UploadProof = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTransfers();
  }, []);

  // Auto-select transfer from URL parameter
  useEffect(() => {
    const transferId = searchParams.get('transfer');
    if (transferId && transfers.length > 0) {
      const transfer = transfers.find(t => t.id === transferId);
      if (transfer) {
        setSelectedTransfer(transferId);
        toast({
          title: "Transfert sélectionné",
          description: `${transfer.reference_number} - ${transfer.amount} ${transfer.from_currency}`,
        });
      }
    }
  }, [searchParams, transfers]);

  const loadTransfers = async () => {
    try {
      const { data } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['pending', 'approved', 'awaiting_admin'])
        .is('proof_image_url', null)
        .order('created_at', { ascending: false });

      if (data) {
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTransfer) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un transfert",
        variant: "destructive",
      });
      return;
    }

    if (!proofImage) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une preuve de paiement",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${user?.id}/${selectedTransfer}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('transfer-proofs')
        .upload(fileName, proofImage, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('transfers')
        .update({ 
          proof_image_url: fileName,
          status: 'awaiting_admin'
        })
        .eq('id', selectedTransfer);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Preuve de paiement ajoutée avec succès. En attente de vérification par l'admin.",
      });

      setProofImage(null);
      setSelectedTransfer('');
      loadTransfers();
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout de la preuve",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const selectedTransferData = transfers.find(t => t.id === selectedTransfer);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/history')}
            className="text-slate-600 hover:text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">
            Ajouter une preuve
          </h1>
          <div className="w-10 h-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-medium border-0">
            <h2 className="text-lg font-semibold mb-4">Sélectionner un transfert</h2>
            
            {transfers.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800">
                  <strong>Aucun transfert disponible</strong> - Seuls les transferts en attente ou approuvés sans preuve peuvent être modifiés ici.
                </p>
              </div>
            )}
            
            <Select value={selectedTransfer} onValueChange={setSelectedTransfer}>
              <SelectTrigger className="w-full h-12 rounded-xl">
                <SelectValue placeholder="Choisir un transfert" />
              </SelectTrigger>
              <SelectContent>
                {transfers.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    Aucun transfert disponible pour l'ajout de preuve
                  </div>
                ) : (
                  transfers.map((transfer) => (
                    <SelectItem key={transfer.id} value={transfer.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{transfer.reference_number}</span>
                        <span className="ml-4 text-sm text-muted-foreground">
                          {transfer.amount} {transfer.from_currency}
                        </span>
                        {transfer.proof_image_url && (
                          <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedTransferData && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Référence</span>
                    <span className="font-medium text-slate-800">{selectedTransferData.reference_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Montant</span>
                    <span className="font-medium text-slate-800">
                      {selectedTransferData.amount} {selectedTransferData.from_currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Statut</span>
                    <span className="font-medium text-slate-800">
                      {selectedTransferData.status === 'pending' ? 'En attente' : 'Approuvé'}
                    </span>
                  </div>
                  {selectedTransferData.proof_image_url && (
                    <div className="flex items-center justify-center pt-2 text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-sm">Preuve déjà ajoutée</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-medium border-0">
            <h2 className="text-lg font-semibold mb-3">Preuve de paiement</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ajoutez une capture d'écran de votre paiement (virement bancaire, Wave, Orange Money...)
            </p>
            
            <Label 
              htmlFor="proof" 
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground block px-4">
                  {proofImage ? proofImage.name : 'Cliquez pour télécharger une image'}
                </span>
                <span className="text-xs text-muted-foreground mt-2 block">
                  PNG, JPG ou JPEG (max 10MB)
                </span>
              </div>
              <Input
                id="proof"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProofImage(e.target.files?.[0] || null)}
              />
            </Label>
          </Card>

          <Button
            type="submit"
            disabled={isLoading || !selectedTransfer || !proofImage}
            className="w-full bg-gradient-primary hover:opacity-90 rounded-2xl h-12 text-white font-medium shadow-medium"
          >
            {isLoading ? 'Envoi en cours...' : 'Ajouter la preuve'}
          </Button>
        </form>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default UploadProof;
