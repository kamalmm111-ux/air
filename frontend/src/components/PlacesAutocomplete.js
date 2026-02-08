import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "./ui/input";

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Major airports with multiple terminals - append "(All Terminals)" when selected
const MULTI_TERMINAL_AIRPORTS = [
  // UK
  "heathrow", "gatwick", "manchester", "stansted", "luton",
  // Europe
  "charles de gaulle", "cdg", "orly", "schiphol", "frankfurt", "munich", "madrid", "barcelona", "rome fiumicino", "malpensa",
  // Middle East
  "dubai", "abu dhabi", "doha", "hamad",
  // Asia
  "changi", "hong kong", "narita", "haneda", "incheon", "beijing", "shanghai", "bangkok", "kuala lumpur",
  // Americas
  "jfk", "john f kennedy", "lax", "los angeles", "o'hare", "ohare", "miami", "atlanta", "san francisco", "toronto pearson", "vancouver"
];

// Check if the place is a main airport (not a specific terminal)
const isMainAirport = (placeName) => {
  if (!placeName) return false;
  const lowerName = placeName.toLowerCase();
  
  // Check if it's an airport
  const isAirport = lowerName.includes("airport") || 
                   lowerName.includes("(lhr)") || 
                   lowerName.includes("(lgw)") ||
                   lowerName.includes("(ltn)") ||
                   lowerName.includes("(stn)") ||
                   lowerName.includes("(man)");
  
  // Check if it's NOT a specific terminal
  const isSpecificTerminal = lowerName.includes("terminal ") || 
                             lowerName.includes("terminal-") ||
                             lowerName.includes("t1") ||
                             lowerName.includes("t2") ||
                             lowerName.includes("t3") ||
                             lowerName.includes("t4") ||
                             lowerName.includes("t5") ||
                             lowerName.includes("north terminal") ||
                             lowerName.includes("south terminal");
  
  // Check if it's a multi-terminal airport
  const isMultiTerminal = MULTI_TERMINAL_AIRPORTS.some(airport => lowerName.includes(airport));
  
  return isAirport && isMultiTerminal && !isSpecificTerminal;
};

// Format the display name for airports
const formatAirportDisplayName = (placeName, placeTypes) => {
  if (!placeName) return placeName;
  
  // If it's a main airport with multiple terminals, append "(All Terminals)"
  if (isMainAirport(placeName)) {
    // Clean up the name first - remove redundant parts
    let cleanName = placeName;
    
    // Remove "London" prefix if followed by airport name for UK airports
    cleanName = cleanName.replace(/^London\s+/i, "");
    
    // Add "(All Terminals)" if not already present
    if (!cleanName.toLowerCase().includes("all terminals")) {
      cleanName = `${cleanName} (All Terminals)`;
    }
    
    return cleanName;
  }
  
  return placeName;
};

// Global flag to track if script is loading
let isScriptLoading = false;
let scriptLoadPromise = null;

// Load Google Maps script with all required libraries
const loadGoogleMapsScript = () => {
  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve(window.google);
  }

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
      const placeName = place.name || "";
      const fullAddress = place.formatted_address || placeName;
      const placeTypes = place.types || [];
      
      // Check if this is an airport
      const isAirport = placeTypes.includes("airport") || 
                       placeName?.toLowerCase().includes("airport") ||
                       placeName?.toLowerCase().includes("terminal");
      
      // For airports: use the formatted airport name with "(All Terminals)"
      // For regular addresses: use the FULL formatted address from Google
      let displayName;
      
      if (isAirport) {
        // For airports, use the place name and format it
        displayName = formatAirportDisplayName(placeName, placeTypes);
      } else {
        // For regular addresses, use the FULL address so customer sees complete location
        displayName = fullAddress;
      }
      
      // Determine if it's a specific terminal
      const isSpecificTerminal = placeName?.toLowerCase().includes("terminal ") ||
                                 placeName?.toLowerCase().includes("north terminal") ||
                                 placeName?.toLowerCase().includes("south terminal");
      
      const location = {
        address: displayName,
        displayName: displayName,
        originalName: placeName,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id,
        type: isAirport ? "airport" : "address",
        isAllTerminals: isAirport && !isSpecificTerminal && isMainAirport(placeName),
        full_address: fullAddress
      };
      
      // Update the input with the display name (full address for non-airports)
      if (onChangeRef.current) {
        onChangeRef.current(displayName);
      }
      
      if (onPlaceSelectRef.current) {
        onPlaceSelectRef.current(location);
      }
    }
  }, []);

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

    const initTimer = setTimeout(() => {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ["establishment", "geocode"],
          fields: ["formatted_address", "geometry", "name", "place_id", "types"]
        });

        autocomplete.addListener("place_changed", handlePlaceSelect);
        autocompleteRef.current = autocomplete;
      } catch (error) {
        console.error(`Failed to initialize autocomplete for ${instanceId.current}:`, error);
        setLoadError(true);
      }
    }, 100);

    return () => {
      clearTimeout(initTimer);
      if (autocompleteRef.current && window.google && window.google.maps) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {}
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
