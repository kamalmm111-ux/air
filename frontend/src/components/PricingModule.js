import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { 
  ArrowLeft, Edit, Plus, Trash2, DollarSign, Clock, Car, MapPin, 
  Route, Save, X, GripVertical, ChevronRight, Map, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import PlacesAutocomplete from "./PlacesAutocomplete";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// ==================== PRICING MODULE ====================
const PricingModule = ({ token }) => {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [pricingScheme, setPricingScheme] = useState(null);
  const [fixedRoutes, setFixedRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRouteBuilder, setShowRouteBuilder] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/vehicles`);
      setVehicles(res.data);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPricingScheme = useCallback(async (vehicleId) => {
    try {
      const [schemeRes, routesRes] = await Promise.all([
        axios.get(`${API}/pricing-schemes/${vehicleId}`, { headers }),
        axios.get(`${API}/map-fixed-routes/vehicle/${vehicleId}`, { headers })
      ]);
      setPricingScheme(schemeRes.data);
      setFixedRoutes(routesRes.data);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      toast.error("Failed to load pricing data");
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (selectedVehicle) {
      fetchPricingScheme(selectedVehicle.id);
    }
  }, [selectedVehicle, fetchPricingScheme]);

  const handleBack = () => {
    setSelectedVehicle(null);
    setPricingScheme(null);
    setFixedRoutes([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  // Vehicle Classes List View
  if (!selectedVehicle) {
    return (
      <div className="space-y-6" data-testid="pricing-module">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
            Pricing Configuration
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="cursor-pointer hover:border-[#D4AF37] transition-colors"
              onClick={() => setSelectedVehicle(vehicle)}
              data-testid={`vehicle-card-${vehicle.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-zinc-100 rounded-sm overflow-hidden">
                    <img
                      src={vehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100"}
                      alt={vehicle.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[#0A0F1C]">{vehicle.name}</h3>
                    <p className="text-sm text-zinc-500">{vehicle.max_passengers} pax, {vehicle.max_luggage} bags</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Vehicle Pricing Card View
  return (
    <div className="space-y-6" data-testid="pricing-detail">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-sm overflow-hidden">
            <img
              src={selectedVehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=100"}
              alt={selectedVehicle.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              {selectedVehicle.name}
            </h2>
            <p className="text-sm text-zinc-500">
              {selectedVehicle.max_passengers} passengers, {selectedVehicle.max_luggage} bags
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mileage Brackets */}
          <MileageBracketsCard
            scheme={pricingScheme}
            onUpdate={(data) => setPricingScheme({ ...pricingScheme, ...data })}
            vehicleId={selectedVehicle.id}
            headers={headers}
          />

          {/* Hourly/Daily Rates */}
          <TimeRatesCard
            scheme={pricingScheme}
            onUpdate={(data) => setPricingScheme({ ...pricingScheme, ...data })}
            vehicleId={selectedVehicle.id}
            headers={headers}
          />

          {/* Extra Fees */}
          <ExtraFeesCard
            scheme={pricingScheme}
            onUpdate={(data) => setPricingScheme({ ...pricingScheme, ...data })}
            vehicleId={selectedVehicle.id}
            headers={headers}
          />

          {/* Fixed Routes */}
          <FixedRoutesCard
            routes={fixedRoutes}
            vehicleId={selectedVehicle.id}
            onAddRoute={() => { setEditingRoute(null); setShowRouteBuilder(true); }}
            onEditRoute={(route) => { setEditingRoute(route); setShowRouteBuilder(true); }}
            onRefresh={() => fetchPricingScheme(selectedVehicle.id)}
            headers={headers}
          />
        </div>

        {/* Summary Cards - Right Side */}
        <div className="space-y-4">
          <SummaryCard
            title="Mileage Brackets"
            count={pricingScheme?.mileage_brackets?.length || 0}
            icon={Route}
          />
          <SummaryCard
            title="Fixed Routes"
            count={fixedRoutes.length}
            icon={MapPin}
          />
          <SummaryCard
            title="Base Fare"
            value={`£${pricingScheme?.base_fare?.toFixed(2) || '0.00'}`}
            icon={DollarSign}
          />
          <SummaryCard
            title="Minimum Fare"
            value={`£${pricingScheme?.minimum_fare?.toFixed(2) || '25.00'}`}
            icon={DollarSign}
          />
        </div>
      </div>

      {/* Fixed Route Builder Dialog */}
      {showRouteBuilder && (
        <FixedRouteBuilder
          open={showRouteBuilder}
          onClose={() => { setShowRouteBuilder(false); setEditingRoute(null); }}
          vehicleId={selectedVehicle.id}
          vehicleName={selectedVehicle.name}
          editingRoute={editingRoute}
          headers={headers}
          onSuccess={() => {
            setShowRouteBuilder(false);
            setEditingRoute(null);
            fetchPricingScheme(selectedVehicle.id);
          }}
        />
      )}
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

const SummaryCard = ({ title, count, value, icon: Icon }) => (
  <Card>
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0A0F1C] rounded-sm flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="font-medium">{title}</span>
      </div>
      <span className="text-xl font-bold text-[#0A0F1C]">{value || count}</span>
    </CardContent>
  </Card>
);

// ==================== MILEAGE BRACKETS CARD ====================
const MileageBracketsCard = ({ scheme, onUpdate, vehicleId, headers }) => {
  const [editing, setEditing] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBrackets(scheme?.mileage_brackets || []);
  }, [scheme]);

  const addBracket = () => {
    const lastBracket = brackets[brackets.length - 1];
    const newMin = lastBracket ? (lastBracket.max_miles || lastBracket.min_miles + 10) : 0;
    setBrackets([
      ...brackets,
      {
        id: `bracket-${Date.now()}`,
        min_miles: newMin,
        max_miles: null,
        fixed_price: null,
        per_mile_rate: 2.50,
        order: brackets.length
      }
    ]);
  };

  const updateBracket = (index, field, value) => {
    const updated = [...brackets];
    updated[index][field] = value;
    setBrackets(updated);
  };

  const removeBracket = (index) => {
    setBrackets(brackets.filter((_, i) => i !== index));
  };

  const saveBrackets = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/pricing-schemes`, {
        vehicle_category_id: vehicleId,
        mileage_brackets: brackets,
        time_rates: scheme?.time_rates,
        extra_fees: scheme?.extra_fees,
        base_fare: scheme?.base_fare || 0,
        minimum_fare: scheme?.minimum_fare || 25
      }, { headers });
      onUpdate({ mileage_brackets: brackets });
      setEditing(false);
      toast.success("Mileage brackets saved!");
    } catch (error) {
      toast.error("Failed to save brackets");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Route className="w-5 h-5 text-[#D4AF37]" />
          Mileage Brackets
        </CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setBrackets(scheme?.mileage_brackets || []); }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveBrackets} disabled={saving} className="bg-[#0A0F1C]">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {brackets.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Route className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No mileage brackets configured</p>
            {editing && (
              <Button onClick={addBracket} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-1" /> Add First Bracket
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {brackets.map((bracket, index) => (
              <div key={bracket.id || index} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-sm">
                {editing && <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab" />}
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-500">From (miles)</Label>
                    <Input
                      type="number"
                      value={bracket.min_miles}
                      onChange={(e) => updateBracket(index, 'min_miles', parseFloat(e.target.value) || 0)}
                      disabled={!editing}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">To (miles)</Label>
                    <Input
                      type="number"
                      value={bracket.max_miles || ''}
                      onChange={(e) => updateBracket(index, 'max_miles', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="∞"
                      disabled={!editing}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Fixed Price (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bracket.fixed_price || ''}
                      onChange={(e) => updateBracket(index, 'fixed_price', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="-"
                      disabled={!editing}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Per Mile (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={bracket.per_mile_rate || ''}
                      onChange={(e) => updateBracket(index, 'per_mile_rate', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="-"
                      disabled={!editing}
                      className="h-9"
                    />
                  </div>
                </div>
                {editing && (
                  <Button variant="ghost" size="sm" onClick={() => removeBracket(index)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {editing && (
              <Button onClick={addBracket} variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Add Bracket
              </Button>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-500 mt-4">
          Configure distance-based pricing tiers. Use "Fixed Price" for flat rates (e.g., first 6 miles = £40) or "Per Mile" for distance-based charging.
        </p>
      </CardContent>
    </Card>
  );
};

// ==================== TIME RATES CARD ====================
const TimeRatesCard = ({ scheme, onUpdate, vehicleId, headers }) => {
  const [editing, setEditing] = useState(false);
  const [rates, setRates] = useState({ hourly_rate: 0, minimum_hours: 2, daily_rate: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRates(scheme?.time_rates || { hourly_rate: 0, minimum_hours: 2, daily_rate: 0 });
  }, [scheme]);

  const saveRates = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/pricing-schemes`, {
        vehicle_category_id: vehicleId,
        mileage_brackets: scheme?.mileage_brackets || [],
        time_rates: rates,
        extra_fees: scheme?.extra_fees,
        base_fare: scheme?.base_fare || 0,
        minimum_fare: scheme?.minimum_fare || 25
      }, { headers });
      onUpdate({ time_rates: rates });
      setEditing(false);
      toast.success("Time rates saved!");
    } catch (error) {
      toast.error("Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#D4AF37]" />
          Hourly / Daily Rates
        </CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setRates(scheme?.time_rates || {}); }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveRates} disabled={saving} className="bg-[#0A0F1C]">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="text-sm text-zinc-500">Hourly Rate (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={rates.hourly_rate}
              onChange={(e) => setRates({ ...rates, hourly_rate: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500">Minimum Hours</Label>
            <Input
              type="number"
              value={rates.minimum_hours}
              onChange={(e) => setRates({ ...rates, minimum_hours: parseInt(e.target.value) || 2 })}
              disabled={!editing}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-zinc-500">Daily Rate (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={rates.daily_rate}
              onChange={(e) => setRates({ ...rates, daily_rate: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== EXTRA FEES CARD ====================
const ExtraFeesCard = ({ scheme, onUpdate, vehicleId, headers }) => {
  const [editing, setEditing] = useState(false);
  const [fees, setFees] = useState({
    additional_pickup_fee: 10,
    waiting_per_minute: 0.50,
    airport_pickup_fee: 10,
    meet_greet_fee: 15,
    night_surcharge_percent: 20,
    weekend_surcharge_percent: 0,
    child_seat_fee: 10
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFees(scheme?.extra_fees || {
      additional_pickup_fee: 10,
      waiting_per_minute: 0.50,
      airport_pickup_fee: 10,
      meet_greet_fee: 15,
      night_surcharge_percent: 20,
      weekend_surcharge_percent: 0,
      child_seat_fee: 10
    });
  }, [scheme]);

  const saveFees = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/pricing-schemes`, {
        vehicle_category_id: vehicleId,
        mileage_brackets: scheme?.mileage_brackets || [],
        time_rates: scheme?.time_rates,
        extra_fees: fees,
        base_fare: scheme?.base_fare || 0,
        minimum_fare: scheme?.minimum_fare || 25
      }, { headers });
      onUpdate({ extra_fees: fees });
      setEditing(false);
      toast.success("Extra fees saved!");
    } catch (error) {
      toast.error("Failed to save fees");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#D4AF37]" />
          Extra Fees
        </CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Edit className="w-4 h-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setFees(scheme?.extra_fees || {}); }}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={saveFees} disabled={saving} className="bg-[#0A0F1C]">
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-zinc-500">Additional Pickup (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={fees.additional_pickup_fee}
              onChange={(e) => setFees({ ...fees, additional_pickup_fee: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Waiting (£/min)</Label>
            <Input
              type="number"
              step="0.01"
              value={fees.waiting_per_minute}
              onChange={(e) => setFees({ ...fees, waiting_per_minute: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Airport Pickup (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={fees.airport_pickup_fee}
              onChange={(e) => setFees({ ...fees, airport_pickup_fee: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Meet & Greet (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={fees.meet_greet_fee}
              onChange={(e) => setFees({ ...fees, meet_greet_fee: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Night Surcharge (%)</Label>
            <Input
              type="number"
              value={fees.night_surcharge_percent}
              onChange={(e) => setFees({ ...fees, night_surcharge_percent: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Weekend Surcharge (%)</Label>
            <Input
              type="number"
              value={fees.weekend_surcharge_percent}
              onChange={(e) => setFees({ ...fees, weekend_surcharge_percent: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-zinc-500">Child Seat (£)</Label>
            <Input
              type="number"
              step="0.01"
              value={fees.child_seat_fee}
              onChange={(e) => setFees({ ...fees, child_seat_fee: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              className="mt-1 h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== FIXED ROUTES CARD ====================
const FixedRoutesCard = ({ routes, vehicleId, onAddRoute, onEditRoute, onRefresh, headers }) => {
  const [search, setSearch] = useState("");
  
  const filteredRoutes = routes.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.start_label?.toLowerCase().includes(search.toLowerCase()) ||
    r.end_label?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteRoute = async (routeId) => {
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    try {
      await axios.delete(`${API}/map-fixed-routes/${routeId}`, { headers });
      toast.success("Route deleted");
      onRefresh();
    } catch (error) {
      toast.error("Failed to delete route");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5 text-[#D4AF37]" />
          Fixed Routes
        </CardTitle>
        <Button onClick={onAddRoute} size="sm" className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-1" /> Add Route
        </Button>
      </CardHeader>
      <CardContent>
        {routes.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder="Search routes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
        
        {filteredRoutes.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Map className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No fixed routes configured</p>
            <p className="text-sm mt-2">Add map-based fixed routes with radius zones</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Start → End</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoutes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell className="font-medium">{route.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="text-zinc-500">{route.start_label}</span>
                      <span className="mx-2">→</span>
                      <span className="text-zinc-500">{route.end_label}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {route.start_radius_miles}mi radius → {route.end_radius_miles}mi radius
                    </div>
                  </TableCell>
                  <TableCell>{route.distance_miles?.toFixed(1) || '-'} mi</TableCell>
                  <TableCell className="font-bold">£{route.price?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={route.valid_return ? "bg-green-100 text-green-800" : "bg-zinc-100"}>
                      {route.valid_return ? "Return Valid" : "One Way"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEditRoute(route)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRoute(route.id)} className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== FIXED ROUTE BUILDER (Map Dialog) ====================
const FixedRouteBuilder = ({ open, onClose, vehicleId, vehicleName, editingRoute, headers, onSuccess }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const startCircleRef = useRef(null);
  const endCircleRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: "",
    start_label: "",
    start_lat: 51.4700,
    start_lng: -0.4543, // Heathrow
    start_radius_miles: 3,
    end_label: "",
    end_lat: 51.5074,
    end_lng: -0.1278, // Central London
    end_radius_miles: 3,
    price: 0,
    distance_miles: null,
    valid_return: false,
    priority: 0
  });
  const [saving, setSaving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize form with editing data
  useEffect(() => {
    if (editingRoute) {
      setFormData({
        name: editingRoute.name || "",
        start_label: editingRoute.start_label || "",
        start_lat: editingRoute.start_lat,
        start_lng: editingRoute.start_lng,
        start_radius_miles: editingRoute.start_radius_miles,
        end_label: editingRoute.end_label || "",
        end_lat: editingRoute.end_lat,
        end_lng: editingRoute.end_lng,
        end_radius_miles: editingRoute.end_radius_miles,
        price: editingRoute.price,
        distance_miles: editingRoute.distance_miles,
        valid_return: editingRoute.valid_return,
        priority: editingRoute.priority || 0
      });
    }
  }, [editingRoute]);

  // Load Google Maps
  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    const initMap = () => {
      if (!mapRef.current || !isMounted) return;
      
      // Clear any existing map
      if (mapInstanceRef.current) {
        if (startMarkerRef.current) startMarkerRef.current.setMap(null);
        if (endMarkerRef.current) endMarkerRef.current.setMap(null);
        if (startCircleRef.current) startCircleRef.current.setMap(null);
        if (endCircleRef.current) endCircleRef.current.setMap(null);
        mapInstanceRef.current = null;
      }

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: formData.start_lat, lng: formData.start_lng },
        zoom: 10,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });
      mapInstanceRef.current = map;

      // Create start marker and circle
      const startMarker = new window.google.maps.Marker({
        position: { lat: formData.start_lat, lng: formData.start_lng },
        map: map,
        draggable: true,
        label: "A",
        title: "Start Point"
      });
      startMarkerRef.current = startMarker;

      const startCircle = new window.google.maps.Circle({
        map: map,
        center: { lat: formData.start_lat, lng: formData.start_lng },
        radius: formData.start_radius_miles * 1609.34, // Convert miles to meters
        fillColor: "#D4AF37",
        fillOpacity: 0.2,
        strokeColor: "#D4AF37",
        strokeWeight: 2,
        editable: true
      });
      startCircleRef.current = startCircle;

      // Create end marker and circle
      const endMarker = new window.google.maps.Marker({
        position: { lat: formData.end_lat, lng: formData.end_lng },
        map: map,
        draggable: true,
        label: "B",
        title: "End Point"
      });
      endMarkerRef.current = endMarker;

      const endCircle = new window.google.maps.Circle({
        map: map,
        center: { lat: formData.end_lat, lng: formData.end_lng },
        radius: formData.end_radius_miles * 1609.34,
        fillColor: "#0A0F1C",
        fillOpacity: 0.2,
        strokeColor: "#0A0F1C",
        strokeWeight: 2,
        editable: true
      });
      endCircleRef.current = endCircle;

      // Add event listeners
      startMarker.addListener('dragend', (e) => {
        const pos = e.latLng;
        setFormData(prev => ({ ...prev, start_lat: pos.lat(), start_lng: pos.lng() }));
        startCircle.setCenter(pos);
      });

      endMarker.addListener('dragend', (e) => {
        const pos = e.latLng;
        setFormData(prev => ({ ...prev, end_lat: pos.lat(), end_lng: pos.lng() }));
        endCircle.setCenter(pos);
      });

      startCircle.addListener('radius_changed', () => {
        const radiusMiles = startCircle.getRadius() / 1609.34;
        setFormData(prev => ({ ...prev, start_radius_miles: Math.round(radiusMiles * 10) / 10 }));
      });

      endCircle.addListener('radius_changed', () => {
        const radiusMiles = endCircle.getRadius() / 1609.34;
        setFormData(prev => ({ ...prev, end_radius_miles: Math.round(radiusMiles * 10) / 10 }));
      });

      // Fit bounds to show both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: formData.start_lat, lng: formData.start_lng });
      bounds.extend({ lat: formData.end_lat, lng: formData.end_lng });
      map.fitBounds(bounds, { padding: 100 });

      setMapLoaded(true);
    };

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(initMap, 100);
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
        // Script exists, wait for it to load
        const checkGoogleMaps = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogleMaps);
            setTimeout(initMap, 100);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.onload = () => setTimeout(initMap, 100);
      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      isMounted = false;
      // Cleanup
      if (startMarkerRef.current) startMarkerRef.current.setMap(null);
      if (endMarkerRef.current) endMarkerRef.current.setMap(null);
      if (startCircleRef.current) startCircleRef.current.setMap(null);
      if (endCircleRef.current) endCircleRef.current.setMap(null);
      mapInstanceRef.current = null;
    };
  }, [open]);

  // Calculate distance between points
  const calculateDistance = () => {
    if (!window.google) return;
    
    const start = new window.google.maps.LatLng(formData.start_lat, formData.start_lng);
    const end = new window.google.maps.LatLng(formData.end_lat, formData.end_lng);
    const distanceMeters = window.google.maps.geometry.spherical.computeDistanceBetween(start, end);
    const distanceMiles = distanceMeters / 1609.34;
    
    setFormData(prev => ({ ...prev, distance_miles: Math.round(distanceMiles * 10) / 10 }));
  };

  // Calculate distance when coordinates change
  useEffect(() => {
    calculateDistance();
  }, [formData.start_lat, formData.start_lng, formData.end_lat, formData.end_lng]);

  // Update map when form data changes
  useEffect(() => {
    if (!mapLoaded) return;
    
    if (startMarkerRef.current) {
      startMarkerRef.current.setPosition({ lat: formData.start_lat, lng: formData.start_lng });
    }
    if (startCircleRef.current) {
      startCircleRef.current.setCenter({ lat: formData.start_lat, lng: formData.start_lng });
      startCircleRef.current.setRadius(formData.start_radius_miles * 1609.34);
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.setPosition({ lat: formData.end_lat, lng: formData.end_lng });
    }
    if (endCircleRef.current) {
      endCircleRef.current.setCenter({ lat: formData.end_lat, lng: formData.end_lng });
      endCircleRef.current.setRadius(formData.end_radius_miles * 1609.34);
    }
  }, [formData.start_lat, formData.start_lng, formData.start_radius_miles, 
      formData.end_lat, formData.end_lng, formData.end_radius_miles, mapLoaded]);

  const handleSave = async () => {
    if (!formData.name || !formData.start_label || !formData.end_label || formData.price <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingRoute) {
        await axios.put(`${API}/map-fixed-routes/${editingRoute.id}`, formData, { headers });
        toast.success("Route updated!");
      } else {
        await axios.post(`${API}/map-fixed-routes`, {
          ...formData,
          vehicle_category_id: vehicleId
        }, { headers });
        toast.success("Route created!");
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save route");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            {editingRoute ? "Edit Fixed Route" : "Add Fixed Route"} - {vehicleName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          {/* Form Panel */}
          <div className="space-y-4">
            <div>
              <Label>Route Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Heathrow to Central London"
              />
            </div>

            <div className="p-3 bg-[#D4AF37]/10 rounded-sm">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-[#D4AF37] rounded-full flex items-center justify-center text-white text-xs">A</div>
                Start Point
              </h4>
              <div className="space-y-2">
                <Input
                  value={formData.start_label}
                  onChange={(e) => setFormData({ ...formData, start_label: e.target.value })}
                  placeholder="e.g., Heathrow Airport"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Radius (miles)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.start_radius_miles}
                      onChange={(e) => setFormData({ ...formData, start_radius_miles: parseFloat(e.target.value) || 3 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lat/Lng</Label>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formData.start_lat.toFixed(4)}, {formData.start_lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-zinc-100 rounded-sm">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <div className="w-5 h-5 bg-[#0A0F1C] rounded-full flex items-center justify-center text-white text-xs">B</div>
                End Point
              </h4>
              <div className="space-y-2">
                <Input
                  value={formData.end_label}
                  onChange={(e) => setFormData({ ...formData, end_label: e.target.value })}
                  placeholder="e.g., Central London"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Radius (miles)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={formData.end_radius_miles}
                      onChange={(e) => setFormData({ ...formData, end_radius_miles: parseFloat(e.target.value) || 3 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Lat/Lng</Label>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formData.end_lat.toFixed(4)}, {formData.end_lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (£) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Distance (miles)</Label>
                <Input
                  type="text"
                  value={formData.distance_miles ? `${formData.distance_miles} mi` : 'Calculating...'}
                  disabled
                  className="bg-zinc-50"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="valid_return"
                checked={formData.valid_return}
                onCheckedChange={(checked) => setFormData({ ...formData, valid_return: checked })}
              />
              <Label htmlFor="valid_return" className="cursor-pointer">
                Valid for return journey (A↔B)
              </Label>
            </div>

            <div className="p-3 bg-blue-50 rounded-sm text-sm text-blue-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Drag markers on the map to adjust positions. Drag circle edges to change radius.
            </div>
          </div>

          {/* Map Panel */}
          <div className="col-span-2">
            <div
              ref={mapRef}
              className="w-full h-[500px] bg-zinc-100 rounded-sm"
              style={{ minHeight: '500px' }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0A0F1C]">
            {saving ? "Saving..." : (editingRoute ? "Update Route" : "Create Route")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModule;
