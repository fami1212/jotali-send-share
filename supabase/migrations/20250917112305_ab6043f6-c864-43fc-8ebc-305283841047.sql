-- Update exchange rates to correct values
UPDATE public.exchange_rates 
SET rate = 60 
WHERE from_currency = 'MAD' AND to_currency = 'CFA';

UPDATE public.exchange_rates 
SET rate = 0.0166667 
WHERE from_currency = 'CFA' AND to_currency = 'MAD';

-- Insert correct exchange rates if they don't exist
INSERT INTO public.exchange_rates (from_currency, to_currency, rate)
VALUES 
  ('MAD', 'CFA', 60),
  ('CFA', 'MAD', 0.0166667)
ON CONFLICT (from_currency, to_currency) DO UPDATE 
SET rate = EXCLUDED.rate;

-- Add transfer type and proof of payment columns to transfers table
ALTER TABLE public.transfers 
ADD COLUMN IF NOT EXISTS transfer_type text NOT NULL DEFAULT 'transfer' CHECK (transfer_type IN ('send', 'transfer')),
ADD COLUMN IF NOT EXISTS proof_image_url text,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Update status enum to include more states
ALTER TABLE public.transfers 
ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.transfers 
DROP CONSTRAINT IF EXISTS transfers_status_check;

ALTER TABLE public.transfers 
ADD CONSTRAINT transfers_status_check 
CHECK (status IN ('pending', 'awaiting_admin', 'approved', 'completed', 'rejected', 'cancelled'));

ALTER TABLE public.transfers 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create admin_users table for admin management
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_users
CREATE POLICY "Only admins can view admin users" 
ON public.admin_users 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Only super admins can manage admin users" 
ON public.admin_users 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid() AND au.role = 'super_admin'
  )
);

-- Update transfers policies to allow admins to view and update all transfers
CREATE POLICY "Admins can view all transfers" 
ON public.transfers 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update transfer status" 
ON public.transfers 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid()
  )
);

-- Add trigger for admin_users updated_at
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for proof images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transfer-proofs', 
  'transfer-proofs', 
  false, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for transfer proofs
CREATE POLICY "Users can upload their transfer proofs" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'transfer-proofs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own proofs and admins can view all" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'transfer-proofs' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can update proof files" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'transfer-proofs' AND
  EXISTS (
    SELECT 1 FROM public.admin_users au 
    WHERE au.user_id = auth.uid()
  )
);