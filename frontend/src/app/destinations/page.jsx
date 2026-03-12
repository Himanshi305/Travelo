'use client';
import React, { useState, useEffect } from 'react';
import axios from '../../services/axios';
import RouteMap from '../../components/RouteMap';

const DestinationsPage = () => {
  const [destinations, setDestinations] = useState([]);
  const [newDestination, setNewDestination] = useState({
    destination_name: '',
    location: '',
    rating: '',
    image_url: '',
  });

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const { data } = await axios.get('/api/destinations');
      setDestinations(data);
    } catch (error) {
      console.error('Failed to fetch destinations:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDestination((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceSelect = (location) => {
    setNewDestination((prev) => ({ ...prev, location }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post('/api/destinations', {
        destination_name: newDestination.destination_name,
        location: newDestination.location,
        rating: newDestination.rating,
        image_url: newDestination.image_url,
      });
      setDestinations((prev) => [...prev, data]);
      setNewDestination({
        destination_name: '',
        location: '',
        rating: '',
        image_url: '',
      });
    } catch (error) {
      console.error('Failed to create destination:', error);
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

        {/* Form to add new destination */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Add a New Destination</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="destination_name"
                placeholder="Destination Name"
                value={newDestination.destination_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
              <input
                type="text"
                name="rating"
                placeholder="Rating (1-5)"
                value={newDestination.rating}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
              <input
                type="text"
                name="image_url"
                placeholder="Image URL"
                value={newDestination.image_url}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
              />
            </div>
            <div className="mt-4">
              <RouteMap onPlaceSelect={handlePlaceSelect} />
            </div>
            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Destination
            </button>
          </form>
        </div>

        {/* Display destinations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination) => (
            <div key={destination.destination_id} className="bg-gray-800 rounded-lg overflow-hidden">
              <img src={destination.image_url} alt={destination.destination_name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <h3 className="text-xl font-bold">{destination.destination_name}</h3>
                <p className="text-gray-400">{destination.location}</p>
                <p className="text-yellow-500">Rating: {destination.rating}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DestinationsPage;
