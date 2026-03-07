'use client';

import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from '../../services/axios';
import DestinationModal from '../../components/DestinationModal';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [destinations, setDestinations] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);

  useEffect(() => {
    if (user?.user_metadata?.role === 'admin') {
      fetchDestinations();
    }
  }, [user]);

  const fetchDestinations = async () => {
    try {
      const res = await axios.get('/api/destinations');
      setDestinations(res.data);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <p className="mb-8">Welcome, {user?.email}</p>

      {user?.user_metadata?.role === 'admin' && (
        <div>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Manage Destinations</h2>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={handleAdd}
            >
              Add Destination
            </button>
          </div>

          <div className="bg-white shadow-md rounded my-6">
            <table className="min-w-max w-full table-auto">
              <thead>
                <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Name</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {destinations.map((dest) => (
                  <tr key={dest.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-medium">{dest.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center">
                        <button
                          onClick={() => handleEdit(dest)}
                          className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(dest.id)}
                          className="w-4 mr-2 transform hover:text-red-500 hover:scale-110"
                        >
                          Delete
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

      <DestinationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        destination={selectedDestination}
      />
    </div>
  );
};

export default Dashboard;

