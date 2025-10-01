-- Ajouter l'utilisateur admin xalimacompany@gmail.com
-- Note: L'utilisateur doit d'abord s'inscrire avec cet email et le mot de passe: molopomo
-- Ensuite, cette migration ajoutera l'utilisateur à la table admin_users

-- Cette fonction permet d'ajouter un admin par email
CREATE OR REPLACE FUNCTION add_admin_by_email(user_email text, admin_role text DEFAULT 'admin')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Trouver l'ID de l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur avec email % non trouvé', user_email;
  END IF;
  
  -- Ajouter à admin_users
  INSERT INTO public.admin_users (user_id, role, created_by)
  VALUES (target_user_id, admin_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;
  
  RAISE NOTICE 'Utilisateur % ajouté comme % avec succès', user_email, admin_role;
END;
$$;

-- Appeler la fonction pour ajouter l'admin
-- Note: Cette commande échouera si l'utilisateur n'existe pas encore
-- Dans ce cas, l'utilisateur doit d'abord créer son compte sur /auth
DO $$
BEGIN
  PERFORM add_admin_by_email('xalimacompany@gmail.com', 'super_admin');
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'L''utilisateur xalimacompany@gmail.com doit d''abord créer son compte sur /auth avec le mot de passe: molopomo';
END;
$$;