-- First, update existing 'send' transfer types to 'transfer'
UPDATE transfers SET transfer_type = 'transfer' WHERE transfer_type = 'send';

-- Drop existing constraint if it exists
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_transfer_type_check;

-- Add new constraint allowing transfer, withdrawal, and exchange
ALTER TABLE transfers ADD CONSTRAINT transfers_transfer_type_check 
CHECK (transfer_type IN ('transfer', 'withdrawal', 'exchange'));

-- Ensure admin_users policies are properly set (fix admin login issue)
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;

-- Create secure policies using security definer functions
CREATE POLICY "Admins can view admin users" ON admin_users
FOR SELECT USING (is_admin());

CREATE POLICY "Super admins can manage admin users" ON admin_users
FOR ALL USING (is_super_admin());