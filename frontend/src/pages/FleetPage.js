import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Users, Briefcase, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FleetPage = () => {
  const navigate = useNavigate();

  const vehicles = [
    {
      id: "sedan",
      name: "Sedan",
      description: "Perfect for business travelers or couples. Comfortable ride with professional service.",
      passengers: 3,
      luggage: 2,
      image: "https://images.pexels.com/photos/12152812/pexels-photo-12152812.jpeg?auto=compress&cs=tinysrgb&w=600",
      features: ["Air Conditioning", "Leather Seats", "Free WiFi", "Bottled Water", "Phone Charger"]
    },
    {
      id: "executive",
      name: "Executive",
      description: "Premium vehicles for discerning travelers. Make a statement at your destination.",
      passengers: 3,
      luggage: 2,
      image: "https://images.unsplash.com/photo-1653673790585-4cf265dbdc79?crop=entropy&cs=srgb&fm=jpg&w=600",
      features: ["Air Conditioning", "Premium Leather", "Free WiFi", "Newspapers", "Bottled Water", "USB Charging"]
    },
    {
      id: "suv",
      name: "SUV",
      description: "Spacious and comfortable. Ideal for families or those with extra luggage.",
      passengers: 5,
      luggage: 4,
      image: "https://images.unsplash.com/photo-1653641305372-a084f9b78858?crop=entropy&cs=srgb&fm=jpg&w=600",
      features: ["Air Conditioning", "Leather Seats", "Free WiFi", "Extra Luggage Space", "Child Seats Available"]
    },
    {
      id: "mpv",
      name: "MPV",
      description: "Multi-purpose vehicle for larger groups. Combines space with comfort.",
      passengers: 6,
      luggage: 5,
      image: "https://images.pexels.com/photos/28496683/pexels-photo-28496683.jpeg?auto=compress&cs=tinysrgb&w=600",
      features: ["Air Conditioning", "Spacious Interior", "Free WiFi", "Child Seats", "Privacy Glass"]
    },
    {
      id: "van",
      name: "Van",
      description: "Maximum capacity for groups with substantial luggage requirements.",
      passengers: 8,
      luggage: 8,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600",
      features: ["Air Conditioning", "Maximum Space", "Free WiFi", "Wheelchair Accessible", "PA System"]
    },
    {
      id: "minibus",
      name: "Minibus",
      description: "Perfect for corporate groups, sports teams, or large families.",
      passengers: 12,
      luggage: 12,
      image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600",
      features: ["Air Conditioning", "PA System", "Free WiFi", "USB Charging", "Reclining Seats"]
    }
  ];

  return (
    <div data-testid="fleet-page">
      {/* Hero */}
      <section className="bg-[#0A0F1C] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-widest font-semibold text-[#D4AF37] mb-4">
            Our Fleet
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Premium Vehicles for Every Journey
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            From executive sedans to spacious minibuses, our diverse fleet ensures the perfect vehicle for your needs.
          </p>
        </div>
      </section>

      {/* Fleet Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id} className="border-zinc-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
                      {vehicle.name}
                    </h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-zinc-600 mb-4">{vehicle.description}</p>
                  
                  <div className="flex items-center gap-6 mb-4 text-sm">
                    <span className="flex items-center gap-2 text-zinc-700">
                      <Users className="w-4 h-4 text-[#D4AF37]" />
                      Up to {vehicle.passengers}
                    </span>
                    <span className="flex items-center gap-2 text-zinc-700">
                      <Briefcase className="w-4 h-4 text-[#D4AF37]" />
                      {vehicle.luggage} bags
                    </span>
                  </div>

                  <div className="border-t border-zinc-200 pt-4 mb-4">
                    <p className="text-sm font-medium text-zinc-900 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-2">
                      {vehicle.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 px-2 py-1 rounded-sm">
                          <Check className="w-3 h-3 text-green-600" />
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/")}
                    className="w-full bg-[#0A0F1C] hover:bg-[#0A0F1C]/90"
                    data-testid={`book-${vehicle.id}-btn`}
                  >
                    Book This Vehicle
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-[#0A0F1C] mb-4" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Not Sure Which Vehicle to Choose?
          </h2>
          <p className="text-zinc-600 mb-8">
            Our team can help you select the perfect vehicle based on your group size, luggage requirements, and preferences.
          </p>
          <Button
            onClick={() => navigate("/contact")}
            variant="outline"
            className="border-2 border-[#0A0F1C] text-[#0A0F1C] hover:bg-[#0A0F1C] hover:text-white font-bold"
          >
            Contact Us for Advice
          </Button>
        </div>
      </section>
    </div>
  );
};

export default FleetPage;
