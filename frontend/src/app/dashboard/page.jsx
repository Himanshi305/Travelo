'use client';

import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from '../../services/axios';
import DestinationModal from '../../components/DestinationModal';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);

  useEffect(() => {
    if (user?.user_metadata?.role === 'admin') {
      fetchDestinations();
    }
    fetchHotels();
  }, [user]);

  const fetchDestinations = async () => {
    try {
      const res = await axios.get('/api/destinations');
      setDestinations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHotels = async () => {
    try {
      const res = await axios.get('/api/hotels');
      setHotels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    setSelectedDestination(null);
    setIsModalOpen(true);
  };

  const handleEdit = (destination) => {
    setSelectedDestination(destination);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this destination?')) {
      try {
        await axios.delete(`/api/destinations/${id}`);
        fetchDestinations();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async (destination) => {
    try {
      if (destination.id) {
        await axios.put(`/api/destinations/${destination.id}`, destination);
      } else {
        await axios.post('/api/destinations', destination);
      }
      fetchDestinations();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
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
        <h1 className="text-5xl font-bold mb-8 text-center">Dashboard</h1>

        <div className="mb-8 bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">User Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-200">
            <div className="bg-gray-700/60 rounded-md p-4">
              <p className="text-sm text-gray-300">Name</p>
              <p className="text-lg font-semibold">{user?.user_metadata?.name || 'Not provided'}</p>
            </div>
            <div className="bg-gray-700/60 rounded-md p-4">
              <p className="text-sm text-gray-300">Email</p>
              <p className="text-lg font-semibold">{user?.email || 'Not available'}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
          <h2 className="text-3xl font-bold mb-6">Stored Hotels</h2>
          {hotels.length === 0 ? (
            <p className="text-gray-300">No hotels stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotels.map((hotel) => (
                <div key={hotel.place_id || hotel.hotel_id || `${hotel.hotel_name}-${hotel.address}`} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h3 className="text-xl font-bold">{hotel.hotel_name}</h3>
                  <p className="text-sm text-gray-300 mt-1">{hotel.address}</p>
                  <div className="mt-3 text-sm text-gray-300 space-y-1">
                    <p>Rating: {Number(hotel.rating || 0).toFixed(1)}</p>
                    <p>Price/Night: ${Number(hotel.price_per_night || 0).toFixed(2)}</p>
                    {hotel.contact_no && <p>Contact: {hotel.contact_no}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {user?.user_metadata?.role === 'admin' && (
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Manage Destinations</h2>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleAdd}
              >
                Add Destination
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr className="bg-gray-700 text-gray-300 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Name</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200 text-sm font-light">
                  {destinations.map((dest) => (
                    <tr key={dest.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        <span className="font-medium">{dest.destination_name}</span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex item-center justify-center">
                          <button
                            onClick={() => handleEdit(dest)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2 hover:bg-blue-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(dest.id)}
                            className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {isModalOpen && (
        <DestinationModal
          destination={selectedDestination}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Dashboard;

