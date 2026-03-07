import React from 'react';
import Link from 'next/link';

const DestinationCard = ({ destination }) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-lg">
      <Link href={`/destinations/${destination.id}`}>
        <div>
          <img src={destination.image_url || '/placeholder.jpg'} alt={destination.name} className="w-full h-48 object-cover" />
          <div className="p-4">
            <h3 className="text-xl font-bold">{destination.name}</h3>
            <p className="text-gray-600">{destination.description?.substring(0, 100)}...</p>
            <div className="flex items-center mt-2">
              <span className="text-yellow-500">{'★'.repeat(Math.round(destination.rating))}</span>
              <span className="text-gray-600 ml-2">{destination.rating?.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default DestinationCard;
