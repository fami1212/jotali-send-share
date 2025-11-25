import { toast } from "@/hooks/use-toast";

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: any, context?: string): void => {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);

  // Vérifier si c'est une erreur Supabase
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        // Aucune donnée trouvée - ne pas afficher d'erreur
        return;
      case '42501':
        toast({
          title: "Accès refusé",
          description: "Vous n'avez pas la permission d'effectuer cette action",
          variant: "destructive"
        });
        return;
      case '23505':
        toast({
          title: "Doublon détecté",
          description: "Cette entrée existe déjà",
          variant: "destructive"
        });
        return;
      case 'PGRST301':
        // Erreur JWT - rediriger vers la connexion
        window.location.href = '/auth';
        return;
      default:
        break;
    }
  }

  // Gérer les erreurs réseau
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    toast({
      title: "Erreur de connexion",
      description: "Veuillez vérifier votre connexion internet",
      variant: "destructive"
    });
    return;
  }

  // Gérer les erreurs 404
  if (error?.status === 404 || error?.message?.includes('404')) {
    if (process.env.NODE_ENV === 'production') {
      // En production, ne pas afficher l'erreur 404 en détail
      console.warn('Resource not found');
      return;
    }
    toast({
      title: "Ressource introuvable",
      description: "La ressource demandée n'existe pas",
      variant: "destructive"
    });
    return;
  }

  // Erreur générique
  toast({
    title: "Une erreur s'est produite",
    description: error?.message || "Veuillez réessayer plus tard",
    variant: "destructive"
  });
};

// Wrapper pour les requêtes Supabase
export const withErrorHandling = async <T>(
  promise: Promise<T>,
  context?: string
): Promise<T | null> => {
  try {
    const result = await promise;
    return result;
  } catch (error) {
    handleApiError(error, context);
    return null;
  }
};
