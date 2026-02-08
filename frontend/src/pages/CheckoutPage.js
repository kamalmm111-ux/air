import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { MapPin, Clock, Users, Briefcase, Car, ArrowLeft, CreditCard, Shield, Check, Plane, Baby, Globe } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { bookingData, selectedVehicle, resetBooking, updateBookingData } = useBooking();
  const { user, token } = useAuth();

  const [formData, setFormData] = useState({
    passenger_name: user?.name || "",
    passenger_email: user?.email || "",
    passenger_phone: user?.phone || "",
    flight_number: bookingData.flight_number || "",
    flight_origin: bookingData.flight_origin || "",
    child_seats: bookingData.child_seats || 0,
    meet_greet: bookingData.meet_greet || false,
    pickup_notes: "",
    dropoff_notes: ""
  });
  const [loading, setLoading] = useState(false);

  if (!selectedVehicle) {
    navigate("/");
    return null;
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (field, checked) => {
    setFormData({ ...formData, [field]: checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.passenger_name || !formData.passenger_email || !formData.passenger_phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Create booking with flight and child seat data
      const bookingPayload = {
        ...bookingData,
        ...formData,
        vehicle_category_id: selectedVehicle.vehicle_category_id,
        price: selectedVehicle.price,
        currency: selectedVehicle.currency,
        payment_method: "stripe"
      };

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const bookingResponse = await axios.post(`${API}/bookings`, bookingPayload, { headers });
      const booking = bookingResponse.data;

      // Create payment session
      const paymentResponse = await axios.post(
        `${API}/payments/create-session?booking_id=${booking.id}`,
        {},
        { headers: { ...headers, origin: window.location.origin } }
      );

      // Redirect to Stripe
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
        {/* Back Button */}
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

                  <div className="space-y-4">
                    <h3 className="font-bold text-[#0A0F1C]">Additional Information</h3>
                    <div className="space-y-2">
                      <Label htmlFor="pickup_notes">Pickup Notes (Optional)</Label>
                      <Textarea
                        id="pickup_notes"
                        name="pickup_notes"
                        value={formData.pickup_notes}
                        onChange={handleChange}
                        placeholder="e.g., Terminal 5, outside Arrivals, hotel lobby name..."
                        rows={3}
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
                        rows={3}
                        data-testid="dropoff-notes-input"
                      />
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
                        Pay £{selectedVehicle.price.toFixed(2)} - Proceed to Payment
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
                    <span>£{selectedVehicle.price.toFixed(2)}</span>
                  </div>
                  {bookingData.meet_greet && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">Meet & Greet</span>
                      <span>Included</span>
                    </div>
                  )}
                  {bookingData.flight_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">Flight Tracking</span>
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
                    £{selectedVehicle.price.toFixed(2)}
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
