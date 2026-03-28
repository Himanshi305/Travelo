import axios from 'axios';
import supabase from '../config/supabase.js';

const normalizeGoogleHotel = (hotelData) => ({
  hotel_id: hotelData.place_id ? String(hotelData.place_id) : null,
  place_id: hotelData.place_id ? String(hotelData.place_id) : null,
  hotel_name: hotelData.name || 'Unnamed hotel',
  address: hotelData.vicinity || hotelData.formatted_address || '',
  rating: Number(hotelData.rating || 0),
  price_per_night: 0,
  contact_no: '',
  hotel_url: '',
  hotel_details: '',
  photo_reference: hotelData.photos?.[0]?.photo_reference || null,
  lat: hotelData.geometry?.location?.lat || null,
  lng: hotelData.geometry?.location?.lng || null,
});

const makeAdminHotelId = (hotelName) => {
  const base = String(hotelName || 'hotel')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'hotel';

  return `admin_${Date.now()}_${base}`;
};

const saveHotel = async (hotelData) => {
  const normalizedHotel = normalizeGoogleHotel(hotelData);
  if (!normalizedHotel.hotel_id) {
    console.warn('[saveHotel] Skipping hotel with missing place_id:', normalizedHotel.hotel_name);
    return null;
  }

  console.log(`[saveHotel] Processing: "${normalizedHotel.hotel_name}" at "${normalizedHotel.address}"`);

  const payload = {
    hotel_id: normalizedHotel.hotel_id,
    hotel_name: normalizedHotel.hotel_name,
    address: normalizedHotel.address,
    rating: normalizedHotel.rating,
  };

  const { data, error } = await supabase
    .from('Hotel_Master')
    .upsert(payload, { onConflict: 'hotel_id' })
    .select('*')
    .single();

  if (error) {
    console.error(`[saveHotel] Error upserting "${normalizedHotel.hotel_name}" to Supabase:`, error);
    return null;
  }

  console.log(`[saveHotel] Upserted hotel: "${normalizedHotel.hotel_name}" with hotel_id ${data.hotel_id}`);
  return {
    ...normalizedHotel,
    ...data,
    lat: normalizedHotel.lat,
    lng: normalizedHotel.lng,
  };
};

// GET nearby hotels from Google Places and save them
export const getNearbyHotels = async (req, res) => {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  const { lat, lng } = req.query;

  console.log(`\n[getNearbyHotels] Request received — lat: ${lat}, lng: ${lng}`);
  console.log(`[getNearbyHotels] GOOGLE_PLACES_API_KEY is ${GOOGLE_PLACES_API_KEY ? 'SET ✓' : 'MISSING ✗'}`);

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY is missing on the backend.' });
  }

  console.log(`[getNearbyHotels] Calling Google Places API...`);

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: 5000,
        type: 'lodging',
        key: GOOGLE_PLACES_API_KEY,
      },
    });
    const googleStatus = response.data.status;
    const places = response.data.results || [];

    console.log(`[getNearbyHotels] Google API status: ${googleStatus}`);
    console.log('[getNearbyHotels] Raw Google API response:', JSON.stringify(response.data, null, 2));
    console.log(`[getNearbyHotels] Places returned by Google: ${places.length}`);

    if (googleStatus === 'REQUEST_DENIED') {
      console.error('[getNearbyHotels] REQUEST_DENIED — API key may be invalid or missing billing.');
      return res.status(403).json({ error: 'Google Places API request was denied. Check your API key and billing.' });
    }

    if (googleStatus === 'INVALID_REQUEST') {
      console.error('[getNearbyHotels] INVALID_REQUEST — Bad parameters sent to Google API.');
      return res.status(400).json({ error: 'Invalid request sent to Google Places API.' });
    }

    if (googleStatus === 'ZERO_RESULTS') {
      console.warn('[getNearbyHotels] ZERO_RESULTS — No hotels found near these coordinates.');
      return res.json([]);
    }

    if (googleStatus !== 'OK') {
      console.error(`[getNearbyHotels] Unexpected Google status: ${googleStatus}`, response.data.error_message || '');
      return res.status(500).json({ error: `Unexpected Google API status: ${googleStatus}` });
    }

    const normalizedHotels = places.map(normalizeGoogleHotel);

    places.forEach((p, i) => {
      console.log(`[getNearbyHotels] Place ${i + 1}: "${p.name}" — rating: ${p.rating ?? 'N/A'}, vicinity: "${p.vicinity}"`);
    });

    const savedHotels = await Promise.all(places.map((hotel) => saveHotel(hotel)));
    const responseHotels = normalizedHotels.map((hotel, index) => {
      const savedHotel = savedHotels[index];

      if (savedHotel === null) {
        console.warn(`[getNearbyHotels] Returning Google result without DB save: "${hotel.hotel_name}"`);
        return hotel;
      }

      return {
        ...hotel,
        ...savedHotel,
        lat: hotel.lat,
        lng: hotel.lng,
      };
    });

    console.log(`[getNearbyHotels] Returning ${responseHotels.length} hotels to client.`);
    console.log('[getNearbyHotels] Returning hotel names:', responseHotels.map((hotel) => hotel.hotel_name));
    res.json(responseHotels);
  } catch (error) {
    console.error('[getNearbyHotels] Error fetching nearby hotels from Google:', error.message);
    res.status(500).json({
      error: 'Server error while fetching nearby hotels.',
      details: error.message,
    });
  }
};

// GET all hotels from our database
export const getAllHotels = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userBookings, error: bookingError } = await supabase
      .from('booking_details')
      .select('hotel_id')
      .eq('user_id', userId);

    if (bookingError) {
      throw bookingError;
    }

    const userHotelIds = [...new Set((userBookings || []).map((b) => String(b.hotel_id).trim()).filter(Boolean))];

    if (userHotelIds.length === 0) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('Hotel_Master')
      .select('*')
      .in('hotel_id', userHotelIds);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// POST a new hotel to our database
export const createHotel = async (req, res) => {
  const {
    place_id,
    hotel_name,
    address,
    rating = 0,
  } = req.body;

  if (!place_id || !hotel_name || !address) {
    return res.status(400).json({
      success: false,
      error: 'place_id, hotel_name and address are required.',
    });
  }

  try {
    const hotelId = String(place_id).trim();

    const payload = {
      hotel_id: hotelId,
      hotel_name: String(hotel_name).trim(),
      address: String(address).trim(),
      rating: Number(rating) || 0,
    };

    const { data, error } = await supabase
      .from('Hotel_Master')
      .upsert(payload, { onConflict: 'hotel_id' })
      .select('*')
      .single();

    if (error) {
      console.error('[createHotel] Supabase upsert error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save hotel.',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Hotel saved successfully.',
      mapped_hotel_id: hotelId,
      hotel: data,
    });
  } catch (err) {
    console.error('[createHotel] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while saving hotel.',
      details: err.message,
    });
  }
};

// GET reviews for a specific hotel
export const getHotelReviews = async (req, res) => {
  const { hotelId } = req.params;

  if (!hotelId) {
    return res.status(400).json({ error: 'hotelId is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('Review_Master')
      .select('review_id, hotel_id, user_id, user_email, comment, star, created_at')
      .eq('hotel_id', String(hotelId).trim())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getHotelReviews] Supabase query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch hotel reviews.',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      reviews: data || [],
    });
  } catch (err) {
    console.error('[getHotelReviews] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching reviews.',
      details: err.message,
    });
  }
};

// POST a review (comment + star) for a specific hotel
export const createHotelReview = async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email || null;
  const { hotelId } = req.params;
  const { comment, star } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!hotelId) {
    return res.status(400).json({ success: false, error: 'hotelId is required.' });
  }

  const sanitizedComment = String(comment || '').trim();
  const numericStar = Number(star);

  if (!sanitizedComment) {
    return res.status(400).json({ success: false, error: 'comment is required.' });
  }

  if (!Number.isFinite(numericStar) || numericStar < 1 || numericStar > 5) {
    return res.status(400).json({ success: false, error: 'star must be a number between 1 and 5.' });
  }

  try {
    const payload = {
      hotel_id: String(hotelId).trim(),
      user_id: userId,
      user_email: userEmail,
      comment: sanitizedComment,
      star: Math.round(numericStar),
    };

    const { data, error } = await supabase
      .from('Review_Master')
      .insert(payload)
      .select('review_id, hotel_id, user_id, user_email, comment, star, created_at')
      .single();

    if (error) {
      console.error('[createHotelReview] Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save review.',
        details: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review: data,
    });
  } catch (err) {
    console.error('[createHotelReview] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while submitting review.',
      details: err.message,
    });
  }
};

export const getAdminHotels = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('Hotel_Master')
      .select('*')
      .eq('created_by', userId)
      .order('hotel_id', { ascending: false });

    if (error) {
      console.error('[getAdminHotels] Supabase query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch admin hotels.',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      hotels: data || [],
    });
  } catch (err) {
    console.error('[getAdminHotels] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching admin hotels.',
      details: err.message,
    });
  }
};

export const createAdminHotel = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { hotel_name, hotel_url = '', hotel_details = '' } = req.body;
  const trimmedName = String(hotel_name || '').trim();
  const trimmedUrl = String(hotel_url || '').trim();
  const trimmedDetails = String(hotel_details || '').trim();

  if (!trimmedName) {
    return res.status(400).json({
      success: false,
      error: 'hotel_name is required.',
    });
  }

  const payload = {
    hotel_id: makeAdminHotelId(trimmedName),
    hotel_name: trimmedName,
    address: 'Not provided',
    rating: 0,
    hotel_url: trimmedUrl,
    hotel_details: trimmedDetails,
    created_by: userId,
  };

  try {
    const { data, error } = await supabase
      .from('Hotel_Master')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('[createAdminHotel] Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save admin hotel.',
        details: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Hotel added successfully.',
      hotel: data,
    });
  } catch (err) {
    console.error('[createAdminHotel] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while saving admin hotel.',
      details: err.message,
    });
  }
};