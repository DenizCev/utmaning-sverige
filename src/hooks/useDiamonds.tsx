import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useDiamonds() {
  const { user } = useAuth();
  const [diamonds, setDiamonds] = useState(0);
  const [dailyAds, setDailyAds] = useState(0);
  const [dailyShares, setDailyShares] = useState(0);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('profiles') as any)
      .select('diamonds, daily_ad_views, last_ad_date, daily_share_views, last_share_date, rules_accepted')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      setDiamonds(data.diamonds || 0);
      setDailyAds(data.last_ad_date === today ? (data.daily_ad_views || 0) : 0);
      setDailyShares(data.last_share_date === today ? (data.daily_share_views || 0) : 0);
      setRulesAccepted(data.rules_accepted || false);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const watchAd = async () => {
    if (!user) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (dailyAds >= 10) {
      toast.error('Du har nått maxgränsen (10 annonser/dag)');
      return false;
    }
    // Simulate ad watching
    const newAdCount = dailyAds + 1;
    const { error } = await (supabase.from('profiles') as any)
      .update({
        diamonds: diamonds + 1,
        daily_ad_views: newAdCount,
        last_ad_date: today,
      })
      .eq('user_id', user.id);
    if (error) { toast.error('Kunde inte spara'); return false; }

    await (supabase.from('diamond_history') as any).insert({
      user_id: user.id, amount: 1, reason: 'Tittade på annons',
    });

    setDiamonds(d => d + 1);
    setDailyAds(newAdCount);
    toast.success('+1 diamant! 💎');
    return true;
  };

  const shareDiamond = async () => {
    if (!user) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (dailyShares >= 5) {
      toast.error('Du har nått maxgränsen (5 delningar/dag)');
      return false;
    }
    const newShareCount = dailyShares + 1;
    const { error } = await (supabase.from('profiles') as any)
      .update({
        diamonds: diamonds + 1,
        daily_share_views: newShareCount,
        last_share_date: today,
      })
      .eq('user_id', user.id);
    if (error) { toast.error('Kunde inte spara'); return false; }

    await (supabase.from('diamond_history') as any).insert({
      user_id: user.id, amount: 1, reason: 'Delade tävlingen',
    });

    setDiamonds(d => d + 1);
    setDailyShares(newShareCount);
    toast.success('+1 diamant! 💎');
    return true;
  };

  const spendDiamonds = async (amount: number) => {
    if (!user) return false;
    if (diamonds < amount) return false;
    const { error } = await (supabase.from('profiles') as any)
      .update({ diamonds: diamonds - amount })
      .eq('user_id', user.id);
    if (error) return false;

    await (supabase.from('diamond_history') as any).insert({
      user_id: user.id, amount: -amount, reason: 'Anmälan till tävling',
    });

    setDiamonds(d => d - amount);
    return true;
  };

  return { diamonds, dailyAds, dailyShares, rulesAccepted, loading, watchAd, shareDiamond, spendDiamonds, refetch: fetchProfile };
}
