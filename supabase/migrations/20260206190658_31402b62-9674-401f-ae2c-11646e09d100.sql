
-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team creator can update" ON public.teams FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Team creator can delete" ON public.teams FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view team members" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team leaders can add members" ON public.team_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'leader')
  );
CREATE POLICY "Members can leave" ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, invited_user_id)
);
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own invitations" ON public.team_invitations FOR SELECT
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by OR
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'leader'));
CREATE POLICY "Team leaders can invite" ON public.team_invitations FOR INSERT
  WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'leader')
  );
CREATE POLICY "Invited users can update status" ON public.team_invitations FOR UPDATE
  USING (auth.uid() = invited_user_id);

-- Add team_id to competition_memberships for team entries
ALTER TABLE public.competition_memberships ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Add streak and all_time_points fields to profiles
ALTER TABLE public.profiles ADD COLUMN streak_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN last_claim_date DATE;
ALTER TABLE public.profiles ADD COLUMN all_time_points INTEGER NOT NULL DEFAULT 0;

-- App settings table for admin customization
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('daily_claim_diamonds', '3'::jsonb),
  ('streak_bonuses', '{"7": 5, "14": 8, "30": 15, "60": 25, "100": 50}'::jsonb),
  ('rank_thresholds', '{"Bronze": 0, "Silver": 500, "Guld": 1500, "Diamond": 3000, "Golden Star": 6000, "The Legend": 10000}'::jsonb),
  ('app_branding', '{"name": "Sweden Challenge Race", "logo_url": null, "background_url": null, "background_color": null, "hero_text": "Sveriges största utmaning!", "theme_color": null}'::jsonb);

-- Enable realtime for team_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invitations;
