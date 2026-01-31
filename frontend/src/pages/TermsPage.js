const TermsPage = () => {
  return (
    <div data-testid="terms-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Terms & Conditions
          </h1>
          <p className="text-zinc-400 mt-4">Last updated: January 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-zinc max-w-none">
            <h2>1. Introduction</h2>
            <p>
              Welcome to Aircabio. These Terms and Conditions govern your use of our airport transfer booking services and website. By using our services, you agree to be bound by these terms.
            </p>

            <h2>2. Booking and Confirmation</h2>
            <p>
              When you make a booking through our website, you are making an offer to enter into a contract with us. A contract is formed when we send you a booking confirmation email. Please check the details in your confirmation carefully and contact us immediately if any information is incorrect.
            </p>

            <h2>3. Prices and Payment</h2>
            <p>
              All prices are quoted in GBP unless otherwise stated. Payment is required at the time of booking. We accept major credit and debit cards. All payments are processed securely through our payment provider, Stripe.
            </p>

            <h2>4. Modifications</h2>
            <p>
              You may request to modify your booking up to 12 hours before the scheduled pickup time, subject to vehicle availability. Modifications may result in a change to the price. We reserve the right to charge a modification fee.
            </p>

            <h2>5. Cancellation Policy</h2>
            <p>
              Cancellations made more than 24 hours before the scheduled pickup time will receive a full refund. Cancellations made within 24 hours of the scheduled pickup time may be subject to a cancellation fee. No refunds will be given for no-shows.
            </p>

            <h2>6. Service Delivery</h2>
            <p>
              We will make every effort to provide the booked vehicle at the specified time and location. In the event of unforeseen circumstances, we may substitute a vehicle of equivalent or higher standard. We monitor flights for airport pickups and will adjust pickup times for delayed flights.
            </p>

            <h2>7. Passenger Responsibilities</h2>
            <p>
              You are responsible for:
            </p>
            <ul>
              <li>Providing accurate booking information</li>
              <li>Being ready at the pickup location at the scheduled time</li>
              <li>Behaving appropriately during the journey</li>
              <li>Any damage caused to the vehicle during your journey</li>
            </ul>

            <h2>8. Liability</h2>
            <p>
              While we take every precaution to ensure your safety and the security of your belongings, our liability is limited as permitted by law. We recommend that you take out appropriate travel insurance.
            </p>

            <h2>9. Complaints</h2>
            <p>
              If you have any complaints about our service, please contact our customer support team within 48 hours of your journey. We take all complaints seriously and will investigate thoroughly.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These Terms and Conditions are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>

            <h2>11. Contact Us</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <ul>
              <li>Email: legal@aircabio.com</li>
              <li>Phone: +44 20 1234 5678</li>
              <li>Address: 123 Transport House, London, EC1A 1BB</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TermsPage;
