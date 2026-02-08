import { createContext, useContext, useState } from "react";

const BookingContext = createContext(null);

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return context;
};

export const BookingProvider = ({ children }) => {
  const [bookingData, setBookingData] = useState({
    // Location data
    pickup_location: "",
    pickup_lat: null,
    pickup_lng: null,
    pickup_place_id: null,
    pickup_type: null, // "airport" | "address"
    pickup_iata: null,
    pickup_airport_name: null,
    pickup_terminal: null,
    
    dropoff_location: "",
    dropoff_lat: null,
    dropoff_lng: null,
    dropoff_place_id: null,
    dropoff_type: null,
    dropoff_iata: null,
    dropoff_airport_name: null,
    dropoff_terminal: null,
    
    // Date/time
    pickup_date: "",
    pickup_time: "",
    
    // Passengers
    passengers: 1,
    luggage: 1,
    
    // Flight details (moved to checkout)
    flight_number: "",
    flight_origin: "",
    
    // Child seats - enhanced with types
    child_seats: [],
    
    // Additional notes
    special_instructions: "",
    
    // Distance/duration
    distance_km: 0,
    duration_minutes: 0,
    
    // Return journey fields
    is_return: false,
    return_date: "",
    return_time: "",
    return_flight_number: "",
    
    // Currency
    base_currency: "GBP",
    selected_currency: "GBP",
    fx_rate: 1
  });

  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [quotes, setQuotes] = useState([]);

  const updateBookingData = (data) => {
    setBookingData(prev => ({ ...prev, ...data }));
  };

  const resetBooking = () => {
    setBookingData({
      pickup_location: "",
      pickup_lat: null,
      pickup_lng: null,
      pickup_place_id: null,
      pickup_type: null,
      pickup_iata: null,
      pickup_airport_name: null,
      pickup_terminal: null,
      
      dropoff_location: "",
      dropoff_lat: null,
      dropoff_lng: null,
      dropoff_place_id: null,
      dropoff_type: null,
      dropoff_iata: null,
      dropoff_airport_name: null,
      dropoff_terminal: null,
      
      pickup_date: "",
      pickup_time: "",
      passengers: 1,
      luggage: 1,
      flight_number: "",
      flight_origin: "",
      child_seats: [],
      special_instructions: "",
      distance_km: 0,
      duration_minutes: 0,
      is_return: false,
      return_date: "",
      return_time: "",
      return_flight_number: "",
      base_currency: "GBP",
      selected_currency: "GBP",
      fx_rate: 1
    });
    setSelectedVehicle(null);
    setQuotes([]);
  };

  return (
    <BookingContext.Provider value={{
      bookingData,
      updateBookingData,
      selectedVehicle,
      setSelectedVehicle,
      quotes,
      setQuotes,
      resetBooking
    }}>
      {children}
    </BookingContext.Provider>
  );
};
