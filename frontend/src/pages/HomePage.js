import { useState, useEffect } from "react";
import BookingEngine from "../components/BookingEngine";
import { CheckCircle, Clock, Shield, Globe, Star, Phone } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const navigate = useNavigate();
  const [siteSettings, setSiteSettings] = useState({});
  const [pageContent, setPageContent] = useState(null);

  useEffect(() => {
    // Fetch website settings and page content from CMS
    const fetchCMSContent = async () => {
      try {
        const [settingsRes, pageRes] = await Promise.all([
          axios.get(`${API}/website-settings`),
          axios.get(`${API}/pages/home`)
        ]);
        setSiteSettings(settingsRes.data || {});
        setPageContent(pageRes.data || null);
      } catch (error) {
        console.log("Using default content");
      }
    };
    fetchCMSContent();
  }, []);

  // Get content from CMS or use defaults
  const heroTitle = siteSettings.hero_title || pageContent?.sections?.find(s => s.type === "hero")?.title || "Travel in Style & Comfort";
  const heroSubtitle = siteSettings.hero_subtitle || pageContent?.sections?.find(s => s.type === "hero")?.subtitle || "Book your airport transfer with Aircabio. Professional drivers, premium vehicles, and guaranteed on-time service worldwide.";
  const heroImage = siteSettings.hero_background_url || pageContent?.sections?.find(s => s.type === "hero")?.image_url || "https://images.unsplash.com/photo-1641736950490-ebb6533422d9?crop=entropy&cs=srgb&fm=jpg&q=85";
  const heroCtaText = siteSettings.hero_cta_text || "Book Now";
  const tagline = siteSettings.tagline || "Premium Airport Transfers";
  const siteName = siteSettings.site_name || "Aircabio";
  const contactPhone = siteSettings.contact_phone || "+44 20 1234 5678";

  const features = [
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "Licensed, insured vehicles with vetted professional drivers"
    },
    {
      icon: Clock,
      title: "On-Time Guarantee",
      description: "Flight monitoring ensures we're always there when you land"
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Airport transfers available in major cities worldwide"
    },
    {
      icon: Star,
      title: "Premium Service",
      description: "Luxury vehicles with complimentary amenities"
    }
  ];

  const stats = [
    { value: "50K+", label: "Happy Customers" },
    { value: "100+", label: "Cities Covered" },
    { value: "99%", label: "On-Time Rate" },
    { value: "4.9", label: "Customer Rating" }
  ];

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${heroImage}')`
          }}
        >
          <div className="absolute inset-0 hero-overlay"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Text */}
              <div className="text-white animate-fadeInUp">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
                  {tagline}
                </p>
                <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {heroTitle.includes("Style") ? (
                    <>
                      Travel in <br />
                      <span className="text-[#D4AF37]">Style</span> & Comfort
                    </>
                  ) : heroTitle}
                </h1>
                <p className="text-lg md:text-xl text-zinc-300 max-w-lg mb-8">
                  {heroSubtitle}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    size="lg"
                    className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0F1C] font-bold h-14 px-8"
                    onClick={() => document.getElementById('booking-section').scrollIntoView({ behavior: 'smooth' })}
                    data-testid="book-now-hero-btn"
                  >
                    {heroCtaText}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-[#0A0F1C] font-bold h-14 px-8"
                    onClick={() => navigate("/fleet")}
                    data-testid="view-fleet-btn"
                  >
                    View Fleet
                  </Button>
                </div>
              </div>

              {/* Booking Engine */}
              <div id="booking-section" className="animate-fadeInUp animate-delay-200">
                <BookingEngine />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-[#0A0F1C] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-4xl md:text-5xl font-black text-[#D4AF37]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {stat.value}
                </p>
                <p className="text-zinc-400 text-sm mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
              Why Choose Us
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              The {siteName} Difference
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white border border-zinc-200 p-8 hover:border-[#0A0F1C]/50 transition-colors duration-300 group"
              >
                <div className="w-12 h-12 bg-[#0A0F1C] rounded-sm flex items-center justify-center mb-6 group-hover:bg-[#D4AF37] transition-colors">
                  <feature.icon className="w-6 h-6 text-white group-hover:text-[#0A0F1C]" />
                </div>
                <h3 className="text-xl font-bold text-[#0A0F1C] mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {feature.title}
                </h3>
                <p className="text-zinc-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
              Simple Process
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Book Online", description: "Enter your pickup and drop-off details, select your vehicle, and complete your booking in minutes." },
              { step: "02", title: "Get Confirmed", description: "Receive instant confirmation with driver details and vehicle information via email." },
              { step: "03", title: "Enjoy Your Ride", description: "Your driver will meet you at the designated pickup point. Sit back and relax." }
            ].map((item, index) => (
              <div key={index} className="relative text-center p-8">
                <span className="text-8xl font-black text-zinc-100 absolute top-0 left-1/2 -translate-x-1/2" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {item.step}
                </span>
                <div className="relative pt-12">
                  <h3 className="text-xl font-bold text-[#0A0F1C] mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {item.title}
                  </h3>
                  <p className="text-zinc-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-[#0A0F1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
              Testimonials
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
              What Our Customers Say
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "James Wilson", location: "London, UK", text: "Excellent service! The driver was waiting for me right after I landed. Very professional and the car was immaculate." },
              { name: "Sarah Chen", location: "New York, USA", text: "I use Aircabio for all my business trips. Reliable, punctual, and the executive vehicles are perfect for client meetings." },
              { name: "Marcus Schmidt", location: "Berlin, Germany", text: "Best airport transfer service I've used. The meet & greet option made navigating Heathrow so much easier." }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white/5 backdrop-blur border border-white/10 p-8 rounded-sm">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-[#D4AF37] text-[#D4AF37]" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-6 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-bold text-white">{testimonial.name}</p>
                  <p className="text-sm text-zinc-500">{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Ready to Book Your Transfer?
          </h2>
          <p className="text-lg text-zinc-600 mb-8">
            Experience premium airport transfers with Aircabio. Book online or call us 24/7.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-[#0A0F1C] hover:bg-[#0A0F1C]/90 text-white font-bold h-14 px-8"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              data-testid="book-transfer-cta-btn"
            >
              Book Your Transfer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-[#0A0F1C] text-[#0A0F1C] hover:bg-[#0A0F1C] hover:text-white font-bold h-14 px-8"
              onClick={() => window.location.href = 'tel:+442012345678'}
              data-testid="call-us-btn"
            >
              <Phone className="w-5 h-5 mr-2" />
              Call Us 24/7
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
