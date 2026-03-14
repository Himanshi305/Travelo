'use client';

import {
  GoogleMap,
  DirectionsRenderer,
  Autocomplete,
} from '@react-google-maps/api';
import { useState, useRef } from 'react';
import GoogleMapsLoader from './GoogleMapsLoader';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = { lat: 28.6139, lng: 77.209 }; // Default to Delhi

const RouteMap = ({ onPlaceSelect }) => {
  const [directions, setDirections] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    const autocomplete = autocompleteRef.current;

    if (!autocomplete || typeof autocomplete.getPlace !== 'function') {
      console.log('Autocomplete is not ready yet');
      return;
    }

    const place = autocomplete.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      console.log('Autocomplete place is missing geometry');
      return;
    }

    const destination = place.geometry.location;
    setMapCenter(destination);

    const selectedDestination = {
      name: place.name,
      address: place.formatted_address,
      lat: destination.lat(),
      lng: destination.lng(),
    };

    if (onPlaceSelect) {
      onPlaceSelect(selectedDestination);
    }

    // Get user's current location and calculate route
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const origin = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(
            {
              origin: origin,
              destination: destination,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK' && result) {
                setDirections(result);
              } else {
                console.error('Error fetching directions:', {
                  status,
                  result,
                });
              }
            }
          );
        },
        () => {
          // Handle geolocation error (e.g., user denies permission)
          console.error('Geolocation failed or was denied.');
        }
      );
    }
  };

  return (
    <GoogleMapsLoader libraries={['places']}>
      <div className="mb-4">
        <Autocomplete
          onLoad={(autocomplete) => {
            autocompleteRef.current = autocomplete;
          }}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            type="text"
            placeholder="Enter a destination"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </Autocomplete>
      </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={10}
      >
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </GoogleMapsLoader>
  );
};

export default RouteMap;