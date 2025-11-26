-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Créer la fonction pour gérer les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insérer dans profiles avec gestion des erreurs
  INSERT INTO public.profiles (
    user_id,
    first_name,
    last_name,
    email,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer la création de l'utilisateur
    RAISE WARNING 'Erreur création profil pour user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();