
-- Allow users to delete their own old invitations (for re-requesting)
CREATE POLICY "Users can delete own invitations"
ON public.team_invitations FOR DELETE
USING (auth.uid() = invited_user_id);
