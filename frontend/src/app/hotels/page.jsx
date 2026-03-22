'use client';
import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import axios from '../../services/axios';
import HotelCard from '../../components/HotelCard';
import GoogleMapsLoader from '../../components/GoogleMapsLoader';
import { useContext } from 'react';
import AuthContext from '../../context/AuthContext';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;

const HotelsPage = () => {
  const { user } = useContext(AuthContext);
  const [hotels, setHotels] = useState([]);
  const [destination, setDestination] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.209 }); // Default center
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingStatus, setBookingStatus] = useState({ type: '', message: '' });
  const [bookingForm, setBookingForm] = useState({
    guest_name: '',
    email: '',
    phone_no: '',
    checkin_date: '',
    checkout_date: '',
    amount: '',
  });
  const autocompleteRef = React.useRef(null);

  useEffect(() => {
    setBookingForm((prev) => ({
      ...prev,
      email: user?.email || prev.email,
    }));
  }, [user]);

  useEffect(() => {
    const storageKey = getDestinationStorageKey(user?.id);
    const storedDestination = localStorage.getItem(storageKey);
    if (storedDestination) {
      const parsedDestination = JSON.parse(storedDestination);
      setDestination(parsedDestination);
      setSearchQuery(parsedDestination.name || '');
      const center = { lat: parsedDestination.lat, lng: parsedDestination.lng };
      setMapCenter(center);
      fetchNearbyHotels(center.lat, center.lng);
    }
  }, [user?.id]);

  const fetchNearbyHotels = async (lat, lng) => {
    setIsSearching(true);
    try {
      const response = await axios.get(`/api/hotels/nearby?lat=${lat}&lng=${lng}`);
      setHotels(response.data);
    } catch (error) {
      console.error('Failed to fetch nearby hotels:', error.message, error.response?.data);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceChanged = () => {
    const autocomplete = autocompleteRef.current;

    if (!autocomplete || typeof autocomplete.getPlace !== 'function') {
      return;
    }

    const place = autocomplete.getPlace();

    if (!place || !place.geometry || !place.geometry.location) {
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const selectedDestination = {
      name: place.name || place.formatted_address || searchQuery,
      address: place.formatted_address || '',
      lat,
      lng,
    };

    setDestination(selectedDestination);
    setSearchQuery(selectedDestination.name || '');
    setMapCenter({ lat, lng });
    localStorage.setItem(getDestinationStorageKey(user?.id), JSON.stringify(selectedDestination));
    fetchNearbyHotels(lat, lng);
  };

  const getHotelImage = (hotel) => {
    if (hotel.photo_reference && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${hotel.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
    }

    return `https://source.unsplash.com/1000x700/?luxury,hotel,${encodeURIComponent(hotel.hotel_name || 'travel')}`;
  };

  const getHotelOfficialPageUrl = (hotel) => {
    if (!hotel) {
      return 'https://www.google.com/travel/hotels';
    }

    if (hotel.place_id) {
      return `https://www.google.com/maps/place/?q=place_id:${hotel.place_id}`;
    }

    const query = `${hotel.hotel_name || 'hotel'} ${hotel.address || ''}`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  };

  const saveSelectedHotel = async (hotel) => {
    const placeId = hotel?.place_id || hotel?.google_place_id || null;

    if (!placeId) {
      console.error('saveSelectedHotel failed: place_id missing for selected hotel.', hotel);
      return hotel;
    }

    try {
      const { data } = await axios.post('/api/hotels', {
        place_id: placeId,
        hotel_name: hotel.hotel_name,
        address: hotel.address || '',
        rating: Number(hotel.rating || 0),
      });

      return {
        ...hotel,
        ...(data?.hotel || {}),
      };
    } catch (error) {
      console.error('Failed to save selected hotel:', error.message, error.response?.data);
      return hotel;
    }
  };

  const openHotelModal = async (hotel) => {
    const persistedHotel = await saveSelectedHotel(hotel);
    setSelectedHotel(persistedHotel);
    setShowBookingForm(false);
    setBookingStatus({ type: '', message: '' });
    setBookingForm((prev) => ({
      ...prev,
      guest_name: '',
      email: user?.email || prev.email || '',
      phone_no: '',
      checkin_date: '',
      checkout_date: '',
      amount: hotel?.price_per_night > 0 ? Number(hotel.price_per_night).toFixed(2) : '',
    }));
  };

  const closeHotelModal = () => {
    setSelectedHotel(null);
    setShowBookingForm(false);
    setBookingStatus({ type: '', message: '' });
  };

  const handleBookingInput = (e) => {
    const { name, value } = e.target;
    setBookingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submitBooking = async (e) => {
    e.preventDefault();

    const resolvedHotelId = selectedHotel?.hotel_id || selectedHotel?.place_id || null;

    if (!resolvedHotelId) {
      setBookingStatus({ type: 'error', message: 'No hotel selected for booking.' });
      return;
    }

    setIsSubmittingBooking(true);
    setBookingStatus({ type: '', message: '' });

    try {
      const payload = {
        user_id: user?.id,
        destination_id: destination?.id ?? null,
        hotel_id: resolvedHotelId,
        hotel_name: selectedHotel.hotel_name,
        address: selectedHotel.address,
        rating: Number(selectedHotel.rating || 0),
        guest_name: bookingForm.guest_name,
        email: bookingForm.email,
        phone_no: bookingForm.phone_no,
        check_in: bookingForm.checkin_date,
        check_out: bookingForm.checkout_date,
        amount: bookingForm.amount,
      };

      const { data } = await axios.post('/api/bookings', payload);
      setBookingStatus({
        type: 'success',
        message: data?.message || 'Booking details submitted successfully.',
      });
      setShowBookingForm(false);

      const officialUrl = getHotelOfficialPageUrl(selectedHotel);
      setTimeout(() => {
        window.location.href = officialUrl;
      }, 700);
    } catch (error) {
      console.error('Booking API failed:', error.message, error.response?.data);
      const apiMessage = error?.response?.data?.error;
      setBookingStatus({
        type: 'error',
        message: apiMessage || 'Failed to submit booking details. Please try again.',
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold mb-2 text-center">
          Hotels Near {destination ? destination.name : 'Your Destination'}
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Showing hotels within a 5km radius
        </p>

        <GoogleMapsLoader libraries={['places']}>
          <div className="mb-6 bg-gray-800 rounded-lg p-4">
            <Autocomplete
              onLoad={(autocomplete) => {
                autocompleteRef.current = autocomplete;
              }}
              onPlaceChanged={handlePlaceChanged}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destination to find nearby hotels"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Autocomplete>
          </div>

          <div className="mb-8">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={13}
            >
              {/* Destination marker */}
              {destination && (
                <Marker
                  position={{ lat: destination.lat, lng: destination.lng }}
                  title={destination.name || 'Destination'}
                  icon={{
                    url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                    scaledSize: { width: 40, height: 40 },
                  }}
                />
              )}
              {/* Hotel markers */}
              {hotels.map((hotel) => (
                <Marker
                  key={hotel.place_id || hotel.hotel_id || `${hotel.hotel_name}-${hotel.address}`}
                  position={{ lat: hotel.lat, lng: hotel.lng }}
                  title={hotel.hotel_name}
                  onClick={() => openHotelModal(hotel)}
                />
              ))}
            </GoogleMap>
          </div>
        </GoogleMapsLoader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isSearching ? (
            <p>Searching hotels near your destination...</p>
          ) : hotels.length > 0 ? (
            hotels.map((hotel) => (
              <HotelCard key={hotel.place_id || hotel.hotel_id || `${hotel.hotel_name}-${hotel.address}`} hotel={hotel} onSelect={openHotelModal} />
            ))
          ) : (
            <p>No hotels found nearby.</p>
          )}
        </div>

        {selectedHotel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-gray-800 border border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="relative">
                <img
                  src={getHotelImage(selectedHotel)}
                  alt={selectedHotel.hotel_name}
                  className="h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={closeHotelModal}
                  className="absolute right-3 top-3 rounded-md bg-black/60 px-3 py-1 text-sm text-white hover:bg-black"
                >
                  Close
                </button>
              </div>

              {!showBookingForm ? (
                <div className="p-6">
                  <h2 className="text-2xl font-bold">{selectedHotel.hotel_name}</h2>
                  <p className="text-gray-300 mt-2">{selectedHotel.address}</p>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-700 p-4">
                      <p className="text-sm text-gray-300">Rating</p>
                      <p className="text-lg font-semibold">{Number(selectedHotel.rating || 0).toFixed(1)} / 5</p>
                    </div>
                    <div className="rounded-lg bg-gray-700 p-4">
                      <p className="text-sm text-gray-300">Price</p>
                      <p className="text-lg font-semibold">
                        {selectedHotel.price_per_night > 0
                          ? `$${Number(selectedHotel.price_per_night).toFixed(2)} / night`
                          : 'Price not available'}
                      </p>
                    </div>
                  </div>

                  {selectedHotel.contact_no && (
                    <p className="text-sm text-gray-300 mt-4">Contact: {selectedHotel.contact_no}</p>
                  )}

                  {bookingStatus.message && (
                    <p
                      className={`mt-4 text-sm ${
                        bookingStatus.type === 'success' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {bookingStatus.message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowBookingForm(true)}
                    className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <form onSubmit={submitBooking} className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold">Booking Details</h2>
                  <p className="text-sm text-gray-300">
                    Fill the details below to book {selectedHotel.hotel_name}.
                  </p>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                    <input
                      name="guest_name"
                      value={bookingForm.guest_name}
                      onChange={handleBookingInput}
                      required
                      className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={bookingForm.email}
                        onChange={handleBookingInput}
                        required
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Phone</label>
                      <input
                        name="phone_no"
                        value={bookingForm.phone_no}
                        onChange={handleBookingInput}
                        required
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Check-in Date</label>
                      <input
                        type="date"
                        name="checkin_date"
                        value={bookingForm.checkin_date}
                        onChange={handleBookingInput}
                        required
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Check-out Date</label>
                      <input
                        type="date"
                        name="checkout_date"
                        value={bookingForm.checkout_date}
                        onChange={handleBookingInput}
                        required
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="amount"
                        value={bookingForm.amount}
                        onChange={handleBookingInput}
                        required
                        className="w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2"
                      />
                    </div>
                  </div>

                  {bookingStatus.message && (
                    <p className={`text-sm ${bookingStatus.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {bookingStatus.message}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      className="w-full rounded-md border border-gray-500 px-4 py-3 font-semibold hover:bg-gray-700"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingBooking}
                      className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold hover:bg-green-700 disabled:opacity-70"
                    >
                      {isSubmittingBooking ? 'Submitting...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HotelsPage;

