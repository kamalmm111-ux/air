import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { 
  MapPin, Navigation, Clock, User, Car, Phone, Star,
  CheckCircle, Loader2, AlertTriangle, Calendar, Users,
  Briefcase, Navigation2, Flag, MessageSquare, ThumbsUp
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status display configuration
const STATUS_CONFIG = {
  pending: { label: "Driver Assigned", color: "bg-blue-500", icon: User, message: "Your driver has been assigned and will depart soon." },
  en_route: { label: "Driver En Route", color: "bg-cyan-500", icon: Navigation2, message: "Your driver is on the way to pick you up." },
  arrived: { label: "Driver Arrived", color: "bg-teal-500", icon: MapPin, message: "Your driver has arrived at the pickup location." },
  in_progress: { label: "Journey Started", color: "bg-orange-500", icon: Car, message: "You're on your way to your destination." },
  completed: { label: "Journey Complete", color: "bg-green-500", icon: Flag, message: "Thank you for traveling with Aircabio!" }
};

const CustomerTrackingPage = () => {
  const { bookingRef } = useParams();
  const [booking, setBooking] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eta, setEta] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  // Fetch booking and tracking data
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/tracking/${bookingRef}`);
      setBooking(res.data.booking);
      setTrackingData(res.data.tracking);
      setEta(res.data.eta);
      setHasRated(res.data.booking?.customer_rating !== undefined);
      
      // Show rating prompt if journey is completed
      if (res.data.booking?.status === "completed" && !res.data.booking?.customer_rating) {
        setShowRating(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load tracking information");
    } finally {
      setLoading(false);
    }
  }, [bookingRef]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 10 seconds for live tracking
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Submit rating
  const submitRating = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    
    setSubmittingRating(true);
    try {
      await axios.post(`${API}/customer/rating/${bookingRef}`, {
        rating,
        feedback
      });
      toast.success("Thank you for your feedback!");
      setShowRating(false);
      setHasRated(true);
      fetchData();
    } catch (err) {
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-zinc-600">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-800 mb-2">Tracking Not Available</h2>
            <p className="text-zinc-600 mb-4">{error}</p>
            <Link to="/">
              <Button className="bg-[#0A0F1C]">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = booking?.status || "pending";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const driver = trackingData?.driver || {};
  const latestLocation = trackingData?.latest_location;

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="customer-tracking-page">
      {/* Header */}
      <div className="bg-[#0A0F1C] text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-2xl font-black tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>
            <span className="text-white">air</span>
            <span className="text-[#D4AF37]">cabio</span>
          </Link>
          <Badge className="bg-[#D4AF37] text-[#0A0F1C] font-bold">
            {booking?.booking_ref}
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status Banner */}
        <Card className={`border-0 ${statusConfig.color} text-white overflow-hidden`}>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <StatusIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{statusConfig.label}</h1>
                <p className="text-white/90">{statusConfig.message}</p>
              </div>
            </div>
            
            {/* ETA Display */}
            {eta && status === "en_route" && (
              <div className="mt-4 bg-white/20 rounded-lg p-4 flex items-center gap-4">
                <Clock className="w-8 h-8" />
                <div>
                  <p className="text-sm text-white/80">Estimated Arrival</p>
                  <p className="text-3xl font-black">{eta} mins</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Location Indicator */}
        {trackingData?.session?.status === "active" && latestLocation && (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live tracking active • Updated {new Date(latestLocation.timestamp).toLocaleTimeString()}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Driver Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[#D4AF37]" />
                Your Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* Driver Photo */}
                <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-100 flex-shrink-0">
                  {driver.photo_url ? (
                    <img 
                      src={driver.photo_url} 
                      alt={driver.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 text-zinc-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#0A0F1C]">{driver.name || booking?.assigned_driver_name || "Driver"}</h3>
                  {driver.rating && (
                    <div className="flex items-center gap-1 text-amber-500 mt-1">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-medium">{driver.rating.toFixed(1)}</span>
                      <span className="text-zinc-400 text-sm">({driver.total_trips || 0} trips)</span>
                    </div>
                  )}
                  {driver.phone && (
                    <a 
                      href={`tel:${driver.phone}`}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Call Driver
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Car className="w-5 h-5 text-[#D4AF37]" />
                Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Vehicle</span>
                  <span className="font-medium">{booking?.vehicle_name || booking?.vehicle_category_id || "Saloon"}</span>
                </div>
                {booking?.assigned_vehicle_plate && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Plate Number</span>
                    <span className="font-mono font-bold text-lg bg-[#D4AF37] text-[#0A0F1C] px-3 py-1 rounded">
                      {booking.assigned_vehicle_plate}
                    </span>
                  </div>
                )}
                {driver.vehicle_make && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Make/Model</span>
                    <span className="font-medium">{driver.vehicle_make} {driver.vehicle_model}</span>
                  </div>
                )}
                {driver.vehicle_color && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Color</span>
                    <span className="font-medium">{driver.vehicle_color}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Map */}
        {latestLocation && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#D4AF37]" />
                Live Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border border-zinc-200 h-64">
                <iframe
                  title="Driver Location"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${latestLocation.longitude - 0.02}%2C${latestLocation.latitude - 0.02}%2C${latestLocation.longitude + 0.02}%2C${latestLocation.latitude + 0.02}&layer=mapnik&marker=${latestLocation.latitude}%2C${latestLocation.longitude}`}
                  style={{ border: 0 }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-zinc-500">
                <span>Last updated: {new Date(latestLocation.timestamp).toLocaleTimeString()}</span>
                <a 
                  href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4" /> View in Google Maps
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trip Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5"></div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Pickup</p>
                  <p className="font-medium">{booking?.pickup_location}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-zinc-200 h-6"></div>
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5"></div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Drop-off</p>
                  <p className="font-medium">{booking?.dropoff_location}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pt-4 border-t mt-4">
                <div className="text-center">
                  <Calendar className="w-5 h-5 text-[#D4AF37] mx-auto mb-1" />
                  <p className="text-xs text-zinc-500">Date</p>
                  <p className="font-medium text-sm">{booking?.pickup_date}</p>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-[#D4AF37] mx-auto mb-1" />
                  <p className="text-xs text-zinc-500">Time</p>
                  <p className="font-medium text-sm">{booking?.pickup_time}</p>
                </div>
                <div className="text-center">
                  <Users className="w-5 h-5 text-[#D4AF37] mx-auto mb-1" />
                  <p className="text-xs text-zinc-500">Passengers</p>
                  <p className="font-medium text-sm">{booking?.passengers || 1}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Section */}
        {showRating && !hasRated && (
          <Card className="border-[#D4AF37] border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="w-5 h-5 text-[#D4AF37]" />
                Rate Your Trip
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-600 mb-4">How was your experience with {driver.name || "your driver"}?</p>
              
              {/* Star Rating */}
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`w-12 h-12 rounded-full transition-all ${
                      star <= rating 
                        ? "bg-[#D4AF37] text-white scale-110" 
                        : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                    }`}
                  >
                    <Star className={`w-6 h-6 mx-auto ${star <= rating ? "fill-current" : ""}`} />
                  </button>
                ))}
              </div>
              
              {rating > 0 && (
                <p className="text-center text-lg font-medium mb-4">
                  {rating === 5 ? "Excellent!" : rating === 4 ? "Great!" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
                </p>
              )}
              
              {/* Feedback */}
              <Textarea
                placeholder="Share your feedback (optional)"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="mb-4"
              />
              
              <Button 
                onClick={submitRating}
                disabled={submittingRating || rating === 0}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0F1C] font-bold"
              >
                {submittingRating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ThumbsUp className="w-4 h-4 mr-2" />
                )}
                Submit Rating
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Already Rated */}
        {hasRated && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Thank you for your feedback!</p>
                  <p className="text-sm text-green-600">Your rating helps us improve our service.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support Contact */}
        <Card className="bg-zinc-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <p className="font-medium">Need Help?</p>
                  <p className="text-sm text-zinc-500">Contact our 24/7 support</p>
                </div>
              </div>
              <a href="tel:+447890123456" className="text-[#D4AF37] font-bold">
                +44 7890 123456
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerTrackingPage;
