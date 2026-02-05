/**
 * Reverse geocoding: lat/lng -> address.
 * Uses OpenStreetMap Nominatim (free, no API key).
 * Rate limit: 1 req/sec – we get updates every 15 sec, so safe.
 */

const GEOCODE_TIMEOUT_MS = 3000;

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'HRMS-Geo-Tracking/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const displayName = data.display_name || '';
    return {
      address: displayName,
      city: addr.city || addr.town || addr.village || addr.county || '',
      area: addr.suburb || addr.neighbourhood || addr.locality || '',
      pincode: addr.postcode || '',
    };
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[Geocoding] Reverse geocode failed:', err.message);
    }
    return null;
  }
}

module.exports = { reverseGeocode };
