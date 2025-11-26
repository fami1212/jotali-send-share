-- ============================================
-- SÉCURITÉ: Nettoyer TOUTES les politiques RLS sur profiles
-- ============================================

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert profile for new user" ON public.profiles;
DROP POLICY IF EXISTS "Select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;

-- Recréer des politiques RLS propres et sécurisées
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique spéciale pour l'insertion lors de la création du compte
CREATE POLICY "Users can create own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SÉCURITÉ: Ajouter des contraintes de validation
-- ============================================

-- Ajouter une contrainte pour valider le format email (en supprimant d'abord si existe)
DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_email_format;
  ALTER TABLE public.profiles
    ADD CONSTRAINT valid_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
END $$;

-- Ajouter des contraintes de longueur pour éviter les abus
DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS first_name_length;
  ALTER TABLE public.profiles
    ADD CONSTRAINT first_name_length CHECK (first_name IS NULL OR length(first_name) <= 100);
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS last_name_length;
  ALTER TABLE public.profiles
    ADD CONSTRAINT last_name_length CHECK (last_name IS NULL OR length(last_name) <= 100);
END $$;

DO $$ 
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS phone_length;
  ALTER TABLE public.profiles
    ADD CONSTRAINT phone_length CHECK (phone IS NULL OR length(phone) <= 20);
END $$;

-- ============================================
-- SÉCURITÉ: Améliorer la fonction handle_new_user
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
  -- Récupérer et valider first_name et last_name depuis raw_user_meta_data
  IF new.raw_user_meta_data ? 'first_name' THEN
    f_name := trim(substring(new.raw_user_meta_data->>'first_name', 1, 100));
  END IF;
  IF new.raw_user_meta_data ? 'last_name' THEN
    l_name := trim(substring(new.raw_user_meta_data->>'last_name', 1, 100));
  END IF;

  -- Insérer dans profiles avec validation
  INSERT INTO public.profiles(user_id, email, first_name, last_name)
  VALUES (new.id, new.email, f_name, l_name);

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Logger l'erreur mais ne pas bloquer l'inscription
    RAISE WARNING 'Erreur lors de la création du profil: %', SQLERRM;
    RETURN new;
END;
$$;