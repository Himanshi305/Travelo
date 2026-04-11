'use client';

import React, { useContext, useEffect, useRef, useState } from 'react';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import axios from '../../services/axios';
import AuthContext from '../../context/AuthContext';
import HotelSearchMap from '../../components/HotelSearchMap';
import HotelCard from '../../components/HotelCard';

const getDestinationStorageKey = (userId) => `destination:${userId || 'guest'}`;
const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const normalizeSearchText = (value) => String(value || '').trim().toLowerCase();

const buildDisplayAddress = (hotel) => {
  const parts = [
    hotel?.local_address,
    hotel?.state,
    hotel?.pin_code,
    hotel?.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return String(hotel?.address || '').trim();
};

const buildHotelSearchBlob = (hotel) => [
  hotel?.hotel_name,
  hotel?.address,
  hotel?.price_per_night,
  hotel?.contact_no,
  hotel?.local_address,
  hotel?.state,
  hotel?.pin_code,
  hotel?.country,
  hotel?.hotel_details,
].map((value) => String(value || '').trim().toLowerCase()).join(' ');

countries.registerLocale(en);

const COUNTRY_OPTIONS = Object.entries(
  countries.getNames('en', { select: 'official' })
)
  .map(([value, label]) => ({ value, label }))
  .sort((left, right) => left.label.localeCompare(right.label));

const COUNTRY_NAME_BY_CODE = Object.fromEntries(
  COUNTRY_OPTIONS.map((country) => [country.value, country.label])
);

const getCountryLabel = (countryCode) => COUNTRY_NAME_BY_CODE[countryCode] || '';

const parseIntegerPricePerNight = (value) => {
  if (value === '' || value === null || value === undefined) {
    return { isValid: false, amount: 0 };
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return { isValid: false, amount: 0 };
  }

  return {
    isValid: true,
    amount: Math.trunc(numericValue),
  };
};

const normalizeHotelPriceForDisplay = (hotel, fallback = 0) => {
  const fallbackNumber = Number(fallback);
  const normalizedFallback =
    Number.isFinite(fallbackNumber) && fallbackNumber >= 0
      ? Math.trunc(fallbackNumber)
      : 0;

  const primaryCandidates = [
    hotel?.price_per_night,
    hotel?.pricePerNight,
    hotel?.price,
  ];

  for (const value of primaryCandidates) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      continue;
    }

    const normalizedValue = Math.trunc(numericValue);

    if (normalizedValue === 0 && normalizedFallback > 0) {
      return normalizedFallback;
    }

    return normalizedValue;
  }

  return normalizedFallback;
};

const mergeHotelPrice = (incomingHotel, existingHotel) => {
  const incomingPrice = normalizeHotelPriceForDisplay(incomingHotel, 0);
  const existingPrice = normalizeHotelPriceForDisplay(existingHotel, 0);

  if (incomingPrice === 0 && existingPrice > 0) {
    return {
      ...incomingHotel,
      price_per_night: existingPrice,
    };
  }

  return {
    ...incomingHotel,
    price_per_night: incomingPrice,
  };
};

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
    price_per_night: '',
    contact_no: '',
    gpay_id: '',
    local_address: '',
    state: '',
    pin_code: '',
    country: '',
    hotel_details: '',
  });
  const [adminHotelImageFile, setAdminHotelImageFile] = useState(null);

  const [selectedDestination, setSelectedDestination] = useState(null);
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [featuredHotelsLoading, setFeaturedHotelsLoading] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingStatus, setBookingStatus] = useState({ type: '', message: '' });
  const [pendingBookingPayload, setPendingBookingPayload] = useState(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const bookingSectionRef = useRef(null);
  const [bookingForm, setBookingForm] = useState({
    check_in: '',
    check_out: '',
    guest_name: user?.user_metadata?.name || '',
    phone_no: '',
    email: user?.email || '',
    amount: 0,
  });

  const matchesAddressSearch = (hotel) => {
    if (!selectedDestination?.address) {
      return false;
    }

    const addressParts = [
      ...selectedDestination.address
      .split(',')
      .map((part) => normalizeSearchText(part))
      .filter(Boolean),
      normalizeSearchText(selectedDestination.state),
      normalizeSearchText(selectedDestination.country),
    ].filter(Boolean);

    const searchCountry = addressParts[addressParts.length - 1] || '';
    const locationTerms = addressParts.slice(0, -1);

    if (!searchCountry) {
      return false;
    }

    const hotelLocationBlob = [
      hotel?.hotel_name,
      hotel?.state,
      hotel?.country,
      hotel?.address,
      hotel?.full_address,
      hotel?.local_address,
    ]
      .map((value) => normalizeSearchText(value))
      .join(' ');

    if (!hotelLocationBlob.includes(searchCountry)) {
      return false;
    }

    if (locationTerms.length === 0) {
      return true;
    }

    return locationTerms.some((term) => hotelLocationBlob.includes(term));
  };

  const filteredFeaturedHotels = featuredHotels.filter(matchesAddressSearch);
  const hasSearchLocation = Boolean(selectedDestination?.address);

  useEffect(() => {
    if (isAdmin) {
      // Keep optimistic value shown immediately; full refresh happens on page reload/useEffect.
      return;
    }

    if (!selectedDestination?.address) {
      setFeaturedHotels([]);
      return;
    }

    fetchFeaturedHotels(selectedDestination);
  }, [isAdmin, selectedDestination]);

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
      const normalizedHotels = data?.hotels || [];
      setAdminHotels((prevHotels) => {
        const prevHotelById = new Map(
          prevHotels.map((hotel) => [String(hotel?.hotel_id || ''), hotel])
        );

        return normalizedHotels.map((hotel) => {
          const hotelId = String(hotel?.hotel_id || '');
          const existingHotel = prevHotelById.get(hotelId);
          return mergeHotelPrice(hotel, existingHotel);
        });
      });
    } catch (error) {
      console.error('Failed to fetch admin hotels:', error.message, error.response?.data);
      setAdminHotels([]);
    }
  };

  const fetchFeaturedHotels = async (destination) => {
    const addressParts = String(destination?.address || '')
      .split(',')
      .map((part) => normalizeSearchText(part))
      .filter(Boolean);

    const searchPayload = {
      address: String(destination?.address || '').trim(),
      state: String(destination?.state || addressParts[addressParts.length - 2] || '').trim(),
      country: String(destination?.country || addressParts[addressParts.length - 1] || '').trim(),
    };

    setFeaturedHotelsLoading(true);
    try {
      const { data } = await axios.get('/api/hotels/featured', {
        params: searchPayload,
      });
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
    const localAddress = (adminHotelForm.local_address || '').trim();
    const state = (adminHotelForm.state || '').trim();
    const pinCode = (adminHotelForm.pin_code || '').trim();
    const countryCode = (adminHotelForm.country || '').trim();
    const country = getCountryLabel(countryCode);
    const contactNo = (adminHotelForm.contact_no || '').trim();
    const gpayId = (adminHotelForm.gpay_id || '').trim();
    const hotelDetails = (adminHotelForm.hotel_details || '').trim();
    const parsedPrice = parseIntegerPricePerNight(adminHotelForm.price_per_night);
    const composedAddress = [localAddress, state, pinCode, country].filter(Boolean).join(', ');

    if (!hotelName) {
      setAdminHotelStatus({ type: 'error', message: 'Hotel name is required.' });
      return;
    }

    if (!localAddress || !state || !pinCode || !countryCode || !country) {
      setAdminHotelStatus({
        type: 'error',
        message: 'Local address, state, PIN, and country are required.',
      });
      return;
    }

    if (!parsedPrice.isValid) {
      setAdminHotelStatus({
        type: 'error',
        message: 'Price per night must be a valid non-negative number.',
      });
      return;
    }

    setAdminHotelSubmitting(true);
    setAdminHotelStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('hotel_name', hotelName);
      formData.append('address', composedAddress);
      formData.append('local_address', localAddress);
      formData.append('state', state);
      formData.append('pin_code', pinCode);
      formData.append('country', country);
      formData.append('contact_no', contactNo);
      formData.append('gpay_id', gpayId);
      formData.append('hotel_details', hotelDetails);
      formData.append('price_per_night', parsedPrice.amount);

      if (adminHotelImageFile) {
        formData.append('hotel_image', adminHotelImageFile);
      }

      const { data } = await axios.post('/api/hotels/admin', formData);

      const savedHotel = data?.hotel || {};
      setAdminHotels((prev) => {
        const normalizedSavedHotel = {
          ...savedHotel,
          price_per_night: normalizeHotelPriceForDisplay(savedHotel, parsedPrice.amount),
        };

        const withoutDuplicate = prev.filter(
          (hotel) => String(hotel?.hotel_id || '') !== String(normalizedSavedHotel?.hotel_id || '')
        );

        return [normalizedSavedHotel, ...withoutDuplicate];
      });

      setAdminHotelStatus({
        type: 'success',
        message: data?.message || 'Hotel added successfully.',
      });

      setAdminHotelForm({
        hotel_name: '',
        price_per_night: '',
        contact_no: '',
        gpay_id: '',
        gpay_qr_url: '',
        local_address: '',
        state: '',
        pin_code: '',
        country: '',
        hotel_details: '',
      });
      setAdminHotelImageFile(null);

      fetchAdminHotels();
    } catch (error) {
      const backendError = error?.response?.data?.error || 'Failed to add hotel.';
      const backendDetails = error?.response?.data?.details || '';
      setAdminHotelStatus({
        type: 'error',
        message: backendDetails ? `${backendError} (${backendDetails})` : backendError,
      });
    } finally {
      setAdminHotelSubmitting(false);
    }
  };

  const handleDeleteAdminHotel = async (hotelId) => {
    const normalizedHotelId = String(hotelId || '').trim();
    if (!normalizedHotelId) {
      return;
    }

    const shouldDelete = window.confirm('Delete this hotel card? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    setAdminDeletingHotelId(normalizedHotelId);
    setAdminHotelStatus({ type: '', message: '' });

    try {
      const { data } = await axios.delete(`/api/hotels/admin/${encodeURIComponent(normalizedHotelId)}`);
      setAdminHotels((prev) => prev.filter((hotel) => String(hotel.hotel_id) !== normalizedHotelId));
      setAdminHotelStatus({
        type: 'success',
        message: data?.message || 'Hotel deleted successfully.',
      });
    } catch (error) {
      setAdminHotelStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to delete hotel.',
      });
    } finally {
      setAdminDeletingHotelId('');
    }
  };

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
    setPendingBookingPayload(null);
    setShowPaymentPanel(false);
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

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHotel) {
      return;
    }

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

    setPendingBookingPayload(payload);
    setShowPaymentPanel(true);
    setBookingStatus({
      type: 'success',
      message: 'Booking details saved. Complete payment below, then confirm payment.',
    });
  };

  const handleConfirmPaymentAndBook = async () => {
    if (!pendingBookingPayload) {
      return;
    }

    setBookingSubmitting(true);
    setBookingStatus({ type: '', message: '' });

    try {
      const { data } = await axios.post('/api/bookings', pendingBookingPayload);
      setBookingStatus({ type: 'success', message: data?.message || 'Booking saved successfully.' });
      setBookingForm((prev) => ({
        ...prev,
        check_in: '',
        check_out: '',
        phone_no: '',
      }));
      setPendingBookingPayload(null);
      setShowPaymentPanel(false);

      setTimeout(() => {
        window.location.assign('/dashboard');
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
              <h2 className="mb-3 text-3xl font-bold">Search Hotels by Location</h2>
              <p className="mb-4 text-white/80">Search for a destination to see nearby hotels on the map and get directions.</p>
              <HotelSearchMap
                onPlaceSelect={handleSelectDestination}
                hotels={filteredFeaturedHotels}
                selectedHotelId={selectedHotel?.hotel_id}
              />
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <h3 className="mb-4 text-2xl font-bold">
                {hasSearchLocation ? 'Hotels Near Your Search Location' : 'Search for a Location'}
              </h3>
              <p className="mb-4 text-white/70 text-sm">
                {hasSearchLocation 
                  ? `Showing hotels matching: ${selectedDestination.address}`
                  : 'Use the search box above to find hotels near a destination.'}
              </p>
              {featuredHotelsLoading ? (
                <p className="text-white/80">Loading hotels...</p>
              ) : hasSearchLocation && filteredFeaturedHotels.length === 0 ? (
                <p className="text-white/80">No hotels found matching your search location. Try searching for a different area.</p>
              ) : (
                hasSearchLocation ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredFeaturedHotels.map((hotel) => (
                      <HotelCard
                        key={`featured-${hotel.hotel_id}`}
                        hotel={hotel}
                        onSelect={handleSelectHotel}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-white/80">Search a location to see nearby hotel cards.</p>
                )
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
                      Continue to Payment
                    </button>
                  </div>
                </form>

                {showPaymentPanel && pendingBookingPayload && (
                  <div className="mt-6 rounded-xl border border-white/20 bg-black/30 p-4">
                    <h4 className="text-lg font-semibold text-white">Payment Details</h4>
                    <p className="mt-1 text-sm text-gray-300">
                      Pay this amount to complete booking: <span className="font-semibold text-emerald-300">{Number(pendingBookingPayload.amount || 0)}</span>
                    </p>

                    {selectedHotel?.gpay_id && (
                      <p className="mt-2 text-sm text-gray-200">GPay ID: {selectedHotel.gpay_id}</p>
                    )}

                    {!selectedHotel?.gpay_id && (
                      <p className="mt-2 text-sm text-amber-300">Payment details are not available for this hotel. Contact hotel admin before payment.</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmPaymentAndBook}
                        disabled={bookingSubmitting}
                        className="rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-70"
                      >
                        {bookingSubmitting ? 'Saving Booking...' : 'I Have Paid, Confirm Booking'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentPanel(false);
                          setPendingBookingPayload(null);
                        }}
                        disabled={bookingSubmitting}
                        className="rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
                <label className="block text-sm font-medium text-white/80">Price Per Night</label>
                <input
                  type="number"
                  name="price_per_night"
                  value={adminHotelForm.price_per_night}
                  onChange={handleAdminHotelInput}
                  min="0"
                  step="0.01"
                  placeholder="Enter price"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80">Contact Number</label>
                <input
                  type="text"
                  name="contact_no"
                  value={adminHotelForm.contact_no}
                  onChange={handleAdminHotelInput}
                  placeholder="Enter contact number"
                  className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Payment Details (Optional)</p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-white/80">GPay ID</label>
                    <input
                      type="text"
                      name="gpay_id"
                      value={adminHotelForm.gpay_id}
                      onChange={handleAdminHotelInput}
                      placeholder="example@okhdfcbank"
                      className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white/80">Local Address</label>
                  <input
                    type="text"
                    name="local_address"
                    value={adminHotelForm.local_address}
                    onChange={handleAdminHotelInput}
                    placeholder="Street, area, landmark"
                    className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80">State</label>
                  <input
                    type="text"
                    name="state"
                    value={adminHotelForm.state}
                    onChange={handleAdminHotelInput}
                    placeholder="State"
                    className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80">PIN Code</label>
                  <input
                    type="text"
                    name="pin_code"
                    value={adminHotelForm.pin_code}
                    onChange={handleAdminHotelInput}
                    placeholder="PIN code"
                    className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80">Country</label>
                  <select
                    name="country"
                    value={adminHotelForm.country}
                    onChange={handleAdminHotelInput}
                    className="mt-1 w-full rounded-md border border-white/20 bg-black/30 px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/75">
                <span className="font-semibold text-white">Preview address: </span>
                {buildDisplayAddress({
                  local_address: adminHotelForm.local_address,
                  state: adminHotelForm.state,
                  pin_code: adminHotelForm.pin_code,
                  country: getCountryLabel(adminHotelForm.country),
                }) || 'Add the address fields above'}
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
                      <div className="mt-2 pt-1">
                        <p className="text-sm font-medium text-emerald-300">Price per night: {normalizeHotelPriceForDisplay(hotel)}</p>
                      </div>
                      {hotel.contact_no && <p className="mt-1 text-sm text-gray-300">Contact: {hotel.contact_no}</p>}
                      {hotel.gpay_id && <p className="mt-1 text-sm text-gray-300">GPay ID: {hotel.gpay_id}</p>}
                      <p className="mt-1 text-sm text-gray-300">{buildDisplayAddress(hotel) || 'Address not provided'}</p>
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
