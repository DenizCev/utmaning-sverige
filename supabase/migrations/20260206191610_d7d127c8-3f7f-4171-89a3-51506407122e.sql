
-- Skins table for emoji/icon-based character customization
CREATE TABLE public.skins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'accessory',
  price INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skins" ON public.skins FOR SELECT USING (true);
CREATE POLICY "Admins can manage skins" ON public.skins FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update skins" ON public.skins FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete skins" ON public.skins FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- User owned skins
CREATE TABLE public.user_skins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skin_id UUID NOT NULL REFERENCES public.skins(id) ON DELETE CASCADE,
  equipped BOOLEAN NOT NULL DEFAULT false,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, skin_id)
);

ALTER TABLE public.user_skins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skins" ON public.user_skins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can purchase skins" ON public.user_skins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skins" ON public.user_skins FOR UPDATE USING (auth.uid() = user_id);

-- Add equipped_skin to profiles for quick access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_skin TEXT DEFAULT NULL;

-- Insert some default skins
INSERT INTO public.skins (name, emoji, category, price) VALUES
  ('Vikingahjälm', '⚔️', 'hatt', 10),
  ('Krona', '👑', 'hatt', 25),
  ('Solglasögon', '😎', 'glasögon', 5),
  ('Stjärnögon', '🤩', 'glasögon', 8),
  ('Eldflamma', '🔥', 'effekt', 15),
  ('Regnbåge', '🌈', 'effekt', 12),
  ('Diamantaura', '💠', 'effekt', 30),
  ('Trollstav', '🪄', 'accessory', 20),
  ('Svenska flaggan', '🇸🇪', 'accessory', 3),
  ('Raket', '🚀', 'effekt', 18);
