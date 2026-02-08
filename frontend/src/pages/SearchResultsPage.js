import { useNavigate } from "react-router-dom";
import { useBooking } from "../context/BookingContext";
import { useCurrency } from "../context/CurrencyContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Users, Briefcase, Check, MapPin, Clock, ArrowRight, ArrowLeft, RotateCcw, Plane } from "lucide-react";

const SearchResultsPage = () => {
  const navigate = useNavigate();
  const { bookingData, quotes, selectedVehicle, setSelectedVehicle } = useBooking();
  const { formatPrice } = useCurrency();

  if (!quotes || quotes.length === 0) {
    navigate("/");
    return null;
  }

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-8" data-testid="search-results-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-zinc-600 hover:text-[#0A0F1C]"
          data-testid="back-to-search-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Modify Search
        </Button>

        {/* Trip Summary */}
        <div className="bg-white border border-zinc-200 rounded-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Trip Summary
            </h2>
            {bookingData.is_return && (
              <Badge className="bg-[#D4AF37] text-[#0A0F1C] flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Return Journey
              </Badge>
            )}
          </div>

          {/* Outbound Journey */}
          <div className="mb-6">
            {bookingData.is_return && (
              <p className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">Outbound Journey</p>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D4AF37] mt-1" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Pickup</p>
                  <p className="font-medium text-[#0A0F1C]">{bookingData.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D4AF37] mt-1" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Drop-off</p>
                  <p className="font-medium text-[#0A0F1C]">{bookingData.dropoff_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#D4AF37] mt-1" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Date & Time</p>
                  <p className="font-medium text-[#0A0F1C]">{bookingData.pickup_date} at {bookingData.pickup_time}</p>
                </div>
              </div>
              {bookingData.flight_number && (
                <div className="flex items-start gap-3">
                  <Plane className="w-5 h-5 text-[#D4AF37] mt-1" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Flight</p>
                    <p className="font-medium text-[#0A0F1C]">{bookingData.flight_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Return Journey */}
          {bookingData.is_return && (
            <div className="pt-6 border-t border-zinc-200 mb-6">
              <p className="text-sm font-semibold text-[#D4AF37] uppercase tracking-wider mb-3">Return Journey</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#D4AF37] mt-1" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Pickup</p>
                    <p className="font-medium text-[#0A0F1C]">{bookingData.dropoff_location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#D4AF37] mt-1" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Drop-off</p>
                    <p className="font-medium text-[#0A0F1C]">{bookingData.pickup_location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#D4AF37] mt-1" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Date & Time</p>
                    <p className="font-medium text-[#0A0F1C]">{bookingData.return_date} at {bookingData.return_time}</p>
                  </div>
                </div>
                {bookingData.return_flight_number && (
                  <div className="flex items-start gap-3">
                    <Plane className="w-5 h-5 text-[#D4AF37] mt-1" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Flight</p>
                      <p className="font-medium text-[#0A0F1C]">{bookingData.return_flight_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Passengers & Trip Info */}
          <div className="pt-6 border-t border-zinc-200">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-[#D4AF37] mt-1" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Passengers & Luggage</p>
                  <p className="font-medium text-[#0A0F1C]">{bookingData.passengers} passengers, {bookingData.luggage} bags</p>
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Est. Distance</span>
                <p className="font-bold text-[#0A0F1C]">{bookingData.distance_km?.toFixed(1)} km {bookingData.is_return && "(each way)"}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Est. Duration</span>
                <p className="font-bold text-[#0A0F1C]">{bookingData.duration_minutes} mins {bookingData.is_return && "(each way)"}</p>
              </div>
              {bookingData.meet_greet && (
                <div className="flex items-center">
                  <Badge className="bg-[#D4AF37] text-[#0A0F1C]">Meet & Greet Included</Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Options */}
        <h2 className="text-2xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
          Available Vehicles
        </h2>

        <div className="grid gap-6">
          {quotes.map((vehicle) => (
            <Card
              key={vehicle.vehicle_category_id}
              className={`bg-white border-2 transition-all duration-300 hover:shadow-lg cursor-pointer ${
                selectedVehicle?.vehicle_category_id === vehicle.vehicle_category_id
                  ? "border-[#D4AF37]"
                  : "border-zinc-200 hover:border-[#0A0F1C]/30"
              }`}
              data-testid={`vehicle-card-${vehicle.vehicle_category_id}`}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Vehicle Image */}
                  <div className="md:w-1/3 bg-zinc-100">
                    <img
                      src={vehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400"}
                      alt={vehicle.vehicle_name}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>

                  {/* Vehicle Details */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                          {vehicle.vehicle_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-zinc-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Up to {vehicle.max_passengers}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {vehicle.max_luggage} bags
                          </span>
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {vehicle.features?.slice(0, 4).map((feature, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 px-2 py-1 rounded-sm"
                            >
                              <Check className="w-3 h-3 text-green-600" />
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Price & Book */}
                      <div className="text-right">
                        {vehicle.is_return && vehicle.one_way_price && (
                          <div className="mb-1">
                            <span className="text-sm text-zinc-500 line-through">
                              {vehicle.currency === "GBP" ? "£" : vehicle.currency}{(vehicle.one_way_price * 2).toFixed(2)}
                            </span>
                            <Badge className="ml-2 bg-green-100 text-green-800 text-xs">Save 10%</Badge>
                          </div>
                        )}
                        <p className="text-sm text-zinc-500">
                          {vehicle.is_return ? "Return Total" : "Total Price"}
                        </p>
                        <p className="text-3xl font-black text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                          {vehicle.currency === "GBP" ? "£" : vehicle.currency}{vehicle.price.toFixed(2)}
                        </p>
                        {vehicle.is_return && (
                          <p className="text-xs text-zinc-500 mt-1">
                            (£{vehicle.one_way_price.toFixed(2)} each way)
                          </p>
                        )}
                        <Button
                          onClick={() => handleSelectVehicle(vehicle)}
                          className="mt-4 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white font-bold px-8"
                          data-testid={`select-vehicle-${vehicle.vehicle_category_id}`}
                        >
                          Select
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-[#0A0F1C] text-white rounded-sm p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Need Help Choosing?
              </h3>
              <p className="text-zinc-400 mt-2">
                Our team is available 24/7 to help you select the perfect vehicle for your journey.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-[#0A0F1C] font-bold"
              onClick={() => window.location.href = 'tel:+442012345678'}
            >
              Call +44 20 1234 5678
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
