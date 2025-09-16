import { useState } from "react";
import { ArrowRightLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TransferForm = () => {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("CFA");
  const [toCurrency, setToCurrency] = useState("MAD");
  const [convertedAmount, setConvertedAmount] = useState("");

  // Taux de change simulé
  const exchangeRate = fromCurrency === "CFA" ? 0.00165 : 606;
  
  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (value) {
      const converted = (parseFloat(value) * exchangeRate).toFixed(2);
      setConvertedAmount(converted);
    } else {
      setConvertedAmount("");
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    handleAmountChange(amount);
  };

  return (
    <Card className="max-w-lg mx-auto bg-gradient-card shadow-strong border-0 p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Nouveau transfert
          </h2>
          <p className="text-muted-foreground">
            Envoyez de l'argent rapidement et en toute sécurité
          </p>
        </div>

        {/* Montant à envoyer */}
        <div className="space-y-2">
          <Label htmlFor="amount">Vous envoyez</Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="text-2xl h-16 text-center border-primary/20 focus:border-primary"
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

        {/* Bouton d'échange */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={swapCurrencies}
            className="rounded-full w-12 h-12 border-primary/20 hover:bg-primary/10"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Montant reçu */}
        <div className="space-y-2">
          <Label htmlFor="received">Destinataire reçoit</Label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                id="received"
                type="text"
                value={convertedAmount}
                readOnly
                className="text-2xl h-16 text-center bg-muted border-primary/20 text-primary font-semibold"
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

        {/* Informations du taux */}
        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Taux de change</span>
            <span className="font-medium">1 {fromCurrency} = {exchangeRate} {toCurrency}</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span>Frais de transfert</span>
            <span className="font-medium text-success">Gratuit</span>
          </div>
          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border">
            <span className="font-medium">Total à payer</span>
            <span className="font-bold">{amount || "0"} {fromCurrency}</span>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="space-y-3">
          <Button className="w-full bg-gradient-primary hover:opacity-90 shadow-medium" size="lg">
            Continuer le transfert
          </Button>
          
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un bénéficiaire
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TransferForm;