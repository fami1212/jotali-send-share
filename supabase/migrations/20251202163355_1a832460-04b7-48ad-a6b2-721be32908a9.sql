-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
USING (sender_id = auth.uid());

-- Allow admins to delete any message
CREATE POLICY "Admins can delete messages"
ON public.messages
FOR DELETE
USING (is_admin(auth.uid()));