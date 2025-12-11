import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Fingerprint, Shield, Smartphone } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";

const BiometricSetup = () => {
  const { isSupported, isEnabled, register, disable } = useBiometricAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isEnabled) {
        disable();
      } else {
        await register();
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-muted-foreground" />
            Authentification biométrique
          </CardTitle>
          <CardDescription>
            Non disponible sur cet appareil
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: isEnabled ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.3 }}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isEnabled 
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500" 
                  : "bg-muted"
              }`}
            >
              <Fingerprint className={`w-5 h-5 ${isEnabled ? "text-white" : "text-muted-foreground"}`} />
            </motion.div>
            <div>
              <CardTitle className="text-base">Biométrie</CardTitle>
              <CardDescription className="text-xs">
                Face ID / Empreinte digitale
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isEnabled 
              ? "Connexion sécurisée activée. Utilisez votre empreinte ou Face ID pour vous connecter rapidement."
              : "Activez pour vous connecter plus rapidement avec votre empreinte digitale ou Face ID."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BiometricSetup;
