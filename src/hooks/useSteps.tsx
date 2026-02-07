import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isNativePlatform, getStepsForDate, requestHealthPermissions } from '@/utils/healthSteps';

export interface StepEntry {
  id: string;
  user_id: string;
  step_count: number;
  date: string;
  updated_at: string;
}

export function useSteps() {
  const { user } = useAuth();
  const [todaySteps, setTodaySteps] = useState<StepEntry | null>(null);
  const [history, setHistory] = useState<StepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isNative, setIsNative] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('step_entries') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    setTodaySteps(data || null);
  }, [user, today]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from('step_entries') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);
    setHistory(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchToday();
      fetchHistory();
    }
  }, [user, fetchToday, fetchHistory]);

  // Auto-sync from health on native when page loads
  useEffect(() => {
    if (user && isNative) {
      syncFromHealth();
    }
  }, [user, isNative]);

  const addSteps = async (count: number) => {
    if (!user) return false;
    if (todaySteps) {
      const { error } = await (supabase.from('step_entries') as any)
        .update({ step_count: todaySteps.step_count + count, updated_at: new Date().toISOString() })
        .eq('id', todaySteps.id);
      if (!error) { await fetchToday(); await fetchHistory(); return true; }
    } else {
      const { error } = await (supabase.from('step_entries') as any)
        .insert({ user_id: user.id, step_count: count, date: today });
      if (!error) { await fetchToday(); await fetchHistory(); return true; }
    }
    return false;
  };

  const setSteps = async (count: number) => {
    if (!user) return false;
    if (todaySteps) {
      const { error } = await (supabase.from('step_entries') as any)
        .update({ step_count: count, updated_at: new Date().toISOString() })
        .eq('id', todaySteps.id);
      if (!error) { await fetchToday(); await fetchHistory(); return true; }
    } else {
      const { error } = await (supabase.from('step_entries') as any)
        .insert({ user_id: user.id, step_count: count, date: today });
      if (!error) { await fetchToday(); await fetchHistory(); return true; }
    }
    return false;
  };

  const syncFromHealth = async (): Promise<boolean> => {
    if (!user || !isNative) return false;
    setSyncing(true);
    try {
      const permGranted = await requestHealthPermissions();
      if (!permGranted) {
        setSyncing(false);
        return false;
      }

      const result = await getStepsForDate(today);
      if (!result || result.steps <= 0) {
        setSyncing(false);
        return false;
      }

      // Use edge function for upsert
      const { error } = await supabase.functions.invoke('sync-steps', {
        body: { steps: result.steps, date: today },
      });

      if (!error) {
        await fetchToday();
        await fetchHistory();
        setSyncing(false);
        return true;
      }
    } catch (err) {
      console.error('Health sync failed:', err);
    }
    setSyncing(false);
    return false;
  };

  return {
    todaySteps,
    history,
    loading,
    syncing,
    isNative,
    addSteps,
    setSteps,
    syncFromHealth,
    refetch: () => { fetchToday(); fetchHistory(); },
  };
}
