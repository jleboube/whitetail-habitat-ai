// Fix: Add reference to google.maps types to resolve namespace errors for the google object.
/// <reference types="@types/google.maps" />

import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { GoogleMap, HeatmapLayer, Polyline, Marker } from '@react-google-maps/api';
import { LatLng, DeerHotspot, DeerCorridor } from '../types';
import { getDeerDensityData } from '../services/aiService';
import { Provider } from '../config/providers';
import { Loader, AlertTriangle } from 'lucide-react';
import MapControls from './MapControls';
import MapLegend from './MapLegend';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions: google.maps.MapOptions = {
  mapTypeId: 'satellite',
  disableDefaultUI: true,
  zoomControl: false,
};

const corridorOptions: google.maps.PolylineOptions = {
    strokeColor: '#FF8C00', // DarkOrange
    strokeOpacity: 0.8,
    strokeWeight: 2,
    icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
        offset: '0',
        repeat: '20px'
    }],
};

interface MapPanelProps {
  location: LatLng | null;
  isLoaded: boolean;
  loadError?: Error;
  provider: Provider;
  className?: string;
}

const MapPanel: React.FC<MapPanelProps> = ({ location, isLoaded, loadError, provider, className }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showDeerLayer, setShowDeerLayer] = useState(false);
  const [deerData, setDeerData] = useState<{ hotspots: DeerHotspot[], corridors: DeerCorridor[] }>({ hotspots: [], corridors: [] });
  const [isMapDataLoading, setIsMapDataLoading] = useState(false);

  // Fix: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  
  const fetchDeerData = useCallback(async () => {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;

    setIsMapDataLoading(true);
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const mapBounds = {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
    };
    const data = await getDeerDensityData(mapBounds, provider);
    setDeerData(data);
    setIsMapDataLoading(false);
  }, [map, provider]);

  const onIdle = () => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
    }
    if (showDeerLayer) {
        timeoutRef.current = setTimeout(() => {
            fetchDeerData();
        }, 1000); // Debounce for 1 second
    }
  };
  
  const handleToggleLayer = () => {
    const newVisibility = !showDeerLayer;
    setShowDeerLayer(newVisibility);
    if (newVisibility && deerData.hotspots.length === 0) { // Fetch data on first toggle
        fetchDeerData();
    }
  };

  useEffect(() => {
    if (showDeerLayer) {
      fetchDeerData();
    }
  }, [provider, showDeerLayer, fetchDeerData]);

  const handleZoomIn = () => map?.setZoom((map.getZoom() || 12) + 1);
  const handleZoomOut = () => map?.setZoom((map.getZoom() || 12) - 1);
  const handleRecenter = () => location && map?.panTo(location);

  if (loadError) {
    return (
      <div className={clsx("flex flex-col items-center justify-center text-red-400 p-4 text-center bg-gray-800", className)}>
        <AlertTriangle size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Map Error</h2>
        <p>Could not load Google Maps. Please check your API key and network connection.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={clsx("flex flex-col items-center justify-center text-gray-400 bg-gray-800", className)}>
        <Loader className="animate-spin mb-4" size={48} />
        <p>Loading Map...</p>
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col bg-gray-700 relative", className)}>
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={location || { lat: 40.7128, lng: -74.0060 }} // Default to NYC if no location
            zoom={location ? 14 : 8}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onIdle={onIdle}
            options={mapOptions}
        >
            {location && <Marker position={location} />}
            {showDeerLayer && (
                <>
                    <HeatmapLayer
                        data={deerData.hotspots.map(h => ({ location: new google.maps.LatLng(h.lat, h.lng), weight: h.weight }))}
                        options={{ radius: 40, opacity: 0.7 }}
                    />
                    {deerData.corridors.map((corridor, index) => (
                        <Polyline key={index} path={corridor.path} options={corridorOptions} />
                    ))}
                </>
            )}
        </GoogleMap>
        <div className="absolute top-4 right-4 z-10">
            <MapControls
                onToggleLayer={handleToggleLayer}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onRecenter={handleRecenter}
                isLayerVisible={showDeerLayer}
                isLoading={isMapDataLoading}
            />
        </div>
        <div className="absolute bottom-4 left-4 z-10">
            <MapLegend isLayerVisible={showDeerLayer}/>
        </div>
    </div>
  );
};

export default MapPanel;
