# Reverse Geocoding Setup

This utility provides reverse geocoding functionality to convert latitude/longitude coordinates to human-readable addresses.

## Features

- **Free Option**: Uses Nominatim (OpenStreetMap) by default - no API key required
- **Premium Option**: Supports OpenCage Geocoding API for better accuracy
- **Automatic Fallback**: Tries multiple services if one fails
- **Rate Limiting**: Nominatim has a 1 request/second limit

## Usage

### Automatic Usage (Recommended)

The utility automatically detects and uses the OpenCage API key from your environment variables if available. No code changes needed!

1. Add your API key to `.env` file in the frontend directory:
   ```
   VITE_OPENCAGE_API_KEY=your_api_key_here
   ```
2. Use the function normally - it will automatically prefer OpenCage if the key is available:
   ```typescript
   import { getLocationWithAddress } from "@/utils/geocoding";

   const location = await getLocationWithAddress({
     enableHighAccuracy: true,
     timeout: 10000,
   });
   // Returns: { latitude, longitude, address, formattedAddress, city, state, country }
   ```

### How It Works

- **If OpenCage API key is set**: Uses OpenCage first (better accuracy), falls back to Nominatim if it fails
- **If no API key**: Uses Nominatim (free, no API key required)
- **Always**: Falls back to coordinates if all geocoding services fail

### Manual Override

You can also manually pass the API key:
```typescript
const location = await getLocationWithAddress({
  enableHighAccuracy: true,
  openCageApiKey: "your_key_here", // Optional override
});
```

## Available Services

### 1. Nominatim (OpenStreetMap) - Default
- **Cost**: Free
- **API Key**: Not required
- **Rate Limit**: 1 request per second
- **Accuracy**: Good for most locations
- **Usage**: Automatically used as primary or fallback

### 2. OpenCage Geocoding API
- **Cost**: Free tier available (2,500 requests/day)
- **API Key**: Required (get from https://opencagedata.com/api)
- **Rate Limit**: Based on your plan
- **Accuracy**: Excellent
- **Usage**: Set `openCageApiKey` in options

### 3. Other Options (Not Implemented)
- **Google Maps Geocoding API**: Requires API key, paid service
- **Mapbox Geocoding API**: Free tier available, requires API key

## Functions

### `reverseGeocode(latitude, longitude, options?)`
Main function that tries multiple services with fallback.

### `reverseGeocodeNominatim(latitude, longitude)`
Uses OpenStreetMap Nominatim service (free, no API key).

### `reverseGeocodeOpenCage(latitude, longitude, apiKey)`
Uses OpenCage API (requires API key, better accuracy).

### `getLocationWithAddress(options?)`
Gets browser geolocation and converts to address in one call.

## Error Handling

All functions return a result object with:
- `address`: The formatted address string (or coordinates if geocoding fails)
- `formattedAddress`: Full formatted address
- `city`, `state`, `country`: Individual components
- `error`: Error message if geocoding failed

Even if geocoding fails, coordinates are always returned as a fallback.

## Rate Limiting

Nominatim has a strict 1 request/second limit. If you need higher throughput, consider:
1. Using OpenCage API (higher rate limits)
2. Implementing client-side caching
3. Using a backend proxy to cache results

## Privacy

- Nominatim: Open source, respects privacy
- OpenCage: See their privacy policy at https://opencagedata.com/privacy

