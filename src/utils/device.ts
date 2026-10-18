/**
 * Generates a stable device fingerprint for browser-based device binding
 */
export function getOrCreateDeviceId(): string {
  const STORAGE_KEY = 'attendpulse_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    const raw = [
      navigator.userAgent,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.hardwareConcurrency || 4,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      Math.random().toString(36).substring(2, 10),
    ].join('###');

    // Create a 16-hex hash
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    deviceId = `DEV-${hex.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceSummary(): { deviceId: string; model: string; platform: string } {
  const deviceId = getOrCreateDeviceId();
  const ua = navigator.userAgent;
  let model = 'Generic Mobile Device';

  if (/iPhone|iPad|iPod/.test(ua)) {
    model = 'Apple iOS Device';
  } else if (/Android/.test(ua)) {
    if (/Samsung/i.test(ua)) model = 'Samsung Galaxy Device';
    else if (/Pixel/i.test(ua)) model = 'Google Pixel Device';
    else model = 'Android Smartphone';
  } else if (/Macintosh/.test(ua)) {
    model = 'MacBook Pro / macOS';
  } else if (/Windows/.test(ua)) {
    model = 'Windows Laptop / PC';
  } else if (/Linux/.test(ua)) {
    model = 'Linux Workstation';
  }

  return {
    deviceId,
    model,
    platform: navigator.platform || 'Web Browser',
  };
}
