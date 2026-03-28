'use client';

import React, { useContext, useEffect, useState } from 'react';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';

const HotelsPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.user_metadata?.role === 'admin';

  const [adminHotels, setAdminHotels] = useState([]);
  const [adminHotelSubmitting, setAdminHotelSubmitting] = useState(false);
  const [adminHotelStatus, setAdminHotelStatus] = useState({ type: '', message: '' });
  const [adminHotelForm, setAdminHotelForm] = useState({
    hotel_name: '',
    hotel_url: '',
    hotel_details: '',
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAdminHotels();
    }
  }, [isAdmin]);

  const fetchAdminHotels = async () => {
    try {
      const { data } = await axios.get('/api/hotels/admin');
      setAdminHotels(data?.hotels || []);
    } catch (error) {
      console.error('Failed to fetch admin hotels:', error.message, error.response?.data);
      setAdminHotels([]);
    }
  };

  const handleAdminHotelInput = (e) => {
    const { name, value } = e.target;
    setAdminHotelForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitAdminHotel = async (e) => {
    e.preventDefault();

    const hotelName = (adminHotelForm.hotel_name || '').trim();
    const hotelUrl = (adminHotelForm.hotel_url || '').trim();
    const hotelDetails = (adminHotelForm.hotel_details || '').trim();

    if (!hotelName) {
      setAdminHotelStatus({ type: 'error', message: 'Hotel name is required.' });
      return;
    }

    setAdminHotelSubmitting(true);
    setAdminHotelStatus({ type: '', message: '' });

    try {
      const { data } = await axios.post('/api/hotels/admin', {
        hotel_name: hotelName,
        hotel_url: hotelUrl,
        hotel_details: hotelDetails,
      });

      setAdminHotelStatus({
        type: 'success',
        message: data?.message || 'Hotel added successfully.',
      });

      setAdminHotelForm({
        hotel_name: '',
        hotel_url: '',
        hotel_details: '',
      });

      fetchAdminHotels();
    } catch (error) {
      setAdminHotelStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to add hotel.',
      });
    } finally {
      setAdminHotelSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold mb-2 text-center">Hotel Creator</h1>

        {!isAdmin ? (
          <div className="mx-auto mt-8 max-w-2xl rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
            <p className="text-gray-200">Only admin users can access the hotel creator.</p>
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-blue-700 bg-blue-900/40 p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-2">Admin Hotel Management</h2>
            <p className="text-blue-100 mb-6">Add and manage your own hotel listings.</p>

            <form onSubmit={submitAdminHotel} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-100">Hotel Name</label>
                <input
                  type="text"
                  name="hotel_name"
                  value={adminHotelForm.hotel_name}
                  onChange={handleAdminHotelInput}
                  placeholder="Enter hotel name"
                  className="mt-1 w-full rounded-md border border-blue-700 bg-gray-900 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100">Hotel URL</label>
                <input
                  type="url"
                  name="hotel_url"
                  value={adminHotelForm.hotel_url}
                  onChange={handleAdminHotelInput}
                  placeholder="https://example.com/hotel"
                  className="mt-1 w-full rounded-md border border-blue-700 bg-gray-900 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-100">Hotel Details</label>
                <textarea
                  name="hotel_details"
                  value={adminHotelForm.hotel_details}
                  onChange={handleAdminHotelInput}
                  rows={4}
                  placeholder="Describe your hotel"
                  className="mt-1 w-full rounded-md border border-blue-700 bg-gray-900 px-3 py-2 text-white"
                />
              </div>

              {adminHotelStatus.message && (
                <p className={`text-sm ${adminHotelStatus.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                  {adminHotelStatus.message}
                </p>
              )}

              <button
                type="submit"
                disabled={adminHotelSubmitting}
                className="w-full sm:w-fit rounded-md bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {adminHotelSubmitting ? 'Saving...' : 'Add Hotel'}
              </button>
            </form>

            <div className="mt-6 rounded-lg border border-blue-800 bg-gray-800/70 p-4">
              <h3 className="text-xl font-semibold mb-3">Your Added Hotels</h3>
              {adminHotels.length === 0 ? (
                <p className="text-gray-300 text-sm">No hotels added yet.</p>
              ) : (
                <div className="space-y-3">
                  {adminHotels.map((hotel) => (
                    <div key={hotel.hotel_id} className="rounded-md border border-gray-700 bg-gray-900/80 p-3">
                      <p className="text-base font-semibold text-white">{hotel.hotel_name}</p>
                      {hotel.hotel_url && (
                        <a
                          href={hotel.hotel_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-sm text-blue-300 hover:text-blue-200"
                        >
                          {hotel.hotel_url}
                        </a>
                      )}
                      {hotel.hotel_details && (
                        <p className="mt-1 text-sm text-gray-300">{hotel.hotel_details}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelsPage;
