import { Capacitor } from '@capacitor/core';

export interface HealthStepsResult {
  steps: number;
  date: string;
  source: 'healthkit' | 'health_connect' | 'manual';
}

export type SyncError =
  | 'not_native'
  | 'health_unavailable'
  | 'permission_denied'
  | 'query_failed'
  | 'server_error'
  | 'unknown';

export interface SyncFailure {
  error: SyncError;
  message: string;
  details?: string;
}

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  } catch {}
  return 'web';
}

export async function isHealthAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const result = await Health.isAvailable();
    return result.available;
  } catch (err) {
    console.error('isHealthAvailable error:', err);
    return false;
  }
}

export async function checkHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  // iOS does not provide a reliable read-permission status.
  if (getPlatform() === 'ios') return false;

  try {
    const { Health } = await import('@capgo/capacitor-health');
    const result = await Health.checkAuthorization({
      read: ['steps'],
    });
    // The plugin returns status per type; treat any truthy value as granted.
    const statuses = (result as any)?.permissions ?? result;
    if (Array.isArray(statuses)) {
      return statuses.some((s: any) => s?.steps === true || s === 'granted');
    }
    if (statuses && typeof statuses === 'object') {
      return Boolean((statuses as Record<string, boolean>).steps);
    }
    return false;
  } catch (err) {
    console.error('checkHealthPermissions error:', err);
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Health } = await import('@capgo/capacitor-health');
    const platform = getPlatform();

    const available = await Health.isAvailable();
    if (!available.available) {
      console.warn('Health API not available on this device, reason:', (available as any).reason);
      return false;
    }

    await Health.requestAuthorization({
      read: ['steps'],
      write: [],
    });

    // iOS reports this optimistically for read permissions.
    const granted = platform === 'ios' ? true : await checkHealthPermissions();
    console.log('Health permission granted:', granted);
    return granted;
  } catch (err) {
    console.error('requestHealthPermissions error:', err);
    return false;
  }
}

export async function openHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const platform = getPlatform();
    if (platform === 'android') {
      const { Health } = await import('@capgo/capacitor-health');
      await Health.openHealthConnectSettings();
    }
    // On iOS there is no direct API to open Health settings;
    // the user must navigate there manually via Settings > Health.
  } catch (err) {
    console.error('openHealthSettings error:', err);
  }
}

export async function getStepsForDate(date: string): Promise<HealthStepsResult | null> {
  if (!isNativePlatform()) return null;
  try {
    const { Health } = await import('@capgo/capacitor-health');

    const startDate = new Date(`${date}T00:00:00`).toISOString();
    const endDate = new Date(`${date}T23:59:59`).toISOString();

    console.log('[getStepsForDate] querying', { startDate, endDate });

    const result = await Health.queryAggregated({
      startDate,
      endDate,
      dataType: 'steps',
      bucket: 'day',
      aggregation: 'sum',
    });

    console.log('[getStepsForDate] result:', JSON.stringify(result));

    // @capgo/capacitor-health returns { samples: [...] }
    const samples = (result as any)?.samples ?? (result as any)?.aggregatedData ?? [];
    const totalSteps = Array.isArray(samples)
      ? samples.reduce((sum: number, s: any) => sum + (s.value ?? 0), 0)
      : 0;

    const platform = getPlatform();

    return {
      steps: Math.round(totalSteps),
      date,
      source: platform === 'ios' ? 'healthkit' : 'health_connect',
    };
  } catch (err: any) {
    console.error('[getStepsForDate] error:', err);
    throw new Error(err?.message || 'Kunde inte hämta steg från hälsoappen');
  }
}
