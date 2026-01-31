import { Shield, Clock, Globe, Award, Users, Car } from "lucide-react";

const AboutPage = () => {
  return (
    <div data-testid="about-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
            About Us
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Your Trusted Transfer Partner
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Since 2015, Aircabio has been providing premium airport transfer services to travelers worldwide.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
                Our Story
              </h2>
              <div className="space-y-4 text-zinc-600">
                <p>
                  Aircabio was founded with a simple mission: to transform airport transfers from a stressful experience into a seamless, enjoyable journey. What started as a small fleet of vehicles serving London airports has grown into a global network covering over 100 cities.
                </p>
                <p>
                  Our commitment to excellence, punctuality, and customer satisfaction has earned us the trust of thousands of travelers, from business executives to families on vacation. We believe that every journey should begin and end with comfort and peace of mind.
                </p>
                <p>
                  Today, Aircabio combines cutting-edge technology with traditional values of service excellence. Our real-time flight tracking, professional drivers, and premium vehicles ensure that your transfer is always smooth, regardless of delays or changes.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1733965961857-99e62b0fc869?crop=entropy&cs=srgb&fm=jpg&q=85"
                alt="Business traveler"
                className="rounded-sm shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-[#D4AF37] text-[#0A0F1C] p-6 rounded-sm">
                <p className="text-4xl font-black" style={{ fontFamily: 'Chivo, sans-serif' }}>10+</p>
                <p className="text-sm font-medium">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Our Values
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Safety First", description: "All our vehicles are regularly maintained and our drivers undergo rigorous background checks and training." },
              { icon: Clock, title: "Punctuality", description: "We monitor flights in real-time and adjust pickup times to ensure we're always there when you arrive." },
              { icon: Award, title: "Excellence", description: "From the moment you book to the end of your journey, we strive to exceed your expectations." }
            ].map((value, index) => (
              <div key={index} className="text-center p-8">
                <div className="w-16 h-16 bg-[#0A0F1C] rounded-sm mx-auto flex items-center justify-center mb-6">
                  <value.icon className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-bold text-[#0A0F1C] mb-3" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {value.title}
                </h3>
                <p className="text-zinc-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-[#0A0F1C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50,000+", label: "Happy Customers" },
              { value: "100+", label: "Cities Worldwide" },
              { value: "500+", label: "Professional Drivers" },
              { value: "99%", label: "On-Time Rate" }
            ].map((stat, index) => (
              <div key={index}>
                <p className="text-4xl md:text-5xl font-black text-[#D4AF37]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                  {stat.value}
                </p>
                <p className="text-zinc-400 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#0A0F1C] mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Meet Our Team
          </h2>
          <p className="text-zinc-600 max-w-2xl mx-auto mb-12">
            Our dedicated team works around the clock to ensure your transfers are seamless. From customer support to our professional drivers, everyone at Aircabio is committed to your satisfaction.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Operations Team", description: "24/7 monitoring of all bookings and flight statuses" },
              { name: "Driver Partners", description: "Vetted professionals with local knowledge and expertise" },
              { name: "Customer Support", description: "Multilingual support available around the clock" }
            ].map((team, index) => (
              <div key={index} className="bg-zinc-50 p-8 rounded-sm">
                <div className="w-16 h-16 bg-[#0A0F1C] rounded-full mx-auto flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-bold text-[#0A0F1C] mb-2">{team.name}</h3>
                <p className="text-zinc-600">{team.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
