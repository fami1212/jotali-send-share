import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AddRecipientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecipientAdded: () => void;
}

const AddRecipientDialog = ({ open, onOpenChange, onRecipientAdded }: AddRecipientDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone || !country) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('recipients')
        .insert([{
          user_id: user?.id,
          name,
          phone,
          country,
          bank_account: bankAccount || null,
          wave_number: waveNumber || null,
        }]);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Bénéficiaire ajouté avec succès",
      });

      // Reset form
      setName('');
      setPhone('');
      setCountry('');
      setBankAccount('');
      setWaveNumber('');
      
      onRecipientAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding recipient:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de l'ajout du bénéficiaire",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un bénéficiaire</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom complet *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean Dupont"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +221 77 123 45 67"
              required
            />
          </div>

          <div>
            <Label htmlFor="country">Pays *</Label>
            <Select value={country} onValueChange={setCountry} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Senegal">Sénégal</SelectItem>
                <SelectItem value="Mali">Mali</SelectItem>
                <SelectItem value="Côte d'Ivoire">Côte d'Ivoire</SelectItem>
                <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                <SelectItem value="Morocco">Maroc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bankAccount">Compte bancaire (optionnel)</Label>
            <Input
              id="bankAccount"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="Ex: RIB ou IBAN"
            />
          </div>

          <div>
            <Label htmlFor="waveNumber">Numéro Wave (optionnel)</Label>
            <Input
              id="waveNumber"
              value={waveNumber}
              onChange={(e) => setWaveNumber(e.target.value)}
              placeholder="Ex: +221 77 123 45 67"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
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
