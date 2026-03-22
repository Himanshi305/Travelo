'use client';
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../../services/axios';
import RouteMap from '../../components/RouteMap';
import AuthContext from '../../context/AuthContext';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;

const DestinationsPage = () => {
  const { user } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestinationName, setSelectedDestinationName] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchDestinations();
    }
  }, [user?.id]);

  const fetchDestinations = async () => {
    try {
      const { data } = await axios.get('/api/destinations');
      setDestinations(data);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    }
  };

  const handlePlaceSelect = async ({ name, address, lat, lng }) => {
    setSaving(true);
    try {
      const { data } = await axios.post('/api/destinations', {
        destination_name: name,
      });
      setDestinations((prev) => [...prev, data]);

      localStorage.setItem(
        getDestinationStorageKey(user?.id),
        JSON.stringify({
          id: data?.id ?? null,
          name,
          address,
          lat,
          lng,
        })
      );

      router.push('/hotels');
    } catch (error) {
      console.error('Failed to save destination:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a)",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold mb-8 text-center">Destinations</h1>

        {/* Search and save destination */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Add a New Destination</h2>
          <p className="text-gray-300 mb-4">Search for a place on the map — it will be saved automatically when selected.</p>
          <RouteMap onPlaceSelect={handlePlaceSelect} selectedDestinationName={selectedDestinationName} />
          {saving && <p className="mt-2 text-blue-400">Saving destination...</p>}
        </div>

        {/* Display destinations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination) => (
            <button
              key={destination.id}
              type="button"
              onClick={() => setSelectedDestinationName(destination.destination_name)}
              className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-700 transition-colors"
            >
              <h3 className="text-xl font-bold">{destination.destination_name}</h3>
              <p className="text-xs text-blue-300 mt-3">Click to show route on map</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;
