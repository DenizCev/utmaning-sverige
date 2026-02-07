
-- Drop old insert policy and create a new one that also allows self-requests
DROP POLICY IF EXISTS "Team leaders can invite" ON public.team_invitations;

CREATE POLICY "Users can create invitations"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = invited_by
  AND (
    -- Team leaders can invite anyone
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'leader'
    )
    OR
    -- Users can request to join (inviting themselves)
    auth.uid() = invited_user_id
  )
);
