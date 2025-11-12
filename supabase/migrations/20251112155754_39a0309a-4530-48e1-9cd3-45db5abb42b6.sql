-- Créer une table pour les notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  transfer_id UUID REFERENCES public.transfers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour créer une notification automatiquement lors d'un changement de statut de transfert
CREATE OR REPLACE FUNCTION public.create_transfer_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Générer le titre et le message selon le statut
  CASE NEW.status
    WHEN 'approved' THEN
      notification_title := CASE 
        WHEN NEW.transfer_type = 'send' THEN 'Envoi approuvé'
        ELSE 'Transfert approuvé'
      END;
      notification_message := 'Votre transfert ' || NEW.reference_number || ' a été approuvé par l''administrateur.';
      notification_type := 'success';
    WHEN 'completed' THEN
      notification_title := CASE 
        WHEN NEW.transfer_type = 'send' THEN 'Envoi terminé'
        ELSE 'Transfert terminé'
      END;
      notification_message := 'Votre transfert ' || NEW.reference_number || ' a été terminé avec succès.';
      notification_type := 'success';
    WHEN 'rejected' THEN
      notification_title := CASE 
        WHEN NEW.transfer_type = 'send' THEN 'Envoi rejeté'
        ELSE 'Transfert rejeté'
      END;
      notification_message := 'Votre transfert ' || NEW.reference_number || ' a été rejeté. Consultez les notes de l''administrateur.';
      notification_type := 'error';
    WHEN 'cancelled' THEN
      notification_title := CASE 
        WHEN NEW.transfer_type = 'send' THEN 'Envoi annulé'
        ELSE 'Transfert annulé'
      END;
      notification_message := 'Votre transfert ' || NEW.reference_number || ' a été annulé.';
      notification_type := 'warning';
    ELSE
      notification_title := 'Mise à jour de statut';
      notification_message := 'Le statut de votre transfert ' || NEW.reference_number || ' a été mis à jour.';
      notification_type := 'info';
  END CASE;

  -- Créer la notification seulement si le statut a changé
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, title, message, type, transfer_id)
    VALUES (NEW.user_id, notification_title, notification_message, notification_type, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger pour créer une notification lors d'un changement de statut
CREATE TRIGGER on_transfer_status_change
AFTER UPDATE ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.create_transfer_notification();

-- Activer realtime pour la table notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;