-- Create admin account
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_sent_at,
  recovery_sent_at,
  email_change_sent_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'ibrahimalo407@gmail.com',
  crypt('molopomo', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Ibrahim", "last_name": "Admin"}',
  false,
  'authenticated',
  'authenticated'
);

-- Get the user ID for the admin user we just created
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'ibrahimalo407@gmail.com';
    
    -- Insert into admin_users table
    INSERT INTO public.admin_users (user_id, role, created_by)
    VALUES (admin_user_id, 'super_admin', admin_user_id);
    
    -- Insert into profiles table
    INSERT INTO public.profiles (user_id, first_name, last_name, is_verified)
    VALUES (admin_user_id, 'Ibrahim', 'Admin', true);
END $$;