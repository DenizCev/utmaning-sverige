
-- Add diamond & rules fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diamonds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ad_views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ad_date date,
  ADD COLUMN IF NOT EXISTS daily_share_views integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_share_date date,
  ADD COLUMN IF NOT EXISTS rules_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rules_accepted_at timestamp with time zone;

-- Diamond history table
CREATE TABLE public.diamond_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.diamond_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diamond history"
ON public.diamond_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diamond history"
ON public.diamond_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add prizes to competitions
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS prizes jsonb DEFAULT '{}';
