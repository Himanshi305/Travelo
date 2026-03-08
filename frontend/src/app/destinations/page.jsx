'use client'
import React, { useState, useEffect } from 'react';
import DestinationCard from '../../components/DestinationCard';
import MapPicker from '../../components/MapPicker';
import axios from '../../services/axios';

const DestinationsPage = () => {
  const [destinations, setDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDestination, setNewDestination] = useState({
    name: '',
    description: '',
    origin_lat: '',
    origin_lng: '',
    destination_lat: '',
    destination_lng: '',
  });

  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const res = await axios.get('/api/destinations');
        setDestinations(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDestinations();
  }, []);

  const handleLocationChange = (locations) => {
    setNewDestination({
      ...newDestination,
      origin_lat: locations.origin?.lat || '',
      origin_lng: locations.origin?.lng || '',
      destination_lat: locations.destination?.lat || '',
      destination_lng: locations.destination?.lng || '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewDestination({ ...newDestination, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/destinations', {
        name: newDestination.name,
        description: newDestination.description,
        latitude: newDestination.destination_lat,
        longitude: newDestination.destination_lng,
      });
      setDestinations([...destinations, res.data]);
      setNewDestination({
        name: '',
        description: '',
        origin_lat: '',
        origin_lng: '',
        destination_lat: '',
        destination_lng: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDestinations = destinations.filter((destination) =>
    destination.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Destinations</h1>
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search destinations..."
          className="w-full px-4 py-2 border rounded-md"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Add a New Destination</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={newDestination.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              value={newDestination.description}
              onChange={handleInputChange}
              rows="3"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Location
            </label>
            <MapPicker onLocationChange={handleLocationChange} />
          </div>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Destination
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDestinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
    </div>
  );
};

export default DestinationsPage;
