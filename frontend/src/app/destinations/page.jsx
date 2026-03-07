'use client'
import React, { useState, useEffect } from 'react';
import DestinationCard from '../../components/DestinationCard';
import axios from '../../services/axios';

const DestinationsPage = () => {
  const [destinations, setDestinations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredDestinations.map((destination) => (
          <DestinationCard key={destination.id} destination={destination} />
        ))}
      </div>
    </div>
  );
};

export default DestinationsPage;
