import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useRealtimeNotifications(user?.id);

  useEffect(() => {
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      // Validation basique côté client
      if (!email || !email.includes('@')) {
        return { error: { message: 'Email invalide' } };
      }
      
      if (!password || password.length < 8) {
        return { error: { message: 'Le mot de passe doit contenir au moins 8 caractères' } };
      }

      if (!firstName || !lastName) {
        return { error: { message: 'Prénom et nom requis' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (error) {
        console.error('Erreur signUp:', error);
        
        // Messages d'erreur en français
        if (error.message.includes('already registered')) {
          return { error: { message: 'Cet email est déjà utilisé' } };
        }
        
        return { error: { message: error.message || 'Erreur lors de l\'inscription' } };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('Exception signUp:', err);
      return { error: { message: 'Erreur inattendue lors de l\'inscription' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        return { error: { message: 'Email et mot de passe requis' } };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('Erreur signIn:', error);
        
        // Messages d'erreur en français
        if (error.message.includes('Invalid login credentials')) {
          return { error: { message: 'Email ou mot de passe incorrect' } };
        }
        
        return { error: { message: error.message || 'Erreur lors de la connexion' } };
      }

      return { error: null };
    } catch (err: any) {
      console.error('Exception signIn:', err);
      return { error: { message: 'Erreur inattendue lors de la connexion' } };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Erreur signOut:', err);
    }
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
