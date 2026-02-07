
-- Fix 1: Replace unique constraint with partial unique index (only block duplicate pending)
ALTER TABLE public.team_invitations DROP CONSTRAINT IF EXISTS team_invitations_team_id_invited_user_id_key;
CREATE UNIQUE INDEX team_invitations_pending_unique ON public.team_invitations (team_id, invited_user_id) WHERE status = 'pending';

-- Fix 2: Fix buggy SELECT policy (tm.team_id = tm.team_id should be tm.team_id = team_invitations.team_id)
DROP POLICY IF EXISTS "Users can see own invitations" ON public.team_invitations;
CREATE POLICY "Users can see own invitations"
ON public.team_invitations FOR SELECT
USING (
  auth.uid() = invited_user_id
  OR auth.uid() = invited_by
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
  )
);

-- Fix 3: Fix INSERT policy for join requests to also allow update of invited_user_id status by leaders
DROP POLICY IF EXISTS "Invited users can update status" ON public.team_invitations;
CREATE POLICY "Users or leaders can update invitation status"
ON public.team_invitations FOR UPDATE
USING (
  auth.uid() = invited_user_id
  OR EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'leader'
  )
);
