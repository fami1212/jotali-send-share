import { useState, useEffect } from 'react';
import { Plus, User, Phone, MapPin, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  country: string;
  bank_account?: string;
  wave_number?: string;
}

const Recipients = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [waveNumber, setWaveNumber] = useState('');

  useEffect(() => {
    loadRecipients();
  }, [user]);

  const loadRecipients = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setRecipients(data);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setCountry('');
    setBankAccount('');
    setWaveNumber('');
    setEditingRecipient(null);
  };

  const openEditDialog = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setName(recipient.name);
    setPhone(recipient.phone);
    setCountry(recipient.country);
    setBankAccount(recipient.bank_account || '');
    setWaveNumber(recipient.wave_number || '');
    setIsAddDialogOpen(true);
  };

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
      const recipientData = {
        user_id: user?.id,
        name,
        phone,
        country,
        bank_account: bankAccount || null,
        wave_number: waveNumber || null,
      };

      if (editingRecipient) {
        // Update existing recipient
        const { error } = await supabase
          .from('recipients')
          .update(recipientData)
          .eq('id', editingRecipient.id);

        if (error) throw error;

        toast({
          title: "Bénéficiaire modifié",
          description: "Les informations ont été mises à jour avec succès",
        });
      } else {
        // Create new recipient
        const { error } = await supabase
          .from('recipients')
          .insert([recipientData]);

        if (error) throw error;

        toast({
          title: "Bénéficiaire ajouté",
          description: "Le nouveau bénéficiaire a été créé avec succès",
        });
      }

      resetForm();
      setIsAddDialogOpen(false);
      loadRecipients();
    } catch (error: any) {
      console.error('Error saving recipient:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const handleDelete = async (recipientId: string) => {
    try {
      const { error } = await supabase
        .from('recipients')
        .delete()
        .eq('id', recipientId);

      if (error) throw error;

      toast({
        title: "Bénéficiaire supprimé",
        description: "Le bénéficiaire a été supprimé avec succès",
      });

      loadRecipients();
    } catch (error: any) {
      console.error('Error deleting recipient:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la suppression",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bénéficiaires
            </h1>
            <p className="text-muted-foreground">
              Gérez vos contacts pour les transferts d'argent
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un bénéficiaire
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRecipient ? 'Modifier le bénéficiaire' : 'Ajouter un nouveau bénéficiaire'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nom et prénom"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212 6 XX XX XX XX"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Pays *</Label>
                  <Select value={country} onValueChange={setCountry} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morocco">Maroc</SelectItem>
                      <SelectItem value="Senegal">Sénégal</SelectItem>
                      <SelectItem value="Mali">Mali</SelectItem>
                      <SelectItem value="Burkina Faso">Burkina Faso</SelectItem>
                      <SelectItem value="Ivory Coast">Côte d'Ivoire</SelectItem>
                      <SelectItem value="Niger">Niger</SelectItem>
                      <SelectItem value="Benin">Bénin</SelectItem>
                      <SelectItem value="Togo">Togo</SelectItem>
                      <SelectItem value="Guinea-Bissau">Guinée-Bissau</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccount">Compte bancaire (optionnel)</Label>
                  <Input
                    id="bankAccount"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Numéro de compte bancaire"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waveNumber">Numéro Wave (optionnel)</Label>
                  <Input
                    id="waveNumber"
                    value={waveNumber}
                    onChange={(e) => setWaveNumber(e.target.value)}
                    placeholder="Numéro Wave"
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Enregistrement..." : (editingRecipient ? "Modifier" : "Ajouter")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recipients List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipients.length > 0 ? (
            recipients.map((recipient) => (
              <Card key={recipient.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(recipient)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le bénéficiaire</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce bénéficiaire ? Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(recipient.id)}>
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-foreground">
                    {recipient.name}
                  </h3>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    {recipient.phone}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    {recipient.country}
                  </div>

                  {recipient.bank_account && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Banque:</strong> {recipient.bank_account}
                    </div>
                  )}

                  {recipient.wave_number && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Wave:</strong> {recipient.wave_number}
                    </div>
                  )}
                </div>

                <Button asChild className="w-full mt-4" variant="outline">
                  <a href={`/transfer?recipient=${recipient.id}`}>
                    Envoyer de l'argent
                  </a>
                </Button>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card className="p-12 text-center">
                <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Aucun bénéficiaire
                </h3>
                <p className="text-muted-foreground mb-6">
                  Ajoutez vos premiers bénéficiaires pour commencer à envoyer de l'argent
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un bénéficiaire
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recipients;