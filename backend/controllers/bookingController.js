import { nanoid } from 'nanoid';
import supabase from '../config/supabase.js';

const validateBookingPayload = (payload) => {
  const requiredFields = ['hotel_id', 'guest_name', 'phone_no', 'checkin_date', 'checkout_date'];

  for (const field of requiredFields) {
    if (!payload[field]) {
      return `${field} is required.`;
    }
  }

  const checkIn = new Date(payload.checkin_date);
  const checkOut = new Date(payload.checkout_date);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return 'Invalid check-in or check-out date.';
  }

  if (checkOut <= checkIn) {
    return 'Check-out date must be after check-in date.';
  }

  if (payload.total_guests && Number(payload.total_guests) < 1) {
    return 'total_guests must be at least 1.';
  }

  if (payload.total_rooms && Number(payload.total_rooms) < 1) {
    return 'total_rooms must be at least 1.';
  }

  return null;
};

const isMissingTableError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('could not find the table') || message.includes('does not exist');
};

export const createBooking = async (req, res) => {
  const {
    hotel_id,
    hotel_name,
    guest_name,
    phone_no,
    checkin_date,
    checkout_date,
  } = req.body;

  const payload = {
    hotel_id,
    hotel_name: hotel_name || null,
    user_id: req.user?.id || null,
    guest_name,
    phone_no,
    checkin_date,
    checkout_date
  };

  const validationError = validateBookingPayload(payload);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const booking_id = `bk_${nanoid(10)}`;

  try {
    const candidateTables = ['Booking_Details', 'booking_details'];
    let data = null;
    const errors = [];

    for (const tableName of candidateTables) {
      const result = await supabase
        .from(tableName)
        .insert([{ booking_id, ...payload }])
        .select()
        .single();

      if (!result.error) {
        data = result.data;
        break;
      }

      errors.push({ tableName, error: result.error });
      console.error(`[createBooking] Insert failed on table ${tableName}:`, result.error);
    }

    if (!data && errors.length > 0) {
      const firstNonMissingTableError = errors.find((entry) => !isMissingTableError(entry.error));
      if (firstNonMissingTableError) {
        throw firstNonMissingTableError.error;
      }

      return res.status(500).json({
        error:
          'Failed to save booking details. Booking table is missing in Supabase. Create table booking_details in public schema and retry.',
      });
    }

    return res.status(201).json({
      message: 'Booking saved successfully.',
      booking: data,
    });
  } catch (err) {
    console.error('[createBooking] Error saving booking:', err);
    const details = err?.message || err?.details || 'Unknown database error.';
    return res.status(500).json({ error: `Failed to save booking details. ${details}` });
  }
};
