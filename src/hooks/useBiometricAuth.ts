import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface BiometricAuthResult {
  isSupported: boolean;
  isEnabled: boolean;
  authenticate: () => Promise<boolean>;
  register: () => Promise<boolean>;
  disable: () => void;
}

const BIOMETRIC_CREDENTIAL_KEY = "jotali_biometric_credential";
const BIOMETRIC_ENABLED_KEY = "jotali_biometric_enabled";

export const useBiometricAuth = (): BiometricAuthResult => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
  });

  const isSupported = typeof window !== "undefined" && 
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential === "function";

  const generateChallenge = (): ArrayBuffer => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer as ArrayBuffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
  };

  const register = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Non supporté",
        description: "L'authentification biométrique n'est pas disponible sur cet appareil",
        variant: "destructive"
      });
      return false;
    }

    try {
      const challenge = generateChallenge();
      const userIdArray = new Uint8Array(16);
      crypto.getRandomValues(userIdArray);
      const userId = userIdArray.buffer as ArrayBuffer;

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Jotali Services",
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: "user@jotali.app",
          displayName: "Utilisateur Jotali"
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred"
        },
        timeout: 60000,
        attestation: "none"
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (credential) {
        const credentialData = {
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          type: credential.type
        };
        
        localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, JSON.stringify(credentialData));
        localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
        setIsEnabled(true);

        toast({
          title: "Biométrie activée",
          description: "Vous pouvez maintenant vous connecter avec votre empreinte ou Face ID"
        });

        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Biometric registration error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'activer l'authentification biométrique",
        variant: "destructive"
      });
      return false;
    }
  }, [isSupported, toast]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !isEnabled) {
      return false;
    }

    try {
      const storedCredential = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
      if (!storedCredential) {
        return false;
      }

      const credentialData = JSON.parse(storedCredential);
      const challenge = generateChallenge();

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [{
          id: base64ToArrayBuffer(credentialData.rawId),
          type: "public-key",
          transports: ["internal"]
        }],
        userVerification: "required",
        timeout: 60000
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      if (assertion) {
        toast({
          title: "Authentifié",
          description: "Connexion biométrique réussie"
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Biometric authentication error:", error);
      toast({
        title: "Échec",
        description: "L'authentification biométrique a échoué",
        variant: "destructive"
      });
      return false;
    }
  }, [isSupported, isEnabled, toast]);

  const disable = useCallback(() => {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    setIsEnabled(false);
    toast({
      title: "Biométrie désactivée",
      description: "L'authentification biométrique a été désactivée"
    });
  }, [toast]);

  return {
    isSupported,
    isEnabled,
    authenticate,
    register,
    disable
  };
};
