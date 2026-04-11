'use client';

import {
  GoogleMap,
  DirectionsRenderer,
  Autocomplete,
} from '@react-google-maps/api';
import { useState, useRef, useEffect } from 'react';
import GoogleMapsLoader from './GoogleMapsLoader';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = { lat: 28.6139, lng: 77.209 }; // Default to Delhi

const RouteMap = ({ onPlaceSelect, selectedDestinationName = '' }) => {
  const [directions, setDirections] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const autocompleteRef = useRef(null);

  const renderRouteToDestination = (destinationLocation) => {
    if (!destinationLocation || !window.google?.maps) {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const origin = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          {
            origin,
            destination: destinationLocation,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK' && result) {
              setDirections(result);
            }
          }
        );
      },
      () => {}
    );
  };

  useEffect(() => {
    if (!selectedDestinationName || !window.google?.maps) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: selectedDestinationName }, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) {
        return;
      }

      const location = results[0].geometry.location;
      const destinationLocation = {
        lat: location.lat(),
        lng: location.lng(),
      };

      setMapCenter(destinationLocation);
      renderRouteToDestination(destinationLocation);
    });
  }, [selectedDestinationName]);

  const handlePlaceChanged = () => {
    const autocomplete = autocompleteRef.current;

    if (!autocomplete || typeof autocomplete.getPlace !== 'function') {
      return;
    }

    const place = autocomplete.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      return;
    }

    const destination = place.geometry.location;
    const destinationLocation = {
      lat: destination.lat(),
      lng: destination.lng(),
    };
    setMapCenter(destinationLocation);

    const selectedDestination = {
      name: place.name,
      address: place.formatted_address,
      lat: destinationLocation.lat,
      lng: destinationLocation.lng,
    };

    if (onPlaceSelect) {
      onPlaceSelect(selectedDestination);
    }

    renderRouteToDestination(destinationLocation);
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