'use client';
import React from 'react';

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

const HotelCard = ({ hotel }) => {
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300">
      <div className="p-4">
        <h3 className="text-xl font-bold text-white">{hotel.hotel_name}</h3>
        <p className="text-gray-400 text-sm mt-1">{hotel.address}</p>
        <div className="flex items-center mt-2">
          <Rating value={hotel.rating} />
          <span className="text-gray-300 ml-2 text-sm">{hotel.rating.toFixed(1)}</span>
        </div>
        <div className="mt-4">
          <p className="text-lg font-semibold text-green-400">
            {hotel.price_per_night > 0 ? `$${hotel.price_per_night.toFixed(2)}` : 'Price not available'}
            <span className="text-sm text-gray-400"> / night</span>
          </p>
          {hotel.contact_no && <p className="text-sm text-gray-400 mt-1">Contact: {hotel.contact_no}</p>}
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
