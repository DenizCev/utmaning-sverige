
-- Allow admins to delete submissions (for competition cleanup)
CREATE POLICY "Admins can delete submissions"
ON public.submissions FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete competition memberships (for competition cleanup)
CREATE POLICY "Admins can delete memberships"
ON public.competition_memberships FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
