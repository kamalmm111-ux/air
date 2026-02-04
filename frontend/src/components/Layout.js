import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Car, Menu, X, User, LogOut, LayoutDashboard, Phone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Layout = () => {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState({});

  // Fetch CMS settings for header/footer
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/website-settings`);
        setSiteSettings(res.data || {});
      } catch (error) {
        console.log("Using default site settings");
      }
    };
    fetchSettings();
  }, []);

  // CMS values with fallbacks
  const siteName = siteSettings.site_name || "AIRCABIO";
  const contactPhone = siteSettings.contact_phone || "+44 20 1234 5678";
  const contactEmail = siteSettings.contact_email || "info@aircabio.com";
  const contactAddress = siteSettings.contact_address || "";
  const tagline = siteSettings.tagline || "24/7 Airport Transfers Worldwide";
  const logoUrl = siteSettings.logo_url || "";
  const footerText = siteSettings.footer_text || "Premium airport transfer services worldwide. Travel in comfort and style.";
  const facebookUrl = siteSettings.facebook_url || "";
  const twitterUrl = siteSettings.twitter_url || "";
  const instagramUrl = siteSettings.instagram_url || "";
  const linkedinUrl = siteSettings.linkedin_url || "";
  const youtubeUrl = siteSettings.youtube_url || "";
  const whatsappNumber = siteSettings.whatsapp_number || "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Our Fleet", href: "/fleet" },
    { name: "About Us", href: "/about" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#0A0F1C] text-white py-2 px-4 text-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">{contactPhone}</span>
            </a>
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">{contactEmail}</span>
            </a>
          </div>
          <div className="text-zinc-400">
            {tagline}
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-10 object-contain" />
              ) : (
                <>
                  <Car className="w-8 h-8 text-[#0A0F1C]" />
                  <span className="text-2xl font-black tracking-tight text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
                    {siteName}
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium text-zinc-600 hover:text-[#0A0F1C] transition-colors"
                  data-testid={`nav-${link.name.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" data-testid="user-menu-trigger">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">{user?.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="dashboard-link">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      My Bookings
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="admin-link">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Button variant="ghost" onClick={() => navigate("/login")} data-testid="login-btn">
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/register")} className="bg-[#0A0F1C] hover:bg-[#0A0F1C]/90" data-testid="register-btn">
                    Register
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="block py-2 text-zinc-600 hover:text-[#0A0F1C]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {!isAuthenticated && (
                <div className="pt-4 border-t border-zinc-200 space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}>
                    Sign In
                  </Button>
                  <Button className="w-full bg-[#0A0F1C]" onClick={() => { navigate("/register"); setMobileMenuOpen(false); }}>
                    Register
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#0A0F1C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-6 h-6" />
                <span className="text-xl font-black" style={{ fontFamily: 'Chivo, sans-serif' }}>AIRCABIO</span>
              </div>
              <p className="text-zinc-400 text-sm">
                Premium airport transfer services worldwide. Travel in comfort and style.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-bold mb-4 text-[#D4AF37]">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/fleet" className="text-zinc-400 hover:text-white transition-colors">Our Fleet</Link></li>
                <li><Link to="/about" className="text-zinc-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/faq" className="text-zinc-400 hover:text-white transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="text-zinc-400 hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-bold mb-4 text-[#D4AF37]">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation" className="text-zinc-400 hover:text-white transition-colors">Cancellation Policy</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold mb-4 text-[#D4AF37]">Contact Us</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +44 20 1234 5678
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@aircabio.com
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-sm text-zinc-500">
            © {new Date().getFullYear()} Aircabio. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
