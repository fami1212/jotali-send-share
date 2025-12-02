import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Smartphone, Building2, ArrowLeft, Check, AlertCircle } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadRecipients();
    loadExchangeRates();
  }, []);

  useEffect(() => {
    if (receiveAmount && exchangeRates) {
      let send = 0;
      if (conversionType === 'mad_to_cfa') {
        send = parseFloat(receiveAmount) * exchangeRates.cfa_to_mad;
      } else {
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

  // Calcul des frais: MAD→CFA uniquement
  // Sénégal = 1%, autres pays Wave/OM = 1.5%, virement = 0%
  const isSenegal = (country: string | undefined) => {
    if (!country) return false;
    const normalized = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized === 'senegal' || normalized === 'sénégal' || country === 'Sénégal' || country === 'Senegal';
  };

  const calculateFees = () => {
    if (!sendAmount) return 0;
    const baseAmount = parseFloat(sendAmount);
    
    // CFA→MAD: le taux 62.5 inclut déjà les frais
    if (conversionType === 'cfa_to_mad') return 0;
    
    // MAD→CFA: selon pays et méthode
    if (transferMethod === 'bank_transfer') return 0;
    
    // Wave ou Orange Money
    if (transferMethod === 'wave' || transferMethod === 'orange_money') {
      if (isSenegal(selectedRecipient?.country)) {
        return baseAmount * 0.01; // 1% Sénégal
      }
      return baseAmount * 0.015; // 1.5% autres pays
    }
    
    return 0;
  };

  const getFeeLabel = () => {
    if (conversionType === 'cfa_to_mad') return 'Inclus';
    if (transferMethod === 'bank_transfer') return 'Gratuit';
    if (transferMethod === 'wave' || transferMethod === 'orange_money') {
      if (isSenegal(selectedRecipient?.country)) return '1%';
      return '1.5%';
    }
    return '0%';
  };

  const getFeeForMethod = (methodId: string) => {
    if (methodId === 'bank_transfer') return 'Gratuit';
    if (conversionType === 'cfa_to_mad') return 'Inclus';
    if (isSenegal(selectedRecipient?.country)) return '1%';
    return '1.5%';
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Connectez-vous pour continuer");
      return;
    }

    if (!receiveAmount || parseFloat(receiveAmount) <= 0) {
      toast.error("Entrez un montant valide");
      return;
    }

    const transferType = conversionType === 'mad_to_cfa' ? 'transfer' : 'withdrawal';
    
    if (transferType === 'transfer' && !selectedRecipient) {
      toast.error("Sélectionnez un bénéficiaire");
      return;
    }

    if (!transferMethod) {
      toast.error("Sélectionnez un moyen de paiement");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: refData } = await supabase.rpc('generate_reference_number');
      const rate = conversionType === 'mad_to_cfa' ? exchangeRates.mad_to_cfa : 62.5;
      const fees = calculateFees();
      const referenceNumber = refData || `TR${Date.now()}`;

      const { error } = await supabase
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
        });

      if (error) throw error;

      toast.success("Transfert créé avec succès !");
      navigate('/history');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return "0";
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fees = calculateFees();
  const total = parseFloat(sendAmount || "0") + fees;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full"
            onClick={() => step === 1 ? navigate('/dashboard') : setStep(step - 1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nouveau transfert</h1>
            <p className="text-sm text-slate-500">Étape {step}/2</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
          <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
        </div>

        {/* Step 1: Type selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Que souhaitez-vous faire ?</h2>
              <p className="text-slate-500">Choisissez le type d'opération</p>
            </div>

            <div className="space-y-4">
              <Card
                className={`p-6 cursor-pointer transition-all border-2 ${
                  conversionType === 'mad_to_cfa' 
                    ? 'border-primary bg-primary/5 shadow-lg' 
                    : 'border-slate-200 hover:border-primary/50 hover:shadow'
                }`}
                onClick={() => {
                  setConversionType('mad_to_cfa');
                  setFromCurrency('MAD');
                  setToCurrency('CFA');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow">
                    <ArrowRight className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">Envoyer de l'argent</h3>
                    <p className="text-sm text-slate-500">Dirhams → CFA (vers l'Afrique)</p>
                  </div>
                  {conversionType === 'mad_to_cfa' && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>

              <Card
                className={`p-6 cursor-pointer transition-all border-2 ${
                  conversionType === 'cfa_to_mad' 
                    ? 'border-primary bg-primary/5 shadow-lg' 
                    : 'border-slate-200 hover:border-primary/50 hover:shadow'
                }`}
                onClick={() => {
                  setConversionType('cfa_to_mad');
                  setFromCurrency('CFA');
                  setToCurrency('MAD');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center shadow">
                    <ArrowLeft className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">Retirer de l'argent</h3>
                    <p className="text-sm text-slate-500">CFA → Dirhams (depuis l'Afrique)</p>
                  </div>
                  {conversionType === 'cfa_to_mad' && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Button 
              className="w-full h-14 text-lg font-semibold rounded-2xl mt-8"
              onClick={() => setStep(2)}
            >
              Continuer
            </Button>
          </motion.div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Amount Card */}
            <Card className="p-6 border-2 border-slate-200">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Montant à recevoir</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Input
                      type="number"
                      value={receiveAmount}
                      onChange={(e) => setReceiveAmount(e.target.value)}
                      placeholder="0"
                      className="text-2xl h-14 font-bold border-2 text-center"
                    />
                    <div className="px-4 py-3 bg-slate-100 rounded-xl font-bold text-lg min-w-[80px] text-center">
                      {toCurrency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center py-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-600">Vous envoyez</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 text-2xl h-14 font-bold border-2 rounded-lg bg-primary/5 border-primary/20 flex items-center justify-center text-primary">
                      {formatNumber(sendAmount)}
                    </div>
                    <div className="px-4 py-3 bg-primary/10 rounded-xl font-bold text-lg text-primary min-w-[80px] text-center">
                      {fromCurrency}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t space-y-1 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Taux</span>
                    <span>1 {toCurrency} = {conversionType === 'mad_to_cfa' ? exchangeRates.cfa_to_mad.toFixed(4) : '62.50'} {fromCurrency}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Recipient (only for MAD→CFA) */}
            {conversionType === 'mad_to_cfa' && (
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-800">Bénéficiaire</Label>
                <Select 
                  value={selectedRecipient?.id} 
                  onValueChange={(id) => {
                    const recipient = recipients.find(r => r.id === id);
                    setSelectedRecipient(recipient || null);
                  }}
                >
                  <SelectTrigger className="h-14 text-base border-2">
                    <SelectValue placeholder="Choisir un bénéficiaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-slate-500">{r.country} • {r.phone}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setShowAddRecipient(true)}
                  className="w-full h-12 border-2 border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un bénéficiaire
                </Button>
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-slate-800">Moyen de paiement</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'wave', label: 'Wave', icon: Smartphone, color: 'bg-yellow-500' },
                  { id: 'orange_money', label: 'Orange', icon: Smartphone, color: 'bg-orange-500' },
                  { id: 'bank_transfer', label: 'Banque', icon: Building2, color: 'bg-blue-500' }
                ].map((method) => (
                  <Card
                    key={method.id}
                    className={`p-4 cursor-pointer transition-all border-2 text-center ${
                      transferMethod === method.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setTransferMethod(method.id)}
                  >
                    <div className={`w-10 h-10 ${method.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      <method.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-medium text-sm text-slate-800">{method.label}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {getFeeForMethod(method.id)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Fee Info for MAD→CFA */}
            {conversionType === 'mad_to_cfa' && (transferMethod === 'wave' || transferMethod === 'orange_money') && (
              <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Frais {getFeeLabel()}</p>
                  <p className="text-blue-600">
                    {selectedRecipient?.country === 'Sénégal' 
                      ? 'Tarif réduit pour le Sénégal'
                      : 'Tarif standard pour les autres pays'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Bank RIBs */}
            {transferMethod === 'bank_transfer' && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
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
                    <div key={bank.rib} className="flex justify-between p-2 bg-white rounded-lg">
                      <span className="font-medium text-slate-700">{bank.name}</span>
                      <span className="font-mono text-xs text-slate-500">{bank.rib}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-600">Notes (optionnel)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instructions supplémentaires..."
                className="resize-none border-2"
                rows={2}
              />
            </div>

            {/* Summary */}
            {sendAmount && parseFloat(sendAmount) > 0 && (
              <Card className="p-4 bg-slate-900 text-white">
                <h4 className="font-semibold mb-3">Récapitulatif</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Montant</span>
                    <span>{formatNumber(sendAmount)} {fromCurrency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Frais ({getFeeLabel()})</span>
                    <span>{formatNumber(fees)} {fromCurrency}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700 font-bold text-lg">
                    <span>Total</span>
                    <span>{formatNumber(total)} {fromCurrency}</span>
                  </div>
                  <div className="flex justify-between text-green-400 pt-1">
                    <span>Bénéficiaire reçoit</span>
                    <span className="font-bold">{formatNumber(receiveAmount)} {toCurrency}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Submit */}
            <Button 
              className="w-full h-14 text-lg font-semibold rounded-2xl"
              onClick={handleSubmit}
              disabled={isSubmitting || !receiveAmount || !transferMethod || (conversionType === 'mad_to_cfa' && !selectedRecipient)}
            >
              {isSubmitting ? "Traitement..." : "Confirmer le transfert"}
            </Button>
          </motion.div>
        )}

        <AddRecipientDialog 
          open={showAddRecipient} 
          onOpenChange={setShowAddRecipient}
          onRecipientAdded={() => {
            loadRecipients();
          }}
        />
      </div>
    </div>
  );
};

export default ModernTransferForm;
