import { isNativePlatform } from '@/utils/healthSteps';

// AdMob configuration
// Replace these with your real AdMob ad unit IDs before publishing
const ADMOB_CONFIG = {
  // Android rewarded ad unit ID
  androidRewardedAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  // iOS rewarded ad unit ID  
  iosRewardedAdUnitId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  // Test ad unit IDs (use these during development)
  testAndroidRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  testIosRewardedAdUnitId: 'ca-app-pub-3940256099942544/1712485313',
  // Set to true for development, false for production
  isTesting: true,
};

let admobPlugin: any = null;

/**
 * Initialize AdMob. Call once on app start.
 */
export async function initializeAdMob(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const mod = await import('@capacitor-community/admob');
    admobPlugin = mod.AdMob;

    await admobPlugin.initialize({
      initializeForTesting: ADMOB_CONFIG.isTesting,
    });

    console.log('AdMob initialized successfully');
    return true;
  } catch (err) {
    console.warn('AdMob initialization failed (expected on web):', err);
    return false;
  }
}

/**
 * Check if AdMob is available (native only).
 */
export function isAdMobAvailable(): boolean {
  return admobPlugin !== null;
}

/**
 * Get the correct ad unit ID based on platform and testing mode.
 */
function getRewardedAdUnitId(): string {
  const platform = getPlatformForAd();

  if (ADMOB_CONFIG.isTesting) {
    return platform === 'ios'
      ? ADMOB_CONFIG.testIosRewardedAdUnitId
      : ADMOB_CONFIG.testAndroidRewardedAdUnitId;
  }

  return platform === 'ios'
    ? ADMOB_CONFIG.iosRewardedAdUnitId
    : ADMOB_CONFIG.androidRewardedAdUnitId;
}

function getPlatformForAd(): 'ios' | 'android' {
  try {
    const { Capacitor } = (window as any).__capacitor_core || {};
    if (Capacitor?.getPlatform?.() === 'ios') return 'ios';
  } catch {}
  return 'android';
}

/**
 * Show a rewarded ad. Returns true if the user watched the full ad.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!admobPlugin) {
    console.warn('AdMob not available, using fallback');
    return false;
  }

  try {
    // Prepare the rewarded ad
    await admobPlugin.prepareRewardVideoAd({
      adId: getRewardedAdUnitId(),
      isTesting: ADMOB_CONFIG.isTesting,
    });

    // Show the rewarded ad and wait for result
    const result = await admobPlugin.showRewardVideoAd();
    console.log('Rewarded ad result:', result);
    return true;
  } catch (err) {
    console.error('Failed to show rewarded ad:', err);
    return false;
  }
}
