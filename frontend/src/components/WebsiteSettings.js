import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Globe, Image, Type, Phone, Mail, MapPin, Save, 
  FileText, Facebook, Twitter, Instagram, Linkedin,
  AlertCircle, CheckCircle, Palette, Layout
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WebsiteSettings = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // General
    site_name: "Aircabio",
    tagline: "Travel in Style & Comfort",
    description: "Premium airport transfer services across the UK. Professional chauffeurs, luxury vehicles, and reliable service.",
    
    // Hero Section
    hero_title: "Travel in Style & Comfort",
    hero_subtitle: "Premium airport transfers with professional chauffeurs. Book your ride in minutes.",
    hero_background_url: "",
    
    // Contact Info
    contact_email: "info@aircabio.com",
    contact_phone: "+44 20 1234 5678",
    contact_address: "123 Airport Road, London, UK",
    
    // Social Media
    facebook_url: "",
    twitter_url: "",
    instagram_url: "",
    linkedin_url: "",
    
    // Features Section
    feature_1_title: "Professional Chauffeurs",
    feature_1_description: "Experienced, vetted drivers ensuring your safety and comfort",
    feature_2_title: "Luxury Fleet",
    feature_2_description: "Premium vehicles maintained to the highest standards",
    feature_3_title: "24/7 Service",
    feature_3_description: "Round-the-clock availability for all your transfer needs",
    feature_4_title: "Fixed Prices",
    feature_4_description: "No hidden fees, no surge pricing - just transparent rates",
    
    // Footer
    footer_text: "© 2026 Aircabio. All rights reserved.",
    
    // Colors
    primary_color: "#D4AF37",
    secondary_color: "#0A0F1C",
    accent_color: "#1a1a2e",
    
    // SEO
    meta_title: "Aircabio - Premium Airport Transfers",
    meta_description: "Book reliable airport transfers with Aircabio. Professional chauffeurs, luxury vehicles, competitive prices.",
    meta_keywords: "airport transfer, taxi, chauffeur, London, Heathrow, Gatwick"
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/website-settings`, { headers });
      if (res.data) {
        setSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      // Settings might not exist yet, use defaults
      console.log("Using default settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/website-settings`, settings, { headers });
      toast.success("Website settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F1C]">Website Settings</h2>
          <p className="text-zinc-500 text-sm">Customize your website content, appearance, and settings</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-[#D4AF37] hover:bg-[#B4941F]">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="general" className="data-[state=active]:bg-white">
            <Globe className="w-4 h-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-white">
            <Layout className="w-4 h-4 mr-2" /> Hero Section
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" /> Features
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-white">
            <Phone className="w-4 h-4 mr-2" /> Contact
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-white">
            <Instagram className="w-4 h-4 mr-2" /> Social
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-white">
            <Type className="w-4 h-4 mr-2" /> SEO
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#D4AF37]" />
                General Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input 
                    value={settings.site_name} 
                    onChange={(e) => updateField('site_name', e.target.value)}
                    placeholder="Aircabio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input 
                    value={settings.tagline} 
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="Travel in Style & Comfort"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Site Description</Label>
                <Textarea 
                  value={settings.description} 
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe your business..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input 
                  value={settings.footer_text} 
                  onChange={(e) => updateField('footer_text', e.target.value)}
                  placeholder="© 2026 Aircabio. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#D4AF37]" />
                Hero Section
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Hero Title</Label>
                <Input 
                  value={settings.hero_title} 
                  onChange={(e) => updateField('hero_title', e.target.value)}
                  placeholder="Travel in Style & Comfort"
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Subtitle</Label>
                <Textarea 
                  value={settings.hero_subtitle} 
                  onChange={(e) => updateField('hero_subtitle', e.target.value)}
                  placeholder="Premium airport transfers with professional chauffeurs..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Background Image URL</Label>
                <Input 
                  value={settings.hero_background_url} 
                  onChange={(e) => updateField('hero_background_url', e.target.value)}
                  placeholder="https://example.com/hero-image.jpg"
                />
                <p className="text-xs text-zinc-500">Leave empty to use default gradient background</p>
              </div>
              {settings.hero_background_url && (
                <div className="mt-4">
                  <Label className="mb-2 block">Preview</Label>
                  <div className="relative h-40 rounded-lg overflow-hidden bg-zinc-200">
                    <img 
                      src={settings.hero_background_url} 
                      alt="Hero preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center text-white">
                        <h3 className="text-2xl font-bold">{settings.hero_title}</h3>
                        <p className="text-sm opacity-80">{settings.hero_subtitle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Section */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                Feature Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Feature {num} Title</Label>
                    <Input 
                      value={settings[`feature_${num}_title`]} 
                      onChange={(e) => updateField(`feature_${num}_title`, e.target.value)}
                      placeholder={`Feature ${num} title`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Feature {num} Description</Label>
                    <Input 
                      value={settings[`feature_${num}_description`]} 
                      onChange={(e) => updateField(`feature_${num}_description`, e.target.value)}
                      placeholder={`Feature ${num} description`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Info */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#D4AF37]" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email Address
                  </Label>
                  <Input 
                    type="email"
                    value={settings.contact_email} 
                    onChange={(e) => updateField('contact_email', e.target.value)}
                    placeholder="info@aircabio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Phone Number
                  </Label>
                  <Input 
                    value={settings.contact_phone} 
                    onChange={(e) => updateField('contact_phone', e.target.value)}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Business Address
                </Label>
                <Textarea 
                  value={settings.contact_address} 
                  onChange={(e) => updateField('contact_address', e.target.value)}
                  placeholder="123 Airport Road, London, UK"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Instagram className="w-5 h-5 text-[#D4AF37]" />
                Social Media Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" /> Facebook
                  </Label>
                  <Input 
                    value={settings.facebook_url} 
                    onChange={(e) => updateField('facebook_url', e.target.value)}
                    placeholder="https://facebook.com/aircabio"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-sky-500" /> Twitter / X
                  </Label>
                  <Input 
                    value={settings.twitter_url} 
                    onChange={(e) => updateField('twitter_url', e.target.value)}
                    placeholder="https://twitter.com/aircabio"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-pink-600" /> Instagram
                  </Label>
                  <Input 
                    value={settings.instagram_url} 
                    onChange={(e) => updateField('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/aircabio"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn
                  </Label>
                  <Input 
                    value={settings.linkedin_url} 
                    onChange={(e) => updateField('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/company/aircabio"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#D4AF37]" />
                Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.primary_color} 
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      placeholder="#D4AF37"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">Used for buttons, links, accents</p>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.secondary_color} 
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      placeholder="#0A0F1C"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">Used for text, headers</p>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={settings.accent_color}
                      onChange={(e) => updateField('accent_color', e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.accent_color} 
                      onChange={(e) => updateField('accent_color', e.target.value)}
                      placeholder="#1a1a2e"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-zinc-500">Used for backgrounds, cards</p>
                </div>
              </div>
              
              {/* Preview */}
              <div className="mt-6 p-6 rounded-lg" style={{ backgroundColor: settings.secondary_color }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: settings.primary_color }}>
                  Color Preview
                </h3>
                <p className="text-white mb-4">This is how your brand colors will look together.</p>
                <Button style={{ backgroundColor: settings.primary_color, color: settings.secondary_color }}>
                  Sample Button
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Type className="w-5 h-5 text-[#D4AF37]" />
                SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input 
                  value={settings.meta_title} 
                  onChange={(e) => updateField('meta_title', e.target.value)}
                  placeholder="Aircabio - Premium Airport Transfers"
                />
                <p className="text-xs text-zinc-500">{settings.meta_title.length}/60 characters (recommended)</p>
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea 
                  value={settings.meta_description} 
                  onChange={(e) => updateField('meta_description', e.target.value)}
                  placeholder="Book reliable airport transfers..."
                  rows={3}
                />
                <p className="text-xs text-zinc-500">{settings.meta_description.length}/160 characters (recommended)</p>
              </div>
              <div className="space-y-2">
                <Label>Meta Keywords</Label>
                <Input 
                  value={settings.meta_keywords} 
                  onChange={(e) => updateField('meta_keywords', e.target.value)}
                  placeholder="airport transfer, taxi, chauffeur, London"
                />
                <p className="text-xs text-zinc-500">Comma-separated keywords</p>
              </div>
              
              {/* Google Preview */}
              <div className="mt-6 p-4 bg-white border rounded-lg">
                <p className="text-xs text-zinc-500 mb-2">Google Search Preview:</p>
                <div className="space-y-1">
                  <p className="text-blue-600 text-lg hover:underline cursor-pointer">
                    {settings.meta_title || "Aircabio - Premium Airport Transfers"}
                  </p>
                  <p className="text-green-700 text-sm">www.aircabio.com</p>
                  <p className="text-zinc-600 text-sm">
                    {settings.meta_description || "Book reliable airport transfers with Aircabio..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebsiteSettings;
