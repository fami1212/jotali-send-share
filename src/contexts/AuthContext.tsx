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

// Validation sécurisée
const emailSchema = z.string().email('Format email invalide').trim().toLowerCase().max(255);
const passwordSchema = z.string()
  .min(8, 'Minimum 8 caractères')
  .max(72)
  .regex(/[A-Z]/, 'Une majuscule requise')
  .regex(/[a-z]/, 'Une minuscule requise')
  .regex(/[0-9]/, 'Un chiffre requis');
const nameSchema = z.string().trim().min(1).max(100).regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides');

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useRealtimeNotifications(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const validatedEmail = emailSchema.parse(email);
      passwordSchema.parse(password);
      const validatedFirstName = nameSchema.parse(firstName);
      const validatedLastName = nameSchema.parse(lastName);

      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: validatedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: validatedFirstName,
            last_name: validatedLastName,
          },
        },
      });


      if (error) return { error };

      return { data, error: null };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return { error: { message: err.issues[0].message } };
      }
      return { error: { message: 'Erreur de validation des données' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const validatedEmail = emailSchema.parse(email);

      if (!password) return { error: { message: 'Mot de passe requis' } };

      const { error } = await supabase.auth.signInWithPassword({ email: validatedEmail, password });
      return { error };
    } catch (err: any) {
      if (err instanceof z.ZodError) return { error: { message: err.issues[0].message } };
      return { error: { message: 'Email invalide' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
