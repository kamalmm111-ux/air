import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { XCircle, ArrowLeft, Phone } from "lucide-react";

const BookingCancelPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");

  return (
    <div className="min-h-screen bg-zinc-50 py-16" data-testid="booking-cancel-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-zinc-200 overflow-hidden">
          {/* Cancel Header */}
          <div className="bg-zinc-800 text-white p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Payment Cancelled
            </h1>
            <p className="text-zinc-400">
              Your payment was cancelled. No charges have been made.
            </p>
          </div>

          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <p className="text-zinc-600">
                Don't worry - your booking details have been saved. You can try again or contact us for assistance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate("/checkout")}
                  className="bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white"
                  data-testid="try-again-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  data-testid="back-home-btn"
                >
                  Start New Booking
                </Button>
              </div>

              <div className="pt-6 border-t border-zinc-200">
                <p className="text-sm text-zinc-500 mb-4">Need help completing your booking?</p>
                <Button
                  variant="ghost"
                  onClick={() => window.location.href = 'tel:+443300585676'}
                  className="text-[#0A0F1C]"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call +44 330 058 5676
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BookingCancelPage;
