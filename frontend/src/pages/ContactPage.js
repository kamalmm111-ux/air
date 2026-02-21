import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Phone, Mail, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    phone: "+44 330 058 5676",
    email: "info@aircabio.com",
    address: ""
  });

  // Fetch centralized contact settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/website-settings`);
        if (res.data) {
          setContactInfo({
            phone: res.data.contact_phone || "+44 330 058 5676",
            email: res.data.contact_email || "info@aircabio.com",
            address: res.data.contact_address || ""
          });
        }
      } catch (error) {
        console.log("Using default contact settings");
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success("Message sent! We'll get back to you shortly.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setLoading(false);
  };

  return (
    <div data-testid="contact-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
            Contact Us
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Get in Touch
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Have questions? Our team is here to help you 24/7.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-[#0A0F1C] mb-8" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Contact Information
              </h2>
              
              <div className="space-y-6">
                <Card className="border-zinc-200">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0A0F1C] rounded-sm flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0A0F1C] mb-1">Phone</h3>
                      <p className="text-zinc-600">24/7 Booking Line</p>
                      <a href="tel:+442012345678" className="text-lg font-bold text-[#0A0F1C] hover:text-[#D4AF37]">
                        +44 20 1234 5678
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0A0F1C] rounded-sm flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0A0F1C] mb-1">Email</h3>
                      <p className="text-zinc-600">General Inquiries</p>
                      <a href="mailto:info@aircabio.com" className="text-lg font-bold text-[#0A0F1C] hover:text-[#D4AF37]">
                        info@aircabio.com
                      </a>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0A0F1C] rounded-sm flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0A0F1C] mb-1">Office</h3>
                      <p className="text-zinc-600">
                        123 Transport House<br />
                        London, EC1A 1BB<br />
                        United Kingdom
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#0A0F1C] rounded-sm flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0A0F1C] mb-1">Operating Hours</h3>
                      <p className="text-zinc-600">
                        Bookings: 24/7<br />
                        Office: Mon-Fri 9am-6pm GMT
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-[#0A0F1C] mb-8" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Send Us a Message
              </h2>
              
              <Card className="border-zinc-200">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="h-12"
                          data-testid="contact-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="h-12"
                          data-testid="contact-email-input"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-12"
                          data-testid="contact-phone-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject *</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          required
                          className="h-12"
                          data-testid="contact-subject-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        data-testid="contact-message-input"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90"
                      data-testid="contact-submit-btn"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          Send Message
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
