-- Fix transfer_type constraint to allow withdrawal and exchange
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_transfer_type_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_transfer_type_check 
CHECK (transfer_type IN ('transfer', 'withdrawal', 'exchange'));

-- Ensure admin_users policies are properly set
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create secure policies using security definer functions
CREATE POLICY "Admins can view admin users" ON admin_users
FOR SELECT USING (is_admin());

CREATE POLICY "Super admins can manage admin users" ON admin_users
FOR ALL USING (is_super_admin());