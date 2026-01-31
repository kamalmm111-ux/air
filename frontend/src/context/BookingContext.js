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
    pickup_location: "",
    pickup_lat: null,
    pickup_lng: null,
    dropoff_location: "",
    dropoff_lat: null,
    dropoff_lng: null,
    pickup_date: "",
    pickup_time: "",
    passengers: 1,
    luggage: 1,
    flight_number: "",
    meet_greet: false,
    distance_km: 0,
    duration_minutes: 0
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
      dropoff_location: "",
      dropoff_lat: null,
      dropoff_lng: null,
      pickup_date: "",
      pickup_time: "",
      passengers: 1,
      luggage: 1,
      flight_number: "",
      meet_greet: false,
      distance_km: 0,
      duration_minutes: 0
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
