"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useState } from "react";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const center = {
  lat: 28.6139,
  lng: 77.2090,
};

export default function MapPicker({ onLocationChange, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || center);

  const handleClick = (event) => {
    const newPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    setPosition(newPosition);
    if (onLocationChange) {
      onLocationChange(newPosition);
    }
  };

  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={position}
        zoom={10}
        onClick={handleClick}
      >
        <Marker position={position} />
      </GoogleMap>
    </LoadScript>
  );
}
