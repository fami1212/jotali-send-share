import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Smartphone, Building2, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import TransferSuccessAnimation from './TransferSuccessAnimation';

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
  
  // Steps: 1=Type, 2=Amount+Beneficiary, 3=Recap, 4=Payment Method
  const [step, setStep] = useState(1);
  const [conversionType, setConversionType] = useState<'mad_to_cfa' | 'cfa_to_mad'>('mad_to_cfa');
  const [receiveAmount, setReceiveAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("MAD");
  const [toCurrency, setToCurrency] = useState("CFA");
  const [sendAmount, setSendAmount] = useState(0);
  const [transferMethod, setTransferMethod] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [notes, setNotes] = useState("");
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState({ amount: '', currency: '', reference: '' });

  // Fixed exchange rates
  const MAD_TO_CFA_RATE = 60; // 1 DHS = 60 CFA
  const CFA_TO_MAD_RATE = 62.5; // 1 DHS = 62.5 CFA (fees included)

  useEffect(() => {
    loadRecipients();
  }, [user]);

  useEffect(() => {
    if (receiveAmount) {
      const amount = parseFloat(receiveAmount);
      if (!isNaN(amount) && amount > 0) {
        if (conversionType === 'mad_to_cfa') {
          // User enters CFA to receive, calculate MAD to send
          // 1 DHS = 60 CFA, so MAD = CFA / 60, rounded up
          const madAmount = Math.ceil(amount / MAD_TO_CFA_RATE);
          setSendAmount(madAmount);
        } else {
          // CFA to MAD: user enters DHS to receive, calculate CFA to send
          // Rate 1 DHS = 62.5 CFA (fees included)
          const cfaAmount = Math.ceil(amount * CFA_TO_MAD_RATE);
          setSendAmount(cfaAmount);
        }
      } else {
        setSendAmount(0);
      }
    } else {
      setSendAmount(0);
    }
  }, [receiveAmount, conversionType]);

  const loadRecipients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('recipients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setRecipients(data);
  };

  // Fee calculation for MAD→CFA only
  const isSenegal = (country: string | undefined) => {
    if (!country) return false;
    const normalized = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized === 'senegal' || normalized === 'sénégal';
  };

  const calculateFees = () => {
    if (conversionType === 'cfa_to_mad') return 0; // Fees included in rate
    if (!transferMethod || !sendAmount) return 0;
    
    if (transferMethod === 'bank_transfer') return 0;
    
    // Wave or Orange Money
    if (transferMethod === 'wave' || transferMethod === 'orange_money') {
      const feeRate = isSenegal(selectedRecipient?.country) ? 0.01 : 0.015;
      return Math.ceil(sendAmount * feeRate);
    }
    
    return 0;
  };

  const fees = calculateFees();
  const total = sendAmount + fees;

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
      toast.error("Sélectionnez un opérateur de paiement");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: refData } = await supabase.rpc('generate_reference_number');
      const rate = conversionType === 'mad_to_cfa' ? MAD_TO_CFA_RATE : CFA_TO_MAD_RATE;
      const referenceNumber = refData || `TR${Date.now()}`;

      const { error } = await supabase
        .from('transfers')
        .insert({
          user_id: user.id,
          amount: sendAmount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          converted_amount: parseFloat(receiveAmount),
          exchange_rate: rate,
          fees: fees,
          total_amount: total,
          reference_number: referenceNumber,
          transfer_method: transferMethod,
          transfer_type: transferType,
          recipient_id: selectedRecipient?.id,
          notes: notes || null,
          status: 'pending'
        });

      if (error) throw error;

      // Show success animation
      setSuccessData({
        amount: formatNumber(total),
        currency: fromCurrency,
        reference: referenceNumber
      });
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('fr-FR');
  };

  const getStepCount = () => 4;

  const canProceedStep2 = () => {
    if (!receiveAmount || parseFloat(receiveAmount) <= 0) return false;
    if (conversionType === 'mad_to_cfa' && !selectedRecipient) return false;
    return true;
  };

  const goBack = () => {
    if (step === 1) {
      navigate('/dashboard');
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full"
            onClick={goBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nouveau transfert</h1>
            <p className="text-sm text-slate-500">Étape {step}/{getStepCount()}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {Array.from({ length: getStepCount() }).map((_, i) => (
            <div 
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${step > i ? 'bg-primary' : 'bg-slate-200'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Type selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                      ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                      : 'border-slate-200 hover:border-primary/50 hover:shadow'
                  }`}
                  onClick={() => {
                    setConversionType('mad_to_cfa');
                    setFromCurrency('MAD');
                    setToCurrency('CFA');
                    setTransferMethod('');
                    setSelectedRecipient(null);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <ArrowRight className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">Envoyer de l'argent</h3>
                      <p className="text-sm text-slate-500">Maroc → Afrique</p>
                      <p className="text-xs text-primary font-semibold mt-1">1 DHS = 60 CFA</p>
                    </div>
                    {conversionType === 'mad_to_cfa' && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </Card>

                <Card
                  className={`p-6 cursor-pointer transition-all border-2 ${
                    conversionType === 'cfa_to_mad' 
                      ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                      : 'border-slate-200 hover:border-primary/50 hover:shadow'
                  }`}
                  onClick={() => {
                    setConversionType('cfa_to_mad');
                    setFromCurrency('CFA');
                    setToCurrency('MAD');
                    setTransferMethod('');
                    setSelectedRecipient(null);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <ArrowLeft className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">Retirer de l'argent</h3>
                      <p className="text-sm text-slate-500">Afrique → Maroc</p>
                      <p className="text-xs text-green-600 font-semibold mt-1">1 DHS = 62,5 CFA (frais inclus)</p>
                    </div>
                    {conversionType === 'cfa_to_mad' && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow">
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

          {/* Step 2: Amount + Beneficiary */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  {conversionType === 'mad_to_cfa' ? 'Envoi d\'argent' : 'Retrait d\'argent'}
                </h2>
                <p className="text-slate-500 text-sm">
                  {conversionType === 'mad_to_cfa' 
                    ? 'Combien votre bénéficiaire doit recevoir ?' 
                    : 'Combien souhaitez-vous recevoir au Maroc ?'}
                </p>
              </div>

              {/* Amount Input */}
              <Card className="p-6 border-2 border-slate-200 rounded-2xl">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">
                      {conversionType === 'mad_to_cfa' 
                        ? '💰 Montant que le bénéficiaire recevra' 
                        : '💰 Montant que vous recevrez'}
                    </Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input
                        type="number"
                        value={receiveAmount}
                        onChange={(e) => setReceiveAmount(e.target.value)}
                        placeholder="Ex: 10000"
                        className="text-2xl h-14 font-bold border-2 text-center rounded-xl focus:border-primary"
                      />
                      <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg min-w-[80px] text-center shadow">
                        {toCurrency}
                      </div>
                    </div>
                  </div>

                  {sendAmount > 0 && (
                    <>
                      <div className="flex items-center justify-center py-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center shadow">
                          <ArrowRight className="w-5 h-5 text-white rotate-90" />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-slate-700">
                          {conversionType === 'mad_to_cfa' ? '📤 Vous devez envoyer' : '📤 Vous devez envoyer'}
                        </Label>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 text-2xl h-14 font-bold border-2 rounded-xl bg-primary/10 border-primary/30 flex items-center justify-center text-primary">
                            {formatNumber(sendAmount)}
                          </div>
                          <div className="px-4 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-bold text-lg min-w-[80px] text-center shadow">
                            {fromCurrency}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 text-center">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm font-medium text-slate-600">
                          📊 Taux: 1 DHS = {conversionType === 'mad_to_cfa' ? MAD_TO_CFA_RATE : CFA_TO_MAD_RATE} CFA
                          {conversionType === 'cfa_to_mad' && <span className="text-green-600">(frais inclus)</span>}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Beneficiary Selection (only for MAD→CFA) */}
              {conversionType === 'mad_to_cfa' && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold text-slate-800">Bénéficiaire</Label>
                  <Select 
                    value={selectedRecipient?.id || ""} 
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

                  {selectedRecipient && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-900">{selectedRecipient.name}</p>
                          <p className="text-sm text-green-700">{selectedRecipient.country} • {selectedRecipient.phone}</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              <Button 
                className="w-full h-14 text-lg font-semibold rounded-2xl"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2()}
              >
                Continuer
              </Button>
            </motion.div>
          )}

          {/* Step 3: Recap */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Récapitulatif</h2>
                <p className="text-slate-500 text-sm">Vérifiez les détails de votre transfert</p>
              </div>

              <Card className="p-6 bg-slate-900 text-white rounded-2xl">
                <div className="space-y-4">
                  <div className="text-center pb-4 border-b border-slate-700">
                    <p className="text-slate-400 text-sm mb-1">Vous envoyez</p>
                    <p className="text-3xl font-bold">{formatNumber(sendAmount)} {fromCurrency}</p>
                  </div>

                  <div className="text-center pb-4 border-b border-slate-700">
                    <p className="text-slate-400 text-sm mb-1">
                      {conversionType === 'mad_to_cfa' ? 'Le bénéficiaire reçoit' : 'Vous recevez'}
                    </p>
                    <p className="text-3xl font-bold text-green-400">{formatNumber(parseFloat(receiveAmount))} {toCurrency}</p>
                  </div>

                  {conversionType === 'mad_to_cfa' && selectedRecipient && (
                    <div className="py-4 border-b border-slate-700">
                      <p className="text-slate-400 text-sm mb-2">Bénéficiaire</p>
                      <p className="font-semibold text-lg">{selectedRecipient.name}</p>
                      <p className="text-slate-300 text-sm">{selectedRecipient.country} • {selectedRecipient.phone}</p>
                      {selectedRecipient.transfer_number && (
                        <p className="text-slate-400 text-sm mt-1">N° transfert: {selectedRecipient.transfer_number}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taux de change</span>
                      <span>1 DHS = {conversionType === 'mad_to_cfa' ? MAD_TO_CFA_RATE : CFA_TO_MAD_RATE} CFA</span>
                    </div>
                    {conversionType === 'cfa_to_mad' && (
                      <div className="flex justify-between text-green-400">
                        <span>Frais de service</span>
                        <span>✓ Inclus dans le taux</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

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

              <Button 
                className="w-full h-14 text-lg font-semibold rounded-2xl"
                onClick={() => setStep(conversionType === 'mad_to_cfa' ? 4 : 4)}
              >
                Choisir l'opérateur de paiement
              </Button>
            </motion.div>
          )}

          {/* Step 4: Payment Method */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Mode de paiement</h2>
                <p className="text-slate-500 text-sm">Sélectionnez votre opérateur</p>
              </div>

              {/* Fee explanation for MAD→CFA only */}
              {conversionType === 'mad_to_cfa' && (
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 rounded-xl">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Informations sur les frais
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-2 bg-white/80 rounded-lg">
                      <span className="text-slate-700 font-medium">Taux de change</span>
                      <span className="text-primary font-bold">1 DHS = 60 CFA</span>
                    </div>
                    <div className="border-t border-blue-200 pt-3">
                      <p className="font-medium text-blue-900 mb-2">Frais selon le pays :</p>
                      <div className="grid gap-2">
                        <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-green-800">🇸🇳 Sénégal</span>
                          <span className="text-green-700 font-semibold">1% (Wave/OM)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <span className="text-amber-800">🌍 Autres pays</span>
                          <span className="text-amber-700 font-semibold">1.5% (Wave/OM)</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <span className="text-blue-800">🏦 Virement bancaire</span>
                          <span className="text-blue-700 font-semibold">0% gratuit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Payment methods */}
              <div className="space-y-3">
                {[
                  { id: 'wave', label: 'Wave', icon: Smartphone, color: 'bg-gradient-to-br from-yellow-400 to-yellow-500' },
                  { id: 'orange_money', label: 'Orange Money', icon: Smartphone, color: 'bg-gradient-to-br from-orange-400 to-orange-500' },
                  { id: 'bank_transfer', label: 'Virement bancaire', icon: Building2, color: 'bg-gradient-to-br from-blue-500 to-indigo-500' }
                ].map((method) => (
                  <Card
                    key={method.id}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      transferMethod === method.id 
                        ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow'
                    }`}
                    onClick={() => setTransferMethod(method.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${method.color} rounded-xl flex items-center justify-center shadow-md`}>
                        <method.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{method.label}</p>
                      </div>
                      {transferMethod === method.id && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Bank RIBs */}
              {transferMethod === 'bank_transfer' && (
                <Card className="p-4 bg-blue-50 border-blue-200 rounded-xl">
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

              {/* Final Summary with Fees */}
              {transferMethod && (
                <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-lg">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    💳 Total à payer
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Montant de base</span>
                      <span>{formatNumber(sendAmount)} {fromCurrency}</span>
                    </div>
                    {conversionType === 'mad_to_cfa' && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">
                          Frais {transferMethod === 'bank_transfer' ? '(gratuit)' : `(${isSenegal(selectedRecipient?.country) ? '1%' : '1.5%'})`}
                        </span>
                        <span className={fees === 0 ? 'text-green-400' : ''}>{formatNumber(fees)} {fromCurrency}</span>
                      </div>
                    )}
                    {conversionType === 'cfa_to_mad' && (
                      <div className="flex justify-between text-green-400">
                        <span>Frais de service</span>
                        <span>✓ Inclus</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-3 border-t border-slate-600 font-bold text-lg">
                      <span>Total</span>
                      <span className="text-green-400">{formatNumber(total)} {fromCurrency}</span>
                    </div>
                  </div>
                </Card>
              )}

              <Button 
                className="w-full h-14 text-lg font-semibold rounded-2xl shadow-lg"
                onClick={handleSubmit}
                disabled={isSubmitting || !transferMethod}
              >
                {isSubmitting ? "Traitement..." : "✓ Confirmer le transfert"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AddRecipientDialog 
          open={showAddRecipient} 
          onOpenChange={setShowAddRecipient}
          onRecipientAdded={() => {
            loadRecipients();
          }}
        />
      </div>

      {/* Success Animation */}
      <TransferSuccessAnimation
        isVisible={showSuccess}
        onComplete={() => navigate('/history')}
        amount={successData.amount}
        currency={successData.currency}
        reference={successData.reference}
      />
    </div>
  );
};

export default ModernTransferForm;
