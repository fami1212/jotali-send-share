-- Enable RLS on backup_admin_users table
ALTER TABLE public.backup_admin_users ENABLE ROW LEVEL SECURITY;

-- Add policy for backup_admin_users (only super admins can access)
CREATE POLICY "Super admins can access backup"
ON public.backup_admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));