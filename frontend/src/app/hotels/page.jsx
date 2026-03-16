'use client';
import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import axios from '../../services/axios';
import HotelCard from '../../components/HotelCard';
import GoogleMapsLoader from '../../components/GoogleMapsLoader';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const HotelsPage = () => {
  const [hotels, setHotels] = useState([]);
  const [destination, setDestination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.209 }); // Default center
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteRef = React.useRef(null);

  useEffect(() => {
    const storedDestination = localStorage.getItem('destination');
    if (storedDestination) {
      const parsedDestination = JSON.parse(storedDestination);
      setDestination(parsedDestination);
      setSearchQuery(parsedDestination.name || '');
      const center = { lat: parsedDestination.lat, lng: parsedDestination.lng };
      setMapCenter(center);
      fetchNearbyHotels(center.lat, center.lng);
    }
  }, []);

  const fetchNearbyHotels = async (lat, lng) => {
    setIsSearching(true);
    try {
      const response = await axios.get(`/api/hotels/nearby?lat=${lat}&lng=${lng}`);
      setHotels(response.data);
    } catch (error) {
      console.error('Failed to fetch nearby hotels:', error);
    } finally {
      setIsSearching(false);
    }
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

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const selectedDestination = {
      name: place.name || place.formatted_address || searchQuery,
      address: place.formatted_address || '',
      lat,
      lng,
    };

    setDestination(selectedDestination);
    setSearchQuery(selectedDestination.name || '');
    setMapCenter({ lat, lng });
    localStorage.setItem('destination', JSON.stringify(selectedDestination));
    fetchNearbyHotels(lat, lng);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold mb-2 text-center">
          Hotels Near {destination ? destination.name : 'Your Destination'}
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Showing hotels within a 5km radius
        </p>

        <GoogleMapsLoader libraries={['places']}>
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            <Autocomplete
              onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={handlePlaceChanged}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination to find nearby hotels"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Autocomplete>
          </div>

          <div className="mb-8">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={13}
            >
              {/* Destination marker */}
              {destination && (
                <Marker
                  position={{ lat: destination.lat, lng: destination.lng }}
                  title={destination.name || 'Destination'}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: { width: 40, height: 40 },
                  }}
                />
              )}
              {/* Hotel markers */}
              {hotels.map((hotel) => (
                <Marker
                  key={hotel.hotel_id}
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  title={hotel.hotel_name}
                />
              ))}
            </GoogleMap>
          </div>
        </GoogleMapsLoader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isSearching ? (
            <p>Searching hotels near your destination...</p>
          ) : hotels.length > 0 ? (
            hotels.map((hotel) => <HotelCard key={hotel.hotel_id} hotel={hotel} />)
          ) : (
            <p>No hotels found nearby.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HotelsPage;

