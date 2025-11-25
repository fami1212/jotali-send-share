import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: any }>;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Validation schemas
const emailSchema = z.string().email('Email invalide').max(255, 'Email trop long');
const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(72, 'Le mot de passe est trop long')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre');
const nameSchema = z.string()
  .trim()
  .min(1, 'Ce champ est requis')
  .max(100, 'Le nom est trop long')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom contient des caractères invalides');

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
    // Validate inputs
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      nameSchema.parse(firstName);
      nameSchema.parse(lastName);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return { error: { message: validationError.issues[0].message } };
      }
      return { error: { message: 'Données invalides' } };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Validate inputs
    try {
      emailSchema.parse(email);
      if (!password || password.length === 0) {
        return { error: { message: 'Le mot de passe est requis' } };
      }
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return { error: { message: validationError.issues[0].message } };
      }
      return { error: { message: 'Email invalide' } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    
    return { error };
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