import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, MapPin, Clock, Car, User, XCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get(`${API}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(response.data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Failed to load bookings");
      } finally {
        setLoadingBookings(false);
      }
    };

    if (isAuthenticated) {
      fetchBookings();
    }
  }, [token, isAuthenticated]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await axios.put(`${API}/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(bookings.map(b => 
        b.id === bookingId ? { ...b, status: "cancelled" } : b
      ));
      toast.success("Booking cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel booking");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{status}</Badge>;
  };

  const upcomingBookings = bookings.filter(b => 
    b.status !== "completed" && b.status !== "cancelled"
  );
  const pastBookings = bookings.filter(b => 
    b.status === "completed" || b.status === "cancelled"
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8" data-testid="customer-dashboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              My Bookings
            </h1>
            <p className="text-zinc-500 mt-1">Welcome back, {user?.name}</p>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#0A0F1C] hover:bg-[#0A0F1C]/90"
            data-testid="new-booking-btn"
          >
            Book New Transfer
          </Button>
        </div>

        {/* Bookings Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white border border-zinc-200">
            <TabsTrigger value="upcoming" data-testid="upcoming-tab">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="past-tab">
              Past ({pastBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loadingBookings ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C] mx-auto"></div>
              </div>
            ) : upcomingBookings.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#0A0F1C] mb-2">No Upcoming Bookings</h3>
                  <p className="text-zinc-500 mb-6">You don't have any upcoming transfers scheduled.</p>
                  <Button onClick={() => navigate("/")} className="bg-[#0A0F1C]">
                    Book a Transfer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={handleCancelBooking}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastBookings.length === 0 ? (
              <Card className="border-zinc-200">
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#0A0F1C] mb-2">No Past Bookings</h3>
                  <p className="text-zinc-500">Your completed and cancelled bookings will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    isPast
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const BookingCard = ({ booking, onCancel, isPast, getStatusBadge }) => {
  return (
    <Card className="border-zinc-200 hover:border-zinc-300 transition-colors" data-testid={`booking-card-${booking.id}`}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              {getStatusBadge(booking.status)}
              <span className="text-sm text-zinc-500">
                Ref: {booking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Trip Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Pickup</p>
                  <p className="text-sm font-medium">{booking.pickup_location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 uppercase">Drop-off</p>
                  <p className="text-sm font-medium">{booking.dropoff_location}</p>
                </div>
              </div>
            </div>

            {/* Date & Vehicle */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {booking.pickup_date} at {booking.pickup_time}
              </span>
              <span className="flex items-center gap-1">
                <Car className="w-4 h-4" />
                {booking.vehicle_name}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {booking.passengers} passengers
              </span>
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex flex-col items-end gap-3">
            <p className="text-2xl font-bold text-[#0A0F1C]">
              £{booking.price?.toFixed(2)}
            </p>
            {!isPast && booking.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(booking.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                data-testid={`cancel-booking-${booking.id}`}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerDashboard;
