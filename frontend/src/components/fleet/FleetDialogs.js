import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { AlertTriangle, User } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import ImageUpload from "../ImageUpload";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Driver Dialog with Photo Upload
const DriverDialog = ({ open, onClose, driver, headers, onSuccess }) => {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", license_number: "", license_expiry: "", photo_url: "", notes: "", status: "active" });
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    if (driver) {
      setFormData({ ...driver });
      setPhotoPreview(driver.photo_url || null);
    } else {
      setFormData({ name: "", phone: "", email: "", license_number: "", license_expiry: "", photo_url: "", notes: "", status: "active" });
      setPhotoPreview(null);
    }
  }, [driver, open]);

  // Handle photo URL input
  const handlePhotoUrl = (url) => {
    setFormData({ ...formData, photo_url: url });
    setPhotoPreview(url);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) { toast.error("Name and phone required"); return; }
    setLoading(true);
    try {
      if (driver) await axios.put(`${API}/fleet/drivers/${driver.id}`, formData, { headers });
      else await axios.post(`${API}/fleet/drivers`, formData, { headers });
      toast.success(driver ? "Driver updated" : "Driver created");
      onClose(); onSuccess();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="driver-dialog">
        <DialogHeader><DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          {/* Driver Photo Section */}
          <ImageUpload
            value={formData.photo_url || ""}
            onChange={(url) => {
              setFormData({ ...formData, photo_url: url });
              setPhotoPreview(url);
            }}
            category="drivers"
            label="Driver Photo"
            placeholder="Upload driver photo"
            headers={headers}
          />
          
          <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} data-testid="driver-name-input" /></div>
          <div><Label>Phone *</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} data-testid="driver-phone-input" /></div>
          <div><Label>Email</Label><Input type="email" value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} data-testid="driver-email-input" /></div>
          <div><Label>License Number</Label><Input value={formData.license_number || ""} onChange={(e) => setFormData({...formData, license_number: e.target.value})} data-testid="driver-license-input" /></div>
          <div><Label>License Expiry</Label><Input type="date" value={formData.license_expiry || ""} onChange={(e) => setFormData({...formData, license_expiry: e.target.value})} data-testid="driver-expiry-input" /></div>
          <div><Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger data-testid="driver-status-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]" data-testid="save-driver-btn">{loading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Vehicle Dialog
const VehicleDialog = ({ open, onClose, vehicle, categories, headers, onSuccess }) => {
  const [formData, setFormData] = useState({ plate_number: "", make: "", model: "", year: "", color: "", category_id: "", passenger_capacity: 4, luggage_capacity: 2, notes: "", status: "active" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) setFormData({ ...vehicle, year: vehicle.year || "" });
    else setFormData({ plate_number: "", make: "", model: "", year: "", color: "", category_id: categories[0]?.id || "", passenger_capacity: 4, luggage_capacity: 2, notes: "", status: "active" });
  }, [vehicle, open, categories]);

  const handleSubmit = async () => {
    if (!formData.plate_number || !formData.category_id) { toast.error("Plate and category required"); return; }
    setLoading(true);
    try {
      const data = { ...formData, year: formData.year ? parseInt(formData.year) : null };
      if (vehicle) await axios.put(`${API}/fleet/vehicles/${vehicle.id}`, data, { headers });
      else await axios.post(`${API}/fleet/vehicles`, data, { headers });
      toast.success(vehicle ? "Vehicle updated" : "Vehicle created");
      onClose(); onSuccess();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="vehicle-dialog">
        <DialogHeader><DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Plate Number *</Label><Input value={formData.plate_number} onChange={(e) => setFormData({...formData, plate_number: e.target.value})} data-testid="vehicle-plate-input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Make</Label><Input value={formData.make || ""} onChange={(e) => setFormData({...formData, make: e.target.value})} placeholder="Toyota" /></div>
            <div><Label>Model</Label><Input value={formData.model || ""} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="Camry" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Year</Label><Input type="number" value={formData.year || ""} onChange={(e) => setFormData({...formData, year: e.target.value})} /></div>
            <div><Label>Color</Label><Input value={formData.color || ""} onChange={(e) => setFormData({...formData, color: e.target.value})} /></div>
          </div>
          <div><Label>Category *</Label>
            <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
              <SelectTrigger data-testid="vehicle-category-select"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Passengers</Label><Input type="number" min="1" value={formData.passenger_capacity} onChange={(e) => setFormData({...formData, passenger_capacity: parseInt(e.target.value) || 1})} /></div>
            <div><Label>Luggage</Label><Input type="number" min="0" value={formData.luggage_capacity} onChange={(e) => setFormData({...formData, luggage_capacity: parseInt(e.target.value) || 0})} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger data-testid="vehicle-status-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]" data-testid="save-vehicle-btn">{loading ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Assign Driver Dialog
const AssignDriverDialog = ({ open, onClose, job, drivers, vehicles, headers, onSuccess }) => {
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) { setDriverId(job.assigned_driver_id || ""); setVehicleId(job.assigned_vehicle_id || ""); }
  }, [job, open]);

  if (!job) return null;

  const handleAssign = async () => {
    if (!driverId) { toast.error("Select a driver"); return; }
    if (!vehicleId) { toast.error("Select a vehicle"); return; }
    setLoading(true);
    try {
      await axios.put(`${API}/fleet/jobs/${job.id}/assign-driver`, { driver_id: driverId, vehicle_id: vehicleId }, { headers });
      toast.success("Driver and vehicle assigned!");
      onClose(); onSuccess();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to assign"); }
    finally { setLoading(false); }
  };

  const hasDrivers = drivers.filter(d => d.status === "active").length > 0;
  const hasVehicles = vehicles.filter(v => v.status === "active").length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="assign-driver-dialog">
        <DialogHeader><DialogTitle>Assign Driver & Vehicle</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-zinc-50 rounded text-sm">
            <div className="font-mono text-xs mb-1">{job.booking_ref}</div>
            <div><strong>Route:</strong> {job.pickup_location} → {job.dropoff_location}</div>
            <div><strong>Date:</strong> {job.pickup_date} at {job.pickup_time}</div>
            <div><strong>Payout:</strong> £{job.price?.toFixed(2)}</div>
          </div>
          
          {!hasDrivers || !hasVehicles ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-amber-700 font-medium">Setup Required</p>
              {!hasDrivers && <p className="text-sm text-amber-600">Add drivers in &quot;My Drivers&quot; tab</p>}
              {!hasVehicles && <p className="text-sm text-amber-600">Add vehicles in &quot;My Vehicles&quot; tab</p>}
            </div>
          ) : (
            <>
              <div><Label>Driver *</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger data-testid="assign-driver-select"><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.phone})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger data-testid="assign-vehicle-select"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.filter(v => v.status === "active").map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading || !hasDrivers || !hasVehicles || !driverId || !vehicleId} className="bg-[#0A0F1C]" data-testid="assign-btn">
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DriverDialog, VehicleDialog, AssignDriverDialog };
