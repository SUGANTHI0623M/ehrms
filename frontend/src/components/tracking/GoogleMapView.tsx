import { useEffect, useRef, useState, useMemo } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";

export interface MapMarker {
  id: string;
  position: [number, number];
  title: string;
  description?: string;
  color?: string;
}

export interface MapRoute {
  positions: [number, number][];
  color?: string;
}

export interface GoogleMapViewProps {
  markers?: MapMarker[];
  route?: [number, number][];
  routes?: MapRoute[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showRoute?: boolean;
  routeColor?: string;
  apiKey: string;
}

const GoogleMapView = ({
  markers = [],
  route = [],
  routes = [],
  center = [13.0827, 80.2707], // Default to Chennai, India
  zoom = 13,
  height = "600px",
  showRoute = false,
  routeColor = "#3b82f6",
  apiKey,
}: GoogleMapViewProps) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [polylinesReady, setPolylinesReady] = useState(false);

  // Filter out invalid markers (null positions)
  const validMarkers = markers.filter(
    (m) =>
      m &&
      m.position &&
      Array.isArray(m.position) &&
      m.position.length === 2 &&
      typeof m.position[0] === "number" &&
      typeof m.position[1] === "number" &&
      !isNaN(m.position[0]) &&
      !isNaN(m.position[1])
  );

  // Filter out invalid route positions
  const validRoutePositions = route.filter(
    (pos) =>
      pos &&
      Array.isArray(pos) &&
      pos.length === 2 &&
      typeof pos[0] === "number" &&
      typeof pos[1] === "number" &&
      !isNaN(pos[0]) &&
      !isNaN(pos[1])
  );

  const validRoutes = routes
    .map((r) => ({
      ...r,
      positions: r.positions.filter(
        (pos: any) =>
          pos &&
          Array.isArray(pos) &&
          pos.length === 2 &&
          typeof pos[0] === "number" &&
          typeof pos[1] === "number" &&
          !isNaN(pos[0]) &&
          !isNaN(pos[1])
      ),
    }))
    .filter((r) => r.positions.length > 0);

  // Memoize valid paths to prevent re-renders with invalid data
  const validPolylinePaths = useMemo(() => {
    if (!showRoute) return [];
    
    if (validRoutes.length > 0) {
      return validRoutes
        .map((routeItem) => {
          if (!routeItem.positions || routeItem.positions.length < 2) return null;
          const path = routeItem.positions
            .filter((pos) => pos && Array.isArray(pos) && pos.length === 2 && !isNaN(pos[0]) && !isNaN(pos[1]))
            .map((pos) => ({
              lat: pos[0],
              lng: pos[1],
            }));
          return path.length >= 2 ? { path, color: routeItem.color || routeColor } : null;
        })
        .filter((item): item is { path: Array<{ lat: number; lng: number }>; color: string } => item !== null);
    }
    
    if (validRoutePositions.length >= 2) {
      const path = validRoutePositions
        .filter((pos) => pos && Array.isArray(pos) && pos.length === 2 && !isNaN(pos[0]) && !isNaN(pos[1]))
        .map((pos) => ({
          lat: pos[0],
          lng: pos[1],
        }));
      return path.length >= 2 ? [{ path, color: routeColor }] : [];
    }
    
    return [];
  }, [showRoute, validRoutes, validRoutePositions, routeColor]);

  // Calculate center from valid markers if no center provided
  const mapCenter =
    validMarkers.length > 0
      ? {
          lat:
            validMarkers.reduce((sum, m) => sum + m.position[0], 0) /
            validMarkers.length,
          lng:
            validMarkers.reduce((sum, m) => sum + m.position[1], 0) /
            validMarkers.length,
        }
      : { lat: center[0], lng: center[1] };

  // Combine all routes and marker positions for bounds
  const allRoutePositions: [number, number][] =
    validRoutes.length > 0
      ? validRoutes.flatMap((r) => r.positions)
      : validRoutePositions;

  const allPositions: [number, number][] = [
    ...(showRoute && allRoutePositions.length > 0 ? allRoutePositions : []),
    ...validMarkers.map((m) => m.position),
  ];

  // Use auto-fit bounds if zoom is undefined and we have positions
  const shouldAutoFit = zoom === undefined && allPositions.length > 0;
  const mapZoom = shouldAutoFit ? 13 : zoom || 13;

  // Fit bounds when map loads or positions change
  useEffect(() => {
    if (isLoaded && mapReady && mapRef.current && allPositions.length > 0 && shouldAutoFit && typeof google !== 'undefined') {
      const bounds = new google.maps.LatLngBounds();
      allPositions.forEach((pos) => {
        bounds.extend({ lat: pos[0], lng: pos[1] });
      });
      mapRef.current.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [isLoaded, mapReady, allPositions, shouldAutoFit]);

  // Update polylines when routes change
  useEffect(() => {
    if (mapReady && mapRef.current && isLoaded && typeof google !== 'undefined' && google.maps && showRoute) {
      // Clear existing polylines
      polylinesRef.current.forEach(polyline => {
        try {
          polyline.setMap(null);
        } catch (e) {
          // Ignore errors
        }
      });
      polylinesRef.current = [];
      
      // Create new polylines
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        
        validPolylinePaths.forEach((polylineData) => {
          try {
            if (!polylineData || !polylineData.path || !Array.isArray(polylineData.path) || polylineData.path.length < 2) {
              return;
            }
            
            const path = polylineData.path
              .filter((point) => 
                point && 
                typeof point === 'object' &&
                'lat' in point &&
                'lng' in point &&
                typeof point.lat === 'number' && 
                typeof point.lng === 'number' &&
                !isNaN(point.lat) && 
                !isNaN(point.lng) &&
                isFinite(point.lat) &&
                isFinite(point.lng)
              )
              .map((point) => new google.maps.LatLng(point.lat, point.lng));
            
            if (path.length < 2) return;
            
            const rgb = hexToRgb(polylineData.color);
            const polyline = new google.maps.Polyline({
              path: path,
              strokeColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
              strokeWeight: 4,
              strokeOpacity: 0.7,
              geodesic: true,
              map: mapRef.current,
            });
            
            polylinesRef.current.push(polyline);
          } catch (error) {
            console.warn('Error creating polyline:', error);
          }
        });
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [validPolylinePaths, mapReady, isLoaded, showRoute]);

  // Cleanup polylines on unmount
  useEffect(() => {
    return () => {
      polylinesRef.current.forEach(polyline => {
        try {
          polyline.setMap(null);
        } catch (e) {
          // Ignore errors during cleanup
        }
      });
      polylinesRef.current = [];
    };
  }, []);

  // Convert color hex to RGB for Google Maps
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 59, g: 130, b: 246 }; // Default blue
  };

  const containerStyle = {
    width: "100%",
    height: height,
  };

  // Only define mapOptions after API is loaded
  const mapOptions: google.maps.MapOptions | undefined = isLoaded && typeof google !== 'undefined' ? {
    zoom: mapZoom,
    center: mapCenter,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    maxZoom: 21, // Google Maps supports up to zoom level 21
    minZoom: 1,
  } : undefined;

  if (!isLoaded) {
    return (
      <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={mapZoom}
        options={mapOptions}
        onLoad={(map) => {
          mapRef.current = map;
          setMapReady(true);
          
          // Create polylines directly using Google Maps API (not React component)
          if (showRoute && validPolylinePaths.length > 0 && typeof google !== 'undefined' && google.maps) {
            // Clear any existing polylines
            polylinesRef.current.forEach(polyline => {
              try {
                polyline.setMap(null);
              } catch (e) {
                  // Ignore errors
                }
            });
            polylinesRef.current = [];
            
            // Create polylines after a short delay to ensure map is fully ready
            setTimeout(() => {
              if (!mapRef.current) return;
              
              validPolylinePaths.forEach((polylineData) => {
                try {
                  if (!polylineData || !polylineData.path || !Array.isArray(polylineData.path) || polylineData.path.length < 2) {
                    return;
                  }
                  
                  // Validate and create LatLng array
                  const path = polylineData.path
                    .filter((point) => 
                      point && 
                      typeof point === 'object' &&
                      'lat' in point &&
                      'lng' in point &&
                      typeof point.lat === 'number' && 
                      typeof point.lng === 'number' &&
                      !isNaN(point.lat) && 
                      !isNaN(point.lng) &&
                      isFinite(point.lat) &&
                      isFinite(point.lng) &&
                      point.lat >= -90 && point.lat <= 90 &&
                      point.lng >= -180 && point.lng <= 180
                    )
                    .map((point) => new google.maps.LatLng(point.lat, point.lng));
                  
                  if (path.length < 2) return;
                  
                  const rgb = hexToRgb(polylineData.color);
                  const polyline = new google.maps.Polyline({
                    path: path,
                    strokeColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
                    strokeWeight: 4,
                    strokeOpacity: 0.7,
                    geodesic: true,
                    map: mapRef.current,
                  });
                  
                  polylinesRef.current.push(polyline);
                } catch (error) {
                  console.warn('Error creating polyline:', error);
                }
              });
              
              setPolylinesReady(true);
            }, 300);
          } else {
            setPolylinesReady(true);
          }
          
          // Fit bounds on initial load if needed
          if (allPositions.length > 0 && shouldAutoFit) {
            const bounds = new google.maps.LatLngBounds();
            allPositions.forEach((pos) => {
              bounds.extend({ lat: pos[0], lng: pos[1] });
            });
            map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
          }
        }}
      >
          {/* Polylines are created directly using Google Maps API in onLoad callback */}
          {/* This avoids React component initialization issues */}

          {/* Render markers */}
          {validMarkers.map((marker) => {
            const rgb = hexToRgb(marker.color || "#3b82f6");
            const icon = isLoaded && typeof google !== 'undefined' ? {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: marker.color || "#3b82f6",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            } : undefined;
            return (
              <Marker
                key={marker.id}
                position={{ lat: marker.position[0], lng: marker.position[1] }}
                icon={icon}
                onClick={() => setSelectedMarker(marker.id)}
              >
                {selectedMarker === marker.id && (
                  <InfoWindow
                    onCloseClick={() => setSelectedMarker(null)}
                    position={{ lat: marker.position[0], lng: marker.position[1] }}
                  >
                    <div className="min-w-[200px]">
                      <strong className="text-base">{marker.title}</strong>
                      {marker.description && (
                        <div className="mt-2 text-sm space-y-1">
                          {marker.description.split(" | ").map((item, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapView;

