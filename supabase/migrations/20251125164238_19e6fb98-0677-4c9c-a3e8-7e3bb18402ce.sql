-- Table pour l'historique des commentaires sur les preuves
CREATE TABLE IF NOT EXISTS public.proof_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proof_comments ENABLE ROW LEVEL SECURITY;

-- Policies pour les commentaires
CREATE POLICY "Users can view comments on their transfers"
  ON public.proof_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transfers 
      WHERE transfers.id = proof_comments.transfer_id 
      AND transfers.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can add comments on their transfers"
  ON public.proof_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transfers 
      WHERE transfers.id = proof_comments.transfer_id 
      AND transfers.user_id = auth.uid()
    )
    AND user_id = auth.uid()
    AND is_admin = false
  );

CREATE POLICY "Admins can add comments"
  ON public.proof_comments
  FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    AND is_admin = true
  );

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_proof_comments_updated_at
  BEFORE UPDATE ON public.proof_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour créer une notification quand un admin commente
CREATE OR REPLACE FUNCTION public.notify_user_on_admin_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  transfer_user_id UUID;
  transfer_ref TEXT;
BEGIN
  IF NEW.is_admin = true THEN
    SELECT user_id, reference_number INTO transfer_user_id, transfer_ref
    FROM public.transfers
    WHERE id = NEW.transfer_id;
    
    INSERT INTO public.notifications (user_id, title, message, type, transfer_id)
    VALUES (
      transfer_user_id,
      'Nouveau commentaire admin',
      'L''administrateur a ajouté un commentaire sur votre preuve de transfert ' || transfer_ref,
      'info',
      NEW.transfer_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_admin_comment
  AFTER INSERT ON public.proof_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_admin_comment();

-- Trigger pour notifier les admins quand une preuve est uploadée
CREATE OR REPLACE FUNCTION public.notify_admins_on_proof_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  IF OLD.proof_image_url IS NULL AND NEW.proof_image_url IS NOT NULL THEN
    FOR admin_record IN 
      SELECT user_id FROM public.admin_users
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, transfer_id)
      VALUES (
        admin_record.user_id,
        'Nouvelle preuve uploadée',
        'Un utilisateur a uploadé une preuve pour le transfert ' || NEW.reference_number,
        'info',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admins_on_proof
  AFTER UPDATE ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_proof_upload();

-- Activer realtime pour les commentaires
ALTER PUBLICATION supabase_realtime ADD TABLE public.proof_comments;

-- Configurer REPLICA IDENTITY pour le realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.proof_comments REPLICA IDENTITY FULL;