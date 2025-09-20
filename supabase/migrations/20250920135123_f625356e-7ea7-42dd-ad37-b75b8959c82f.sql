-- Fix infinite recursion in admin_users policies
-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Only admins can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON public.admin_users;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id_input UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = COALESCE(user_id_input, auth.uid())
  );
$$;

-- Create a security definer function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id_input UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = COALESCE(user_id_input, auth.uid()) 
    AND role = 'super_admin'
  );
$$;

-- Create new safe policies using the functions
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Super admins can manage admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin());