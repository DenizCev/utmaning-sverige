import { Capacitor } from '@capacitor/core';

export interface HealthStepsResult {
  steps: number;
  date: string;
  source: 'healthkit' | 'health_connect' | 'manual';
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

/**
 * Check if the native health API is available on this device.
 */
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

/**
 * Internal helper to safely read permission responses across platforms.
 */
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

/**
 * Check current permission status for step reading.
 * Returns true if already granted.
 */
export async function checkHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  // iOS does not provide a reliable read-permission status via checkHealthPermissions.
  // Return false here so we always trigger an explicit request flow before syncing.
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

/**
 * Request health permissions from the user.
 * This triggers the native OS permission dialog.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Health } = await import('capacitor-health');
    const platform = getPlatform();

    // First check if health is available
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

/**
 * Open the native health settings so the user can manually toggle permissions.
 */
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

/**
 * Query aggregated steps for a specific date.
 */
export async function getStepsForDate(date: string): Promise<HealthStepsResult | null> {
  if (!isNativePlatform()) return null;
  try {
    const { Health } = await import('capacitor-health');

    // Build start/end for the full day
    const startDate = new Date(`${date}T00:00:00`).toISOString();
    const endDate = new Date(`${date}T23:59:59`).toISOString();

    const result = await Health.queryAggregated({
      startDate,
      endDate,
      dataType: 'steps',
      bucket: '1day',
    });

    console.log('queryAggregated steps result:', JSON.stringify(result));

    const totalSteps = (result?.aggregatedData ?? []).reduce((sum, s) => sum + (s.value ?? 0), 0);
    const platform = getPlatform();

    return {
      steps: Math.round(totalSteps),
      date,
      source: platform === 'ios' ? 'healthkit' : 'health_connect',
    };
  } catch (err) {
    console.error('getStepsForDate error:', err);
    return null;
  }
}
