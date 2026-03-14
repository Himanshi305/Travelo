'use client';

import React from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const defaultLibraries = ['places'];

const GoogleMapsLoader = ({ children, libraries = defaultLibraries }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="text-sm text-red-400">
        Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.
      </div>
    );
  }

  if (loadError) {
    return <div className="text-sm text-red-400">Failed to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div className="text-sm text-gray-400">Loading map...</div>;
  }

  return <>{children}</>;
};

export default GoogleMapsLoader;