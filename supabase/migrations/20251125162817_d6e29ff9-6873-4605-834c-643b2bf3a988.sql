-- Permettre aux utilisateurs de mettre à jour la preuve de leurs propres transferts
CREATE POLICY "Users can update proof on their own transfers"
ON public.transfers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);