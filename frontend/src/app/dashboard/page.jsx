'use client';

import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from '../../services/axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.user_metadata?.role === 'admin';

  const [hotels, setHotels] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [hotelReviewsMap, setHotelReviewsMap] = useState({});
  const [reviewLoadingMap, setReviewLoadingMap] = useState({});
  const [reviewSubmittingMap, setReviewSubmittingMap] = useState({});
  const [reviewStatusMap, setReviewStatusMap] = useState({});

  const [replyForms, setReplyForms] = useState({});
  const [replySubmittingMap, setReplySubmittingMap] = useState({});
  const [replyStatusMap, setReplyStatusMap] = useState({});

  const [deletingHotelId, setDeletingHotelId] = useState('');
  const [deleteStatus, setDeleteStatus] = useState({ type: '', message: '' });

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchHotels();
      if (!isAdmin) {
        fetchBookings();
      }
    }
  }, [user?.id, isAdmin]);

  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const { data } = await axios.get('/api/bookings');
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const calculateNights = (checkIn, checkOut) => {
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 0;
    } catch {
      return 0;
    }
  };

  const fetchHotels = async () => {
    try {
      if (isAdmin) {
        const { data } = await axios.get('/api/hotels/admin');
        setHotels(Array.isArray(data?.hotels) ? data.hotels : []);
        return;
      }

      const { data } = await axios.get('/api/hotels');
      setHotels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch hotels for dashboard:', err);
      setHotels([]);
    }
  };

  const resolveHotelId = (hotel) => {
    const rawId = hotel?.hotel_id || hotel?.place_id || null;
    return rawId ? String(rawId).trim() : null;
  };

  const getDisplayPrice = (hotel) => {
    const numericPrice = Number(hotel?.price_per_night);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return 0;
    }

    return Math.trunc(numericPrice);
  };

  const setReviewFormField = (hotelId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [hotelId]: {
        comment: prev?.[hotelId]?.comment || '',
        star: prev?.[hotelId]?.star || 0,
        [field]: value,
      },
    }));
  };

  const setReplyFormField = (reviewId, value) => {
    setReplyForms((prev) => ({
      ...prev,
      [reviewId]: value,
    }));
  };

  const fetchHotelReviews = async (hotelId) => {
    if (!hotelId) {
      return;
    }

    setReviewLoadingMap((prev) => ({ ...prev, [hotelId]: true }));
    try {
      const { data } = await axios.get(`/api/hotels/${encodeURIComponent(hotelId)}/reviews`);
      setHotelReviewsMap((prev) => ({
        ...prev,
        [hotelId]: Array.isArray(data?.reviews) ? data.reviews : [],
      }));
    } catch (err) {
      console.error('Failed to fetch hotel reviews:', err);
      setHotelReviewsMap((prev) => ({ ...prev, [hotelId]: [] }));
    } finally {
      setReviewLoadingMap((prev) => ({ ...prev, [hotelId]: false }));
    }
  };

  const submitHotelReview = async (hotelId) => {
    const comment = (reviewForms?.[hotelId]?.comment || '').trim();
    const star = Number(reviewForms?.[hotelId]?.star || 0);

    if (!comment) {
      setReviewStatusMap((prev) => ({ ...prev, [hotelId]: { type: 'error', message: 'Please add a comment.' } }));
      return;
    }

    if (!Number.isFinite(star) || star < 1 || star > 5) {
      setReviewStatusMap((prev) => ({ ...prev, [hotelId]: { type: 'error', message: 'Please select a star between 1 and 5.' } }));
      return;
    }

    setReviewSubmittingMap((prev) => ({ ...prev, [hotelId]: true }));
    setReviewStatusMap((prev) => ({ ...prev, [hotelId]: { type: '', message: '' } }));

    try {
      const { data } = await axios.post(`/api/hotels/${encodeURIComponent(hotelId)}/reviews`, {
        comment,
        star,
      });

      setReviewStatusMap((prev) => ({
        ...prev,
        [hotelId]: { type: 'success', message: data?.message || 'Review submitted successfully.' },
      }));

      setReviewForms((prev) => ({
        ...prev,
        [hotelId]: {
          comment: '',
          star: 0,
        },
      }));

      await fetchHotelReviews(hotelId);
      await fetchHotels();
    } catch (err) {
      console.error('Failed to submit hotel review:', err);
      setReviewStatusMap((prev) => ({
        ...prev,
        [hotelId]: {
          type: 'error',
          message: err?.response?.data?.error || 'Failed to submit review.',
        },
      }));
    } finally {
      setReviewSubmittingMap((prev) => ({ ...prev, [hotelId]: false }));
    }
  };

  const submitAdminReply = async (hotelId, reviewId) => {
    const replyText = String(replyForms?.[reviewId] || '').trim();

    if (!replyText) {
      setReplyStatusMap((prev) => ({ ...prev, [reviewId]: { type: 'error', message: 'Please write a reply.' } }));
      return;
    }

    setReplySubmittingMap((prev) => ({ ...prev, [reviewId]: true }));
    setReplyStatusMap((prev) => ({ ...prev, [reviewId]: { type: '', message: '' } }));

    try {
      const { data } = await axios.post(
        `/api/hotels/${encodeURIComponent(hotelId)}/reviews/${encodeURIComponent(reviewId)}/reply`,
        { reply_text: replyText }
      );

      setReplyStatusMap((prev) => ({
        ...prev,
        [reviewId]: { type: 'success', message: data?.message || 'Reply added successfully.' },
      }));
      setReplyForms((prev) => ({ ...prev, [reviewId]: '' }));
      await fetchHotelReviews(hotelId);
    } catch (err) {
      console.error('Failed to submit admin reply:', err);
      setReplyStatusMap((prev) => ({
        ...prev,
        [reviewId]: {
          type: 'error',
          message: err?.response?.data?.error || 'Failed to submit reply.',
        },
      }));
    } finally {
      setReplySubmittingMap((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handleDeleteHotel = async (hotelId) => {
    const normalizedHotelId = String(hotelId || '').trim();
    if (!normalizedHotelId) {
      return;
    }

    const shouldDelete = window.confirm('Delete this hotel card? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }

    setDeletingHotelId(normalizedHotelId);
    setDeleteStatus({ type: '', message: '' });

    try {
      const { data } = await axios.delete(`/api/hotels/admin/${encodeURIComponent(normalizedHotelId)}`);
      setHotels((prev) => prev.filter((hotel) => String(hotel.hotel_id) !== normalizedHotelId));
      setDeleteStatus({
        type: 'success',
        message: data?.message || 'Hotel deleted successfully.',
      });
    } catch (error) {
      setDeleteStatus({
        type: 'error',
        message: error?.response?.data?.error || 'Failed to delete hotel.',
      });
    } finally {
      setDeletingHotelId('');
    }
  };

  useEffect(() => {
    hotels.forEach((hotel) => {
      const hotelId = resolveHotelId(hotel);
      if (hotelId && hotelReviewsMap[hotelId] === undefined && !reviewLoadingMap[hotelId]) {
        fetchHotelReviews(hotelId);
      }
    });
  }, [hotels]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
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
        <h1 className="mb-8 text-center text-4xl font-bold sm:text-5xl">Dashboard</h1>

        <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
          <h2 className="text-2xl font-bold mb-4">User Info</h2>
          <div className="grid grid-cols-1 gap-4 text-gray-200 sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-black/25 p-4">
              <p className="text-sm text-gray-300">Name</p>
              <p className="text-lg font-semibold">{user?.user_metadata?.name || 'Not provided'}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/25 p-4">
              <p className="text-sm text-gray-300">Email</p>
              <p className="text-lg font-semibold">{user?.email || 'Not available'}</p>
            </div>
          </div>
        </div>

        {!isAdmin && bookings.length > 0 && (
          <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
            <h2 className="text-3xl font-bold mb-6">Your Booked Hotels</h2>
            {bookingsLoading ? (
              <p className="text-gray-300">Loading bookings...</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {bookings.map((booking) => (
                  <div key={booking.booking_id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <h3 className="text-lg font-bold text-white">
                      {booking.hotel_name || booking.hotel?.hotel_name || 'Hotel'}
                    </h3>
                    <p className="text-sm text-gray-300 mt-1">{booking.address}</p>
                    
                    <div className="mt-4 space-y-2 text-sm text-gray-300">
                      <div className="flex justify-between">
                        <span>Check-in:</span>
                        <span className="font-semibold text-emerald-300">{formatDate(booking.checkin_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Check-out:</span>
                        <span className="font-semibold text-emerald-300">{formatDate(booking.checkout_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nights:</span>
                        <span className="font-semibold text-emerald-300">{calculateNights(booking.checkin_date, booking.checkout_date)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                        <span>Total Amount:</span>
                        <span className="font-semibold text-emerald-400">₹{Number(booking.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guest:</span>
                        <span className="font-semibold">{booking.guest_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-semibold text-green-400">✓ Confirmed</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
          <h2 className="text-3xl font-bold mb-6">{isAdmin ? 'Your Added Hotels' : 'Stored Hotels'}</h2>
          {deleteStatus.message && (
            <div className={`mb-4 rounded-md px-4 py-2 text-sm font-semibold ${
              deleteStatus.type === 'success'
                ? 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
            }`}>
              {deleteStatus.message}
            </div>
          )}
          {hotels.length === 0 ? (
            <p className="text-gray-300">No hotels available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hotels.map((hotel) => (
                <div key={hotel.place_id || hotel.hotel_id || `${hotel.hotel_name}-${hotel.address}`} className="rounded-xl border border-white/20 bg-black/30 p-4 transition hover:bg-black/40">
                  {(() => {
                    const hotelId = resolveHotelId(hotel);
                    const reviewForm = reviewForms?.[hotelId] || { comment: '', star: 0 };
                    const reviewStatus = reviewStatusMap?.[hotelId] || { type: '', message: '' };
                    const hotelReviews = hotelReviewsMap?.[hotelId] || [];
                    const isLoadingReviews = !!reviewLoadingMap?.[hotelId];
                    const isSubmittingReview = !!reviewSubmittingMap?.[hotelId];

                    return (
                      <>
                        <h3 className="text-xl font-bold">{hotel.hotel_name}</h3>
                        <p className="text-sm text-gray-300 mt-1">{hotel.address}</p>
                        <div className="mt-3 text-sm text-gray-300 space-y-1">
                          <p>Rating: {Number(hotel.rating || 0).toFixed(1)}</p>
                          <p>Price per night: {getDisplayPrice(hotel)}</p>
                          {isAdmin && <p>Details: {hotel.hotel_details || 'No details available.'}</p>}
                          {hotel.contact_no && <p>Contact: {hotel.contact_no}</p>}
                        {isAdmin && hotel.gpay_id && <p>GPay ID: {hotel.gpay_id}</p>}
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteHotel(hotel.hotel_id)}
                            disabled={deletingHotelId === String(hotel.hotel_id)}
                            className="mt-4 w-full rounded-md border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingHotelId === String(hotel.hotel_id) ? 'Deleting...' : 'Delete Hotel'}
                          </button>
                        )}

                        {!isAdmin && (
                          <div className="mt-4 rounded-lg border border-white/15 bg-black/35 p-3">
                            <p className="text-sm font-semibold">Add Review</p>
                            <div className="mt-2 flex gap-2">
                              {[1, 2, 3, 4, 5].map((starValue) => (
                                <button
                                  key={starValue}
                                  type="button"
                                  onClick={() => setReviewFormField(hotelId, 'star', starValue)}
                                  className={`text-2xl leading-none ${starValue <= reviewForm.star ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'}`}
                                  aria-label={`Rate ${starValue} stars`}
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={reviewForm.comment}
                              onChange={(e) => setReviewFormField(hotelId, 'comment', e.target.value)}
                              rows={3}
                              placeholder="Write your comment"
                              className="mt-2 w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm"
                            />

                            {reviewStatus.message && (
                              <p className={`mt-2 text-xs ${reviewStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {reviewStatus.message}
                              </p>
                            )}

                            <button
                              type="button"
                              disabled={!hotelId || isSubmittingReview}
                              onClick={() => submitHotelReview(hotelId)}
                              className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-black hover:brightness-95 disabled:opacity-70"
                            >
                              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </div>
                        )}

                        <div className="mt-3 rounded-lg border border-white/15 bg-black/35 p-3">
                          <p className="text-sm font-semibold">Latest Reviews</p>
                          {isLoadingReviews ? (
                            <p className="mt-2 text-xs text-gray-300">Loading reviews...</p>
                          ) : hotelReviews.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-300">No reviews yet.</p>
                          ) : (
                            <div className="mt-2 space-y-3">
                              {hotelReviews.slice(0, 5).map((review) => {
                                const reviewId = review.review_id;
                                const reviewReplies = Array.isArray(review.admin_replies) ? review.admin_replies : [];
                                const replyStatus = replyStatusMap?.[reviewId] || { type: '', message: '' };
                                const isSubmittingReply = !!replySubmittingMap?.[reviewId];

                                return (
                                  <div key={reviewId} className="rounded bg-black/45 p-2">
                                    <p className="text-xs text-gray-200">{review.comment}</p>
                                    <p className="mt-1 text-[11px] text-gray-400">
                                      {'★'.repeat(Number(review.star || 0))}{'☆'.repeat(5 - Number(review.star || 0))}
                                    </p>

                                    {reviewReplies.length > 0 && (
                                      <div className="mt-2 space-y-2 rounded border border-white/10 bg-black/40 p-2">
                                        {reviewReplies.map((reply) => (
                                          <div key={reply.reply_id}>
                                            <p className="text-[11px] font-semibold text-primary">Admin Reply</p>
                                            <p className="text-[11px] text-gray-200">{reply.reply_text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {isAdmin && hotelId && reviewId && (
                                      <div className="mt-2">
                                        <textarea
                                          value={replyForms?.[reviewId] || ''}
                                          onChange={(e) => setReplyFormField(reviewId, e.target.value)}
                                          rows={2}
                                          placeholder="Reply to this comment"
                                          className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-xs"
                                        />
                                        {replyStatus.message && (
                                          <p className={`mt-1 text-[11px] ${replyStatus.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {replyStatus.message}
                                          </p>
                                        )}
                                        <button
                                          type="button"
                                          disabled={isSubmittingReply}
                                          onClick={() => submitAdminReply(hotelId, reviewId)}
                                          className="mt-2 w-full rounded-md border border-emerald-200 bg-emerald-400 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-70"
                                        >
                                          {isSubmittingReply ? 'Sending...' : 'Send Reply'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
