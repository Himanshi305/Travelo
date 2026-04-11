'use client';

import {
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { useState, useRef, useEffect } from 'react';
import GoogleMapsLoader from './GoogleMapsLoader';

const containerStyle = {
  width: '100%',
  height: '500px',
};

const center = { lat: 28.6139, lng: 77.209 }; // Default to Delhi

const HotelSearchMap = ({ onPlaceSelect, hotels = [], selectedHotelId = null }) => {
  const [directions, setDirections] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const autocompleteRef = useRef(null);

  // Get user's geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setMapCenter(location);
      },
      () => {}
    );
  }, []);

  const renderRouteToPlace = (placeLocation) => {
    if (!placeLocation || !window.google?.maps || !userLocation) {
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: placeLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );
  };

  const handlePlaceChanged = () => {
    const autocomplete = autocompleteRef.current;

    if (!autocomplete || typeof autocomplete.getPlace !== 'function') {
      return;
    }

    const place = autocomplete.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      return;
    }

    const location = place.geometry.location;
    const placeLocation = {
      lat: location.lat(),
      lng: location.lng(),
    };

    setMapCenter(placeLocation);
    setSelectedPlace({
      name: place.name || place.formatted_address,
      address: place.formatted_address,
      lat: placeLocation.lat,
      lng: placeLocation.lng,
    });

    renderRouteToPlace(placeLocation);

    if (onPlaceSelect) {
      onPlaceSelect({
        name: place.name || place.formatted_address,
        address: place.formatted_address,
        lat: placeLocation.lat,
        lng: placeLocation.lng,
      });
    }
  };

  // Filter hotels within a reasonable distance (e.g., 25 km)
  const visibleHotels = hotels.filter((hotel) => {
    if (!selectedPlace || !hotel.lat || !hotel.lng) {
      return true;
    }

    const distance = Math.sqrt(
      Math.pow(hotel.lat - selectedPlace.lat, 2) +
      Math.pow(hotel.lng - selectedPlace.lng, 2)
    );

    // Rough filter: hotels within ~0.25 degrees (about 25km)
    return distance < 0.25;
  });

  return (
    <GoogleMapsLoader libraries={['places']}>
      <div className="space-y-4">
        <div>
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
            }}
            onPlaceChanged={handlePlaceChanged}
          >
            <input
              type="text"
              placeholder="Search a place (e.g., Mumbai, India)"
              className="w-full rounded-md border border-white/20 bg-black/30 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Autocomplete>
          {selectedPlace && (
            <p className="mt-2 text-sm text-blue-400">
              Selected: {selectedPlace.name}
            </p>
          )}
        </div>

        <GoogleMap mapContainerStyle={containerStyle} center={mapCenter} zoom={12}>
          {/* User location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              title="Your Location"
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: 8,
                fillColor: '#4F46E5',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
            />
          )}

          {/* Selected place marker */}
          {selectedPlace && (
            <Marker
              position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
              title={selectedPlace.name}
              icon={{
                path: window.google?.maps?.SymbolPath?.CIRCLE,
                scale: 10,
                fillColor: '#10B981',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
            />
          )}

          {/* Hotel markers */}
          {visibleHotels.map((hotel) => (
            <Marker
              key={`hotel-${hotel.hotel_id}`}
              position={{ lat: parseFloat(hotel.lat || 0), lng: parseFloat(hotel.lng || 0) }}
              title={hotel.hotel_name}
              icon={{
                path: window.google?.maps?.SymbolPath?.BACKWARD_CLOSED_ARROW,
                scale: 8,
                fillColor: selectedHotelId === hotel.hotel_id ? '#F59E0B' : '#EC4899',
                fillOpacity: selectedHotelId === hotel.hotel_id ? 1 : 0.7,
                strokeColor: '#fff',
                strokeWeight: 2,
              }}
            />
          ))}

          {/* Route/Directions */}
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>

        {selectedPlace && visibleHotels.length > 0 && (
          <p className="text-sm text-white/70">
            Found {visibleHotels.length} hotel(s) near your search location
          </p>
        )}
      </div>
    </GoogleMapsLoader>
  );
};

export default HotelSearchMap;
