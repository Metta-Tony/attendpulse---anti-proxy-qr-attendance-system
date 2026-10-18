/**
 * Calculates the great-circle distance between two GPS points using the Haversine formula
 * Returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10; // 1 decimal place in meters
}

/**
 * Attempts to retrieve real browser geolocation or returns a fallback coordinate
 */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // Default to campus engineering theatre coordinates
      resolve({ latitude: 6.524379, longitude: 3.379205, accuracy: 12 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 15,
        });
      },
      () => {
        // Fallback: Campus Engineering Lecture Theatre
        resolve({ latitude: 6.524379, longitude: 3.379205, accuracy: 12 });
      },
      { timeout: 5000, enableHighAccuracy: true, maximumAge: 10000 }
    );
  });
}
