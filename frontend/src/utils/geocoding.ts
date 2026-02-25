/**
 * Reverse geocoding utility to convert latitude/longitude to human-readable addresses
 * Uses multiple services as fallback for reliability
 */

export interface GeocodingResult {
  address: string; // Full formatted address (e.g., "123 Main Street, Downtown, New York, NY 10001, USA")
  formattedAddress?: string; // Same as address, kept for compatibility
  city?: string;
  state?: string;
  country?: string;
  street?: string; // Street name
  houseNumber?: string; // Building/house number
  postalCode?: string; // Postal/ZIP code
  error?: string;
}

/**
 * Reverse geocode using Nominatim (OpenStreetMap) - Free, no API key required
 * Rate limit: 1 request per second
 */
export const reverseGeocodeNominatim = async (
  latitude: number,
  longitude: number
): Promise<GeocodingResult> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'HRMS-App/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error('Nominatim API request failed');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    const address = data.address || {};
    const parts: string[] = [];

    // Build detailed address from components
    // Start with house number and street/road
    if (address.house_number && (address.road || address.street)) {
      parts.push(`${address.house_number} ${address.road || address.street}`);
    } else if (address.road || address.street) {
      parts.push(address.road || address.street);
    } else if (address.house_number) {
      parts.push(address.house_number);
    }
    
    // Add suburb/neighbourhood
    if (address.suburb) {
      parts.push(address.suburb);
    } else if (address.neighbourhood) {
      parts.push(address.neighbourhood);
    }
    
    // Add city/town/village
    if (address.city) {
      parts.push(address.city);
    } else if (address.town) {
      parts.push(address.town);
    } else if (address.village) {
      parts.push(address.village);
    }
    
    // Add postal code if available
    if (address.postcode) {
      parts.push(address.postcode);
    }
    
    // Add state/region
    if (address.state) {
      parts.push(address.state);
    } else if (address.region) {
      parts.push(address.region);
    }
    
    // Add country
    if (address.country) {
      parts.push(address.country);
    }

    // Use detailed address if we have parts, otherwise use display_name
    const formattedAddress = parts.length > 0 
      ? parts.join(', ') 
      : data.display_name || 'Location captured';

    return {
      address: formattedAddress,
      formattedAddress: formattedAddress,
      city: address.city || address.town || address.village,
      state: address.state || address.region,
      country: address.country,
      street: address.road || address.street,
      houseNumber: address.house_number,
      postalCode: address.postcode,
    };
  } catch (error: any) {
    return {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      error: error.message || 'Failed to get address from Nominatim',
    };
  }
};

/**
 * Reverse geocode using OpenCage Geocoding API
 * Requires API key, but has better accuracy and higher rate limits
 */
export const reverseGeocodeOpenCage = async (
  latitude: number,
  longitude: number,
  apiKey?: string
): Promise<GeocodingResult> => {
  if (!apiKey) {
    return {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      error: 'OpenCage API key not provided',
    };
  }

  try {
    // OpenCage reverse geocoding API format: q=latitude,longitude
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude},${longitude}&key=${apiKey}&no_annotations=1&limit=1`
    );

    if (!response.ok) {
      throw new Error('OpenCage API request failed');
    }

    const data = await response.json();

    if (data.status.code !== 200 || !data.results || data.results.length === 0) {
      throw new Error(data.status.message || 'No results found');
    }

    const result = data.results[0];
    const components = result.components || {};
    const formatted = result.formatted || 'Location captured';

    // Build detailed address from components for better accuracy
    const addressParts: string[] = [];
    
    // Add house/building number and street
    if (components.house_number && components.road) {
      addressParts.push(`${components.house_number} ${components.road}`);
    } else if (components.road) {
      addressParts.push(components.road);
    } else if (components.street) {
      addressParts.push(components.street);
    } else if (components.house_number) {
      addressParts.push(components.house_number);
    }
    
    // Add suburb/neighbourhood if available
    if (components.suburb) {
      addressParts.push(components.suburb);
    } else if (components.neighbourhood) {
      addressParts.push(components.neighbourhood);
    }
    
    // Add city/town
    if (components.city) {
      addressParts.push(components.city);
    } else if (components.town) {
      addressParts.push(components.town);
    } else if (components.village) {
      addressParts.push(components.village);
    }
    
    // Add state/region
    if (components.state) {
      addressParts.push(components.state);
    } else if (components.region) {
      addressParts.push(components.region);
    }
    
    // Add postal code if available
    if (components.postcode) {
      // Insert before state if state exists, otherwise at the end
      const stateIndex = addressParts.findIndex(part => 
        part === components.state || part === components.region
      );
      if (stateIndex !== -1) {
        addressParts.splice(stateIndex, 0, components.postcode);
      } else {
        addressParts.push(components.postcode);
      }
    }
    
    // Add country
    if (components.country) {
      addressParts.push(components.country);
    }

    // Use detailed address if we have parts, otherwise use formatted
    const detailedAddress = addressParts.length > 0 
      ? addressParts.join(', ')
      : formatted;

    return {
      address: detailedAddress,
      formattedAddress: detailedAddress,
      city: components.city || components.town || components.village,
      state: components.state || components.region,
      country: components.country,
      street: components.road || components.street,
      houseNumber: components.house_number,
      postalCode: components.postcode,
    };
  } catch (error: any) {
    return {
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      error: error.message || 'Failed to get address from OpenCage',
    };
  }
};

/**
 * Get OpenCage API key from environment variable
 */
const getOpenCageApiKey = (): string | undefined => {
  // Check for API key in environment variable
  return import.meta.env.VITE_OPENCAGE_API_KEY;
};

/**
 * Main reverse geocoding function with fallback
 * Tries multiple services in order of preference
 * Automatically uses OpenCage API key from environment if available
 */
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
  options?: {
    openCageApiKey?: string;
    preferOpenCage?: boolean;
  }
): Promise<GeocodingResult> => {
  // Get API key from options or environment variable
  const apiKey = options?.openCageApiKey || getOpenCageApiKey();
  const preferOpenCage = options?.preferOpenCage ?? true; // Default to preferring OpenCage if API key is available

  // If OpenCage API key is available, try it first (better accuracy)
  if (apiKey) {
    const openCageResult = await reverseGeocodeOpenCage(latitude, longitude, apiKey);
    if (!openCageResult.error) {
      return openCageResult;
    }
    // If OpenCage fails, fall through to Nominatim
  }

  // Try Nominatim (free, no API key needed) as fallback
  const nominatimResult = await reverseGeocodeNominatim(latitude, longitude);
  if (!nominatimResult.error) {
    return nominatimResult;
  }

  // Fallback to coordinates if all services fail
  return {
    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    error: 'All geocoding services failed',
  };
};

/**
 * Get location with address using browser geolocation API
 * Automatically uses OpenCage API key from environment if available
 */
export const getLocationWithAddress = async (
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    openCageApiKey?: string;
  }
): Promise<{
  latitude: number;
  longitude: number;
  address: string;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  error?: string;
}> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Get address from coordinates (automatically uses API key from env if available)
        const geocodeResult = await reverseGeocode(latitude, longitude, {
          openCageApiKey: options?.openCageApiKey,
          preferOpenCage: true, // Prefer OpenCage for better accuracy
        });

        resolve({
          latitude,
          longitude,
          address: geocodeResult.address,
          formattedAddress: geocodeResult.formattedAddress,
          city: geocodeResult.city,
          state: geocodeResult.state,
          country: geocodeResult.country,
          error: geocodeResult.error,
        });
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      }
    );
  });
};

