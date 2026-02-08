import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MapPin, Clock, Users, Briefcase, ArrowLeft, CreditCard, Shield, Check, Plane, Baby, Globe, Plus, Minus, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default child seat types (fallback)
const DEFAULT_CHILD_SEAT_TYPES = [
  { id: "infant", name: "Infant Seat", age_range: "0-12 months", price: 10 },
  { id: "toddler", name: "Toddler Seat", age_range: "1-4 years", price: 10 },
  { id: "booster", name: "Booster Seat", age_range: "4-8 years", price: 8 }
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { bookingData, selectedVehicle, updateBookingData } = useBooking();
  const { user, token } = useAuth();
  const { formatPrice, currency, getCurrentRate } = useCurrency();

  const [formData, setFormData] = useState({
    passenger_name: user?.name || "",
    passenger_email: user?.email || "",
    passenger_phone: user?.phone || "",
    flight_number: bookingData.flight_number || "",
    flight_origin: bookingData.flight_origin || "",
    special_instructions: bookingData.special_instructions || "",
    pickup_notes: "",
    dropoff_notes: ""
  });
  
  // Child seats state - array of {type, qty}
  const [childSeats, setChildSeats] = useState([]);
  const [childSeatTypes, setChildSeatTypes] = useState(DEFAULT_CHILD_SEAT_TYPES);
  const [loading, setLoading] = useState(false);

  // Fetch child seat pricing from API
  const fetchChildSeatPricing = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings/child-seats`);
      if (response.data.child_seats && response.data.child_seats.length > 0) {
        setChildSeatTypes(response.data.child_seats);
      }
    } catch (error) {
      console.error("Failed to fetch child seat pricing:", error);
      // Use defaults on error
    }
  }, []);

  useEffect(() => {
    fetchChildSeatPricing();
  }, [fetchChildSeatPricing]);

  useEffect(() => {
    if (!selectedVehicle) {
      navigate("/");
    }
  }, [selectedVehicle, navigate]);

  if (!selectedVehicle) {
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Add child seat
  const addChildSeat = (type) => {
    const existing = childSeats.find(s => s.type === type);
    if (existing) {
      setChildSeats(childSeats.map(s => 
        s.type === type ? { ...s, qty: Math.min(s.qty + 1, 3) } : s
      ));
    } else {
      setChildSeats([...childSeats, { type, qty: 1 }]);
    }
  };

  // Remove child seat
  const removeChildSeat = (type) => {
    const existing = childSeats.find(s => s.type === type);
    if (existing && existing.qty > 1) {
      setChildSeats(childSeats.map(s => 
        s.type === type ? { ...s, qty: s.qty - 1 } : s
      ));
    } else {
      setChildSeats(childSeats.filter(s => s.type !== type));
    }
  };

  // Calculate child seats total
  const getChildSeatsTotal = () => {
    return childSeats.reduce((total, seat) => {
      const seatType = childSeatTypes.find(t => t.id === seat.type);
      return total + (seatType?.price || 0) * seat.qty;
    }, 0);
  };

  // Calculate total price
  const getTotalPrice = () => {
    return selectedVehicle.price + getChildSeatsTotal();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.passenger_name || !formData.passenger_email || !formData.passenger_phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Prepare child seats data
      const childSeatsData = childSeats.map(seat => {
        const seatType = childSeatTypes.find(t => t.id === seat.type);
        return {
          type: seat.type,
          name: seatType?.name,
          age_range: seatType?.age_range,
          qty: seat.qty,
          price_per_seat: seatType?.price
        };
      });

      const bookingPayload = {
        ...bookingData,
        ...formData,
        child_seats: childSeatsData,
        vehicle_category_id: selectedVehicle.vehicle_category_id,
        price: getTotalPrice(),
        base_price: selectedVehicle.price,
        child_seats_total: getChildSeatsTotal(),
        currency: "GBP",
        selected_currency: currency,
        fx_rate: getCurrentRate(),
        payment_method: "stripe"
      };

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const bookingResponse = await axios.post(`${API}/bookings`, bookingPayload, { headers });
      const booking = bookingResponse.data;

      const paymentResponse = await axios.post(
        `${API}/payments/create-session?booking_id=${booking.id}`,
        {},
        { headers: { ...headers, origin: window.location.origin } }
      );

      if (paymentResponse.data.url) {
        window.location.href = paymentResponse.data.url;
      } else {
        throw new Error("Failed to get payment URL");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.detail || "Failed to process booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/search")}
          className="mb-6 text-zinc-600 hover:text-[#0A0F1C]"
          data-testid="back-to-vehicles-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vehicles
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="border-zinc-200">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Passenger Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="passenger_name">Full Name *</Label>
                      <Input
                        id="passenger_name"
                        name="passenger_name"
                        value={formData.passenger_name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        required
                        className="h-12"
                        data-testid="passenger-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passenger_email">Email Address *</Label>
                      <Input
                        id="passenger_email"
                        name="passenger_email"
                        type="email"
                        value={formData.passenger_email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        required
                        className="h-12"
                        data-testid="passenger-email-input"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="passenger_phone">Phone Number *</Label>
                      <Input
                        id="passenger_phone"
                        name="passenger_phone"
                        value={formData.passenger_phone}
                        onChange={handleChange}
                        placeholder="+44 7700 900000"
                        required
                        className="h-12"
                        data-testid="passenger-phone-input"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Flight Details Section */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-[#0A0F1C] flex items-center gap-2">
                      <Plane className="w-4 h-4 text-[#D4AF37]" />
                      Flight Details (Optional)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="flight_number">Flight Number</Label>
                        <Input
                          id="flight_number"
                          name="flight_number"
                          value={formData.flight_number}
                          onChange={handleChange}
                          placeholder="e.g., BA1234"
                          className="h-12"
                          data-testid="flight-number-input"
                        />
                        <p className="text-xs text-zinc-500">We'll track your flight for delays</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="flight_origin" className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Flight Arriving From
                        </Label>
                        <Input
                          id="flight_origin"
                          name="flight_origin"
                          value={formData.flight_origin}
                          onChange={handleChange}
                          placeholder="e.g., New York, Dubai, Paris"
                          className="h-12"
                          data-testid="flight-origin-input"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Child Seats Section - Enhanced */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-[#0A0F1C] flex items-center gap-2">
                      <Baby className="w-4 h-4 text-[#D4AF37]" />
                      Child Seats
                    </h3>
                    <p className="text-sm text-zinc-500">Select the type and number of child seats required</p>
                    
                    <div className="space-y-3">
                      {CHILD_SEAT_TYPES.map((seatType) => {
                        const selected = childSeats.find(s => s.type === seatType.id);
                        return (
                          <div 
                            key={seatType.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              selected ? 'border-[#D4AF37] bg-[#D4AF37]/5' : 'border-zinc-200 bg-zinc-50'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-[#0A0F1C]">{seatType.name}</div>
                              <div className="text-sm text-zinc-500">{seatType.ageRange}</div>
                              <div className="text-sm font-medium text-[#D4AF37]">
                                {formatPrice(seatType.price)} per seat
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {selected ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => removeChildSeat(seatType.id)}
                                    data-testid={`remove-${seatType.id}-btn`}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <span className="w-8 text-center font-bold">{selected.qty}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => addChildSeat(seatType.id)}
                                    disabled={selected.qty >= 3}
                                    data-testid={`add-${seatType.id}-btn`}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addChildSeat(seatType.id)}
                                  className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                                  data-testid={`select-${seatType.id}-btn`}
                                >
                                  <Plus className="w-4 h-4 mr-1" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {childSeats.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-[#D4AF37]/10 rounded-lg">
                        <span className="text-sm font-medium">Child Seats Total:</span>
                        <span className="font-bold text-[#D4AF37]">{formatPrice(getChildSeatsTotal())}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Additional Information */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-[#0A0F1C]">Additional Information</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="special_instructions">Special Instructions / Notes</Label>
                      <Textarea
                        id="special_instructions"
                        name="special_instructions"
                        value={formData.special_instructions}
                        onChange={handleChange}
                        placeholder="Any special requirements, wheelchair assistance, multiple stops, etc."
                        rows={3}
                        data-testid="special-instructions-input"
                      />
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pickup_notes">Pickup Notes (Optional)</Label>
                        <Textarea
                          id="pickup_notes"
                          name="pickup_notes"
                          value={formData.pickup_notes}
                          onChange={handleChange}
                          placeholder="e.g., Terminal 5, outside Arrivals..."
                          rows={2}
                          data-testid="pickup-notes-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dropoff_notes">Drop-off Notes (Optional)</Label>
                        <Textarea
                          id="dropoff_notes"
                          name="dropoff_notes"
                          value={formData.dropoff_notes}
                          onChange={handleChange}
                          placeholder="e.g., Specific entrance, building name..."
                          rows={2}
                          data-testid="dropoff-notes-input"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Security Note */}
                  <div className="bg-zinc-100 p-4 rounded-sm flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-[#0A0F1C]">Secure Payment</p>
                      <p className="text-zinc-600">Your payment is processed securely by Stripe. We never store your card details.</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white font-bold text-lg"
                    data-testid="proceed-to-payment-btn"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Pay {formatPrice(getTotalPrice())} - Proceed to Payment
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-zinc-200 sticky top-24">
              <CardHeader className="bg-[#0A0F1C] text-white rounded-t-lg">
                <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Vehicle */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-16 bg-zinc-100 rounded-sm overflow-hidden">
                    <img
                      src={selectedVehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200"}
                      alt={selectedVehicle.vehicle_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-[#0A0F1C]">{selectedVehicle.vehicle_name}</p>
                    <p className="text-sm text-zinc-500 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Up to {selectedVehicle.max_passengers}
                      <Briefcase className="w-4 h-4 ml-2" /> {selectedVehicle.max_luggage} bags
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Trip Details */}
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Pickup</p>
                      <p className="text-sm font-medium">{bookingData.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Drop-off</p>
                      <p className="text-sm font-medium">{bookingData.dropoff_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Date & Time</p>
                      <p className="text-sm font-medium">{bookingData.pickup_date} at {bookingData.pickup_time}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600">Vehicle ({selectedVehicle.vehicle_name})</span>
                    <span>{formatPrice(selectedVehicle.price)}</span>
                  </div>
                  
                  {childSeats.map((seat) => {
                    const seatType = CHILD_SEAT_TYPES.find(t => t.id === seat.type);
                    if (!seatType) return null;
                    return (
                      <div key={seat.type} className="flex justify-between text-sm">
                        <span className="text-zinc-600">{seatType.name} × {seat.qty}</span>
                        <span>{formatPrice(seatType.price * seat.qty)}</span>
                      </div>
                    );
                  })}
                  
                  {formData.flight_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">Flight Tracking ({formData.flight_number})</span>
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" /> Free
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-black text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {formatPrice(getTotalPrice())}
                  </span>
                </div>

                {/* Features */}
                <div className="bg-zinc-50 p-4 rounded-sm space-y-2">
                  {[
                    "Free cancellation up to 24h before",
                    "24/7 customer support",
                    "Flight tracking included",
                    "No hidden fees"
                  ].map((feature, idx) => (
                    <p key={idx} className="text-xs text-zinc-600 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      {feature}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
