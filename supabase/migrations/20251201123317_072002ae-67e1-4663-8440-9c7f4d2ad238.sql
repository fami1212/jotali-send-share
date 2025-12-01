-- Créer la table pour la messagerie interne entre admin et clients
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  message TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages for their own transfers
CREATE POLICY "Users can view messages for their transfers"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.transfers 
    WHERE transfers.id = messages.transfer_id 
    AND transfers.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Policy: Users can send messages on their own transfers
CREATE POLICY "Users can send messages on their transfers"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transfers 
    WHERE transfers.id = messages.transfer_id 
    AND transfers.user_id = auth.uid()
  ) AND sender_id = auth.uid() AND is_admin = false
);

-- Policy: Admins can send messages
CREATE POLICY "Admins can send messages"
ON public.messages
FOR INSERT
WITH CHECK (is_admin(auth.uid()) AND is_admin = true);

-- Policy: Users can mark their messages as read
CREATE POLICY "Users can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.transfers 
    WHERE transfers.id = messages.transfer_id 
    AND transfers.user_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Create index for performance
CREATE INDEX idx_messages_transfer_id ON public.messages(transfer_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Modifier la table recipients pour simplifier les champs
-- Retirer bank_account et wave_number, ajouter transfer_number
ALTER TABLE public.recipients 
  DROP COLUMN IF EXISTS bank_account,
  DROP COLUMN IF EXISTS wave_number,
  ADD COLUMN IF NOT EXISTS transfer_number TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message attachments
CREATE POLICY "Users can view attachments for their transfers"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    is_admin(auth.uid())
  )
);

CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' AND
  is_admin(auth.uid())
);