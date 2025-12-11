import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, X } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { toast } from 'sonner';

interface BiometricPromptProps {
  userId: string | undefined;
}

export function BiometricPrompt({ userId }: BiometricPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { isSupported, isEnabled, register } = useBiometricAuth();

  useEffect(() => {
    if (!userId) return;
    
    const promptKey = `biometric_prompt_shown_${userId}`;
    const hasSeenPrompt = localStorage.getItem(promptKey);
    
    // Show prompt only if: supported, not already enabled, and user hasn't seen prompt
    if (isSupported && !isEnabled && !hasSeenPrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userId, isSupported, isEnabled]);

  const handleEnable = async () => {
    setIsLoading(true);
    try {
      const success = await register();
      if (success) {
        toast.success('Biométrie activée avec succès');
      }
    } finally {
      setIsLoading(false);
      markPromptSeen();
      setShowPrompt(false);
    }
  };

  const handleSkip = () => {
    markPromptSeen();
    setShowPrompt(false);
  };

  const markPromptSeen = () => {
    if (userId) {
      localStorage.setItem(`biometric_prompt_shown_${userId}`, 'true');
    }
  };

  if (!isSupported) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Fingerprint className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Sécurisez votre compte</DialogTitle>
          <DialogDescription className="text-center">
            Activez l'authentification biométrique (Face ID / Empreinte) pour une connexion plus rapide et sécurisée.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleEnable} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Activation...' : 'Activer maintenant'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full text-muted-foreground"
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
