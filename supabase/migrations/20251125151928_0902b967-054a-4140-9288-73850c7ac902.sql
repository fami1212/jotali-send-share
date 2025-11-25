-- Add proof validation fields to transfers table
ALTER TABLE public.transfers 
ADD COLUMN IF NOT EXISTS proof_verified BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS proof_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proof_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS proof_admin_comment TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.transfers.proof_verified IS 'NULL = not reviewed, TRUE = verified, FALSE = invalid';
COMMENT ON COLUMN public.transfers.proof_admin_comment IS 'Admin comments about the proof validation';