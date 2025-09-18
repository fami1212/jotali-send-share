import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Plus, Banknote, Smartphone, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  country: string;
  bank_account?: string;
  wave_number?: string;
}

const ModernTransferForm = () => {
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
  const [step, setStep] = useState(1);

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

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CFA' ? 'XOF' : 'MAD',
    }).format(amount);
  };

  const totalAmount = amount ? parseFloat(amount) + 0 : 0;

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-white">
            Nouveau transfert
          </h1>
          <div className="w-10 h-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Transfer Type */}
          {step === 1 && (
            <>
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <h2 className="text-lg font-semibold mb-4 text-center">Type d'opération</h2>
                
                <RadioGroup value={transferType} onValueChange={setTransferType}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 border-2 rounded-2xl border-purple/20 hover:border-purple transition-colors">
                      <RadioGroupItem value="transfer" id="transfer" />
                      <Label htmlFor="transfer" className="flex items-center space-x-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                          <ArrowRightLeft className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Demande de retrait</p>
                          <p className="text-sm text-muted-foreground">Faire une demande que l'admin validera</p>
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 border-2 rounded-2xl border-blue/20 hover:border-blue transition-colors">
                      <RadioGroupItem value="send" id="send" />
                      <Label htmlFor="send" className="flex items-center space-x-3 cursor-pointer flex-1">
                        <div className="w-10 h-10 bg-gradient-secondary rounded-xl flex items-center justify-center">
                          <Plus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">Envoi direct</p>
                          <p className="text-sm text-muted-foreground">J'ai déjà effectué le transfert</p>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              <Button 
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-gradient-primary hover:opacity-90 rounded-2xl h-12"
              >
                Continuer
              </Button>
            </>
          )}

          {/* Step 2: Amount & Details */}
          {step === 2 && (
            <>
              {/* Amount Card */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <h2 className="text-lg font-semibold mb-4 text-center">Montant</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Vous envoyez</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl h-12 text-center rounded-xl border-2"
                        step="0.01"
                        min="1"
                      />
                      <Select value={fromCurrency} onValueChange={setFromCurrency}>
                        <SelectTrigger className="w-20 h-12 rounded-xl">
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
                      className="rounded-full w-10 h-10 bg-white"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground">Bénéficiaire reçoit</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        type="text"
                        value={convertedAmount}
                        readOnly
                        className="text-2xl h-12 text-center bg-purple/10 font-semibold text-purple rounded-xl"
                      />
                      <Select value={toCurrency} onValueChange={setToCurrency}>
                        <SelectTrigger className="w-20 h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAD">MAD</SelectItem>
                          <SelectItem value="CFA">CFA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-purple/5 p-3 rounded-xl">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taux</span>
                      <span className="font-medium">1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Frais</span>
                      <span className="font-medium text-success">Gratuit</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                      <span className="font-medium">Total</span>
                      <span className="font-bold">{formatCurrency(totalAmount, fromCurrency)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recipient Card */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">Bénéficiaire</h2>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <a href="/recipients">
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </a>
                  </Button>
                </div>

                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className="w-full h-12 rounded-xl">
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
              </Card>

              {/* Method Card */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <h2 className="text-lg font-semibold mb-4 text-center">Méthode</h2>
                
                <RadioGroup value={transferMethod} onValueChange={setTransferMethod}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 border-2 rounded-xl border-border hover:border-purple transition-colors">
                      <RadioGroupItem value="bank" id="bank" />
                      <Label htmlFor="bank" className="flex items-center space-x-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <Banknote className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">Virement bancaire</span>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 border-2 rounded-xl border-border hover:border-blue transition-colors">
                      <RadioGroupItem value="wave" id="wave" />
                      <Label htmlFor="wave" className="flex items-center space-x-3 cursor-pointer flex-1">
                        <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                          <Smartphone className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium">Wave Money</span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              {/* Proof Upload for Send */}
              {transferType === 'send' && (
                <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                  <h2 className="text-lg font-semibold mb-3 text-center">Preuve de paiement</h2>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Téléchargez une capture d'écran de votre virement
                  </p>
                  
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                      className="cursor-pointer rounded-xl h-12"
                    />
                    {proofImage && (
                      <div className="flex items-center space-x-2 p-2 bg-success/10 rounded-xl">
                        <Upload className="w-4 h-4 text-success" />
                        <span className="text-sm text-success font-medium">
                          {proofImage.name}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Notes */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <h2 className="text-lg font-semibold mb-3 text-center">Note (optionnel)</h2>
                <Textarea
                  placeholder="Ajouter une note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] rounded-xl resize-none"
                />
              </Card>

              <div className="flex space-x-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-2xl"
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-primary hover:opacity-90 h-12 rounded-2xl" 
                  disabled={isLoading}
                >
                  {isLoading ? "Traitement..." : (
                    transferType === 'send' ? "Soumettre" : "Créer"
                  )}
                </Button>
              </div>
            </>
          )}
        </form>

        {/* Bottom Spacing */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default ModernTransferForm;