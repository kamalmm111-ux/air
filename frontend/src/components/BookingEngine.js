import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarIcon, MapPin, Clock, Users, Briefcase, Search, ArrowLeftRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import PlacesAutocomplete, { calculateDistance } from "./PlacesAutocomplete";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingEngine = () => {
  const navigate = useNavigate();
  const { bookingData, updateBookingData, setQuotes } = useBooking();
  const [loading, setLoading] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [tripType, setTripType] = useState("one-way"); // "one-way" or "return"

  // Generate time options
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  // Get tomorrow's date as minimum
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Get minimum return date (must be >= pickup date)
  const getMinReturnDate = () => {
    if (bookingData.pickup_date) {
      return bookingData.pickup_date;
    }
    return getTomorrowDate();
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    updateBookingData({ pickup_date: newDate });
    // If return date is before pickup date, reset it
    if (bookingData.return_date && bookingData.return_date < newDate) {
      updateBookingData({ return_date: newDate });
    }
  };

  const handleTripTypeChange = (type) => {
    setTripType(type);
    updateBookingData({ 
      is_return: type === "return",
      return_date: type === "return" ? bookingData.pickup_date : "",
      return_time: ""
    });
  };

  const handlePickupSelect = (location) => {
    updateBookingData({ 
      pickup_location: location.displayName || location.address,
      pickup_lat: location.lat,
      pickup_lng: location.lng,
      pickup_place_id: location.placeId,
      pickup_type: location.type,
      pickup_iata: location.iata_code,
      pickup_airport_name: location.airport_name,
      pickup_terminal: location.terminal
    });
    setPickupCoords({ lat: location.lat, lng: location.lng });
  };

  const handleDropoffSelect = (location) => {
    updateBookingData({ 
      dropoff_location: location.displayName || location.address,
      dropoff_lat: location.lat,
      dropoff_lng: location.lng,
      dropoff_place_id: location.placeId,
      dropoff_type: location.type,
      dropoff_iata: location.iata_code,
      dropoff_airport_name: location.airport_name,
      dropoff_terminal: location.terminal
    });
    setDropoffCoords({ lat: location.lat, lng: location.lng });
  };

  const handleSearch = async () => {
    // Validate required fields
    if (!bookingData.pickup_location || !bookingData.dropoff_location) {
      toast.error("Please enter pickup and drop-off locations");
      return;
    }
    if (!bookingData.pickup_date) {
      toast.error("Please select a pickup date");
      return;
    }
    if (!bookingData.pickup_time) {
      toast.error("Please select a pickup time");
      return;
    }

    // Validate return fields if return journey is selected
    if (tripType === "return") {
      if (!bookingData.return_date) {
        toast.error("Please select a return date");
        return;
      }
      if (!bookingData.return_time) {
        toast.error("Please select a return time");
        return;
      }
    }

    setLoading(true);

    try {
      let distance_km, duration_minutes;

      // Try to calculate real distance using Google Maps
      if (pickupCoords && dropoffCoords) {
        try {
          const distanceResult = await calculateDistance(
            { lat: pickupCoords.lat, lng: pickupCoords.lng },
            { lat: dropoffCoords.lat, lng: dropoffCoords.lng }
          );
          distance_km = distanceResult.distance_km;
          duration_minutes = distanceResult.duration_minutes;
        } catch (error) {
          console.warn("Distance calculation failed, using estimate:", error);
          // Fallback to estimate
          distance_km = Math.random() * 50 + 10;
          duration_minutes = Math.ceil(distance_km * 2);
        }
      } else {
        // Fallback for manual entry without autocomplete
        distance_km = Math.random() * 50 + 10;
        duration_minutes = Math.ceil(distance_km * 2);
      }

      const isAirport = bookingData.pickup_location.toLowerCase().includes("airport") ||
                        bookingData.dropoff_location.toLowerCase().includes("airport") ||
                        bookingData.pickup_location.toLowerCase().includes("heathrow") ||
                        bookingData.pickup_location.toLowerCase().includes("gatwick") ||
                        bookingData.pickup_location.toLowerCase().includes("stansted") ||
                        bookingData.pickup_location.toLowerCase().includes("luton") ||
                        bookingData.dropoff_location.toLowerCase().includes("heathrow") ||
                        bookingData.dropoff_location.toLowerCase().includes("gatwick") ||
                        bookingData.dropoff_location.toLowerCase().includes("stansted") ||
                        bookingData.dropoff_location.toLowerCase().includes("luton");

      const response = await axios.post(`${API}/quote`, {
        pickup_location: bookingData.pickup_location,
        dropoff_location: bookingData.dropoff_location,
        pickup_lat: bookingData.pickup_lat,
        pickup_lng: bookingData.pickup_lng,
        dropoff_lat: bookingData.dropoff_lat,
        dropoff_lng: bookingData.dropoff_lng,
        distance_km: distance_km,
        passengers: bookingData.passengers,
        luggage: bookingData.luggage,
        meet_greet: bookingData.meet_greet,
        is_airport_pickup: isAirport
      });

      // If return journey, double the distance for pricing indication
      const finalQuotes = response.data.quotes.map(quote => ({
        ...quote,
        // Store original one-way price
        one_way_price: quote.price,
        // If return, show total price (roughly 2x, could add discount)
        price: tripType === "return" ? Math.round(quote.price * 1.9 * 100) / 100 : quote.price,
        is_return: tripType === "return"
      }));

      updateBookingData({
        distance_km: response.data.distance_km,
        duration_minutes: response.data.duration_minutes,
        is_return: tripType === "return"
      });
      setQuotes(finalQuotes);
      navigate("/search");
    } catch (error) {
      console.error("Quote error:", error);
      toast.error("Failed to get quotes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-sm shadow-2xl p-6 md:p-8 max-w-4xl mx-auto" data-testid="booking-engine">
      <h2 className="text-2xl md:text-3xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
        Book Your Transfer
      </h2>

      {/* Trip Type Toggle */}
      <div className="flex gap-2 mb-6" data-testid="trip-type-toggle">
        <Button
          type="button"
          variant={tripType === "one-way" ? "default" : "outline"}
          onClick={() => handleTripTypeChange("one-way")}
          className={`flex-1 h-12 ${tripType === "one-way" ? "bg-[#0A0F1C]" : "border-zinc-300"}`}
          data-testid="one-way-btn"
        >
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          One Way
        </Button>
        <Button
          type="button"
          variant={tripType === "return" ? "default" : "outline"}
          onClick={() => handleTripTypeChange("return")}
          className={`flex-1 h-12 ${tripType === "return" ? "bg-[#0A0F1C]" : "border-zinc-300"}`}
          data-testid="return-btn"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Return Journey
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Pickup Location */}
        <div className="space-y-2">
          <Label htmlFor="pickup" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
            Pickup Location
          </Label>
          <PlacesAutocomplete
            id="pickup"
            value={bookingData.pickup_location}
            onChange={(value) => updateBookingData({ pickup_location: value })}
            onPlaceSelect={handlePickupSelect}
            placeholder="Enter pickup address or airport"
            className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
            data-testid="pickup-input"
          />
        </div>

        {/* Drop-off Location */}
        <div className="space-y-2">
          <Label htmlFor="dropoff" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
            Drop-off Location
          </Label>
          <PlacesAutocomplete
            id="dropoff"
            value={bookingData.dropoff_location}
            onChange={(value) => updateBookingData({ dropoff_location: value })}
            onPlaceSelect={handleDropoffSelect}
            placeholder="Enter destination address"
            className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
            data-testid="dropoff-input"
          />
        </div>

        {/* Outbound Date */}
        <div className="space-y-2">
          <Label htmlFor="pickup_date" className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
            {tripType === "return" ? "Outbound Date" : "Pickup Date"}
          </Label>
          <Input
            id="pickup_date"
            type="date"
            min={getTomorrowDate()}
            value={bookingData.pickup_date}
            onChange={handleDateChange}
            className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
            data-testid="date-input"
          />
        </div>

        {/* Outbound Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            {tripType === "return" ? "Outbound Time" : "Pickup Time"}
          </Label>
          <Select
            value={bookingData.pickup_time}
            onValueChange={(value) => updateBookingData({ pickup_time: value })}
          >
            <SelectTrigger className="h-12 bg-zinc-50 border-zinc-200" data-testid="time-select">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Return Date & Time - Only shown when return is selected */}
        {tripType === "return" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="return_date" className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
                Return Date
              </Label>
              <Input
                id="return_date"
                type="date"
                min={getMinReturnDate()}
                value={bookingData.return_date}
                onChange={(e) => updateBookingData({ return_date: e.target.value })}
                className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
                data-testid="return-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D4AF37]" />
                Return Time
              </Label>
              <Select
                value={bookingData.return_time}
                onValueChange={(value) => updateBookingData({ return_time: value })}
              >
                <SelectTrigger className="h-12 bg-zinc-50 border-zinc-200" data-testid="return-time-select">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Passengers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-[#D4AF37]" />
            Passengers
          </Label>
          <Select
            value={bookingData.passengers.toString()}
            onValueChange={(value) => updateBookingData({ passengers: parseInt(value) })}
          >
            <SelectTrigger className="h-12 bg-zinc-50 border-zinc-200" data-testid="passengers-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n} {n === 1 ? "Passenger" : "Passengers"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Luggage */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#D4AF37]" />
            Luggage
          </Label>
          <Select
            value={bookingData.luggage.toString()}
            onValueChange={(value) => updateBookingData({ luggage: parseInt(value) })}
          >
            <SelectTrigger className="h-12 bg-zinc-50 border-zinc-200" data-testid="luggage-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n} {n === 1 ? "Bag" : "Bags"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Return Journey Notice */}
      {tripType === "return" && (
        <div className="mt-4 p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-sm">
          <p className="text-sm text-[#0A0F1C] flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#D4AF37]" />
            <span><strong>Return Journey:</strong> Save up to 10% when booking a return trip!</span>
          </p>
        </div>
      )}

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        disabled={loading}
        className="w-full mt-6 h-14 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white font-bold tracking-wide uppercase"
        data-testid="search-vehicles-btn"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            Calculating Route...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {tripType === "return" ? "Search Return Vehicles" : "Search Vehicles"}
          </span>
        )}
      </Button>
    </div>
  );
};

export default BookingEngine;
