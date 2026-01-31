import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const CancellationPage = () => {
  const navigate = useNavigate();

  return (
    <div data-testid="cancellation-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Cancellation Policy
          </h1>
          <p className="text-zinc-400 mt-4">Last updated: January 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-zinc max-w-none">
            <h2>Overview</h2>
            <p>
              We understand that plans can change. Our cancellation policy is designed to be fair to both our customers and our driver partners.
            </p>

            <h2>Standard Bookings</h2>
            <div className="bg-green-50 border border-green-200 p-6 rounded-sm mb-6 not-prose">
              <h3 className="text-lg font-bold text-green-800 mb-2">Free Cancellation</h3>
              <p className="text-green-700">
                Cancel more than 24 hours before your scheduled pickup time and receive a <strong>full refund</strong>.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-sm mb-6 not-prose">
              <h3 className="text-lg font-bold text-yellow-800 mb-2">Late Cancellation</h3>
              <p className="text-yellow-700">
                Cancel between 12-24 hours before your scheduled pickup time and receive a <strong>50% refund</strong>.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 p-6 rounded-sm mb-6 not-prose">
              <h3 className="text-lg font-bold text-red-800 mb-2">No Refund</h3>
              <p className="text-red-700">
                Cancellations made less than 12 hours before the scheduled pickup time or no-shows are <strong>non-refundable</strong>.
              </p>
            </div>

            <h2>How to Cancel</h2>
            <p>You can cancel your booking through any of the following methods:</p>
            <ul>
              <li><strong>Online:</strong> Log into your account and cancel through your booking dashboard</li>
              <li><strong>Email:</strong> Send a cancellation request to bookings@aircabio.com</li>
              <li><strong>Phone:</strong> Call our 24/7 support line at +44 20 1234 5678</li>
            </ul>

            <h2>Refund Process</h2>
            <p>
              Eligible refunds will be processed within 5-7 business days. Refunds will be credited to the original payment method used for the booking.
            </p>

            <h2>Modifications</h2>
            <p>
              If you need to modify your booking (change date, time, or location), please contact us at least 12 hours before your scheduled pickup. Modifications are subject to vehicle availability and may result in a price change.
            </p>

            <h2>Exceptional Circumstances</h2>
            <p>
              In case of flight cancellations by airlines, severe weather conditions, or other exceptional circumstances, please contact us. We will work with you to find a suitable solution, which may include rebooking or a full refund.
            </p>

            <h2>Corporate Accounts</h2>
            <p>
              Corporate account holders may have different cancellation terms as specified in their service agreement. Please refer to your contract or contact your account manager.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about our cancellation policy, please don't hesitate to contact us:
            </p>
            <ul>
              <li>Email: support@aircabio.com</li>
              <li>Phone: +44 20 1234 5678</li>
            </ul>
          </div>

          <div className="mt-12 text-center">
            <Button
              onClick={() => navigate("/contact")}
              className="bg-[#0A0F1C] hover:bg-[#0A0F1C]/90"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CancellationPage;
