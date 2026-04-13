'use client';
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { useRouter } from 'next/navigation';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';
import RouteMap from '../../components/RouteMap';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;
const getLiveLocationStorageKey = (userId) => `live_location:${userId || 'guest'}`;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (from, to) => {
  const fromLat = Number(from?.lat);
  const fromLng = Number(from?.lng);
  const toLat = Number(to?.lat);
  const toLng = Number(to?.lng);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const DestinationsPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.user_metadata?.role === 'admin';
  const [destinations, setDestinations] = useState([]);
  const [newDestinationName, setNewDestinationName] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [saving, setSaving] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveLocationStatus, setLiveLocationStatus] = useState({ type: '', message: '' });
  const router = useRouter();

  const distanceToSelectedDestinationKm = calculateDistanceKm(liveLocation, selectedDestination);

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

  useEffect(() => {
    if (!user?.id || isAdmin || typeof window === 'undefined') {
      return;
    }

    const stored = localStorage.getItem(getLiveLocationStorageKey(user.id));
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Number.isFinite(Number(parsed?.lat)) && Number.isFinite(Number(parsed?.lng))) {
        setLiveLocation({
          lat: Number(parsed.lat),
          lng: Number(parsed.lng),
        });
      }
    } catch {
      // Ignore malformed localStorage payload.
    }
  }, [user?.id, isAdmin]);

  const requestLiveLocation = () => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) {
      setLiveLocationStatus({
        type: 'error',
        message: 'Geolocation is not supported in this browser.',
      });
      return;
    }

    setLiveLocationStatus({ type: 'loading', message: 'Fetching your current location...' });

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
        };

        setLiveLocation(coords);
        localStorage.setItem(
          getLiveLocationStorageKey(user?.id),
          JSON.stringify({
            ...coords,
            accuracy: Number(position.coords.accuracy || 0),
            captured_at: new Date().toISOString(),
          })
        );
        setLiveLocationStatus({ type: 'success', message: 'Live location captured.' });
      },
      (error) => {
        const message =
          error?.code === 1
            ? 'Location permission denied. Please allow location access.'
            : 'Unable to get your live location right now.';
        setLiveLocationStatus({ type: 'error', message });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000,
      }
    );
  };

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
            <div className="mb-4 rounded-lg border border-white/20 bg-black/25 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-200">
                  {liveLocation
                    ? 'Live location detected. Distance will be shown for your selected destination.'
                    : 'Allow live location to see distance from your current location.'}
                </p>
                <button
                  type="button"
                  onClick={requestLiveLocation}
                  className="rounded-md border border-primary/60 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
                >
                  {liveLocation ? 'Refresh Live Location' : 'Enable Live Location'}
                </button>
              </div>
              {liveLocationStatus.message && (
                <p className={`mt-2 text-xs ${liveLocationStatus.type === 'error' ? 'text-red-300' : 'text-green-300'}`}>
                  {liveLocationStatus.message}
                </p>
              )}
            </div>
            <RouteMap 
              onPlaceSelect={setSelectedDestination} 
              selectedDestinationName={selectedDestination?.name || ''}
            />
            {selectedDestination?.name && (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-primary">Selected: {selectedDestination.name}</p>
                {liveLocation && Number.isFinite(distanceToSelectedDestinationKm) && (
                  <p className="text-sm text-emerald-300">
                    Distance from your live location: {distanceToSelectedDestinationKm.toFixed(1)} km
                  </p>
                )}
                {liveLocation && !Number.isFinite(distanceToSelectedDestinationKm) && (
                  <p className="text-sm text-yellow-300">
                    Distance unavailable for this destination.
                  </p>
                )}
              </div>
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
