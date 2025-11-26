-- ============================================
-- CORRECTION: Sécuriser les fonctions avec search_path
-- ============================================

-- Corriger la fonction create_profile
CREATE OR REPLACE FUNCTION public.create_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.profiles(user_id, first_name, last_name)
  values (
    new.id,
    new.user_metadata->>'first_name',
    new.user_metadata->>'last_name'
  );
  return new;
end;
$function$;

-- Corriger la fonction update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;