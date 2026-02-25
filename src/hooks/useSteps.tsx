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
  type SyncError,
} from '@/utils/healthSteps';

export interface StepEntry {
  id: string;
  user_id: string;
  step_count: number;
  date: string;
  updated_at: string;
}

export type HealthPermissionStatus = 'unknown' | 'granted' | 'denied' | 'unavailable';

export interface DebugInfo {
  platform: string;
  isNative: boolean;
  permissionStatus: HealthPermissionStatus;
  healthAvailable: boolean | null;
  lastSyncError: string | null;
  lastSyncDate: string | null;
}

export function useSteps() {
  const { user } = useAuth();
  const [todaySteps, setTodaySteps] = useState<StepEntry | null>(null);
  const [history, setHistory] = useState<StepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<HealthPermissionStatus>('unknown');
  const [lastSyncError, setLastSyncError] = useState<SyncError | null>(null);
  const [lastSyncErrorMessage, setLastSyncErrorMessage] = useState<string | null>(null);
  const [healthAvailable, setHealthAvailable] = useState<boolean | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const native = isNativePlatform();
    setIsNative(native);

    if (native) {
      checkPermissionStatus();
    } else {
      setPermissionStatus('unavailable');
      setHealthAvailable(false);
    }
  }, []);

  const checkPermissionStatus = async () => {
    const platform = getPlatform();
    const available = await isHealthAvailable();
    setHealthAvailable(available);
    console.log('[useSteps] isHealthAvailable:', available, 'platform:', platform);

    if (!available && platform === 'ios') {
      console.log('[useSteps] iOS reported unavailable, treating as denied so user can still try');
      setPermissionStatus('denied');
      return;
    }

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
    if (!granted) {
      setLastSyncError('permission_denied');
      setLastSyncErrorMessage('Behörighet nekades av användaren.');
    }
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

  useEffect(() => {
    if (user && isNative && permissionStatus === 'granted') {
      syncFromHealth();
    }
  }, [user, isNative, permissionStatus]);

  const syncFromHealth = async (): Promise<boolean> => {
    if (!user) {
      setLastSyncError('unknown');
      setLastSyncErrorMessage('Du måste vara inloggad.');
      return false;
    }
    if (!isNative) {
      setLastSyncError('not_native');
      setLastSyncErrorMessage('Stegsynk fungerar bara i native-appen.');
      return false;
    }

    setSyncing(true);
    setLastSyncError(null);
    setLastSyncErrorMessage(null);

    try {
      const platform = getPlatform();

      if (platform === 'ios') {
        const granted = await requestPermission();
        if (!granted) {
          setLastSyncError('permission_denied');
          setLastSyncErrorMessage('Behörighet nekad. Gå till Inställningar > Hälsa > Kampen.');
          return false;
        }
      } else if (permissionStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLastSyncError('permission_denied');
          setLastSyncErrorMessage('Behörighet nekad. Öppna Health Connect-inställningar.');
          return false;
        }
      }

      const result = await getStepsForDate(today);
      if (!result) {
        setLastSyncError('query_failed');
        setLastSyncErrorMessage(`Kunde inte hämta stegdata för ${today}. Kontrollera att hälsoappen har stegdata.`);
        return false;
      }

      if (result.steps <= 0) {
        // Success – just no steps recorded yet
        setLastSyncErrorMessage(null);
        return true;
      }

      const { error } = await supabase.functions.invoke('sync-steps', {
        body: { steps: result.steps, date: today },
      });

      if (error) {
        setLastSyncError('server_error');
        setLastSyncErrorMessage(`Serverfel vid sparning: ${error.message || 'okänt fel'}`);
        return false;
      }

      await Promise.all([fetchToday(), fetchHistory()]);
      return true;
    } catch (err: any) {
      console.error('Health sync failed:', err);
      setLastSyncError('unknown');
      setLastSyncErrorMessage(err?.message || 'Okänt fel vid synkronisering.');
      return false;
    } finally {
      setSyncing(false);
    }
  };

  const debugInfo: DebugInfo = {
    platform: getPlatform(),
    isNative,
    permissionStatus,
    healthAvailable,
    lastSyncError: lastSyncErrorMessage,
    lastSyncDate: today,
  };

  return {
    todaySteps,
    history,
    loading,
    syncing,
    isNative,
    permissionStatus,
    lastSyncError,
    lastSyncErrorMessage,
    requestPermission,
    openHealthSettings,
    syncFromHealth,
    checkPermissionStatus,
    debugInfo,
    refetch: () => { fetchToday(); fetchHistory(); },
  };
}
