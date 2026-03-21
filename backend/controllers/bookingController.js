import { nanoid } from 'nanoid';
import supabase from '../config/supabase.js';

const validateBookingPayload = (payload) => {
  const requiredFields = ['hotel_id', 'guest_name', 'phone_no', 'checkin_date', 'checkout_date', 'email', 'amount'];

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

  const emailPattern = /^\S+@\S+\.\S+$/;
  if (!emailPattern.test(String(payload.email || '').trim())) {
    return 'email must be a valid email address.';
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return 'amount must be a valid non-negative number.';
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
    guest_name,
    phone_no,
    checkin_date,
    checkout_date,
    email,
    amount,
  } = req.body;

  const payload = {
    hotel_id,
    guest_name,
    phone_no,
    checkin_date,
    checkout_date,
    email,
    amount: Number(amount),
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
          'Failed to save booking details. Booking table is missing in Supabase. Create table Booking_Details in public schema and retry.',
      });
    }

    const { error: hotelUpdateError } = await supabase
      .from('Hotel_Master')
      .update({ booking_id })
      .eq('hotel_id', hotel_id);

    if (hotelUpdateError) {
      console.error('[createBooking] Failed to update Hotel_Master booking_id:', hotelUpdateError);
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
