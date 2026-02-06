import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAppSettings } from './useAppSettings';
import { toast } from 'sonner';

export function useStreak() {
  const { user } = useAuth();
  const { dailyClaimDiamonds, streakBonuses } = useAppSettings();
  const [streakCount, setStreakCount] = useState(0);
  const [lastClaimDate, setLastClaimDate] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('profiles') as any)
      .select('streak_count, last_claim_date')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const today = new Date().toISOString().slice(0, 10);
      setStreakCount(data.streak_count || 0);
      setLastClaimDate(data.last_claim_date);
      setCanClaim(data.last_claim_date !== today);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStreak(); }, [fetchStreak]);

  const claimDaily = async () => {
    if (!user || !canClaim) return false;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    let newStreak = 1;
    if (lastClaimDate === yesterday) {
      newStreak = streakCount + 1;
    }

    // Check for streak bonus
    let bonus = 0;
    const bonusKey = String(newStreak);
    if (streakBonuses[bonusKey]) {
      bonus = streakBonuses[bonusKey];
    }

    const totalDiamonds = dailyClaimDiamonds + bonus;

    // Get current diamonds
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('diamonds')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentDiamonds = profile?.diamonds || 0;

    const { error } = await (supabase.from('profiles') as any)
      .update({
        streak_count: newStreak,
        last_claim_date: today,
        diamonds: currentDiamonds + totalDiamonds,
      })
      .eq('user_id', user.id);

    if (error) { toast.error('Kunde inte claima bonus'); return false; }

    await (supabase.from('diamond_history') as any).insert({
      user_id: user.id,
      amount: totalDiamonds,
      reason: bonus > 0 ? `Daglig bonus + streak-bonus (${newStreak} dagar 🔥)` : 'Daglig bonus',
    });

    setStreakCount(newStreak);
    setLastClaimDate(today);
    setCanClaim(false);

    if (bonus > 0) {
      toast.success(`+${totalDiamonds} diamanter! 🔥 ${newStreak} dagars streak-bonus!`);
    } else {
      toast.success(`+${dailyClaimDiamonds} diamanter! Daglig bonus claimad 💎`);
    }
    return true;
  };

  // Time until next claim (midnight)
  const getTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  };

  return { streakCount, canClaim, lastClaimDate, loading, claimDaily, getTimeUntilReset, refetch: fetchStreak };
}
