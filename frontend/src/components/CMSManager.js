import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { 
  Globe, Image, Type, Phone, Mail, MapPin, Save, Trash2,
  FileText, Facebook, Twitter, Instagram, Linkedin, Youtube,
  Palette, Layout, Car, Users, Briefcase, Upload, Plus,
  Eye, EyeOff, GripVertical, Edit, ChevronRight, Settings,
  Home, Info, Truck, Building2, MessageSquare, FileCheck, Shield,
  ExternalLink, Check, X, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import ImageUpload from "./ImageUpload";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Page icons mapping
const PAGE_ICONS = {
  home: Home,
  about: Info,
  services: Briefcase,
  fleet: Truck,
  contact: MessageSquare,
  terms: FileCheck,
  privacy: Shield
};

const CMSManager = ({ token }) => {
  const [activeTab, setActiveTab] = useState("settings");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Data states
  const [settings, setSettings] = useState({});
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [pages, setPages] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  
  // Dialog states
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [pageEditorOpen, setPageEditorOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, vehiclesRes, mediaRes] = await Promise.all([
        axios.get(`${API}/admin/website-settings`, { headers }),
        axios.get(`${API}/admin/vehicle-categories`, { headers }),
        axios.get(`${API}/admin/media`, { headers })
      ]);
      
      setSettings(settingsRes.data || {});
      setVehicleCategories(vehiclesRes.data || []);
      setMediaLibrary(mediaRes.data || []);
    } catch (error) {
      console.error("Error fetching CMS data:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save website settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/website-settings`, settings, { headers });
      toast.success("Website settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Update vehicle category
  const saveVehicle = async (vehicle) => {
    try {
      if (editingVehicle?.id) {
        await axios.put(`${API}/admin/vehicle-categories/${editingVehicle.id}`, vehicle, { headers });
        toast.success("Vehicle updated!");
      } else {
        await axios.post(`${API}/admin/vehicle-categories`, vehicle, { headers });
        toast.success("Vehicle created!");
      }
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to save vehicle");
    }
  };

  // Delete vehicle
  const deleteVehicle = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await axios.delete(`${API}/admin/vehicle-categories/${id}`, { headers });
      toast.success("Vehicle deleted!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete vehicle");
    }
  };

  // Add media
  const addMedia = async (url, name) => {
    try {
      await axios.post(`${API}/admin/media`, { url, name, type: "image" }, { headers });
      toast.success("Image added to library!");
      fetchData();
    } catch (error) {
      toast.error("Failed to add image");
    }
  };

  // Delete media
  const deleteMedia = async (id) => {
    try {
      await axios.delete(`${API}/admin/media/${id}`, { headers });
      toast.success("Image removed!");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F1C]">Website CMS</h2>
          <p className="text-zinc-500 text-sm">Complete control over all website content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button 
            onClick={saveSettings} 
            disabled={saving}
            className="bg-[#D4AF37] hover:bg-[#B4941F]"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-zinc-100 p-1 h-auto flex-wrap">
          <TabsTrigger value="settings" className="data-[state=active]:bg-white">
            <Settings className="w-4 h-4 mr-2" /> Site Settings
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="data-[state=active]:bg-white">
            <Car className="w-4 h-4 mr-2" /> Vehicles
          </TabsTrigger>
          <TabsTrigger value="pages" className="data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-2" /> Pages
          </TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-white">
            <Image className="w-4 h-4 mr-2" /> Media Library
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </TabsTrigger>
        </TabsList>

        {/* Site Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#D4AF37]" /> Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site Name</Label>
                  <Input 
                    value={settings.site_name || ""} 
                    onChange={(e) => setSettings({...settings, site_name: e.target.value})}
                    placeholder="Aircabio"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input 
                    value={settings.tagline || ""} 
                    onChange={(e) => setSettings({...settings, tagline: e.target.value})}
                    placeholder="Travel in Style & Comfort"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload
                  value={settings.logo_url || ""}
                  onChange={(url) => setSettings({...settings, logo_url: url})}
                  category="branding"
                  label="Company Logo"
                  placeholder="Upload your company logo"
                  headers={headers}
                />
                <ImageUpload
                  value={settings.favicon_url || ""}
                  onChange={(url) => setSettings({...settings, favicon_url: url})}
                  category="branding"
                  label="Favicon"
                  placeholder="Upload favicon (recommended 32x32)"
                  headers={headers}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#D4AF37]" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                  <Input 
                    value={settings.contact_email || ""} 
                    onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
                    placeholder="info@aircabio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</Label>
                  <Input 
                    value={settings.contact_phone || ""} 
                    onChange={(e) => setSettings({...settings, contact_phone: e.target.value})}
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input 
                    value={settings.whatsapp_number || ""} 
                    onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
                    placeholder="+44 7xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</Label>
                  <Input 
                    value={settings.contact_address || ""} 
                    onChange={(e) => setSettings({...settings, contact_address: e.target.value})}
                    placeholder="123 Airport Road, London"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Instagram className="w-5 h-5 text-[#D4AF37]" /> Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-600" /> Facebook</Label>
                <Input 
                  value={settings.facebook_url || ""} 
                  onChange={(e) => setSettings({...settings, facebook_url: e.target.value})}
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Twitter className="w-4 h-4 text-sky-500" /> Twitter/X</Label>
                <Input 
                  value={settings.twitter_url || ""} 
                  onChange={(e) => setSettings({...settings, twitter_url: e.target.value})}
                  placeholder="https://twitter.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Instagram className="w-4 h-4 text-pink-600" /> Instagram</Label>
                <Input 
                  value={settings.instagram_url || ""} 
                  onChange={(e) => setSettings({...settings, instagram_url: e.target.value})}
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4 text-blue-700" /> LinkedIn</Label>
                <Input 
                  value={settings.linkedin_url || ""} 
                  onChange={(e) => setSettings({...settings, linkedin_url: e.target.value})}
                  placeholder="https://linkedin.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Youtube className="w-4 h-4 text-red-600" /> YouTube</Label>
                <Input 
                  value={settings.youtube_url || ""} 
                  onChange={(e) => setSettings({...settings, youtube_url: e.target.value})}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Image className="w-5 h-5 text-[#D4AF37]" /> Hero Section (Homepage)
              </CardTitle>
              <p className="text-sm text-zinc-500">Customize the main banner on your homepage</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Hero Title</Label>
                <Input 
                  value={settings.hero_title || ""} 
                  onChange={(e) => setSettings({...settings, hero_title: e.target.value})}
                  placeholder="Travel in Style & Comfort"
                />
              </div>
              <div className="space-y-2">
                <Label>Hero Subtitle</Label>
                <Textarea 
                  value={settings.hero_subtitle || ""} 
                  onChange={(e) => setSettings({...settings, hero_subtitle: e.target.value})}
                  placeholder="Book your airport transfer with Aircabio..."
                  rows={2}
                />
              </div>
              <ImageUpload
                value={settings.hero_background_url || ""}
                onChange={(url) => setSettings({...settings, hero_background_url: url})}
                category="banners"
                label="Hero Background Image"
                placeholder="Upload hero background image"
                headers={headers}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hero Button Text</Label>
                  <Input 
                    value={settings.hero_cta_text || ""} 
                    onChange={(e) => setSettings({...settings, hero_cta_text: e.target.value})}
                    placeholder="Book Now"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hero Button Link</Label>
                  <Input 
                    value={settings.hero_cta_link || ""} 
                    onChange={(e) => setSettings({...settings, hero_cta_link: e.target.value})}
                    placeholder="#booking-section"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Type className="w-5 h-5 text-[#D4AF37]" /> SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input 
                  value={settings.meta_title || ""} 
                  onChange={(e) => setSettings({...settings, meta_title: e.target.value})}
                  placeholder="Aircabio - Premium Airport Transfers"
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea 
                  value={settings.meta_description || ""} 
                  onChange={(e) => setSettings({...settings, meta_description: e.target.value})}
                  placeholder="Book reliable airport transfers..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Meta Keywords</Label>
                <Input 
                  value={settings.meta_keywords || ""} 
                  onChange={(e) => setSettings({...settings, meta_keywords: e.target.value})}
                  placeholder="airport transfer, taxi, chauffeur"
                />
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="w-5 h-5 text-[#D4AF37]" /> Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Input 
                  value={settings.footer_text || ""} 
                  onChange={(e) => setSettings({...settings, footer_text: e.target.value})}
                  placeholder="© 2026 Aircabio. All rights reserved."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-zinc-500">Manage vehicle categories displayed on the website</p>
            <Button onClick={() => { setEditingVehicle({}); setVehicleDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Vehicle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleCategories.map((vehicle) => (
              <Card key={vehicle.id} className={`relative ${!vehicle.is_active && vehicle.is_active !== undefined ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="aspect-video bg-zinc-100 rounded-lg mb-4 overflow-hidden">
                    {vehicle.image_url ? (
                      <img src={vehicle.image_url} alt={vehicle.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-12 h-12 text-zinc-300" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{vehicle.name}</h3>
                  <p className="text-sm text-zinc-500 mb-2">{vehicle.description || "No description"}</p>
                  <div className="flex gap-4 text-sm text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> {vehicle.passengers || 4} pax
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" /> {vehicle.luggage || 2} bags
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => deleteVehicle(vehicle.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {vehicle.is_active === false && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Hidden
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <p className="text-zinc-500">Edit content for each page of the website</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["home", "about", "services", "fleet", "contact", "terms", "privacy"].map((pageId) => {
              const Icon = PAGE_ICONS[pageId] || FileText;
              return (
                <Card 
                  key={pageId} 
                  className="cursor-pointer hover:border-[#D4AF37] transition-colors"
                  onClick={() => {
                    setEditingPage(pageId);
                    setPageEditorOpen(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[#D4AF37]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold capitalize">{pageId} Page</h3>
                        <p className="text-sm text-zinc-500">Edit content & sections</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Media Library Tab */}
        <TabsContent value="media" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-zinc-500">Manage images and media files</p>
            <Button onClick={() => setMediaDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" /> Add Image
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaLibrary.map((media) => (
              <div key={media.id} className="group relative">
                <div className="aspect-square bg-zinc-100 rounded-lg overflow-hidden">
                  <img 
                    src={media.url} 
                    alt={media.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1 truncate">{media.name}</p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                  onClick={() => deleteMedia(media.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {mediaLibrary.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500">
                No images in library. Click "Add Image" to upload.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#D4AF37]" /> Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.primary_color || "#D4AF37"}
                      onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.primary_color || "#D4AF37"} 
                      onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.secondary_color || "#0A0F1C"}
                      onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.secondary_color || "#0A0F1C"} 
                      onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      value={settings.accent_color || "#1a1a2e"}
                      onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      className="w-12 h-10 rounded cursor-pointer border"
                    />
                    <Input 
                      value={settings.accent_color || "#1a1a2e"} 
                      onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
              
              {/* Preview */}
              <div className="mt-6 p-6 rounded-lg" style={{ backgroundColor: settings.secondary_color || "#0A0F1C" }}>
                <h3 className="text-xl font-bold mb-2" style={{ color: settings.primary_color || "#D4AF37" }}>
                  Color Preview
                </h3>
                <p className="text-white mb-4">This is how your brand colors will look together.</p>
                <Button style={{ backgroundColor: settings.primary_color || "#D4AF37", color: settings.secondary_color || "#0A0F1C" }}>
                  Sample Button
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vehicle Edit Dialog */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onClose={() => { setVehicleDialogOpen(false); setEditingVehicle(null); }}
        vehicle={editingVehicle}
        onSave={saveVehicle}
        mediaLibrary={mediaLibrary}
      />

      {/* Page Editor Dialog */}
      <PageEditorDialog
        open={pageEditorOpen}
        onClose={() => { setPageEditorOpen(false); setEditingPage(null); }}
        pageId={editingPage}
        token={token}
        mediaLibrary={mediaLibrary}
      />

      {/* Add Media Dialog */}
      <AddMediaDialog
        open={mediaDialogOpen}
        onClose={() => setMediaDialogOpen(false)}
        onAdd={addMedia}
      />
    </div>
  );
};

// Vehicle Edit Dialog
const VehicleDialog = ({ open, onClose, vehicle, onSave, mediaLibrary }) => {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    passengers: 4,
    luggage: 2,
    features: [],
    display_order: 0,
    is_active: true
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name || "",
        slug: vehicle.slug || vehicle.id || "",
        description: vehicle.description || "",
        image_url: vehicle.image_url || "",
        passengers: vehicle.passengers || 4,
        luggage: vehicle.luggage || 2,
        features: vehicle.features || [],
        display_order: vehicle.display_order || 0,
        is_active: vehicle.is_active !== false
      });
    }
  }, [vehicle]);

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Vehicle name is required");
      return;
    }
    onSave({ ...vehicle, ...formData });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vehicle?.id ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Executive Sedan"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug/ID</Label>
              <Input 
                value={formData.slug} 
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                placeholder="e.g., executive-sedan"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe this vehicle class..."
              rows={3}
            />
          </div>

          <ImageUpload
            value={formData.image_url}
            onChange={(url) => setFormData({...formData, image_url: url})}
            category="blog"
            label="Blog Post Image"
            placeholder="Upload blog post featured image"
            headers={headers}
          />
          {mediaLibrary.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-zinc-500 mb-2">Or select from Media Library:</p>
              <div className="flex gap-2 flex-wrap">
                {mediaLibrary.slice(0, 6).map((media) => (
                  <img 
                    key={media.id}
                    src={media.url} 
                    alt={media.name}
                    className={`w-16 h-16 rounded cursor-pointer object-cover border-2 ${formData.image_url === media.url ? 'border-[#D4AF37]' : 'border-transparent'}`}
                    onClick={() => setFormData({...formData, image_url: media.url})}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Passengers</Label>
              <Input 
                type="number"
                value={formData.passengers} 
                onChange={(e) => setFormData({...formData, passengers: parseInt(e.target.value) || 4})}
              />
            </div>
            <div className="space-y-2">
              <Label>Luggage</Label>
              <Input 
                type="number"
                value={formData.luggage} 
                onChange={(e) => setFormData({...formData, luggage: parseInt(e.target.value) || 2})}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input 
                type="number"
                value={formData.display_order} 
                onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Label>Active (visible on website)</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-[#D4AF37] hover:bg-[#B4941F]">Save Vehicle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Page Editor Dialog
const PageEditorDialog = ({ open, onClose, pageId, token, mediaLibrary }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageContent, setPageContent] = useState(null);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (open && pageId) {
      fetchPageContent();
    }
  }, [open, pageId]);

  const fetchPageContent = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/pages/${pageId}`, { headers });
      setPageContent(res.data);
    } catch (error) {
      toast.error("Failed to load page content");
    } finally {
      setLoading(false);
    }
  };

  const savePageContent = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/pages/${pageId}`, pageContent, { headers });
      toast.success("Page saved!");
      onClose();
    } catch (error) {
      toast.error("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (sectionId, field, value) => {
    setPageContent(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId ? { ...s, [field]: value } : s
      )
    }));
  };

  const addSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      type: "text",
      title: "New Section",
      content: "",
      image_url: "",
      order: pageContent.sections.length,
      is_active: true
    };
    setPageContent(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const deleteSection = (sectionId) => {
    setPageContent(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId)
    }));
  };

  if (!pageContent) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="capitalize">{pageId} Page Editor</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Page Meta */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Page Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Page Title</Label>
                    <Input 
                      value={pageContent.title || ""} 
                      onChange={(e) => setPageContent({...pageContent, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Title (SEO)</Label>
                    <Input 
                      value={pageContent.meta_title || ""} 
                      onChange={(e) => setPageContent({...pageContent, meta_title: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Meta Description (SEO)</Label>
                  <Textarea 
                    value={pageContent.meta_description || ""} 
                    onChange={(e) => setPageContent({...pageContent, meta_description: e.target.value})}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Page Sections</h3>
                <Button size="sm" onClick={addSection}>
                  <Plus className="w-4 h-4 mr-1" /> Add Section
                </Button>
              </div>

              {pageContent.sections?.map((section, index) => (
                <Card key={section.id} className="relative">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium">Section {index + 1}: {section.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.is_active !== false}
                          onCheckedChange={(checked) => updateSection(section.id, 'is_active', checked)}
                        />
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteSection(section.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Type</Label>
                        <select
                          value={section.type}
                          onChange={(e) => updateSection(section.id, 'type', e.target.value)}
                          className="w-full h-9 rounded-md border px-3"
                        >
                          <option value="hero">Hero</option>
                          <option value="text">Text Block</option>
                          <option value="image">Image</option>
                          <option value="features">Features Grid</option>
                          <option value="cta">Call to Action</option>
                          <option value="testimonials">Testimonials</option>
                          <option value="steps">Steps/Process</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input 
                          value={section.title || ""} 
                          onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Subtitle</Label>
                      <Input 
                        value={section.subtitle || ""} 
                        onChange={(e) => updateSection(section.id, 'subtitle', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea 
                        value={section.content || ""} 
                        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                        rows={4}
                      />
                    </div>

                    <ImageUpload
                      value={section.image_url || ""}
                      onChange={(url) => updateSection(section.id, 'image_url', url)}
                      category="sections"
                      label="Section Image"
                      placeholder="Upload section image"
                      headers={headers}
                    />

                    {(section.type === "hero" || section.type === "cta") && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Button Text</Label>
                          <Input 
                            value={section.button_text || ""} 
                            onChange={(e) => updateSection(section.id, 'button_text', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Button Link</Label>
                          <Input 
                            value={section.button_link || ""} 
                            onChange={(e) => updateSection(section.id, 'button_link', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={savePageContent} disabled={saving} className="bg-[#D4AF37] hover:bg-[#B4941F]">
            {saving ? "Saving..." : "Save Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Add Media Dialog
const AddMediaDialog = ({ open, onClose, onAdd }) => {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!url) {
      toast.error("Image URL is required");
      return;
    }
    onAdd(url, name || "Untitled");
    setUrl("");
    setName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Image to Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Image URL *</Label>
            <Input 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Image name"
            />
          </div>
          {url && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <img 
                src={url} 
                alt="Preview" 
                className="max-h-48 rounded"
                onError={(e) => e.target.style.display = 'none'}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} className="bg-[#D4AF37] hover:bg-[#B4941F]">Add Image</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CMSManager;
