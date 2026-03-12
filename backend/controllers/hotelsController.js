import { nanoid } from 'nanoid';
import axios from 'axios';
import supabase from '../config/supabase.js';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Helper to check for existing hotel and save if new
const saveHotel = async (hotelData) => {
  const { data: existingHotel } = await supabase
    .from('Hotel_Master')
    .select('hotel_id')
    .eq('hotel_name', hotelData.name)
    .eq('address', hotelData.vicinity)
    .single();

  if (existingHotel) {
    return existingHotel;
  }

  const newHotel = {
    hotel_id: `hot_${nanoid(8)}`,
    hotel_name: hotelData.name,
    address: hotelData.vicinity,
    rating: hotelData.rating || 0,
    price_per_night: 0, // Google Places API doesn't provide price per night directly
    contact_no: '', // Not provided by nearby search
  };

  const { data, error } = await supabase
    .from('Hotel_Master')
    .insert(newHotel)
    .select()
    .single();

  if (error) {
    console.error('Error saving hotel to Supabase:', error);
    return null;
  }
  return data;
};

// GET nearby hotels from Google Places and save them
export const getNearbyHotels = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude are required.' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=lodging&key=${GOOGLE_PLACES_API_KEY}`;

  try {
    const response = await axios.get(url);
    const hotels = response.data.results;

    const savedHotels = await Promise.all(hotels.map(hotel => saveHotel(hotel)));
    const filteredHotels = savedHotels.filter(h => h !== null);

    res.json(filteredHotels);
  } catch (error) {
    console.error('Error fetching nearby hotels from Google:', error);
    res.status(500).send('Server error');
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