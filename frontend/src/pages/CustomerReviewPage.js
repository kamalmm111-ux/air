import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { 
  Star, CheckCircle, Loader2, Car, MapPin, Calendar,
  User, ThumbsUp, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomerReviewPage = () => {
  const { bookingRef } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await axios.get(`${API}/customer/tracking/${bookingRef}`);
        setBooking(res.data.booking);
        
        // Check if already rated
        if (res.data.booking?.customer_rating) {
          setExistingRating(res.data.booking.customer_rating);
          setSubmitted(true);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Unable to load booking information");
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingRef]);

  const submitRating = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/customer/rating/${bookingRef}`, {
        rating,
        feedback: feedback.trim() || undefined
      });
      toast.success("Thank you for your feedback!");
      setSubmitted(true);
      setExistingRating({ rating, comment: feedback });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (interactive = true) => {
    const displayRating = interactive ? (hoverRating || rating) : (existingRating?.rating || 0);
    
    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive || submitted}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`transition-all duration-200 ${interactive && !submitted ? 'cursor-pointer hover:scale-110' : ''}`}
            data-testid={`star-${star}`}
          >
            <Star
              className={`w-10 h-10 sm:w-12 sm:h-12 transition-colors ${
                star <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingLabel = (r) => {
    const labels = {
      1: "Poor",
      2: "Fair",
      3: "Good",
      4: "Very Good",
      5: "Excellent"
    };
    return labels[r] || "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-gray-600">Loading your trip details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-gray-900">
      {/* Header */}
      <header className="bg-[#0A0F1C] border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center">
            <h1 className="text-2xl font-bold text-[#D4AF37]">AIRCABIO</h1>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {submitted ? (
          /* Thank You Card */
          <Card className="border-0 shadow-xl" data-testid="review-submitted">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-6">
                Your feedback has been submitted and helps us maintain our high standards.
              </p>
              
              {/* Show submitted rating */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-500 mb-2">Your Rating</p>
                {renderStars(false)}
                <p className="text-lg font-medium text-[#D4AF37] mt-2">
                  {getRatingLabel(existingRating?.rating)}
                </p>
                {existingRating?.comment && (
                  <p className="text-gray-600 mt-4 italic">"{existingRating.comment}"</p>
                )}
              </div>

              <Link to="/">
                <Button className="bg-[#0A0F1C] hover:bg-[#1a1f2e]">
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Book Another Transfer
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          /* Review Form */
          <Card className="border-0 shadow-xl" data-testid="review-form">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <CardTitle className="text-2xl">Rate Your Experience</CardTitle>
              <p className="text-gray-600 mt-2">
                Your feedback helps us improve our service
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Trip Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{booking?.pickup_date} at {booking?.pickup_time}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-800">{booking?.pickup_location}</p>
                    <p className="text-gray-400">↓</p>
                    <p className="text-gray-800">{booking?.dropoff_location}</p>
                  </div>
                </div>
                {booking?.assigned_driver_name && (
                  <div className="flex items-center gap-3 text-sm border-t pt-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Driver: <strong>{booking.assigned_driver_name}</strong></span>
                  </div>
                )}
              </div>

              {/* Star Rating */}
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-4">Tap to rate</p>
                {renderStars(true)}
                {rating > 0 && (
                  <p className="text-lg font-medium text-[#D4AF37] mt-3 animate-fadeIn">
                    {getRatingLabel(rating)}
                  </p>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className="min-h-[100px] resize-none"
                  data-testid="feedback-input"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={submitRating}
                disabled={rating === 0 || submitting}
                className="w-full h-12 bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A0F1C] font-semibold"
                data-testid="submit-review-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Your review helps us recognize exceptional drivers and improve our service.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center">
        <p className="text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Aircabio. Premium Airport Transfers.
        </p>
      </footer>
    </div>
  );
};

export default CustomerReviewPage;
