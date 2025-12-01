import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, Plus, Smartphone, Building2, ArrowLeft, Check, Receipt, Info as InfoIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import AddRecipientDialog from './AddRecipientDialog';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  country: string;
  transfer_number?: string;
}

const ModernTransferForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [conversionType, setConversionType] = useState<'mad_to_cfa' | 'cfa_to_mad'>('mad_to_cfa');
  const [receiveAmount, setReceiveAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("MAD");
  const [toCurrency, setToCurrency] = useState("CFA");
  const [sendAmount, setSendAmount] = useState("");
  const [exchangeRates, setExchangeRates] = useState<{ mad_to_cfa: number; cfa_to_mad: number }>({
    mad_to_cfa: 60,
    cfa_to_mad: 0.0166667
  });
  const [transferMethod, setTransferMethod] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [notes, setNotes] = useState("");
  const [showAddRecipient, setShowAddRecipient] = useState(false);

  useEffect(() => {
    loadRecipients();
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (receiveAmount && exchangeRates) {
      let send = 0;
      if (conversionType === 'mad_to_cfa') {
        // MAD → CFA: diviser par le taux (0.0166667) = multiplier par 60
        send = parseFloat(receiveAmount) * exchangeRates.cfa_to_mad;
      } else {
        // CFA → MAD: multiplier par 62.5 (inclut les frais)
        send = parseFloat(receiveAmount) * 62.5;
      }
      setSendAmount(send.toFixed(2));
    } else {
      setSendAmount("");
    }
  }, [receiveAmount, conversionType, exchangeRates]);

  const loadRecipients = async () => {
    const { data } = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (data) setRecipients(data);
  };

  const loadExchangeRates = async () => {
    const { data } = await supabase
      .from('exchange_rates')
      .select('*');

    if (data && data.length > 0) {
      const madToCfa = data.find(r => r.from_currency === 'MAD' && r.to_currency === 'CFA')?.rate || 60;
      const cfaToMad = data.find(r => r.from_currency === 'CFA' && r.to_currency === 'MAD')?.rate || 0.0166667;
      setExchangeRates({ mad_to_cfa: madToCfa, cfa_to_mad: cfaToMad });
    }
  };

  const calculateFees = () => {
    if (!sendAmount) return 0;
    const baseAmount = parseFloat(sendAmount);
    
    // Pour CFA→MAD, le taux de 62.5 inclut déjà les frais, donc pas de frais supplémentaires
    if (conversionType === 'cfa_to_mad') {
      return 0;
    }
    
    // Pour MAD→CFA: Sénégal = 1%, autres pays Wave/OM = 1.5%, virement = 0%
    if (selectedRecipient?.country === 'Sénégal') {
      return baseAmount * 0.01; // 1%
    }
    
    if (transferMethod === 'wave' || transferMethod === 'orange_money') {
      return baseAmount * 0.015; // 1.5%
    }
    
    return 0; // Virement bancaire gratuit
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer un transfert");
      return;
    }

    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    const transferType = conversionType === 'mad_to_cfa' ? 'send' : 'withdraw';
    
    if (transferType === 'send' && !selectedRecipient) {
      toast.error("Veuillez sélectionner un bénéficiaire");
      return;
    }

    if (!transferMethod) {
      toast.error("Veuillez sélectionner un moyen de paiement");
      return;
    }

    try {
      const { data: refData } = await supabase.rpc('generate_reference_number');
      const rate = conversionType === 'mad_to_cfa' ? exchangeRates.mad_to_cfa : exchangeRates.cfa_to_mad;
      const fees = calculateFees();
      const referenceNumber = refData || `TR${Date.now()}`;

      const { data: transfer, error } = await supabase
        .from('transfers')
        .insert({
          user_id: user.id,
          amount: parseFloat(sendAmount),
          from_currency: fromCurrency,
          to_currency: toCurrency,
          converted_amount: parseFloat(receiveAmount),
          exchange_rate: rate,
          fees: fees,
          total_amount: parseFloat(sendAmount) + fees,
          reference_number: referenceNumber,
          transfer_method: transferMethod,
          transfer_type: transferType,
          recipient_id: selectedRecipient?.id,
          notes: notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Transfert créé avec succès !");
      setReceiveAmount("");
      setSendAmount("");
      setSelectedRecipient(null);
      setTransferMethod("");
      setNotes("");
      setStep(1);
      navigate('/history');
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error("Erreur lors de la création du transfert");
    }
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return "0";
    return parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => step === 1 ? navigate('/dashboard') : setStep(step - 1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Nouveau transfert</h1>
          <div className="w-10"></div>
        </motion.div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Type de conversion</h2>
              <p className="text-muted-foreground">Choisissez votre conversion</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
                  conversionType === 'mad_to_cfa' ? 'border-primary ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => {
                  setConversionType('mad_to_cfa');
                  setFromCurrency('MAD');
                  setToCurrency('CFA');
                  setStep(2);
                }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">→</span>
                  </div>
                  <h3 className="text-2xl font-bold">Dirham → CFA</h3>
                  <p className="text-sm text-muted-foreground">
                    Envoyer de l'argent vers l'Afrique
                  </p>
                </div>
              </Card>

              <Card
                className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
                  conversionType === 'cfa_to_mad' ? 'border-primary ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => {
                  setConversionType('cfa_to_mad');
                  setFromCurrency('CFA');
                  setToCurrency('MAD');
                  setStep(2);
                }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">←</span>
                  </div>
                  <h3 className="text-2xl font-bold">CFA → Dirham</h3>
                  <p className="text-sm text-muted-foreground">
                    Retirer de l'argent depuis l'Afrique
                  </p>
                </div>
              </Card>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Détails du transfert</h2>
              <p className="text-muted-foreground">
                {conversionType === 'mad_to_cfa' ? 'Envoi vers l\'Afrique' : 'Retrait depuis l\'Afrique'}
              </p>
            </div>

            <Card className="p-6 space-y-6">
              {/* Montant à recevoir */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Bénéficiaire reçoit</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    type="number"
                    value={receiveAmount}
                    onChange={(e) => setReceiveAmount(e.target.value)}
                    placeholder="0"
                    className="text-3xl h-16 text-center font-bold"
                  />
                  <div className="px-6 py-4 bg-muted rounded-lg min-w-[100px] text-center">
                    <span className="text-xl font-bold">{toCurrency}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowDown className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>

              {/* Montant à envoyer (calculé) */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Vous envoyez</Label>
                <div className="flex items-center space-x-3">
                  <Input
                    type="text"
                    value={sendAmount}
                    readOnly
                    className="text-3xl h-16 text-center font-bold bg-primary/10 text-primary"
                  />
                  <div className="px-6 py-4 bg-primary/10 rounded-lg min-w-[100px] text-center">
                    <span className="text-xl font-bold text-primary">{fromCurrency}</span>
                  </div>
                </div>
              </div>

              {/* Taux */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taux de change</span>
                  <span className="font-medium">
                    1 {toCurrency} = {conversionType === 'mad_to_cfa' ? exchangeRates.cfa_to_mad.toFixed(6) : '62.50000'} {fromCurrency}
                  </span>
                </div>
              </div>
            </Card>

            {conversionType === 'mad_to_cfa' && (
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Bénéficiaire</Label>
                <Select value={selectedRecipient?.id} onValueChange={(id) => {
                  const recipient = recipients.find(r => r.id === id);
                  setSelectedRecipient(recipient || null);
                }}>
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Choisir un bénéficiaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map((recipient) => (
                      <SelectItem key={recipient.id} value={recipient.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{recipient.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {recipient.country}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setShowAddRecipient(true)}
                  className="w-full h-12"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un bénéficiaire
                </Button>
              </div>
            )}

            {/* Moyens de paiement sous forme de cartes */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Moyen de paiement</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    transferMethod === 'wave' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setTransferMethod('wave')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h4 className="font-semibold text-lg">Wave</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedRecipient?.country === 'Sénégal' ? 'Frais: 1%' : 'Frais: 1.5%'}
                    </p>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    transferMethod === 'orange_money' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setTransferMethod('orange_money')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Smartphone className="w-8 h-8 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-lg">Orange Money</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedRecipient?.country === 'Sénégal' ? 'Frais: 1%' : 'Frais: 1.5%'}
                    </p>
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                    transferMethod === 'bank_transfer' ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setTransferMethod('bank_transfer')}
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-lg">Virement bancaire</h4>
                    <p className="text-xs text-green-600 font-medium">Gratuit</p>
                  </div>
                </Card>
              </div>
            </div>

            {/* RIB bancaires */}
            {transferMethod === 'bank_transfer' && (
              <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  Nos RIB bancaires
                </h4>
                <div className="space-y-2 text-sm">
                  {[
                    { name: "Crédit du Maroc", rib: "021825000024400106532425" },
                    { name: "CIH", rib: "230825260774421100590063" },
                    { name: "Banque Populaire", rib: "181825211113968204000937" },
                    { name: "AttijariWafa Bank", rib: "007810000462200030523754" },
                    { name: "Société Générale", rib: "022780000760003747072074" },
                    { name: "BMCE", rib: "011825000010200000210393" }
                  ].map((bank) => (
                    <div key={bank.rib} className="flex justify-between p-3 bg-background rounded-lg">
                      <span className="font-medium">{bank.name}</span>
                      <span className="font-mono text-xs">{bank.rib}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Note pour Wave/OM */}
            {(transferMethod === 'wave' || transferMethod === 'orange_money') && (
              <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                <p className="text-sm flex items-start gap-2">
                  <InfoIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>
                    L'admin vous fournira le numéro de réception après validation de votre demande.
                  </span>
                </p>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des informations complémentaires..."
                className="min-h-[100px]"
              />
            </div>

            {/* Récapitulatif */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Receipt className="w-6 h-6" />
                Récapitulatif
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-border/50">
                  <span className="text-muted-foreground">Bénéficiaire reçoit</span>
                  <span className="font-bold text-xl">{formatCurrency(receiveAmount)} {toCurrency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taux de change</span>
                  <span className="font-medium text-sm">
                    1 {toCurrency} = {conversionType === 'mad_to_cfa' ? exchangeRates.cfa_to_mad.toFixed(6) : '62.50000'} {fromCurrency}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Frais de transfert</span>
                  <span className={calculateFees() === 0 ? "text-green-600 font-medium" : "font-medium"}>
                    {calculateFees() === 0 ? 'Gratuit' : `${formatCurrency(calculateFees().toFixed(2))} ${fromCurrency}`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-bold text-lg">Total à payer</span>
                  <span className="font-bold text-2xl text-primary">
                    {formatCurrency((parseFloat(sendAmount || "0") + calculateFees()).toFixed(2))} {fromCurrency}
                  </span>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={!receiveAmount || (conversionType === 'mad_to_cfa' && !selectedRecipient) || !transferMethod}
              className="w-full h-14 text-lg"
            >
              Valider le transfert
              <Check className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        <AddRecipientDialog 
          open={showAddRecipient}
          onOpenChange={setShowAddRecipient}
          onRecipientAdded={loadRecipients}
        />
      </div>
    </div>
  );
};

export default ModernTransferForm;
