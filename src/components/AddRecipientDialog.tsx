import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipientAdded: () => void;
}

const COUNTRIES = [
  "Sénégal",
  "Côte d'Ivoire",
  "Mali",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Niger",
  "Guinée"
];

const AddRecipientDialog = ({ open, onOpenChange, onRecipientAdded }: AddRecipientDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [country, setCountry] = useState("Sénégal");
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName("");
      setTransferNumber("");
      setCountry("Sénégal");
      setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    const trimmedNumber = transferNumber.trim();

    if (!trimmedName || !trimmedNumber || !country) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('recipients')
        .insert({
          user_id: user.id,
          name: trimmedName,
          phone: trimmedNumber,
          country: country,
          transfer_number: trimmedNumber
        });

      if (error) throw error;

      toast.success("Bénéficiaire ajouté avec succès");
      onRecipientAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      toast.error("Erreur lors de l'ajout du bénéficiaire");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Ajouter un bénéficiaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-number">Numéro du transfert *</Label>
            <Input
              id="transfer-number"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              placeholder="Numéro Wave, Orange Money ou compte bancaire"
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays *</Label>
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger id="country" className="h-12">
                <SelectValue placeholder="Sélectionnez un pays" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-12"
            >
              {isLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRecipientDialog;
