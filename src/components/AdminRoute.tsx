import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/hooks/use-toast';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute = ({ children }: AdminRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_admin', { 
          user_id_input: user.id 
        });

        if (error) throw error;

        setIsAdmin(data === true);
        
        if (data !== true) {
          toast({
            title: "Accès refusé",
            description: "Vous n'avez pas les privilèges d'administrateur",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        toast({
          title: "Erreur",
          description: "Impossible de vérifier les privilèges",
          variant: "destructive",
        });
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading, toast]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
