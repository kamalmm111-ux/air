import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const FAQPage = () => {
  const navigate = useNavigate();

  const faqs = [
    {
      category: "Booking",
      questions: [
        {
          q: "How do I book a transfer?",
          a: "Simply enter your pickup and drop-off locations, select your date and time, choose your preferred vehicle, and complete the checkout process. You'll receive an instant confirmation via email."
        },
        {
          q: "Can I book a return journey?",
          a: "Yes, you can book a return journey by making two separate bookings - one for your outbound trip and one for your return. We recommend booking both at the same time for peace of mind."
        },
        {
          q: "How far in advance should I book?",
          a: "We recommend booking at least 24 hours in advance to ensure availability, especially during peak travel times. However, we do accept last-minute bookings subject to availability."
        },
        {
          q: "Can I modify my booking after confirmation?",
          a: "Yes, you can modify your booking up to 12 hours before the scheduled pickup time. Contact our customer support team or log into your account to make changes."
        }
      ]
    },
    {
      category: "Pricing & Payment",
      questions: [
        {
          q: "What is included in the price?",
          a: "Our prices include the full journey, all applicable taxes, a professional driver, flight monitoring for airport pickups, and free waiting time (60 minutes for airport pickups, 15 minutes for other locations)."
        },
        {
          q: "Are there any hidden fees?",
          a: "No, the price you see at checkout is the final price you pay. There are no hidden fees. Additional charges may apply only if you request extra services like child seats or wait beyond the free waiting time."
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit and debit cards through our secure payment gateway powered by Stripe. Corporate clients can also arrange invoicing."
        },
        {
          q: "When will I be charged?",
          a: "Payment is taken at the time of booking to secure your vehicle. For corporate accounts, we offer monthly invoicing."
        }
      ]
    },
    {
      category: "Service",
      questions: [
        {
          q: "How will I find my driver?",
          a: "Your driver will be waiting for you in the arrivals hall holding a sign with your name. You'll also receive driver details and contact information via email and SMS before your pickup."
        },
        {
          q: "What if my flight is delayed?",
          a: "We monitor all flight arrivals in real-time. If your flight is delayed, we automatically adjust your pickup time at no extra charge. Your driver will be waiting when you land."
        },
        {
          q: "Can I request a specific type of vehicle?",
          a: "Yes, you can choose from our range of vehicles during the booking process. If you have specific requirements, please contact our team and we'll do our best to accommodate."
        },
        {
          q: "Do you provide child seats?",
          a: "Yes, we can provide child seats and booster seats upon request. Please specify your requirements when booking. This service may incur an additional fee."
        }
      ]
    },
    {
      category: "Cancellation",
      questions: [
        {
          q: "What is your cancellation policy?",
          a: "You can cancel free of charge up to 24 hours before your scheduled pickup. Cancellations within 24 hours may incur a cancellation fee. Please refer to our cancellation policy for full details."
        },
        {
          q: "How do I cancel my booking?",
          a: "You can cancel your booking by logging into your account, contacting our customer support team, or replying to your confirmation email."
        },
        {
          q: "Will I get a refund if I cancel?",
          a: "If you cancel more than 24 hours before your pickup, you'll receive a full refund. Refunds are processed within 5-7 business days to your original payment method."
        }
      ]
    }
  ];

  return (
    <div data-testid="faq-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
            FAQ
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Find answers to common questions about our airport transfer services.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqs.map((category, idx) => (
            <div key={idx} className="mb-12">
              <h2 className="text-2xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
                {category.category}
              </h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.questions.map((faq, faqIdx) => (
                  <AccordionItem
                    key={faqIdx}
                    value={`${idx}-${faqIdx}`}
                    className="border border-zinc-200 rounded-sm px-6"
                  >
                    <AccordionTrigger className="text-left font-medium hover:text-[#D4AF37]">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-zinc-600 pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {/* Contact CTA */}
          <div className="mt-12 text-center bg-zinc-50 p-8 rounded-sm">
            <h3 className="text-xl font-bold text-[#0A0F1C] mb-3">
              Still Have Questions?
            </h3>
            <p className="text-zinc-600 mb-6">
              Our customer support team is available 24/7 to help you.
            </p>
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

export default FAQPage;
