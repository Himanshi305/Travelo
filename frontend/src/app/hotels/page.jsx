'use client';
import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from '../../services/axios';
import HotelCard from '../../components/HotelCard';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const HotelsPage = () => {
  const [hotels, setHotels] = useState([]);
  const [destination, setDestination] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.209 }); // Default center

  useEffect(() => {
    const storedDestination = localStorage.getItem('destination');
    if (storedDestination) {
      const parsedDestination = JSON.parse(storedDestination);
      setDestination(parsedDestination);
      const center = { lat: parsedDestination.lat, lng: parsedDestination.lng };
      setMapCenter(center);
      fetchNearbyHotels(center.lat, center.lng);
    }
  }, []);

  const fetchNearbyHotels = async (lat, lng) => {
    try {
      const { data } = await axios.get(`/api/hotels/nearby?lat=${lat}&lng=${lng}`);
      setHotels(data);
    } catch (error) {
      console.error('Failed to fetch nearby hotels:', error);
    }
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

        <div className="mb-8">
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={13}
            >
              {hotels.map((hotel) => (
                <Marker
                  key={hotel.hotel_id}
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  title={hotel.hotel_name}
                />
              ))}
            </GoogleMap>
          </LoadScript>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hotels.length > 0 ? (
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

