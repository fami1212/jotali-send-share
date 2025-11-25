import { useState, useEffect } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Transfer {
  id: string;
  reference_number: string;
  amount: number;
  from_currency: string;
  status: string;
  created_at: string;
  proof_image_url: string | null;
}

interface UploadProofDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedTransferId?: string;
  onSuccess?: () => void;
}

const UploadProofDialog = ({ open, onOpenChange, preselectedTransferId, onSuccess }: UploadProofDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadTransfers();
    }
  }, [open]);

  useEffect(() => {
    if (preselectedTransferId) {
      setSelectedTransfer(preselectedTransferId);
    }
  }, [preselectedTransferId]);

  const loadTransfers = async () => {
    try {
      const { data } = await supabase
        .from('transfers')
        .select('*')
        .eq('user_id', user?.id)
        .in('status', ['pending', 'approved'])
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
        .update({ proof_image_url: fileName })
        .eq('id', selectedTransfer);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Preuve de paiement ajoutée avec succès",
      });

      setProofImage(null);
      setSelectedTransfer('');
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une preuve</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Card className="bg-muted/30 p-4 rounded-xl border-0">
            <h3 className="text-sm font-semibold mb-3">Sélectionner un transfert</h3>
            
            <Select value={selectedTransfer} onValueChange={setSelectedTransfer}>
              <SelectTrigger className="w-full h-11 rounded-lg bg-background border-2 border-border">
                <SelectValue placeholder="Choisir un transfert">
                  {selectedTransferData && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{selectedTransferData.reference_number}</span>
                      <span className="text-sm text-muted-foreground">
                        • {selectedTransferData.amount} {selectedTransferData.from_currency}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {transfers.map((transfer) => (
                  <SelectItem key={transfer.id} value={transfer.id}>
                    <div className="flex items-center gap-3 py-1">
                      <span className="font-medium">{transfer.reference_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {transfer.amount} {transfer.from_currency}
                      </span>
                      {transfer.proof_image_url && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTransferData && (
              <div className="mt-3 p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Référence</span>
                    <span className="font-semibold text-primary">{selectedTransferData.reference_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-semibold">
                      {selectedTransferData.amount} {selectedTransferData.from_currency}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="font-medium">
                      {selectedTransferData.status === 'pending' ? 'En attente' : 'Approuvé'}
                    </span>
                  </div>
                  {selectedTransferData.proof_image_url && (
                    <div className="flex items-center justify-center pt-2 text-green-600 bg-green-50 rounded-md py-2 mt-2">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="text-xs font-medium">Preuve déjà ajoutée</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Card className="bg-muted/30 p-4 rounded-xl border-0">
            <h3 className="text-sm font-semibold mb-2">Preuve de paiement</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Ajoutez une capture d'écran de votre paiement
            </p>
            
            <Label 
              htmlFor="proof-dialog" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <span className="text-xs text-muted-foreground block px-4">
                  {proofImage ? proofImage.name : 'Cliquez pour télécharger'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  PNG, JPG (max 10MB)
                </span>
              </div>
              <Input
                id="proof-dialog"
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
            className="w-full bg-gradient-primary hover:opacity-90 rounded-lg h-11 text-white font-medium"
          >
            {isLoading ? 'Envoi en cours...' : 'Ajouter la preuve'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadProofDialog;
