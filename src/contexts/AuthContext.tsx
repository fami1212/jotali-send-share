import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: any; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Schémas de validation sécurisés
const emailSchema = z.string()
  .email('Format email invalide')
  .trim()
  .toLowerCase()
  .max(255, 'Email trop long');

const passwordSchema = z.string()
  .min(8, 'Minimum 8 caractères requis')
  .max(72, 'Maximum 72 caractères')
  .regex(/[A-Z]/, 'Une majuscule requise')
  .regex(/[a-z]/, 'Une minuscule requise')
  .regex(/[0-9]/, 'Un chiffre requis');

const nameSchema = z.string()
  .trim()
  .min(1, 'Champ requis')
  .max(100, 'Maximum 100 caractères')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides détectés');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Activer les notifications en temps réel
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Validation stricte des entrées
      const validatedEmail = emailSchema.parse(email);
      passwordSchema.parse(password);
      const validatedFirstName = nameSchema.parse(firstName);
      const validatedLastName = nameSchema.parse(lastName);

      // URL de redirection sécurisée
      const redirectUrl = `${window.location.origin}/`;
      
      // Inscription avec métadonnées utilisateur
      const { data, error } = await supabase.auth.signUp({
        email: validatedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: validatedFirstName,
            last_name: validatedLastName,
          }
        }
      });

      if (error) {
        console.error('Erreur d\'inscription:', error);
        return { error };
      }

      return { data, error: null };

    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return { 
          error: { 
            message: validationError.issues[0].message 
          } 
        };
      }
      return { error: { message: 'Erreur de validation des données' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Validation de l'email
      const validatedEmail = emailSchema.parse(email);
      
      // Vérification du mot de passe
      if (!password || password.length === 0) {
        return { error: { message: 'Mot de passe requis' } };
      }

      // Connexion
      const { error } = await supabase.auth.signInWithPassword({
        email: validatedEmail,
        password,
      });

      if (error) {
        console.error('Erreur de connexion:', error);
      }
      
      return { error };

    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return { 
          error: { 
            message: validationError.issues[0].message 
          } 
        };
      }
      return { error: { message: 'Email invalide' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}