
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS entry_diamonds integer NOT NULL DEFAULT 15;
