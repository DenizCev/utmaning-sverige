import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppBranding {
  name: string;
  logo_url: string | null;
  background_url: string | null;
  background_color: string | null;
  hero_text: string;
  theme_color: string | null;
}

export interface RankThresholds {
  [key: string]: number;
}

export interface StreakBonuses {
  [key: string]: number;
}

export function useAppSettings() {
  const [branding, setBranding] = useState<AppBranding>({
    name: 'Kampen',
    logo_url: null,
    background_url: null,
    background_color: null,
    hero_text: 'Sveriges största utmaning!',
    theme_color: null,
  });
  const [dailyClaimDiamonds, setDailyClaimDiamonds] = useState(3);
  const [rankThresholds, setRankThresholds] = useState<RankThresholds>({
    Bronze: 0, Silver: 500, Guld: 1500, Diamond: 3000, 'Golden Star': 6000, 'The Legend': 10000,
  });
  const [streakBonuses, setStreakBonuses] = useState<StreakBonuses>({ '7': 5, '14': 8, '30': 15, '60': 25, '100': 50 });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await (supabase.from('app_settings') as any).select('key, value');
    if (data) {
      for (const row of data) {
        switch (row.key) {
          case 'app_branding': setBranding(row.value); break;
          case 'daily_claim_diamonds': setDailyClaimDiamonds(typeof row.value === 'number' ? row.value : Number(row.value)); break;
          case 'rank_thresholds': setRankThresholds(row.value); break;
          case 'streak_bonuses': setStreakBonuses(row.value); break;
        }
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = async (key: string, value: any) => {
    const { error } = await (supabase.from('app_settings') as any)
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (!error) await fetchSettings();
    return !error;
  };

  const getRank = (points: number): { name: string; emoji: string } => {
    const ranks = [
      { name: 'The Legend', emoji: '🌟', min: rankThresholds['The Legend'] || 10000 },
      { name: 'Golden Star', emoji: '⭐', min: rankThresholds['Golden Star'] || 6000 },
      { name: 'Diamond', emoji: '💎', min: rankThresholds['Diamond'] || 3000 },
      { name: 'Guld', emoji: '🥇', min: rankThresholds['Guld'] || 1500 },
      { name: 'Silver', emoji: '🥈', min: rankThresholds['Silver'] || 500 },
      { name: 'Bronze', emoji: '🥉', min: rankThresholds['Bronze'] || 0 },
    ];
    for (const r of ranks) {
      if (points >= r.min) return { name: r.name, emoji: r.emoji };
    }
    return { name: 'Bronze', emoji: '🥉' };
  };

  return { branding, dailyClaimDiamonds, rankThresholds, streakBonuses, loading, updateSetting, getRank, refetch: fetchSettings };
}
