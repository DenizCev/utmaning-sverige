
-- Allow any authenticated user to insert notifications (for cross-user notifications like team join requests)
-- SELECT policy still restricts visibility to own notifications only
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
