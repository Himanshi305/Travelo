'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';
import RouteMap from '../../components/RouteMap';
import HotelCard from '../../components/HotelCard';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;
const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const resolveHotelImageUrl = (rawUrl) => {
  const normalized = String(rawUrl || '').trim();

  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return `${API_BASE_URL}${normalized}`;
  }

  return normalized;
};

const HotelsPage = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.user_metadata?.role === 'admin';

  const [adminHotels, setAdminHotels] = useState([]);
  const [adminHotelSubmitting, setAdminHotelSubmitting] = useState(false);
  const [adminHotelStatus, setAdminHotelStatus] = useState({ type: '', message: '' });
  const [adminHotelForm, setAdminHotelForm] = useState({
    hotel_name: '',
    address: '',
    hotel_url: '',
    hotel_details: '',
  });
  const [adminHotelImageFile, setAdminHotelImageFile] = useState(null);

  const [selectedDestination, setSelectedDestination] = useState(null);
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [featuredHotelsLoading, setFeaturedHotelsLoading] = useState(false);
  const [nearbyHotels, setNearbyHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingStatus, setBookingStatus] = useState({ type: '', message: '' });
  const bookingSectionRef = useRef(null);
  const [bookingForm, setBookingForm] = useState({
    check_in: '',
    check_out: '',
    guest_name: user?.user_metadata?.name || '',
    phone_no: '',
    email: user?.email || '',
    amount: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAdminHotels();
      return;
    }

    fetchFeaturedHotels();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    const raw = localStorage.getItem(getDestinationStorageKey(user?.id));
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.name) {
        setSelectedDestination(parsed);
      }
    } catch (error) {
      console.error('Failed to parse saved destination:', error);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    setBookingForm((prev) => ({
      ...prev,
      guest_name: prev.guest_name || user?.user_metadata?.name || '',
      email: prev.email || user?.email || '',
    }));
  }, [user?.user_metadata?.name, user?.email]);

  useEffect(() => {
    if (!selectedHotel || !bookingSectionRef.current) {
      return;
    }

    bookingSectionRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [selectedHotel]);

  const fetchAdminHotels = async () => {
    try {
      const { data } = await axios.get('/api/hotels/admin');
      setAdminHotels(data?.hotels || []);
    } catch (error) {
      console.error('Failed to fetch admin hotels:', error.message, error.response?.data);
      setAdminHotels([]);
    }
  };

  const fetchFeaturedHotels = async () => {
    setFeaturedHotelsLoading(true);
    try {
      const { data } = await axios.get('/api/hotels/featured');
      setFeaturedHotels(Array.isArray(data?.hotels) ? data.hotels : []);
    } catch (error) {
      console.error('Failed to fetch admin-added hotels:', error);
      setFeaturedHotels([]);
    } finally {
      setFeaturedHotelsLoading(false);
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
    const hotelAddress = (adminHotelForm.address || '').trim();
    const hotelUrl = (adminHotelForm.hotel_url || '').trim();
    const hotelDetails = (adminHotelForm.hotel_details || '').trim();

    if (!hotelName) {
      setAdminHotelStatus({ type: 'error', message: 'Hotel name is required.' });
      return;
    }

    if (!hotelAddress) {
      setAdminHotelStatus({ type: 'error', message: 'Hotel address is required.' });
      return;
    }

    setAdminHotelSubmitting(true);
    setAdminHotelStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('hotel_name', hotelName);
      formData.append('address', hotelAddress);
      formData.append('hotel_url', hotelUrl);
      formData.append('hotel_details', hotelDetails);

      if (adminHotelImageFile) {
        formData.append('hotel_image', adminHotelImageFile);
      }

      const { data } = await axios.post('/api/hotels/admin', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAdminHotelStatus({
        type: 'success',
        message: data?.message || 'Hotel added successfully.',
      });

      setAdminHotelForm({
        hotel_name: '',
        address: '',
        hotel_url: '',
        hotel_details: '',
      });
      setAdminHotelImageFile(null);

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

  const fetchNearbyHotels = async (lat, lng) => {
    if (!lat || !lng) {
      return;
    }

    setHotelsLoading(true);
    setBookingStatus({ type: '', message: '' });
    try {
      const { data } = await axios.get('/api/hotels/nearby', {
        params: { lat, lng },
      });
      setNearbyHotels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch nearby hotels:', error);
      setNearbyHotels([]);
      setBookingStatus({ type: 'error', message: 'Failed to load nearby hotels.' });
    } finally {
      setHotelsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    if (selectedDestination?.lat && selectedDestination?.lng) {
      fetchNearbyHotels(selectedDestination.lat, selectedDestination.lng);
    }
  }, [isAdmin, selectedDestination?.lat, selectedDestination?.lng]);

  const handleSelectDestination = (destination) => {
    setSelectedDestination(destination);
    localStorage.setItem(
      getDestinationStorageKey(user?.id),
      JSON.stringify({
        id: null,
        name: destination?.name || '',
        address: destination?.address || '',
        lat: destination?.lat ?? null,
        lng: destination?.lng ?? null,
      })
    );
  };

  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel);
    setBookingStatus({ type: '', message: '' });
    setBookingForm((prev) => ({
      ...prev,
      amount: Number(hotel?.price_per_night || 0),
    }));
  };

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value,
    }));
  };

  const getPostBookingRedirectUrl = (hotel) => {
    const officialUrl = String(hotel?.hotel_url || '').trim();
    if (/^https?:\/\//i.test(officialUrl)) {
      return officialUrl;
    }

    return 'https://www.makemytrip.com/hotels/';
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHotel) {
      return;
    }

    setBookingSubmitting(true);
    setBookingStatus({ type: '', message: '' });

    try {
      const payload = {
        hotel_id: String(selectedHotel.hotel_id || selectedHotel.place_id || ''),
        place_id: String(selectedHotel.place_id || selectedHotel.hotel_id || ''),
        hotel_name: selectedHotel.hotel_name,
        address: selectedHotel.address,
        rating: Number(selectedHotel.rating || 0),
        check_in: bookingForm.check_in,
        check_out: bookingForm.check_out,
        guest_name: bookingForm.guest_name,
        phone_no: bookingForm.phone_no,
        email: bookingForm.email,
        amount: Number(bookingForm.amount || 0),
      };

      const { data } = await axios.post('/api/bookings', payload);
      setBookingStatus({ type: 'success', message: data?.message || 'Booking saved successfully.' });
      setBookingForm((prev) => ({
        ...prev,
        check_in: '',
        check_out: '',
        phone_no: '',
      }));

      const redirectUrl = getPostBookingRedirectUrl(selectedHotel);
      setTimeout(() => {
        window.location.assign(redirectUrl);
      }, 800);
    } catch (error) {
      console.error('Failed to save booking:', error);
      setBookingStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to save booking.',
      });
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
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
        <h1 className="mb-2 text-center text-4xl font-bold sm:text-5xl">Hotel Creator</h1>

        {!isAdmin ? (
          <div className="mx-auto mt-8 max-w-6xl space-y-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h2 className="mb-3 text-3xl font-bold">Find Nearby Hotels</h2>
              <p className="mb-4 text-white/80">Search destination on map to get nearby hotels.</p>
              <RouteMap
                onPlaceSelect={handleSelectDestination}
                selectedDestinationName={selectedDestination?.name || ''}
              />
              {selectedDestination?.name && (
                <p className="mt-3 text-sm text-primary">Selected: {selectedDestination.name}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h3 className="mb-4 text-2xl font-bold">Admin Added Hotels</h3>
              {featuredHotelsLoading ? (
                <p className="text-white/80">Loading admin-added hotels...</p>
              ) : featuredHotels.length === 0 ? (
                <p className="text-white/80">No admin-added hotels yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {featuredHotels.map((hotel) => (
                    <HotelCard
                      key={`featured-${hotel.hotel_id}`}
                      hotel={hotel}
                      onSelect={handleSelectHotel}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h3 className="mb-4 text-2xl font-bold">Nearby Hotels</h3>
              {hotelsLoading ? (
                <p className="text-white/80">Loading nearby hotels...</p>
              ) : nearbyHotels.length === 0 ? (
                <p className="text-white/80">No nearby hotels yet. Select a destination on map.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {nearbyHotels.map((hotel) => (
                    <HotelCard
                      key={hotel.place_id || hotel.hotel_id}
                      hotel={hotel}
                      onSelect={handleSelectHotel}
                    />
                  ))}
                </div>
              )}
            </div>

            {selectedHotel && (
              <div ref={bookingSectionRef} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <h3 className="mb-4 text-2xl font-bold">Book: {selectedHotel.hotel_name}</h3>
                <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Check-in</label>
                    <input
                      type="date"
                      name="check_in"
                      value={bookingForm.check_in}
                      onChange={handleBookingChange}
                      className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Check-out</label>
                    <input
                      type="date"
                      name="check_out"
                      value={bookingForm.check_out}
                      onChange={handleBookingChange}
                      className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Guest Name</label>
                    <input
                      type="text"
                      name="guest_name"
                      value={bookingForm.guest_name}
                      onChange={handleBookingChange}
                      className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Phone</label>
                    <input
                      type="text"
                      name="phone_no"
                      value={bookingForm.phone_no}
                      onChange={handleBookingChange}
                      className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={bookingForm.email}
                      onChange={handleBookingChange}
                      className="w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    {bookingStatus.message && (
                      <p className={`mb-3 text-sm ${bookingStatus.type === 'success' ? 'text-primary' : 'text-red-300'}`}>
                        {bookingStatus.message}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={bookingSubmitting}
                      className="rounded-md bg-primary px-5 py-2 font-semibold text-black hover:brightness-95 disabled:opacity-70"
                    >
                      {bookingSubmitting ? 'Saving...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-2">Admin Hotel Management</h2>
            <p className="mb-6 text-white/80">Add and manage your own hotel listings.</p>

            <form onSubmit={submitAdminHotel} className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80">Hotel Name</label>
                <input
                  type="text"
                  name="hotel_name"
                  value={adminHotelForm.hotel_name}
                  onChange={handleAdminHotelInput}
                  placeholder="Enter hotel name"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Address</label>
                <input
                  type="text"
                  name="address"
                  value={adminHotelForm.address}
                  onChange={handleAdminHotelInput}
                  placeholder="Enter hotel address"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Hotel Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setAdminHotelImageFile(e.target.files?.[0] || null);
                  }}
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Hotel URL</label>
                <input
                  type="url"
                  name="hotel_url"
                  value={adminHotelForm.hotel_url}
                  onChange={handleAdminHotelInput}
                  placeholder="https://example.com/hotel"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Hotel Details</label>
                <textarea
                  name="hotel_details"
                  value={adminHotelForm.hotel_details}
                  onChange={handleAdminHotelInput}
                  rows={4}
                  placeholder="Describe your hotel"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                />
              </div>

              {adminHotelStatus.message && (
                <p className={`text-sm ${adminHotelStatus.type === 'success' ? 'text-primary' : 'text-red-300'}`}>
                  {adminHotelStatus.message}
                </p>
              )}

              <button
                type="submit"
                disabled={adminHotelSubmitting}
                className="w-full rounded-md bg-primary px-5 py-2 font-semibold text-black hover:brightness-95 disabled:opacity-70 sm:w-fit"
              >
                {adminHotelSubmitting ? 'Saving...' : 'Add Hotel'}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-white/20 bg-black/30 p-4">
              <h3 className="text-xl font-semibold mb-3">Your Added Hotels</h3>
              {adminHotels.length === 0 ? (
                <p className="text-gray-300 text-sm">No hotels added yet.</p>
              ) : (
                <div className="space-y-3">
                  {adminHotels.map((hotel) => (
                    <div key={hotel.hotel_id} className="rounded-md border border-white/15 bg-black/35 p-3">
                      <p className="text-base font-semibold text-white">{hotel.hotel_name}</p>
                      <p className="mt-1 text-sm text-gray-300">{hotel.address || 'Address not provided'}</p>
                      {hotel.hotel_image_url && (
                        <img
                          src={resolveHotelImageUrl(hotel.hotel_image_url)}
                          alt={hotel.hotel_name}
                          className="mt-2 h-28 w-full rounded object-cover"
                        />
                      )}
                      {hotel.hotel_url && (
                        <a
                          href={hotel.hotel_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-sm text-primary hover:text-white"
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
