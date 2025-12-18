import { useState, useEffect } from 'react';
import { Plus, User, Phone, MapPin, Trash2, Edit, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import BottomNavigation from '@/components/BottomNavigation';
import { Link } from 'react-router-dom';
import AnimatedElement from '@/components/AnimatedElement';
import { AnimatedList, AnimatedItem } from '@/components/AnimatedList';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  country: string;
  transfer_number?: string;
}

const countries = [
  { value: 'Sénégal', label: 'Sénégal' },
  { value: 'Mali', label: 'Mali' },
  { value: 'Burkina Faso', label: 'Burkina Faso' },
  { value: 'Côte d\'Ivoire', label: 'Côte d\'Ivoire' },
  { value: 'Niger', label: 'Niger' },
  { value: 'Bénin', label: 'Bénin' },
  { value: 'Togo', label: 'Togo' },
  { value: 'Guinée-Bissau', label: 'Guinée-Bissau' }
];

const Recipients = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [transferNumber, setTransferNumber] = useState('');

  useEffect(() => {
    loadRecipients();
  }, [user]);

  const loadRecipients = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setRecipients(data);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setCountry('');
    setTransferNumber('');
    setEditingRecipient(null);
  };

  const openEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setName(recipient.name);
    setPhone(recipient.phone);
    setCountry(recipient.country);
    setTransferNumber(recipient.transfer_number || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !phone || !country) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }

    setIsLoading(true);

    try {
      const data = {
        user_id: user?.id,
        name,
        phone,
        country,
        transfer_number: transferNumber || null,
      };

      if (editingRecipient) {
        const { error } = await supabase
          .from('recipients')
          .update(data)
          .eq('id', editingRecipient.id);
        if (error) throw error;
        toast.success("Bénéficiaire modifié");
      } else {
        const { error } = await supabase
          .from('recipients')
          .insert([data]);
        if (error) throw error;
        toast.success("Bénéficiaire ajouté");
      }

      resetForm();
      setIsDialogOpen(false);
      loadRecipients();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recipients')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success("Bénéficiaire supprimé");
      loadRecipients();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="hidden md:block"><Navbar /></div>
      
      <div className="container mx-auto px-4 py-6 max-w-lg md:max-w-4xl">
        {/* Header */}
        <AnimatedElement delay={0} direction="down">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bénéficiaires</h1>
              <p className="text-slate-500 text-sm">Vos contacts de transfert</p>
            </div>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </AnimatedElement>

        {/* Recipients List */}
        {recipients.length > 0 ? (
          <AnimatedList className="grid gap-4 md:grid-cols-2">
            {recipients.map((recipient) => (
              <AnimatedItem key={recipient.id}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{recipient.name}</h3>
                      
                      <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                        <Phone className="w-3 h-3" />
                        {recipient.phone}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {recipient.country}
                      </div>

                      {recipient.transfer_number && (
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          N° transfert: {recipient.transfer_number}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(recipient)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce bénéficiaire ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(recipient.id)} className="bg-red-500 hover:bg-red-600">
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <Link to={`/transfer?recipient=${recipient.id}`}>
                    <Button variant="outline" size="sm" className="w-full mt-3 hover:scale-[1.02] transition-transform">
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer de l'argent
                    </Button>
                  </Link>
                </Card>
              </AnimatedItem>
            ))}
          </AnimatedList>
        ) : (
          <AnimatedElement delay={1}>
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Aucun bénéficiaire</h3>
              <p className="text-slate-500 text-sm mb-4">
                Ajoutez vos contacts pour envoyer de l'argent rapidement
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="hover:scale-105 transition-transform">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un bénéficiaire
              </Button>
            </Card>
          </AnimatedElement>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? 'Modifier' : 'Ajouter'} un bénéficiaire
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prénom et nom"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Téléphone *</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 XXX XX XX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pays *</Label>
              <Select value={country} onValueChange={setCountry} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Numéro de transfert (optionnel)</Label>
              <Input
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="Numéro Wave, Orange Money ou compte bancaire"
              />
              <p className="text-xs text-slate-500">
                Ce numéro sera utilisé pour recevoir les fonds
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "..." : (editingRecipient ? "Modifier" : "Ajouter")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default Recipients;
