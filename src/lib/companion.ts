/**
 * Companion（Capacitor WebView）判定ユーティリティ
 */
export function isCompanionBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return ua.includes('GarageLogCapacitor');
}
