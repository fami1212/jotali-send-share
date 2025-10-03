-- Ajouter la colonne email à la table profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Mettre à jour la fonction handle_new_user pour inclure l'email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;

-- Mettre à jour les profils existants avec les emails
UPDATE public.profiles p
SET email = (SELECT email FROM auth.users u WHERE u.id = p.user_id)
WHERE email IS NULL;