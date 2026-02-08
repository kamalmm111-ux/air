import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "./ui/input";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Load Google Maps script with all required libraries
const loadGoogleMapsScript = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve(window.google);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          resolve(window.google);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.google && window.google.maps) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps load timeout"));
        }
      }, 10000);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    window.initGoogleMaps = () => {
      if (window.google && window.google.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps failed to initialize"));
      }
    };
    
    script.onerror = (error) => {
      console.error("Google Maps script load error:", error);
      reject(error);
    };
    
    document.head.appendChild(script);
    
    setTimeout(() => {
      if (!window.google || !window.google.maps) {
        reject(new Error("Google Maps load timeout"));
      }
    }, 10000);
  });
};

const PlacesAutocomplete = ({ 
  value, 
  onChange, 
  onPlaceSelect, 
  placeholder, 
  className,
  id,
  "data-testid": dataTestId
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return;
    
    const place = autocompleteRef.current.getPlace();
    
    if (place && place.geometry) {
      // Check if this is an airport
      const isAirport = place.types && (
        place.types.includes("airport") || 
        place.name?.toLowerCase().includes("airport") ||
        place.name?.toLowerCase().includes("terminal")
      );
      
      // Use the place name for display (cleaner than formatted_address)
      const displayName = place.name || place.formatted_address;
      
      const location = {
        address: displayName,
        displayName: displayName,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id,
        type: isAirport ? "airport" : "address",
        full_address: place.formatted_address
      };
      
      // Update the input with the place name
      onChange(displayName);
      
      if (onPlaceSelectRef.current) {
        onPlaceSelectRef.current(location);
      }
    }
  }, [onChange]);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API key not configured");
      setLoadError(true);
      return;
    }

    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
        setLoadError(false);
      })
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
        setLoadError(true);
      });
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;
    
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (e) {}
      autocompleteRef.current = null;
    }

    try {
      // Configure autocomplete to prioritize airports and establishments
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment", "geocode"],
        fields: ["formatted_address", "geometry", "name", "place_id", "types"]
      });

      autocomplete.addListener("place_changed", handlePlaceSelect);
      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error("Failed to initialize autocomplete:", error);
      setLoadError(true);
    }

    return () => {
      if (autocompleteRef.current && window.google && window.google.maps) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {}
      }
    };
  }, [isLoaded, loadError, handlePlaceSelect]);

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      data-testid={dataTestId}
      autoComplete="off"
    />
  );
};

// Calculate distance between two points using Google Distance Matrix
export const calculateDistance = async (origin, destination) => {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      // Fallback to Haversine formula for estimation
      const R = 6371;
      const dLat = (destination.lat - origin.lat) * Math.PI / 180;
      const dLon = (destination.lng - origin.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c * 1.3;
      
      resolve({
        distance_km: Math.round(distance * 10) / 10,
        duration_minutes: Math.ceil(distance * 1.5)
      });
      return;
    }

    const service = new window.google.maps.DistanceMatrixService();
    
    service.getDistanceMatrix(
      {
        origins: [new window.google.maps.LatLng(origin.lat, origin.lng)],
        destinations: [new window.google.maps.LatLng(destination.lat, destination.lng)],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC
      },
      (response, status) => {
        if (status === "OK" && response.rows[0]?.elements[0]?.status === "OK") {
          const element = response.rows[0].elements[0];
          resolve({
            distance_km: Math.round(element.distance.value / 100) / 10,
            duration_minutes: Math.ceil(element.duration.value / 60)
          });
        } else {
          // Fallback
          const R = 6371;
          const dLat = (destination.lat - origin.lat) * Math.PI / 180;
          const dLon = (destination.lng - origin.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c * 1.3;
          
          resolve({
            distance_km: Math.round(distance * 10) / 10,
            duration_minutes: Math.ceil(distance * 1.5)
          });
        }
      }
    );
  });
};

export default PlacesAutocomplete;
