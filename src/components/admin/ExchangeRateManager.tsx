import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExchangeRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
}

const ExchangeRateManager = () => {
  const { toast } = useToast();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [newRate, setNewRate] = useState<number>(0);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading rates:', error);
      return;
    }

    setRates(data || []);
  };

  const startEdit = (rate: ExchangeRate) => {
    setEditingRate(rate.id);
    setNewRate(rate.rate);
  };

  const cancelEdit = () => {
    setEditingRate(null);
    setNewRate(0);
  };

  const saveRate = async (rateId: string) => {
    // Note: Cette fonction nécessiterait une edge function pour mettre à jour les taux
    // car les utilisateurs normaux n'ont pas les permissions INSERT/UPDATE sur exchange_rates
    toast({
      title: "Information",
      description: "La mise à jour des taux nécessite une edge function admin dédiée",
      variant: "default",
    });
    cancelEdit();
  };

  const getRateChange = (rate: ExchangeRate) => {
    // Calcul du changement par rapport à un taux de référence (exemple: 60)
    const referenceRate = rate.from_currency === 'MAD' ? 60 : 0.0167;
    const change = ((rate.rate - referenceRate) / referenceRate) * 100;
    return change;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">Gestion des taux de change</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rates.map((rate) => {
          const change = getRateChange(rate);
          const isPositive = change >= 0;
          const isEditing = editingRate === rate.id;

          return (
            <Card key={rate.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">
                    {rate.from_currency} → {rate.to_currency}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Mis à jour: {new Date(rate.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-sm font-medium">{Math.abs(change).toFixed(2)}%</span>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    type="number"
                    step="0.0001"
                    value={newRate}
                    onChange={(e) => setNewRate(parseFloat(e.target.value))}
                    className="font-mono"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveRate(rate.id)} className="flex-1">
                      <Save className="h-4 w-4 mr-1" />
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-foreground font-mono">
                    {rate.rate.toFixed(4)}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => startEdit(rate)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                </div>
              )}

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  1 {rate.from_currency} = {rate.rate.toFixed(2)} {rate.to_currency}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {rates.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun taux de change configuré</p>
        </Card>
      )}
    </div>
  );
};

export default ExchangeRateManager;
