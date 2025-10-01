-- Drop existing problematic policies on admin_users
DROP POLICY IF EXISTS "Enable all access for super admins" ON public.admin_users;
DROP POLICY IF EXISTS "Enable read access for admins" ON public.admin_users;

-- Recreate is_admin and is_super_admin functions with proper security definer
CREATE OR REPLACE FUNCTION public.is_admin(user_id_input uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = COALESCE(user_id_input, auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(user_id_input uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = COALESCE(user_id_input, auth.uid()) 
    AND role = 'super_admin'
  );
$$;

-- Create new simplified policies using the security definer functions
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin_users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Update transfers policies to use the security definer functions
DROP POLICY IF EXISTS "Admins can view all transfers" ON public.transfers;
DROP POLICY IF EXISTS "Admins can update transfer status" ON public.transfers;

CREATE POLICY "Admins can view all transfers"
ON public.transfers
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Admins can update transfer status"
ON public.transfers
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));