export interface HealthStepsResult {
  steps: number;
  date: string;
  source: 'healthkit' | 'health_connect' | 'manual';
}

/**
 * Check if we're running on a native platform.
 * On web this always returns false.
 * When built with Capacitor locally, replace with actual detection.
 */
export function isNativePlatform(): boolean {
  try {
    // @capacitor/core is only available in native builds
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Capacitor } = (window as any).__capacitor_core || {};
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  try {
    const { Capacitor } = (window as any).__capacitor_core || {};
    const p = Capacitor?.getPlatform?.();
    if (p === 'ios') return 'ios';
    if (p === 'android') return 'android';
  } catch {}
  return 'web';
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  // Implemented in native builds with actual Capacitor health plugins
  return false;
}

export async function getStepsForDate(_date: string): Promise<HealthStepsResult | null> {
  if (!isNativePlatform()) return null;
  // Implemented in native builds with actual Capacitor health plugins
  return null;
}
