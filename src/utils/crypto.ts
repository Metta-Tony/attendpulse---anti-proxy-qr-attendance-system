import { RotatingTokenPayload } from '../types/attendance';

/**
 * Computes an HMAC-SHA256 signature using the Web Crypto API
 */
export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random cryptographic secret key for a lecture session
 */
export function generateSessionSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates the signed token for the active 10-second window
 * Changes every 10 seconds based on Math.floor(now / 10)
 */
export async function generateRotatingToken(
  sessionId: string,
  courseId: string,
  secretKey: string,
  customTimestamp?: number
): Promise<{ tokenString: string; payload: RotatingTokenPayload }> {
  const now = customTimestamp ?? Math.floor(Date.now() / 1000);
  const rotationCounter = Math.floor(now / 10);
  
  // Message payload to sign: sessionId:courseId:rotationCounter:now
  const messageToSign = `${sessionId}:${courseId}:${rotationCounter}:${now}`;
  const signature = await computeHmacSha256(secretKey, messageToSign);

  const payload: RotatingTokenPayload = {
    sessionId,
    courseId,
    timestamp: now,
    rotationCounter,
    signature,
  };

  const jsonStr = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
  const tokenString = `ATTEND_SEC_v1:${b64}`;

  return { tokenString, payload };
}

/**
 * Parses and unpacks a scanned QR token string
 */
export function parseTokenString(tokenString: string): RotatingTokenPayload | null {
  try {
    if (!tokenString.startsWith('ATTEND_SEC_v1:')) {
      // Try direct JSON
      return JSON.parse(tokenString);
    }
    const b64 = tokenString.replace('ATTEND_SEC_v1:', '');
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Verifies the HMAC-SHA256 signature of a token against the session secret
 */
export async function verifyTokenSignature(
  payload: RotatingTokenPayload,
  secretKey: string
): Promise<boolean> {
  try {
    const messageToSign = `${payload.sessionId}:${payload.courseId}:${payload.rotationCounter}:${payload.timestamp}`;
    const expectedSignature = await computeHmacSha256(secretKey, messageToSign);
    return expectedSignature.toLowerCase() === payload.signature.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Checks token freshness:
 * Rotating token expires after 10 seconds.
 * We allow a tight 12-second window to account for network transmission / scan latency.
 */
export function checkTokenFreshness(
  tokenTimestampSeconds: number,
  currentTimestampSeconds?: number,
  maxWindowSeconds = 12
): { isFresh: boolean; ageSeconds: number } {
  const now = currentTimestampSeconds ?? Math.floor(Date.now() / 1000);
  const ageSeconds = now - tokenTimestampSeconds;
  
  // Future tokens with > 3s clock skew are also rejected
  const isFresh = ageSeconds >= -3 && ageSeconds <= maxWindowSeconds;
  return { isFresh, ageSeconds };
}
