'use client';
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;

const DestinationsPage = () => {
  const { user } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [newDestinationName, setNewDestinationName] = useState('');
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

  const saveAndGoToHotels = (destination) => {
    localStorage.setItem(
      getDestinationStorageKey(user?.id),
      JSON.stringify({
        id: destination?.destination_id ?? destination?.id ?? null,
        name: destination?.destination_name || '',
        address: '',
        lat: null,
        lng: null,
      })
    );

    router.push('/hotels');
  };

  const handleCreateDestination = async (e) => {
    e.preventDefault();
    const destinationName = (newDestinationName || '').trim();

    if (!destinationName) {
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post('/api/destinations', {
        destination_name: destinationName,
      });
      setDestinations((prev) => [...prev, data]);
      setNewDestinationName('');
      saveAndGoToHotels(data);
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
          <p className="text-gray-300 mb-4">Enter destination name and continue to hotels page.</p>
          <form onSubmit={handleCreateDestination} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newDestinationName}
              onChange={(e) => setNewDestinationName(e.target.value)}
              placeholder="Type destination name"
              className="w-full rounded-md border border-gray-600 bg-gray-700 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </form>
          {saving && <p className="mt-2 text-blue-400">Saving destination...</p>}
        </div>

        {/* Display destinations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination, index) => (
            <button
              key={destination.destination_id ?? destination.id ?? `${destination.destination_name}-${index}`}
              type="button"
              onClick={() => saveAndGoToHotels(destination)}
              className="bg-gray-800 rounded-lg p-4 text-left hover:bg-gray-700 transition-colors"
            >
              <h3 className="text-xl font-bold">{destination.destination_name}</h3>
              <p className="text-xs text-blue-300 mt-3">Click to continue to hotels</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;
