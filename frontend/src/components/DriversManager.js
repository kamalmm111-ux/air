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
import { Users, Edit, Plus, Search, Phone, Mail, Star, Car, Image } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DriversManager = ({ token, fleets = [], vehicles = [] }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fleetFilter, setFleetFilter] = useState("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/drivers`, { headers });
      setDrivers(response.data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = !searchTerm || 
      driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || driver.status === statusFilter;
    const matchesFleet = fleetFilter === "all" || driver.fleet_id === fleetFilter;
    return matchesSearch && matchesStatus && matchesFleet;
  });

  const handleSaveDriver = async () => {
    try {
      if (editingDriver?.id) {
        await axios.put(`${API}/drivers/${editingDriver.id}`, editingDriver, { headers });
        toast.success("Driver updated successfully");
      } else {
        await axios.post(`${API}/drivers`, editingDriver, { headers });
        toast.success("Driver created successfully");
      }
      setDialogOpen(false);
      setEditingDriver(null);
      fetchDrivers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save driver");
    }
  };

  const getFleetName = (fleetId) => {
    const fleet = fleets.find(f => f.id === fleetId);
    return fleet?.name || "-";
  };

  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make || ""} ${vehicle.model || ""} (${vehicle.plate_number})` : "-";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="drivers-manager">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-xl font-bold">Driver Management</h2>
          <Badge variant="outline" className="ml-2">{drivers.length} Total</Badge>
        </div>
        <Button
          onClick={() => {
            setEditingDriver({ driver_type: "internal", status: "active" });
            setDialogOpen(true);
          }}
          className="bg-[#0A0F1C]"
          data-testid="add-driver-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Driver
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
                  placeholder="Search by name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="driver-search-input"
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
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Label className="text-xs text-zinc-500">Fleet</Label>
              <Select value={fleetFilter} onValueChange={setFleetFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fleets</SelectItem>
                  <SelectItem value="">Internal</SelectItem>
                  {fleets.map(fleet => (
                    <SelectItem key={fleet.id} value={fleet.id}>{fleet.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setFleetFilter("all"); }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fleet</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {driver.photo_url ? (
                        <img src={driver.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-zinc-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-xs text-zinc-500">{driver.license_number || "No license"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3" /> {driver.phone}
                    </div>
                    {driver.email && (
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Mail className="w-3 h-3" /> {driver.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{driver.driver_type}</Badge>
                  </TableCell>
                  <TableCell>{getFleetName(driver.fleet_id)}</TableCell>
                  <TableCell className="text-sm">{getVehicleInfo(driver.vehicle_id)}</TableCell>
                  <TableCell>
                    {driver.average_rating ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{driver.average_rating.toFixed(1)}</span>
                        <span className="text-xs text-zinc-500">({driver.total_ratings || 0})</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"}>
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingDriver({ ...driver });
                        setDialogOpen(true);
                      }}
                      data-testid={`edit-driver-${driver.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDrivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    {searchTerm || statusFilter !== "all" || fleetFilter !== "all"
                      ? "No drivers match your search criteria"
                      : "No drivers added yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Driver Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDriver?.id ? "Edit Driver" : "Add New Driver"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editingDriver?.name || ""}
                  onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                  placeholder="Driver full name"
                  data-testid="driver-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={editingDriver?.phone || ""}
                  onChange={(e) => setEditingDriver({ ...editingDriver, phone: e.target.value })}
                  placeholder="+44 7xxx xxx xxx"
                  data-testid="driver-phone-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingDriver?.email || ""}
                  onChange={(e) => setEditingDriver({ ...editingDriver, email: e.target.value })}
                  placeholder="driver@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Type</Label>
                <Select
                  value={editingDriver?.driver_type || "internal"}
                  onValueChange={(value) => setEditingDriver({ ...editingDriver, driver_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="fleet">Fleet</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number</Label>
                <Input
                  value={editingDriver?.license_number || ""}
                  onChange={(e) => setEditingDriver({ ...editingDriver, license_number: e.target.value })}
                  placeholder="License number"
                />
              </div>
              <div className="space-y-2">
                <Label>License Expiry</Label>
                <Input
                  type="date"
                  value={editingDriver?.license_expiry || ""}
                  onChange={(e) => setEditingDriver({ ...editingDriver, license_expiry: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned Fleet</Label>
                <Select
                  value={editingDriver?.fleet_id || ""}
                  onValueChange={(value) => setEditingDriver({ ...editingDriver, fleet_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fleet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Internal)</SelectItem>
                    {fleets.map(fleet => (
                      <SelectItem key={fleet.id} value={fleet.id}>{fleet.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigned Vehicle</Label>
                <Select
                  value={editingDriver?.vehicle_id || ""}
                  onValueChange={(value) => setEditingDriver({ ...editingDriver, vehicle_id: value || null })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {vehicles.filter(v => v.status === "active").map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.plate_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Photo URL
              </Label>
              <Input
                value={editingDriver?.photo_url || ""}
                onChange={(e) => setEditingDriver({ ...editingDriver, photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
              {editingDriver?.photo_url && (
                <div className="mt-2">
                  <img src={editingDriver.photo_url} alt="Preview" className="w-20 h-20 rounded-full object-cover border" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editingDriver?.status || "active"}
                  onValueChange={(value) => setEditingDriver({ ...editingDriver, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingDriver?.notes || ""}
                onChange={(e) => setEditingDriver({ ...editingDriver, notes: e.target.value })}
                placeholder="Additional notes about the driver..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingDriver(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveDriver} className="bg-[#0A0F1C]" data-testid="save-driver-btn">
              {editingDriver?.id ? "Update Driver" : "Add Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriversManager;
