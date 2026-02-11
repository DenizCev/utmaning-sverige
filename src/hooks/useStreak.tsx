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
      const now = new Date();
      setStreakCount(data.streak_count || 0);
      setLastClaimDate(data.last_claim_date);
      
      // Check if 24 hours have passed since last claim
      if (!data.last_claim_date) {
        setCanClaim(true);
      } else {
        const lastClaim = new Date(data.last_claim_date + 'T00:00:00');
        const hoursSinceClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        setCanClaim(hoursSinceClaim >= 24);
      }
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

  // Time until next claim (24h from last claim)
  const getTimeUntilReset = () => {
    if (!lastClaimDate) return 0;
    const lastClaim = new Date(lastClaimDate + 'T00:00:00');
    const nextClaim = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
    return Math.max(0, nextClaim.getTime() - Date.now());
  };

  return { streakCount, canClaim, lastClaimDate, loading, claimDaily, getTimeUntilReset, refetch: fetchStreak };
}
