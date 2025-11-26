-- ============================================
-- NETTOYAGE: Supprimer les triggers en conflit
-- ============================================

-- Supprimer le trigger en doublon qui cause les erreurs
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;

-- Supprimer l'ancienne fonction create_profile
DROP FUNCTION IF EXISTS public.create_profile();

-- Garder uniquement on_auth_user_created qui est plus robuste

-- ============================================
-- CORRECTION: S'assurer que le bon trigger existe
-- ============================================

-- Vérifier que le trigger on_auth_user_created existe
-- Si non, le créer (mais il devrait déjà exister)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW 
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================
-- AMÉLIORATION: Fonction handle_new_user robuste
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f_name text := '';
  l_name text := '';
BEGIN
  -- Récupérer first_name et last_name depuis raw_user_meta_data
  IF new.raw_user_meta_data ? 'first_name' THEN
    f_name := trim(substring(new.raw_user_meta_data->>'first_name', 1, 100));
  END IF;
  IF new.raw_user_meta_data ? 'last_name' THEN
    l_name := trim(substring(new.raw_user_meta_data->>'last_name', 1, 100));
  END IF;

  -- Insérer dans profiles avec ON CONFLICT pour éviter les doublons
  INSERT INTO public.profiles(user_id, email, first_name, last_name)
  VALUES (new.id, new.email, f_name, l_name)
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur sans bloquer l'inscription
    RAISE WARNING 'Erreur lors de la création du profil pour user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- ============================================
-- SÉCURITÉ: Ajouter une contrainte unique sur user_id
-- ============================================

-- S'assurer qu'il y a une contrainte unique sur user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_key' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;