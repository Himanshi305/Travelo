'use client';
import React from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BACKEND_URL|| 'http://localhost:5000')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const Star = ({ filled }) => (
  <span className={`text-yellow-500 ${filled ? ' ' : 'text-gray-600'}`}>★</span>
);

const Rating = ({ value }) => {
  const totalStars = 5;
  const filledStars = Math.round(value);
  return (
    <div className="flex">
      {[...Array(totalStars)].map((_, i) => (
        <Star key={i} filled={i < filledStars} />
      ))}
    </div>
  );
};

const getHotelImage = (hotel) => {
  const directImageUrl = String(hotel?.hotel_image_url || '').trim();
  if (/^https?:\/\//i.test(directImageUrl)) {
    return directImageUrl;
  }

  if (directImageUrl.startsWith('/')) {
    return `${API_BASE_URL}${directImageUrl}`;
  }

  if (hotel.photo_reference && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${hotel.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  }

  return `https://source.unsplash.com/800x500/?hotel,${encodeURIComponent(hotel.hotel_name || 'travel')}`;
};

const getDisplayPrice = (hotel) => {
  const numericPrice = Number(hotel?.price_per_night);
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    return 0;
  }

  return Math.trunc(numericPrice);
};

const HotelCard = ({ hotel, onSelect }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(hotel);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 text-left w-full"
    >
      <img
        src={getHotelImage(hotel)}
        alt={hotel.hotel_name}
        className="h-48 w-full object-cover"
      />
      <div className="p-4">
        <h3 className="text-xl font-bold text-white">{hotel.hotel_name}</h3>
        <p className="text-gray-400 text-sm mt-1">{hotel.address}</p>
        <div className="flex items-center mt-2">
          <Rating value={hotel.rating} />
          <span className="text-gray-300 ml-2 text-sm">{hotel.rating.toFixed(1)}</span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-emerald-300">Price per night: {getDisplayPrice(hotel)}</p>
          {hotel.contact_no && <p className="text-sm text-gray-400 mt-1">Contact: {hotel.contact_no}</p>}
          <p className="text-xs text-amber-300 mt-2">Click card to view hotel details</p>
        </div>
      </div>
    </button>
  );
};

export default HotelCard;
