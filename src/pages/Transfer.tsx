import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Plus, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

const Transfer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('CFA');
  const [toCurrency, setToCurrency] = useState('MAD');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(60);
  const [transferType, setTransferType] = useState('transfer');
  const [transferMethod, setTransferMethod] = useState('bank');
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecipients();
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (amount && exchangeRate) {
      const converted = (parseFloat(amount) * exchangeRate).toFixed(2);
      setConvertedAmount(converted);
    } else {
      setConvertedAmount('');
    }
  }, [amount, exchangeRate]);

  const loadRecipients = async () => {
    try {
      const { data } = await supabase
        .from('recipients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        setRecipients(data);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      const { data } = await supabase
        .from('exchange_rates')
        .select('*');

      if (data) {
        const rate = data.find(r => 
          r.from_currency === fromCurrency && r.to_currency === toCurrency
        )?.rate || (fromCurrency === 'CFA' ? 0.0166667 : 60);
        
        setExchangeRate(rate);
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const swapCurrencies = () => {
    const newFromCurrency = toCurrency;
    const newToCurrency = fromCurrency;
    
    setFromCurrency(newFromCurrency);
    setToCurrency(newToCurrency);
    
    // Update exchange rate  
    const newRate = newFromCurrency === 'CFA' ? 0.0166667 : 60;
    setExchangeRate(newRate);
  };

  const uploadProofImage = async (transferId: string): Promise<string | null> => {
    if (!proofImage || !user?.id) return null;

    const fileExt = proofImage.name.split('.').pop();
    const fileName = `${user.id}/${transferId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('transfer-proofs')
      .upload(fileName, proofImage);

    if (uploadError) {
      console.error('Error uploading proof:', uploadError);
      return null;
    }

    return fileName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecipient) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un bénéficiaire",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Erreur", 
        description: "Veuillez entrer un montant valide",
        variant: "destructive",
      });
      return;
    }

    if (transferType === 'send' && !proofImage) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une preuve de paiement pour un envoi",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Generate reference number
      const { data: refData } = await supabase.rpc('generate_reference_number');
      
      const transferData = {
        user_id: user?.id,
        recipient_id: selectedRecipient,
        amount: parseFloat(amount),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        converted_amount: parseFloat(convertedAmount),
        exchange_rate: exchangeRate,
        fees: 0,
        total_amount: parseFloat(amount),
        transfer_method: transferMethod,
        transfer_type: transferType,
        reference_number: refData || `TR${Date.now()}`,
        notes,
        status: transferType === 'send' ? 'awaiting_admin' : 'pending'
      };

      const { data: transfer, error } = await supabase
        .from('transfers')
        .insert([transferData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Upload proof image if provided
      if (proofImage && transfer) {
        const proofUrl = await uploadProofImage(transfer.id);
        if (proofUrl) {
          await supabase
            .from('transfers')
            .update({ proof_image_url: proofUrl })
            .eq('id', transfer.id);
        }
      }

      toast({
        title: transferType === 'send' ? "Envoi créé" : "Transfert créé",
        description: transferType === 'send' 
          ? "Votre envoi est en attente de validation par l'administrateur"
          : "Votre demande de transfert a été créée avec succès",
      });

      navigate('/history');
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du transfert",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  const fees = 0; // Gratuit pour le moment
  const totalAmount = amount ? parseFloat(amount) + fees : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Nouveau transfert
            </h1>
            <p className="text-muted-foreground">
              Envoyez de l'argent rapidement et en toute sécurité
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Type d'opération */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Type d'opération</h2>
              
              <RadioGroup value={transferType} onValueChange={setTransferType}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Demande de transfert</p>
                        <p className="text-sm text-muted-foreground">Faire une demande que l'admin validera</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="send" id="send" />
                    <Label htmlFor="send" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Plus className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Envoi direct</p>
                        <p className="text-sm text-muted-foreground">J'ai déjà effectué le transfert</p>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </Card>

            {/* Montant */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Montant du transfert</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vous envoyez</Label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl h-16 text-center"
                        step="0.01"
                        min="1"
                      />
                    </div>
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="w-24 h-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CFA">CFA</SelectItem>
                        <SelectItem value="MAD">MAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={swapCurrencies}
                    className="rounded-full w-12 h-12"
                  >
                    <ArrowRightLeft className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Bénéficiaire reçoit</Label>
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={convertedAmount}
                        readOnly
                        className="text-2xl h-16 text-center bg-muted font-semibold text-primary"
                      />
                    </div>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="w-24 h-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAD">MAD</SelectItem>
                        <SelectItem value="CFA">CFA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taux de change</span>
                    <span className="font-medium">1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frais de transfert</span>
                    <span className="font-medium text-success">Gratuit</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="font-medium">Total à payer</span>
                    <span className="font-bold">{totalAmount.toFixed(2)} {fromCurrency}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Bénéficiaire */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Bénéficiaire</h2>
                <Button asChild variant="outline" size="sm">
                  <a href="/recipients">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </a>
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sélectionner un bénéficiaire</Label>
                  <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un bénéficiaire" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          {recipient.name} - {recipient.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Méthode de transfert */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Méthode de transfert</h2>
              
              <RadioGroup value={transferMethod} onValueChange={setTransferMethod}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Banknote className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Virement bancaire</p>
                        <p className="text-sm text-muted-foreground">Transfert direct vers le compte bancaire</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="wave" id="wave" />
                    <Label htmlFor="wave" className="flex items-center space-x-2 cursor-pointer flex-1">
                      <Smartphone className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Wave</p>
                        <p className="text-sm text-muted-foreground">Transfert via Wave Money</p>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </Card>

            {/* Preuve de paiement */}
            {transferType === 'send' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Preuve de paiement *</h2>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Veuillez télécharger une capture d'écran ou photo de votre virement bancaire
                  </p>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {proofImage && (
                    <p className="text-sm text-success">
                      Fichier sélectionné: {proofImage.name}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notes (optionnel)</h2>
              <Textarea
                placeholder="Ajouter une note à votre transfert..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </Card>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90" 
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Traitement..." : (
                transferType === 'send' ? "Soumettre l'envoi" : "Créer la demande"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Transfer;