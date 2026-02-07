
-- Step counter table: daily steps per user
CREATE TABLE public.step_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step_count INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.step_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can view steps (for leaderboard)
CREATE POLICY "Anyone can view steps"
ON public.step_entries FOR SELECT
USING (true);

-- Users can insert own steps
CREATE POLICY "Users can insert own steps"
ON public.step_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own steps
CREATE POLICY "Users can update own steps"
ON public.step_entries FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update any steps (for reset)
CREATE POLICY "Admins can update steps"
ON public.step_entries FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete steps (for reset)
CREATE POLICY "Admins can delete steps"
ON public.step_entries FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.step_entries;
