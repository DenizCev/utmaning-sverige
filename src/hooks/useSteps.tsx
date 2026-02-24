import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  isNativePlatform,
  isHealthAvailable,
  checkHealthPermissions,
  requestHealthPermissions,
  getPlatform,
  getStepsForDate,
  openHealthSettings,
} from '@/utils/healthSteps';

export interface StepEntry {
  id: string;
  user_id: string;
  step_count: number;
  date: string;
  updated_at: string;
}

export type HealthPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export function useSteps() {
  const { user } = useAuth();
  const [todaySteps, setTodaySteps] = useState<StepEntry | null>(null);
  const [history, setHistory] = useState<StepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<HealthPermissionStatus>('unknown');

  const today = new Date().toISOString().split('T')[0];

  // Detect native and check permission status on mount
  useEffect(() => {
    const native = isNativePlatform();
    setIsNative(native);

    if (native) {
      checkPermissionStatus();
    } else {
      setPermissionStatus('unavailable');
    }
  }, []);

  const checkPermissionStatus = async () => {
    const available = await isHealthAvailable();
    if (!available) {
      setPermissionStatus('unavailable');
      return;
    }
    const granted = await checkHealthPermissions();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  const requestPermission = async (): Promise<boolean> => {
    const granted = await requestHealthPermissions();
    setPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  };

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

  // Auto-sync when permission is granted
  useEffect(() => {
    if (user && isNative && permissionStatus === 'granted') {
      syncFromHealth();
    }
  }, [user, isNative, permissionStatus]);

  const syncFromHealth = async (): Promise<boolean> => {
    if (!user || !isNative) return false;
    setSyncing(true);
    try {
      if (permissionStatus === 'unavailable') {
        return false;
      }

      const platform = getPlatform();

      // iOS permission status checks are unreliable, so always trigger request flow before sync.
      if (platform === 'ios') {
        const granted = await requestPermission();
        if (!granted) {
          return false;
        }
      } else if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return false;
        }
      }

      const result = await getStepsForDate(today);
      if (!result) {
        return false;
      }

      // Still a success if we queried but got 0 steps
      if (result.steps <= 0) {
        return true;
      }

      const { error } = await supabase.functions.invoke('sync-steps', {
        body: { steps: result.steps, date: today },
      });

      if (error) {
        return false;
      }

      await Promise.all([fetchToday(), fetchHistory()]);
      return true;
    } catch (err) {
      console.error('Health sync failed:', err);
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return {
    todaySteps,
    history,
    loading,
    syncing,
    isNative,
    permissionStatus,
    requestPermission,
    openHealthSettings,
    syncFromHealth,
    checkPermissionStatus,
    refetch: () => { fetchToday(); fetchHistory(); },
  };
}
