'use client';

import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import axios from '../../services/axios';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [hotels, setHotels] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [hotelReviewsMap, setHotelReviewsMap] = useState({});
  const [reviewLoadingMap, setReviewLoadingMap] = useState({});
  const [reviewSubmittingMap, setReviewSubmittingMap] = useState({});
  const [reviewStatusMap, setReviewStatusMap] = useState({});

  useEffect(() => {
    fetchHotels();
  }, [user]);

  const fetchHotels = async () => {
    try {
      const res = await axios.get('/api/hotels');
      setHotels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const resolveHotelId = (hotel) => {
    const rawId = hotel?.hotel_id || hotel?.place_id || null;
    return rawId ? String(rawId).trim() : null;
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

  useEffect(() => {
    hotels.forEach((hotel) => {
      const hotelId = resolveHotelId(hotel);
      if (hotelId && hotelReviewsMap[hotelId] === undefined && !reviewLoadingMap[hotelId]) {
        fetchHotelReviews(hotelId);
      }
    });
  }, [hotels]);


  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a)",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
      </div>
      <div className="relative container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold mb-8 text-center">Dashboard</h1>

        <div className="mb-8 bg-gray-800/60 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">User Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-200">
            <div className="bg-gray-700/60 rounded-md p-4">
              <p className="text-sm text-gray-300">Name</p>
              <p className="text-lg font-semibold">{user?.user_metadata?.name || 'Not provided'}</p>
            </div>
            <div className="bg-gray-700/60 rounded-md p-4">
              <p className="text-sm text-gray-300">Email</p>
              <p className="text-lg font-semibold">{user?.email || 'Not available'}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg">
          <h2 className="text-3xl font-bold mb-6">Stored Hotels</h2>
          {hotels.length === 0 ? (
            <p className="text-gray-300">No hotels stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotels.map((hotel) => (
                <div key={hotel.place_id || hotel.hotel_id || `${hotel.hotel_name}-${hotel.address}`} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
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
                          <p>Price/Night: ${Number(hotel.price_per_night || 0).toFixed(2)}</p>
                          {hotel.contact_no && <p>Contact: {hotel.contact_no}</p>}
                        </div>

                        <div className="mt-4 rounded-md bg-gray-700 p-3">
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
                            className="mt-2 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm"
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
                            className="mt-2 w-full rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-70"
                          >
                            {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                          </button>
                        </div>

                        <div className="mt-3 rounded-md bg-gray-700 p-3">
                          <p className="text-sm font-semibold">Latest Reviews</p>
                          {isLoadingReviews ? (
                            <p className="mt-2 text-xs text-gray-300">Loading reviews...</p>
                          ) : hotelReviews.length === 0 ? (
                            <p className="mt-2 text-xs text-gray-300">No reviews yet.</p>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {hotelReviews.slice(0, 3).map((review) => (
                                <div key={review.review_id} className="rounded bg-gray-800 p-2">
                                  <p className="text-xs text-gray-200">{review.comment}</p>
                                  <p className="mt-1 text-[11px] text-gray-400">
                                    {'★'.repeat(Number(review.star || 0))}{'☆'.repeat(5 - Number(review.star || 0))}
                                  </p>
                                </div>
                              ))}
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

