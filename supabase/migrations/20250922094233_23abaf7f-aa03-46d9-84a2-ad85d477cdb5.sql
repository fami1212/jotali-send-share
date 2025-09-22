-- Fix the transfer_type constraint to include withdrawal and exchange
ALTER TABLE transfers DROP CONSTRAINT IF EXISTS transfers_transfer_type_check;
ALTER TABLE transfers ADD CONSTRAINT transfers_transfer_type_check 
CHECK (transfer_type IN ('transfer', 'withdrawal', 'exchange'));

-- Fix profile duplicate issue by making the trigger handle existing profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;