-- Ajouter une policy pour permettre aux admins de voir tous les profils
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_admin(auth.uid()));

-- Ajouter une policy pour permettre aux admins de voir tous les bénéficiaires
CREATE POLICY "Admins can view all recipients"
ON public.recipients
FOR SELECT
USING (is_admin(auth.uid()));