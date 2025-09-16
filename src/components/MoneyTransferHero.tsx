import { ArrowRightLeft, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@/assets/money-transfer-hero.jpg";

const MoneyTransferHero = () => {
  return (
    <div className="relative min-h-screen bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-16 pb-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-white">TransferApp</span>
          </div>
          
          <Button variant="outline" className="text-white border-white/30 bg-white/10 hover:bg-white/20">
            Se connecter
          </Button>
        </header>

        {/* Hero Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Transférez votre argent
            <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
              CFA ⟷ Dirham
            </span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Des transferts rapides, sécurisés et au meilleur taux entre le CFA et le Dirham marocain
          </p>
          
          <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-strong">
            Commencer un transfert
          </Button>
        </div>

        {/* Exchange Rate Card */}
        <Card className="max-w-md mx-auto bg-gradient-card shadow-strong border-0 p-6 mb-8">
          <div className="text-center">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">1 000</div>
                <div className="text-muted-foreground">CFA</div>
              </div>
              
              <ArrowRightLeft className="w-6 h-6 text-primary mx-4" />
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">1.65</div>
                <div className="text-muted-foreground">MAD</div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Taux mis à jour il y a 2 min
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6 text-center">
            <Zap className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Instantané</h3>
            <p className="text-white/80">Transferts en moins de 5 minutes</p>
          </Card>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6 text-center">
            <Shield className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Sécurisé</h3>
            <p className="text-white/80">Cryptage bancaire et protection des données</p>
          </Card>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm p-6 text-center">
            <ArrowRightLeft className="w-12 h-12 text-white mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Meilleur taux</h3>
            <p className="text-white/80">Pas de frais cachés, taux transparents</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MoneyTransferHero;