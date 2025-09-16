-- Fix security issues

-- Enable RLS on exchange_rates table
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to read exchange rates
CREATE POLICY "Everyone can view exchange rates" 
ON public.exchange_rates 
FOR SELECT 
USING (true);

-- Update functions with proper search_path
CREATE OR REPLACE FUNCTION generate_reference_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TR' || to_char(now(), 'YYYYMMDD') || lpad(floor(random() * 100000)::text, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;