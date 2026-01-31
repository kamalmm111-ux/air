import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle, Download, Home, Calendar } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [pollCount, setPollCount] = useState(0);

  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const pollPaymentStatus = async () => {
      if (!sessionId || pollCount >= 10) {
        if (pollCount >= 10) setPaymentStatus("timeout");
        return;
      }

      try {
        const response = await axios.get(`${API}/payments/status/${sessionId}`);
        
        if (response.data.payment_status === "paid") {
          setPaymentStatus("paid");
          // Fetch booking details
          if (bookingId) {
            const bookingRes = await axios.get(`${API}/bookings/${bookingId}`);
            setBooking(bookingRes.data);
          }
        } else if (response.data.status === "expired") {
          setPaymentStatus("expired");
        } else {
          // Continue polling
          setPollCount(prev => prev + 1);
          setTimeout(pollPaymentStatus, 2000);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        setPollCount(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    };

    pollPaymentStatus();
  }, [sessionId, bookingId, pollCount]);

  return (
    <div className="min-h-screen bg-zinc-50 py-16" data-testid="booking-success-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-zinc-200 overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-600 text-white p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Booking Confirmed!
            </h1>
            <p className="text-green-100">
              {paymentStatus === "paid" 
                ? "Your payment has been processed successfully."
                : paymentStatus === "checking"
                ? "Verifying your payment..."
                : "Payment verification complete."}
            </p>
          </div>

          <CardContent className="p-8">
            {paymentStatus === "checking" ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0F1C] mx-auto mb-4"></div>
                <p className="text-zinc-600">Verifying your payment...</p>
              </div>
            ) : (
              <>
                {booking && (
                  <div className="space-y-6 mb-8">
                    <div className="bg-zinc-50 p-6 rounded-sm">
                      <h3 className="font-bold text-[#0A0F1C] mb-4">Booking Details</h3>
                      <dl className="space-y-3">
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Booking Reference</dt>
                          <dd className="font-medium text-[#0A0F1C]">{booking.id.slice(0, 8).toUpperCase()}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Vehicle</dt>
                          <dd className="font-medium">{booking.vehicle_name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Pickup Date</dt>
                          <dd className="font-medium">{booking.pickup_date} at {booking.pickup_time}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Pickup Location</dt>
                          <dd className="font-medium text-right max-w-[200px]">{booking.pickup_location}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-zinc-500">Drop-off Location</dt>
                          <dd className="font-medium text-right max-w-[200px]">{booking.dropoff_location}</dd>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-zinc-200">
                          <dt className="text-zinc-500 font-bold">Total Paid</dt>
                          <dd className="font-black text-[#0A0F1C] text-xl">£{booking.price?.toFixed(2)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
                      <p className="text-sm text-blue-800">
                        <strong>Confirmation email sent!</strong> Check your inbox at {booking.passenger_email} for full booking details and receipt.
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={() => navigate("/")}
                    className="flex-1 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white"
                    data-testid="back-home-btn"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                  <Button
                    onClick={() => navigate("/dashboard")}
                    variant="outline"
                    className="flex-1"
                    data-testid="view-bookings-btn"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View My Bookings
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Support Info */}
        <p className="text-center text-sm text-zinc-500 mt-8">
          Need help? Contact us at{" "}
          <a href="tel:+442012345678" className="text-[#0A0F1C] font-medium hover:underline">
            +44 20 1234 5678
          </a>
        </p>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
