import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import GoogleMapView from "./GoogleMapView";

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const createCustomIcon = (color: string = "#3b82f6") => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to handle map bounds
function MapBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);

  return null;
}

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

export interface MapViewProps {
  markers?: MapMarker[];
  route?: [number, number][];
  routes?: MapRoute[]; // Multiple routes for multiple users
  center?: [number, number];
  zoom?: number;
  height?: string;
  showRoute?: boolean;
  routeColor?: string;
  useGoogleMaps?: boolean; // Option to use Google Maps instead of Leaflet
  googleMapsApiKey?: string; // Google Maps API key
}

const MapView = ({
  markers = [],
  route = [],
  routes = [],
  center = [13.0827, 80.2707], // Default to Chennai, India
  zoom = 13,
  height = "600px",
  showRoute = false,
  routeColor = "#3b82f6",
  useGoogleMaps = false,
  googleMapsApiKey,
}: MapViewProps) => {
  const mapRef = useRef<L.Map>(null);
  
  // If Google Maps is enabled and API key is provided, use Google Maps
  if (useGoogleMaps && googleMapsApiKey) {
    return (
      <GoogleMapView
        markers={markers}
        route={route}
        routes={routes}
        center={center}
        zoom={zoom}
        height={height}
        showRoute={showRoute}
        routeColor={routeColor}
        apiKey={googleMapsApiKey}
      />
    );
  }

  // Filter out invalid markers (null positions and [0, 0] coordinates)
  const validMarkers = markers.filter(m => 
    m && 
    m.position && 
    Array.isArray(m.position) && 
    m.position.length === 2 && 
    typeof m.position[0] === 'number' && 
    typeof m.position[1] === 'number' &&
    !isNaN(m.position[0]) && 
    !isNaN(m.position[1]) &&
    !(m.position[0] === 0 && m.position[1] === 0) // Filter out [0, 0] coordinates
  );

  // Filter out invalid route positions (including [0, 0])
  const validRoutePositions = route.filter(pos => 
    pos && 
    Array.isArray(pos) && 
    pos.length === 2 && 
    typeof pos[0] === 'number' && 
    typeof pos[1] === 'number' &&
    !isNaN(pos[0]) && 
    !isNaN(pos[1]) &&
    !(pos[0] === 0 && pos[1] === 0) // Filter out [0, 0] coordinates
  );

  const validRoutes = routes.map(r => ({
    ...r,
    positions: r.positions.filter((pos: any) => 
      pos && 
      Array.isArray(pos) && 
      pos.length === 2 && 
      typeof pos[0] === 'number' && 
      typeof pos[1] === 'number' &&
      !isNaN(pos[0]) && 
      !isNaN(pos[1]) &&
      !(pos[0] === 0 && pos[1] === 0) // Filter out [0, 0] coordinates
    )
  })).filter(r => r.positions.length > 0);

  // Calculate center from valid markers if no center provided
  const mapCenter = validMarkers.length > 0
    ? [
        validMarkers.reduce((sum, m) => sum + m.position[0], 0) / validMarkers.length,
        validMarkers.reduce((sum, m) => sum + m.position[1], 0) / validMarkers.length,
      ] as [number, number]
    : center;

  // Combine all routes and marker positions for bounds
  const allRoutePositions: [number, number][] = validRoutes.length > 0
    ? validRoutes.flatMap(r => r.positions)
    : validRoutePositions;
  
  const allPositions: [number, number][] = [
    ...(showRoute && allRoutePositions.length > 0 ? allRoutePositions : []),
    ...validMarkers.map((m) => m.position),
  ];

  // Use auto-fit bounds if zoom is undefined and we have positions
  const shouldAutoFit = zoom === undefined && allPositions.length > 0;
  const mapZoom = shouldAutoFit ? 13 : (zoom || 13);

  return (
    <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Show multiple routes if provided (for multiple users) */}
        {showRoute && validRoutes.length > 0 && validRoutes.map((routeItem, index) => (
          routeItem.positions.length > 0 && (
            <Polyline
              key={`route-${index}`}
              positions={routeItem.positions}
              pathOptions={{
                color: routeItem.color || routeColor,
                weight: 4,
                opacity: 0.7,
              }}
            />
          )
        ))}
        
        {/* Show single route if provided (for single user) */}
        {showRoute && validRoutes.length === 0 && validRoutePositions.length > 0 && (
          <Polyline
            positions={validRoutePositions}
            pathOptions={{
              color: routeColor,
              weight: 4,
              opacity: 0.7,
            }}
          />
        )}

        {/* Render markers */}
        {validMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={createCustomIcon(marker.color)}
          >
            <Popup>
              <div className="min-w-[200px]">
                <strong className="text-base">{marker.title}</strong>
                {marker.description && (
                  <div className="mt-2 text-sm space-y-1">
                    {marker.description.split(' | ').map((item, idx) => (
                      <div key={idx} className="text-muted-foreground">{item}</div>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit bounds if we have positions and zoom is undefined */}
        {shouldAutoFit && allPositions.length > 0 && <MapBounds positions={allPositions} />}
      </MapContainer>
    </div>
  );
};

export default MapView;
