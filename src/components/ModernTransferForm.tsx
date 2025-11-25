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
import BottomNavigation from './BottomNavigation';

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
  const [fromCurrency, setFromCurrency] = useState('MAD');
  const [toCurrency, setToCurrency] = useState('CFA');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(60);
  const [transferType, setTransferType] = useState<'send' | 'withdraw'>('send');
  const [conversionType, setConversionType] = useState<'mad-to-cfa' | 'cfa-to-mad'>('mad-to-cfa');
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
    if (conversionType === 'mad-to-cfa') {
      setFromCurrency('MAD');
      setToCurrency('CFA');
      setExchangeRate(60);
    } else {
      setFromCurrency('CFA');
      setToCurrency('MAD');
      setExchangeRate(0.0166667);
    }
  }, [conversionType]);

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

  const calculateFees = () => {
    if (!amount) return 0;
    const amt = parseFloat(amount);
    if (transferMethod === 'wave' || transferMethod === 'orange') {
      return amt * 0.01; // 1%
    }
    return 0; // 0% for bank transfer
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
    
    if (transferType === 'send' && !selectedRecipient) {
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

    if (transferType === 'withdraw' && !proofImage) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une preuve de paiement pour un retrait",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: refData } = await supabase.rpc('generate_reference_number');
      const fees = calculateFees();
      
      const transferData = {
        user_id: user?.id,
        recipient_id: transferType === 'send' ? selectedRecipient : null,
        amount: parseFloat(amount),
        from_currency: fromCurrency,
        to_currency: toCurrency,
        converted_amount: parseFloat(convertedAmount),
        exchange_rate: exchangeRate,
        fees,
        total_amount: parseFloat(amount) + fees,
        transfer_method: transferMethod,
        transfer_type: transferType,
        reference_number: refData || `TR${Date.now()}`,
        notes,
        status: 'pending'
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
        title: transferType === 'send' ? "Envoi créé" : "Demande de retrait créée",
        description: transferType === 'send' 
          ? "Votre envoi vers le bénéficiaire a été créé avec succès"
          : "Votre demande de retrait est en attente de validation",
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

  const fees = calculateFees();
  const totalAmount = amount ? parseFloat(amount) + fees : 0;

  const bankAccounts = [
    { name: "Crédit du Maroc", rib: "021825000024400106532425" },
    { name: "CIH", rib: "230825260774421100590063" },
    { name: "Banque Populaire", rib: "181825211113968204000937" },
    { name: "AttijariWafa Bank", rib: "007810000462200030523754" },
    { name: "Société Générale", rib: "022780000760003747072074" },
    { name: "BMCE", rib: "011825000010200000210393" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-6 max-w-md pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="text-slate-600 hover:text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">
            Nouveau transfert
          </h1>
          <div className="w-10 h-10"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Transfer Type */}
          {step === 1 && (
            <>
              <Card className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-medium border-0">
                <h2 className="text-lg font-semibold mb-4 text-center text-slate-800">Type d'opération</h2>
                
                <RadioGroup value={transferType} onValueChange={(val) => setTransferType(val as 'send' | 'withdraw')}>
                  <div className="space-y-4">
                     <div className="flex items-center space-x-4 p-4 border-2 rounded-2xl border-primary/20 hover:border-primary transition-all duration-200 hover:shadow-medium">
                        <RadioGroupItem value="send" id="send" />
                        <Label htmlFor="send" className="flex items-center space-x-4 cursor-pointer flex-1">
                         <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medium">
                           <Plus className="w-6 h-6 text-white" />
                         </div>
                         <div>
                           <p className="font-semibold text-slate-800">Envoyer de l'argent</p>
                           <p className="text-sm text-slate-600">Transférer vers un bénéficiaire</p>
                         </div>
                       </Label>
                     </div>
                     
                     <div className="flex items-center space-x-4 p-4 border-2 rounded-2xl border-secondary/20 hover:border-secondary transition-all duration-200 hover:shadow-medium">
                        <RadioGroupItem value="withdraw" id="withdraw" />
                        <Label htmlFor="withdraw" className="flex items-center space-x-4 cursor-pointer flex-1">
                         <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medium">
                           <ArrowRightLeft className="w-6 h-6 text-white" />
                         </div>
                         <div>
                           <p className="font-semibold text-slate-800">Retirer de l'argent</p>
                           <p className="text-sm text-slate-600">Échanger vos devises</p>
                         </div>
                       </Label>
                     </div>
                  </div>
                </RadioGroup>
              </Card>

              <Button 
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-gradient-primary hover:opacity-90 rounded-2xl h-12 text-white font-medium shadow-medium"
              >
                Continuer
              </Button>
            </>
          )}

          {/* Step 2: Conversion Type */}
          {step === 2 && (
            <>
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>

              <Card className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-medium border-0">
                <h2 className="text-lg font-semibold mb-4 text-center text-slate-800">Type de conversion</h2>
                
                <RadioGroup value={conversionType} onValueChange={(val) => setConversionType(val as 'mad-to-cfa' | 'cfa-to-mad')}>
                  <div className="space-y-4">
                     <div className="flex items-center space-x-4 p-4 border-2 rounded-2xl border-primary/20 hover:border-primary transition-all duration-200 hover:shadow-medium">
                        <RadioGroupItem value="mad-to-cfa" id="mad-to-cfa" />
                        <Label htmlFor="mad-to-cfa" className="flex items-center space-x-4 cursor-pointer flex-1">
                         <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-medium">
                           <span className="text-white font-bold text-xs">MAD</span>
                         </div>
                         <div className="flex-1">
                           <p className="font-semibold text-slate-800">Dirhams → CFA</p>
                           <p className="text-sm text-slate-600">
                             {transferType === 'send' 
                               ? "Envoyer des Dirhams, le bénéficiaire reçoit des CFA"
                               : "Échanger vos Dirhams contre des CFA"}
                           </p>
                         </div>
                       </Label>
                     </div>
                     
                     <div className="flex items-center space-x-4 p-4 border-2 rounded-2xl border-secondary/20 hover:border-secondary transition-all duration-200 hover:shadow-medium">
                        <RadioGroupItem value="cfa-to-mad" id="cfa-to-mad" />
                        <Label htmlFor="cfa-to-mad" className="flex items-center space-x-4 cursor-pointer flex-1">
                         <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center shadow-medium">
                           <span className="text-white font-bold text-xs">CFA</span>
                         </div>
                         <div className="flex-1">
                           <p className="font-semibold text-slate-800">CFA → Dirhams</p>
                           <p className="text-sm text-slate-600">
                             {transferType === 'send' 
                               ? "Envoyer des CFA, le bénéficiaire reçoit des Dirhams"
                               : "Échanger vos CFA contre des Dirhams"}
                           </p>
                         </div>
                       </Label>
                     </div>
                  </div>
                </RadioGroup>
              </Card>

              <Button 
                type="button"
                onClick={() => setStep(3)}
                className="w-full bg-gradient-primary hover:opacity-90 rounded-2xl h-12 text-white font-medium shadow-medium"
              >
                Continuer
              </Button>
            </>
          )}

          {/* Step 3: Amount & Details */}
          {step === 3 && (
            <>
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setStep(2)}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>

              {/* Amount Card */}
              <Card className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-medium border-0">
                <h2 className="text-lg font-semibold mb-4 text-center text-slate-800">Montant</h2>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-600 font-medium">Vous envoyez</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl h-12 text-center rounded-xl border-2 border-slate-200 focus:border-primary bg-white text-slate-800"
                        step="0.01"
                        min="1"
                      />
                      <div className="w-20 h-12 rounded-xl border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                        <span className="font-semibold text-slate-700">{fromCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="w-10 h-10 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-slate-600 font-medium">
                      {transferType === 'send' ? 'Bénéficiaire reçoit' : 'Vous recevez'}
                    </Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Input
                        type="text"
                        value={convertedAmount}
                        readOnly
                        className="text-2xl h-12 text-center bg-primary/5 font-semibold text-primary rounded-xl border-2 border-primary/20"
                      />
                      <div className="w-20 h-12 rounded-xl border-2 border-primary/20 bg-primary/5 flex items-center justify-center">
                        <span className="font-semibold text-primary">{toCurrency}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Taux</span>
                      <span className="font-medium text-slate-800">
                        1 {fromCurrency} = {exchangeRate.toFixed(fromCurrency === 'CFA' ? 6 : 2)} {toCurrency}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Frais</span>
                      <span className={`font-medium ${fees > 0 ? 'text-slate-800' : 'text-success'}`}>
                        {fees > 0 ? formatCurrency(fees, fromCurrency) : 'Gratuit'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                      <span className="font-medium text-slate-600">Total</span>
                      <span className="font-bold text-slate-800">{formatCurrency(totalAmount, fromCurrency)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recipient Card - Only for send type */}
              {transferType === 'send' && (
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
              )}

              {/* Method Card */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <h2 className="text-lg font-semibold mb-4 text-center">
                  {transferType === 'send' ? 'Méthode de paiement' : 'Comment nous envoyer l\'argent ?'}
                </h2>
                
                <RadioGroup value={transferMethod} onValueChange={setTransferMethod}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border-2 rounded-xl border-border hover:border-purple transition-colors">
                      <div className="flex items-center space-x-3 flex-1">
                        <RadioGroupItem value="bank" id="bank" />
                        <Label htmlFor="bank" className="flex items-center space-x-3 cursor-pointer flex-1">
                          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                            <Banknote className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">Virement bancaire</span>
                        </Label>
                      </div>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">0% frais</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border-2 rounded-xl border-border hover:border-blue transition-colors">
                      <div className="flex items-center space-x-3 flex-1">
                        <RadioGroupItem value="wave" id="wave" />
                        <Label htmlFor="wave" className="flex items-center space-x-3 cursor-pointer flex-1">
                          <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">Wave</span>
                        </Label>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">1% frais</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border-2 rounded-xl border-border hover:border-blue transition-colors">
                      <div className="flex items-center space-x-3 flex-1">
                        <RadioGroupItem value="orange" id="orange" />
                        <Label htmlFor="orange" className="flex items-center space-x-3 cursor-pointer flex-1">
                          <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                            <Smartphone className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">Orange Money</span>
                        </Label>
                      </div>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">1% frais</Badge>
                    </div>
                  </div>
                </RadioGroup>
              </Card>

              {/* Bank Accounts List - Only for bank transfer */}
              {transferMethod === 'bank' && (
                <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                  <h2 className="text-base font-semibold mb-3 text-center text-slate-800">Nos RIB bancaires</h2>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bankAccounts.map((bank, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="font-semibold text-sm text-slate-800">{bank.name}</p>
                        <p className="text-xs text-slate-600 font-mono mt-1">{bank.rib}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Effectuez votre virement sur l'un de ces comptes
                  </p>
                </Card>
              )}

              {/* Proof Upload - Only for Withdrawal */}
              {transferType === 'withdraw' && (
                <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                  <h2 className="text-lg font-semibold mb-3 text-center">Preuve de paiement</h2>
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    Envoyez-nous une capture d'écran de votre {transferMethod === 'bank' ? 'virement bancaire' : 'paiement mobile'}
                  </p>
                  <div className="space-y-3">
                    <Label htmlFor="proof" className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {proofImage ? proofImage.name : 'Télécharger la capture'}
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
                  </div>
                </Card>
              )}

              {/* Notes */}
              <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
                <Label className="text-sm font-medium mb-2 block">Notes (optionnel)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter des notes..."
                  className="min-h-[80px] rounded-xl"
                />
              </Card>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-primary hover:opacity-90 rounded-2xl h-12 text-white font-medium shadow-medium"
              >
                {isLoading ? 'En cours...' : 'Créer le transfert'}
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default ModernTransferForm;
