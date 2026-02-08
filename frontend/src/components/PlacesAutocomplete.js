import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "./ui/input";
import { Plane, MapPin } from "lucide-react";
import { searchAirports, formatAirportName } from "../data/airports";

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
  const dropdownRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [airportResults, setAirportResults] = useState([]);
  const [selectedTerminal, setSelectedTerminal] = useState(null);
  const [showTerminals, setShowTerminals] = useState(null);

  const onPlaceSelectRef = useRef(onPlaceSelect);
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onPlaceSelect]);

  // Search airports when input changes
  useEffect(() => {
    if (value && value.length >= 2) {
      const airports = searchAirports(value);
      setAirportResults(airports);
      setShowDropdown(airports.length > 0);
    } else {
      setAirportResults([]);
      setShowDropdown(false);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && 
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowTerminals(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle airport selection
  const handleAirportSelect = async (airport, terminal = null) => {
    const displayName = formatAirportName(airport, terminal);
    onChange(displayName);
    setShowDropdown(false);
    setShowTerminals(null);
    
    // Get coordinates using Google Geocoding or use approximate
    try {
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        const searchQuery = terminal 
          ? `${airport.name} ${terminal}, ${airport.city}`
          : `${airport.name}, ${airport.city}`;
        
        geocoder.geocode({ address: searchQuery }, (results, status) => {
          if (status === "OK" && results[0]) {
            const location = {
              address: displayName,
              displayName: displayName,
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
              placeId: results[0].place_id,
              type: "airport",
              iata_code: airport.iata,
              airport_name: airport.name,
              terminal: terminal,
              city: airport.city,
              country: airport.country
            };
            if (onPlaceSelectRef.current) {
              onPlaceSelectRef.current(location);
            }
          }
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Handle terminal expansion
  const handleShowTerminals = (airport, e) => {
    e.stopPropagation();
    if (showTerminals === airport.iata) {
      setShowTerminals(null);
    } else {
      setShowTerminals(airport.iata);
    }
  };

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
      
      const location = {
        address: place.name || place.formatted_address,
        displayName: place.name || place.formatted_address,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id,
        type: isAirport ? "airport" : "address",
        full_address: place.formatted_address
      };
      
      // Update the input with a cleaner display name
      onChange(location.displayName);
      
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
    <div className="relative">
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
        onFocus={() => {
          if (airportResults.length > 0) setShowDropdown(true);
        }}
      />
      
      {/* Airport Dropdown */}
      {showDropdown && airportResults.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
          style={{ top: '100%' }}
        >
          <div className="px-3 py-2 bg-zinc-50 border-b text-xs font-semibold text-zinc-500 flex items-center gap-2">
            <Plane className="w-3 h-3" />
            AIRPORTS
          </div>
          {airportResults.map((airport) => (
            <div key={airport.iata}>
              <div 
                className="px-3 py-3 hover:bg-zinc-50 cursor-pointer flex items-start gap-3 border-b border-zinc-100"
                onClick={() => handleAirportSelect(airport)}
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Plane className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#0A0F1C]">
                    {airport.name} <span className="text-blue-600 font-bold">({airport.iata})</span>
                  </div>
                  <div className="text-sm text-zinc-500">{airport.city}, {airport.country}</div>
                  {airport.terminals && airport.terminals.length > 0 && (
                    <button
                      onClick={(e) => handleShowTerminals(airport, e)}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center gap-1"
                    >
                      {showTerminals === airport.iata ? "Hide" : "Show"} {airport.terminals.length} terminals
                    </button>
                  )}
                </div>
              </div>
              
              {/* Terminal options */}
              {showTerminals === airport.iata && airport.terminals && (
                <div className="bg-zinc-50 border-b">
                  {airport.terminals.map((terminal) => (
                    <div
                      key={terminal}
                      className="px-3 py-2 pl-14 hover:bg-zinc-100 cursor-pointer text-sm flex items-center gap-2"
                      onClick={() => handleAirportSelect(airport, terminal)}
                    >
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      <span>{airport.name} ({airport.iata}) – {terminal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="px-3 py-2 bg-zinc-50 text-xs text-zinc-400 border-t">
            Or continue typing for more results...
          </div>
        </div>
      )}
    </div>
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
