
-- Add unique constraint on app_settings.key for upsert to work
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);

-- Allow admins to insert diamond_history for any user (needed for admin diamond editing)
CREATE POLICY "Admins can insert diamond history"
  ON public.diamond_history
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update any profile (needed for admin diamond editing)
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
