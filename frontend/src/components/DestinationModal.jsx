'use client';

import React from 'react';
import MapPicker from './MapPicker';

const DestinationModal = ({ isOpen, onClose, onSave, destination }) => {
  if (!isOpen) return null;

  const [name, setName] = React.useState(destination?.name || '');
  const [description, setDescription] = React.useState(destination?.description || '');
  const [imageUrl, setImageUrl] = React.useState(destination?.image_url || '');
  const [location, setLocation] = React.useState(
    destination?.lat && destination?.lng ? { lat: destination.lat, lng: destination.lng } : null
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...destination, name, description, image_url: imageUrl, ...location });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">{destination ? 'Edit' : 'Add'} Destination</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <label className="block text-gray-700">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-md"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-md"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700">Image URL</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border rounded-md"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Location</label>
              <MapPicker onLocationChange={setLocation} initialPosition={location} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DestinationModal;
