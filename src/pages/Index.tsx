import { useState, useEffect } from 'react';
import { ArrowRightLeft, Shield, Zap, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user } = useAuth();
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExchangeRates();
  }, []);

  const loadExchangeRates = async () => {
    try {
      const { data } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('from_currency', 'CFA')
        .eq('to_currency', 'MAD')
        .single();

      if (data) {
        setExchangeRate(data.rate * 1000); // Pour 1000 CFA
      } else {
        setExchangeRate(16.50); // Valeur par défaut
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      setExchangeRate(16.50); // Valeur par défaut
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 pt-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-medium">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Koligo</h1>
              <p className="text-sm text-white/70">Transferts d'argent</p>
            </div>
          </div>
        </div>

        {/* Hero Content */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Transférez votre argent
          </h2>
          <h3 className="text-2xl font-bold text-white mb-6">
            CFA ⟷ Dirham
          </h3>
          <p className="text-lg text-white/90 mb-8">
            Des transferts rapides, sécurisés et au meilleur taux
          </p>
        </div>

        {/* Exchange Rate Card */}
        <Card className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-strong mb-8">
          <div className="text-center">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Chargement du taux...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">1 000</div>
                    <div className="text-muted-foreground text-sm">CFA</div>
                  </div>
                  
                  <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{exchangeRate?.toFixed(2)}</div>
                    <div className="text-muted-foreground text-sm">MAD</div>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Taux en temps réel
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Instantané</h3>
                <p className="text-sm text-muted-foreground">Transferts en moins de 5 minutes</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-secondary rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Sécurisé</h3>
                <p className="text-sm text-muted-foreground">Cryptage bancaire et protection des données</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-medium">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-accent rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Meilleur taux</h3>
                <p className="text-sm text-muted-foreground">Pas de frais cachés, taux transparents</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button 
            asChild 
            className="w-full bg-gradient-primary hover:opacity-90 text-white rounded-2xl h-14 text-lg font-semibold shadow-strong"
          >
            <Link to="/auth">
              <User className="w-5 h-5 mr-2" />
              Commencer un transfert
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="w-full bg-white/90 border-white/30 hover:bg-white rounded-2xl h-12 text-foreground font-medium"
          >
            <Link to="/auth">Se connecter</Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/70 text-sm">
          <p>© 2024 Koligo. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
