import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "./ui/input";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Global flag to track if script is loading
let isScriptLoading = false;
let scriptLoadPromise = null;

// Load Google Maps script with all required libraries
const loadGoogleMapsScript = () => {
  // Return existing promise if already loading
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  // If already loaded, resolve immediately
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }

  // Check for existing script
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingScript && !isScriptLoading) {
    scriptLoadPromise = new Promise((resolve) => {
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
        }
      }, 10000);
    });
    return scriptLoadPromise;
  }

  // Create new script
  isScriptLoading = true;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    window.initGoogleMaps = () => {
      isScriptLoading = false;
      if (window.google && window.google.maps) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps failed to initialize"));
      }
    };
    
    script.onerror = (error) => {
      isScriptLoading = false;
      console.error("Google Maps script load error:", error);
      reject(error);
    };
    
    document.head.appendChild(script);
    
    setTimeout(() => {
      if (!window.google || !window.google.maps) {
        isScriptLoading = false;
        reject(new Error("Google Maps load timeout"));
      }
    }, 15000);
  });

  return scriptLoadPromise;
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
  const instanceId = useRef(`places-${id || Math.random().toString(36).substr(2, 9)}`);

  // Store callback in ref to avoid stale closures
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onChangeRef = useRef(onChange);
  
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
    onChangeRef.current = onChange;
  }, [onPlaceSelect, onChange]);

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
      if (onChangeRef.current) {
        onChangeRef.current(displayName);
      }
      
      if (onPlaceSelectRef.current) {
        onPlaceSelectRef.current(location);
      }
    }
  }, []);

  // Load Google Maps script
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

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || loadError) return;
    
    // Clean up previous autocomplete instance
    if (autocompleteRef.current) {
      try {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      } catch (e) {
        // Ignore cleanup errors
      }
      autocompleteRef.current = null;
    }

    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      try {
        // Create a fresh autocomplete instance for this input
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["establishment", "geocode"],
          fields: ["formatted_address", "geometry", "name", "place_id", "types"]
        });

        // Add place_changed listener
        autocomplete.addListener("place_changed", handlePlaceSelect);
        
        // Store reference
        autocompleteRef.current = autocomplete;
      } catch (error) {
        console.error(`Failed to initialize autocomplete for ${instanceId.current}:`, error);
        setLoadError(true);
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearTimeout(initTimer);
      if (autocompleteRef.current && window.google && window.google.maps) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, loadError, handlePlaceSelect]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    if (onChangeRef.current) {
      onChangeRef.current(newValue);
    }
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      data-testid={dataTestId}
      autoComplete="off"
    />
  );
};

// Calculate distance between two points using Google Distance Matrix
export const calculateDistance = async (origin, destination) => {
  return new Promise((resolve) => {
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
