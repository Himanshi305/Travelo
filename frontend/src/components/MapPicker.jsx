"use client";

import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useState, useEffect } from "react";
import GoogleMapsLoader from "./GoogleMapsLoader";

const containerStyle = {
  width: "100%",
  height: "400px",
};

const center = {
  lat: 28.6139,
  lng: 77.209,
};

export default function MapPicker({ onLocationChange }) {
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLocation = { lat: latitude, lng: longitude };
          setOrigin(currentLocation);
          if (onLocationChange) {
            onLocationChange({ origin: currentLocation, destination });
          }
        },
        () => {
          // Handle error or user denial
          setOrigin(center); // Fallback to default center
        }
      );
    } else {
      // Browser doesn't support Geolocation
      setOrigin(center); // Fallback to default center
    }
  }, []);

  const handleClick = (event) => {
    const newDestination = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    setDestination(newDestination);
    setResponse(null); // Clear previous route
    if (onLocationChange) {
      onLocationChange({ origin, destination: newDestination });
    }
  };

  const directionsCallback = (res) => {
    if (res !== null) {
      if (res.status === "OK") {
        setResponse(res);

      }
    }
  };

  return (
    <GoogleMapsLoader>
      <GoogleMap mapContainerStyle={containerStyle} center={origin || center} zoom={10}>
        {origin && <Marker position={origin} label="A" />}
        {destination && <Marker position={destination} label="B" onClick={handleClick} />}

        {origin && destination && !response && (
          <DirectionsService
            options={{
              destination: destination,
              origin: origin,
              travelMode: "DRIVING",
            }}
            callback={directionsCallback}
          />
        )}

        {response && (
          <DirectionsRenderer
            options={{
              directions: response,
            }}
          />
        )}
      </GoogleMap>
    </GoogleMapsLoader>
  );
}
