import { nanoid } from 'nanoid';
import axios from 'axios';
import supabase from '../config/supabase.js';

const normalizeGoogleHotel = (hotelData) => ({
  hotel_id: hotelData.place_id || `hot_${nanoid(8)}`,
  hotel_name: hotelData.name || 'Unnamed hotel',
  address: hotelData.vicinity || hotelData.formatted_address || '',
  rating: hotelData.rating || 0,
  price_per_night: 0,
  contact_no: '',
  lat: hotelData.geometry?.location?.lat || null,
  lng: hotelData.geometry?.location?.lng || null,
});

// Helper to check for existing hotel and save if new
const saveHotel = async (hotelData) => {
  const normalizedHotel = normalizeGoogleHotel(hotelData);
  console.log(`[saveHotel] Processing: "${normalizedHotel.hotel_name}" at "${normalizedHotel.address}"`);

  const { data: existingHotel, error: existingHotelError } = await supabase
    .from('Hotel_Master')
    .select('*')
    .eq('hotel_name', normalizedHotel.hotel_name)
    .eq('address', normalizedHotel.address)
    .single();

  if (existingHotelError && existingHotelError.code !== 'PGRST116') {
    console.error(`[saveHotel] Error checking existing hotel "${normalizedHotel.hotel_name}":`, existingHotelError);
  }

  if (existingHotel) {
    console.log(`[saveHotel] Already exists in DB: "${normalizedHotel.hotel_name}"`);
    return {
      ...normalizedHotel,
      ...existingHotel,
      lat: normalizedHotel.lat,
      lng: normalizedHotel.lng,
    };
  }

  const newHotel = {
    hotel_id: `hot_${nanoid(8)}`,
    hotel_name: normalizedHotel.hotel_name,
    address: normalizedHotel.address,
    rating: normalizedHotel.rating,
    price_per_night: normalizedHotel.price_per_night,
    contact_no: normalizedHotel.contact_no,
  };

  const { data, error } = await supabase
    .from('Hotel_Master')
    .insert(newHotel)
    .select()
    .single();

  if (error) {
    console.error(`[saveHotel] Error saving "${normalizedHotel.hotel_name}" to Supabase:`, error);
    return null;
  }
  console.log(`[saveHotel] Saved new hotel: "${normalizedHotel.hotel_name}" with id ${data.hotel_id}`);
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
    const { data, error } = await supabase.from('Hotel_Master').select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// POST a new hotel to our database
export const createHotel = async (req, res) => {
  const { hotel_name, address, price_per_night, contact_no, rating } = req.body;
  const hotel_id = `hot_${nanoid(8)}`;

  try {
    const { data, error } = await supabase
      .from('Hotel_Master')
      .insert([{ hotel_id, hotel_name, address, price_per_night, contact_no, rating }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};