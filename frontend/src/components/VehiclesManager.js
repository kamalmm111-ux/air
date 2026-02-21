import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Truck, Edit, Plus, Search, Users, Car } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import ImageUpload from "./ImageUpload";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VehiclesManager = ({ token, fleets = [], drivers = [], categories = [] }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/vehicles`, { headers });
      setVehicles(response.data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = !searchTerm || 
      vehicle.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || vehicle.category_id === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleSaveVehicle = async () => {
    try {
      if (editingVehicle?.id) {
        await axios.put(`${API}/vehicles/${editingVehicle.id}`, editingVehicle, { headers });
        toast.success("Vehicle updated successfully");
      } else {
        await axios.post(`${API}/vehicles`, editingVehicle, { headers });
        toast.success("Vehicle created successfully");
      }
      setDialogOpen(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save vehicle");
    }
  };

  const getFleetName = (fleetId) => {
    const fleet = fleets.find(f => f.id === fleetId);
    return fleet?.name || "-";
  };

  const getDriverName = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || "-";
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId || "-";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vehicles-manager">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-xl font-bold">Vehicle Fleet</h2>
          <Badge variant="outline" className="ml-2">{vehicles.length} Total</Badge>
        </div>
        <Button
          onClick={() => {
            setEditingVehicle({ status: "active", passenger_capacity: 4, luggage_capacity: 2 });
            setDialogOpen(true);
          }}
          className="bg-[#0A0F1C]"
          data-testid="add-vehicle-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-zinc-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search by plate, make, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="vehicle-search-input"
                />
              </div>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs text-zinc-500">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs text-zinc-500">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setCategoryFilter("all"); }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Plate Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fleet</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-zinc-100 flex items-center justify-center">
                        <Car className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                        <div className="text-xs text-zinc-500">{vehicle.year} • {vehicle.color}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{vehicle.plate_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryName(vehicle.category_id)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" /> {vehicle.passenger_capacity}
                      <span className="text-zinc-400">|</span>
                      <span>🧳 {vehicle.luggage_capacity}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getFleetName(vehicle.fleet_id)}</TableCell>
                  <TableCell>{getDriverName(vehicle.driver_id)}</TableCell>
                  <TableCell>
                    <Badge className={
                      vehicle.status === "active" ? "bg-green-100 text-green-800" : 
                      vehicle.status === "maintenance" ? "bg-yellow-100 text-yellow-800" :
                      "bg-zinc-100 text-zinc-600"
                    }>
                      {vehicle.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingVehicle({ ...vehicle });
                        setDialogOpen(true);
                      }}
                      data-testid={`edit-vehicle-${vehicle.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                      ? "No vehicles match your search criteria"
                      : "No vehicles added yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vehicle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingVehicle?.id ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Make *</Label>
                <Input
                  value={editingVehicle?.make || ""}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, make: e.target.value })}
                  placeholder="Mercedes"
                />
              </div>
              <div className="space-y-2">
                <Label>Model *</Label>
                <Input
                  value={editingVehicle?.model || ""}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                  placeholder="E-Class"
                />
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={editingVehicle?.year || ""}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, year: parseInt(e.target.value) || null })}
                  placeholder="2024"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plate Number *</Label>
                <Input
                  value={editingVehicle?.plate_number || ""}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, plate_number: e.target.value.toUpperCase() })}
                  placeholder="AB12 CDE"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  value={editingVehicle?.color || ""}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, color: e.target.value })}
                  placeholder="Black"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={editingVehicle?.category_id || ""}
                  onValueChange={(value) => setEditingVehicle({ ...editingVehicle, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingVehicle?.status || "active"}
                  onValueChange={(value) => setEditingVehicle({ ...editingVehicle, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passenger Capacity</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={editingVehicle?.passenger_capacity || 4}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, passenger_capacity: parseInt(e.target.value) || 4 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Luggage Capacity</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={editingVehicle?.luggage_capacity || 2}
                  onChange={(e) => setEditingVehicle({ ...editingVehicle, luggage_capacity: parseInt(e.target.value) || 2 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Fleet</Label>
                <Select
                  value={editingVehicle?.fleet_id || "none"}
                  onValueChange={(value) => setEditingVehicle({ ...editingVehicle, fleet_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fleet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Internal)</SelectItem>
                    {fleets.map(fleet => (
                      <SelectItem key={fleet.id} value={fleet.id}>{fleet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Driver</Label>
                <Select
                  value={editingVehicle?.driver_id || "none"}
                  onValueChange={(value) => setEditingVehicle({ ...editingVehicle, driver_id: value === "none" ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {drivers.filter(d => d.status === "active").map(driver => (
                      <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingVehicle?.notes || ""}
                onChange={(e) => setEditingVehicle({ ...editingVehicle, notes: e.target.value })}
                placeholder="Additional notes about the vehicle..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingVehicle(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveVehicle} className="bg-[#0A0F1C]" data-testid="save-vehicle-btn">
              {editingVehicle?.id ? "Update Vehicle" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehiclesManager;
