'use client';
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';
import RouteMap from '../../components/RouteMap';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;

const DestinationsPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.user_metadata?.role === 'admin';
  const [destinations, setDestinations] = useState([]);
  const [newDestinationName, setNewDestinationName] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) {
      router.replace('/hotels');
    }
  }, [isAdmin, router]);

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
        name: destination?.destination_name || destination?.name || '',
        address: destination?.address || '',
        lat: destination?.lat ?? null,
        lng: destination?.lng ?? null,
      })
    );

    router.push('/hotels');
  };

  const handleUserContinue = async () => {
    if (!selectedDestination?.name) {
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post('/api/destinations', {
        destination_name: selectedDestination.name,
      });

      setDestinations((prev) => [...prev, data]);
      saveAndGoToHotels({
        ...data,
        name: selectedDestination.name,
        address: selectedDestination.address,
        lat: selectedDestination.lat,
        lng: selectedDestination.lng,
      });
    } catch (error) {
      console.error('Failed to save destination:', error);
    } finally {
      setSaving(false);
    }
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dwuljx2zv/image/upload/v1774700770/Complete_Guide_To_Backpacking_In_Arunachal_Pradesh_-_Lost_With_Purpose_ioqn7q.jpg')",
          filter: 'blur(4px)',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-32 sm:px-8">
        <h1 className="mb-8 text-center text-4xl font-bold sm:text-5xl">Destinations</h1>

        {isAdmin ? (
          <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-4">Add a New Destination</h2>
            <p className="text-gray-300 mb-4">Enter destination name and continue to hotels page.</p>
            <form onSubmit={handleCreateDestination} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newDestinationName}
                onChange={(e) => setNewDestinationName(e.target.value)}
                placeholder="Type destination name"
                className="w-full rounded-md border border-white/20 bg-black/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-5 py-3 font-semibold text-black hover:brightness-95 disabled:opacity-70"
              >
                {saving ? 'Saving...' : 'Save & Continue'}
              </button>
            </form>
            {saving && <p className="mt-2 text-primary">Saving destination...</p>}
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-4">Choose Destination on Map</h2>
            <p className="mb-4 text-gray-300">Search your destination and continue to nearby hotels.</p>
            <RouteMap 
              onPlaceSelect={setSelectedDestination} 
              selectedDestinationName={selectedDestination?.name || ''}
            />
            {selectedDestination?.name && (
              <p className="mt-3 text-sm text-primary">
                Selected: {selectedDestination.name}
              </p>
            )}
            <button
              type="button"
              onClick={handleUserContinue}
              disabled={saving || !selectedDestination?.name}
              className="mt-4 rounded-md bg-primary px-5 py-3 font-semibold text-black hover:brightness-95 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        )}

        {/* Display destinations */}
        {destinations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Saved Destinations</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {destinations.map((destination, index) => (
                <button
                  key={destination.destination_id ?? destination.id ?? `${destination.destination_name}-${index}`}
                  type="button"
                  onClick={() => setSelectedDestination({
                    name: destination.destination_name ||destination.name || '',
                    address: destination.address || '',
                    lat: destination.lat ?? null,
                    lng: destination.lng ?? null,
                  })}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 text-left backdrop-blur-md transition hover:bg-white/15"
                >
                  <h3 className="text-xl font-bold">{destination.destination_name}</h3>
                  <p className="mt-3 text-xs text-primary">Click to view on map</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DestinationsPage;
