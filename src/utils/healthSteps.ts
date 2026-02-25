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
    const { Health } = await import('capacitor-health');
    const result = await Health.isHealthAvailable();
    return result.available;
  } catch (err) {
    console.error('isHealthAvailable error:', err);
    return false;
  }
}

function hasGrantedPermission(response: unknown, key: string): boolean {
  const permissions = (response as { permissions?: unknown })?.permissions;

  if (Array.isArray(permissions)) {
    return permissions.some((entry) => (entry as Record<string, boolean> | undefined)?.[key] === true);
  }

  if (permissions && typeof permissions === 'object') {
    return Boolean((permissions as Record<string, boolean>)[key]);
  }

  return false;
}

export async function checkHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  // iOS does not provide a reliable read-permission status.
  if (getPlatform() === 'ios') return false;

  try {
    const { Health } = await import('capacitor-health');
    const result = await Health.checkHealthPermissions({
      permissions: ['READ_STEPS'],
    });
    return hasGrantedPermission(result, 'READ_STEPS');
  } catch (err) {
    console.error('checkHealthPermissions error:', err);
    return false;
  }
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Health } = await import('capacitor-health');
    const platform = getPlatform();

    const available = await Health.isHealthAvailable();
    if (!available.available) {
      if (platform === 'android' && typeof Health.showHealthConnectInPlayStore === 'function') {
        await Health.showHealthConnectInPlayStore();
      }
      console.warn('Health API not available on this device');
      return false;
    }

    const result = await Health.requestHealthPermissions({
      permissions: ['READ_STEPS'],
    });

    // iOS reports this optimistically for read permissions.
    const granted = platform === 'ios' ? true : hasGrantedPermission(result, 'READ_STEPS');
    console.log('Health permission result:', JSON.stringify(result), 'granted:', granted);
    return granted;
  } catch (err) {
    console.error('requestHealthPermissions error:', err);
    return false;
  }
}

export async function openHealthSettings(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { Health } = await import('capacitor-health');
    const platform = getPlatform();
    if (platform === 'ios') {
      await Health.openAppleHealthSettings();
      return;
    }

    if (platform === 'android') {
      const available = await Health.isHealthAvailable();
      if (available.available) {
        await Health.openHealthConnectSettings();
      } else if (typeof Health.showHealthConnectInPlayStore === 'function') {
        await Health.showHealthConnectInPlayStore();
      }
    }
  } catch (err) {
    console.error('openHealthSettings error:', err);
  }
}

export async function getStepsForDate(date: string): Promise<HealthStepsResult | null> {
  if (!isNativePlatform()) return null;
  try {
    const { Health } = await import('capacitor-health');

    const startDate = new Date(`${date}T00:00:00`).toISOString();
    const endDate = new Date(`${date}T23:59:59`).toISOString();

    console.log('[getStepsForDate] querying', { startDate, endDate });

    const result = await Health.queryAggregated({
      startDate,
      endDate,
      dataType: 'steps',
      bucket: '1day',
    });

    console.log('[getStepsForDate] result:', JSON.stringify(result));

    const totalSteps = (result?.aggregatedData ?? []).reduce((sum, s) => sum + (s.value ?? 0), 0);
    const platform = getPlatform();

    return {
      steps: Math.round(totalSteps),
      date,
      source: platform === 'ios' ? 'healthkit' : 'health_connect',
    };
  } catch (err) {
    console.error('[getStepsForDate] error:', err);
    return null;
  }
}
