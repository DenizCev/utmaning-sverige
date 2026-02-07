import { Capacitor } from '@capacitor/core';

export interface HealthStepsResult {
  steps: number;
  date: string;
  source: 'healthkit' | 'health_connect' | 'manual';
}

/**
 * Check if we're running on a native platform with health data access.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform: 'ios', 'android', or 'web'.
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Request health data permissions.
 * This must be called before reading step data.
 * 
 * NOTE: The actual native plugins must be installed and registered
 * when building with Capacitor locally. This file provides the
 * abstraction layer — the native plugins are resolved at build time.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  const platform = getPlatform();

  if (platform === 'web') {
    console.log('Health permissions not available on web');
    return false;
  }

  try {
    if (platform === 'ios') {
      // Uses @nicepay-corp/capacitor-healthkit or similar
      const { CapacitorHealthkit } = await import('@nicepay-corp/capacitor-healthkit' as any);
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: ['stepCount'],
        write: [],
      });
      return true;
    }

    if (platform === 'android') {
      // Uses @nicepay-corp/capacitor-health-connect or similar
      const { CapacitorHealthConnect } = await import('@nicepay-corp/capacitor-health-connect' as any);
      await CapacitorHealthConnect.requestHealthPermissions({
        read: ['Steps'],
        write: [],
      });
      return true;
    }
  } catch (error) {
    console.error('Failed to request health permissions:', error);
    return false;
  }

  return false;
}

/**
 * Get steps for a given date from the native health API.
 * Returns null if not available (web) or if permissions are denied.
 */
export async function getStepsForDate(date: string): Promise<HealthStepsResult | null> {
  const platform = getPlatform();

  if (platform === 'web') {
    return null;
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    if (platform === 'ios') {
      const { CapacitorHealthkit } = await import('@nicepay-corp/capacitor-healthkit' as any);
      const result = await CapacitorHealthkit.queryHKitSampleType({
        sampleName: 'stepCount',
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        limit: 0,
      });

      const totalSteps = (result?.resultData || []).reduce(
        (sum: number, entry: any) => sum + (entry.value || 0),
        0
      );

      return { steps: Math.round(totalSteps), date, source: 'healthkit' };
    }

    if (platform === 'android') {
      const { CapacitorHealthConnect } = await import('@nicepay-corp/capacitor-health-connect' as any);
      const result = await CapacitorHealthConnect.readRecords({
        type: 'Steps',
        timeRangeFilter: {
          type: 'between',
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        },
      });

      const totalSteps = (result?.records || []).reduce(
        (sum: number, record: any) => sum + (record.count || 0),
        0
      );

      return { steps: Math.round(totalSteps), date, source: 'health_connect' };
    }
  } catch (error) {
    console.error('Failed to read steps from health API:', error);
    return null;
  }

  return null;
}
