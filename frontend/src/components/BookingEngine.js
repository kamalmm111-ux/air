import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";
import { CalendarIcon, MapPin, Clock, Users, Briefcase, Plane, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingEngine = () => {
  const navigate = useNavigate();
  const { bookingData, updateBookingData, setQuotes } = useBooking();
  const [date, setDate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate time options
  const timeOptions = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    if (selectedDate) {
      updateBookingData({ pickup_date: format(selectedDate, "yyyy-MM-dd") });
    }
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

    setLoading(true);

    try {
      // Mock distance calculation (in real app, would use Google Maps)
      const mockDistance = Math.random() * 50 + 10; // 10-60 km
      const isAirport = bookingData.pickup_location.toLowerCase().includes("airport") ||
                        bookingData.dropoff_location.toLowerCase().includes("airport");

      const response = await axios.post(`${API}/quote`, {
        pickup_location: bookingData.pickup_location,
        dropoff_location: bookingData.dropoff_location,
        distance_km: mockDistance,
        passengers: bookingData.passengers,
        luggage: bookingData.luggage,
        meet_greet: bookingData.meet_greet,
        is_airport_pickup: isAirport
      });

      updateBookingData({
        distance_km: response.data.distance_km,
        duration_minutes: response.data.duration_minutes
      });
      setQuotes(response.data.quotes);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Pickup Location */}
        <div className="space-y-2">
          <Label htmlFor="pickup" className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37]" />
            Pickup Location
          </Label>
          <Input
            id="pickup"
            placeholder="Enter pickup address or airport"
            value={bookingData.pickup_location}
            onChange={(e) => updateBookingData({ pickup_location: e.target.value })}
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
          <Input
            id="dropoff"
            placeholder="Enter destination address"
            value={bookingData.dropoff_location}
            onChange={(e) => updateBookingData({ dropoff_location: e.target.value })}
            className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
            data-testid="dropoff-input"
          />
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#D4AF37]" />
            Pickup Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-left font-normal bg-zinc-50 border-zinc-200",
                  !date && "text-muted-foreground"
                )}
                data-testid="date-picker-trigger"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date()}
                initialFocus
                data-testid="calendar"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            Pickup Time
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

        {/* Flight Number */}
        <div className="space-y-2">
          <Label htmlFor="flight" className="text-sm font-medium flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#D4AF37]" />
            Flight Number (Optional)
          </Label>
          <Input
            id="flight"
            placeholder="e.g., BA1234"
            value={bookingData.flight_number}
            onChange={(e) => updateBookingData({ flight_number: e.target.value })}
            className="h-12 bg-zinc-50 border-zinc-200 focus:border-[#0A0F1C] focus:ring-[#0A0F1C]"
            data-testid="flight-input"
          />
        </div>

        {/* Meet & Greet */}
        <div className="flex items-center space-x-3 pt-6">
          <Checkbox
            id="meet_greet"
            checked={bookingData.meet_greet}
            onCheckedChange={(checked) => updateBookingData({ meet_greet: checked })}
            data-testid="meet-greet-checkbox"
          />
          <Label htmlFor="meet_greet" className="text-sm font-medium cursor-pointer">
            Meet & Greet Service (+£15)
          </Label>
        </div>
      </div>

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
            Searching...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Vehicles
          </span>
        )}
      </Button>
    </div>
  );
};

export default BookingEngine;
