import supabase from '../config/supabase.js';

const extractBearerToken = (req) => {
  const authHeader = req.headers?.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
};

const resolveAuthenticatedUser = async (req) => {
  if (req.user?.id) {
    return req.user;
  }

  const token = extractBearerToken(req);
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
};

const toTrimmedString = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const validateBookingPayload = (payload) => {
  if (!payload.hotel_id) {
    return 'hotel_id is required.';
  }

  if (!payload.checkin_date) {
    return 'checkin_date is required.';
  }

  if (!payload.checkout_date) {
    return 'checkout_date is required.';
  }

  if (!payload.guest_name) {
    return 'guest_name is required.';
  }

  if (!payload.phone_no) {
    return 'phone_no is required.';
  }

  if (!payload.email) {
    return 'email is required.';
  }

  if (payload.amount === null || payload.amount === undefined || payload.amount === '') {
    return 'amount is required.';
  }

  if (!payload.payment_id) {
    return 'payment_id is required. Complete payment first.';
  }

  const checkIn = new Date(payload.checkin_date);
  const checkOut = new Date(payload.checkout_date);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 'Invalid check-in or check-out date.';
  }

  if (checkOut <= checkIn) {
    return 'Check-out date must be after check-in date.';
  }

  const emailPattern = /^\S+@\S+\.\S+$/;
  if (!emailPattern.test(payload.email)) {
    return 'email must be a valid email address.';
  }

  if (!Number.isFinite(payload.amount) || payload.amount < 0) {
    return 'amount must be a valid non-negative number.';
  }

  return null;
};

const isForeignKeyError = (error) => {
  const code = error?.code;
  return code === '23503';
};

const normalizeBookingPayload = (req) => {
  const body = req.body || {};
  const mappedHotelId = body.hotel_id || body.place_id || null;
  const checkinDate = body.check_in || body.checkin_date || null;
  const checkoutDate = body.check_out || body.checkout_date || null;

  return {
    hotel_id: mappedHotelId ? toTrimmedString(mappedHotelId) : '',
    user_id: null,
    checkin_date: checkinDate ? toTrimmedString(checkinDate) : '',
    checkout_date: checkoutDate ? toTrimmedString(checkoutDate) : '',
    guest_name: toTrimmedString(body.guest_name),
    phone_no: toTrimmedString(body.phone_no),
    email: toTrimmedString(body.email),
    amount: Number(body.amount),
    payment_id: toTrimmedString(body.payment_id),
    hotel_name: body.hotel_name || null,
    address: body.address || null,
    rating: Number(body.rating || 0),
  };
};

const ensureHotelExists = async (payload) => {
  const hotelId = String(payload.hotel_id || '').trim();

  const { data: existingHotel, error: selectError } = await supabase
    .from('Hotel_Master')
    .select('hotel_id')
    .eq('hotel_id', hotelId)
    .maybeSingle();

  if (selectError) {
    console.error('[ensureHotelExists] Failed to check hotel:', selectError);
    throw selectError;
  }

  if (existingHotel) {
    return;
  }

  if (!payload.hotel_name || !payload.address) {
    throw new Error('Hotel does not exist yet. Send hotel_name and address to create it before booking.');
  }

  const hotelPayload = {
    hotel_id: hotelId,
    hotel_name: String(payload.hotel_name).trim(),
    address: String(payload.address).trim(),
    rating: Number(payload.rating || 0),
  };

  const { error: upsertHotelError } = await supabase
    .from('Hotel_Master')
    .upsert(hotelPayload, { onConflict: 'hotel_id' });

  if (upsertHotelError) {
    console.error('[ensureHotelExists] Failed to upsert hotel:', upsertHotelError);
    throw upsertHotelError;
  }
};

export const getBookings = async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { data, error } = await supabase
      .from('booking_details')
      .select('*')
      .eq('user_id', user.id)
      .order('checkin_date', { ascending: false });

    if (error) {
      console.error('[getBookings] Failed to fetch bookings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bookings.',
        details: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      bookings: data || [],
    });
  } catch (err) {
    console.error('[getBookings] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'Server error while fetching bookings.',
      details: err.message,
    });
  }
};

export const createBooking = async (req, res) => {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const payload = normalizeBookingPayload(req);
    payload.user_id = user.id;

    if (!payload.email) {
      payload.email = toTrimmedString(user.email);
    }

    const validationError = validateBookingPayload(payload);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    await ensureHotelExists(payload);

    const insertPayload = {
      user_id: user.id,
      hotel_id: payload.hotel_id,
      checkin_date: payload.checkin_date,
      checkout_date: payload.checkout_date,
      guest_name: payload.guest_name,
      phone_no: payload.phone_no,
      email: payload.email,
      amount: payload.amount,
      payment_id: payload.payment_id,
    };

    const { data, error } = await supabase
      .from('booking_details')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('[createBooking] Insert booking error:', error);

      if (isForeignKeyError(error)) {
        return res.status(400).json({
          success: false,
          error: 'Foreign key validation failed. Verify user_id, hotel_id, and destination_id.',
          details: error.details || error.message,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to save booking details.',
        details: error.details || error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Booking saved successfully.',
      booking: data,
    });
  } catch (err) {
    console.error('[createBooking] Error saving booking:', err);
    const details = err?.message || err?.details || 'Unknown database error.';
    return res.status(500).json({
      success: false,
      error: 'Failed to save booking details.',
      details,
    });
  }
};
