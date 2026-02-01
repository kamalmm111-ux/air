import { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, DollarSign, Users, Car, Download, Eye, Edit, Plus, Search, Filter,
  Clock, CheckCircle, Building2, Truck, FileText, MapPin, Send, X, Minus,
  Plane, User, Phone, Mail, Hash, AlertTriangle, TrendingUp, UserCheck, LogIn, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import PricingModule from "../components/PricingModule";
import PlacesAutocomplete from "../components/PlacesAutocomplete";
import CMSManager from "../components/CMSManager";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Job status configuration
const JOB_STATUSES = {
  new: { label: "New", color: "bg-blue-100 text-blue-800" },
  unassigned: { label: "Unassigned", color: "bg-yellow-100 text-yellow-800" },
  assigned: { label: "Assigned", color: "bg-purple-100 text-purple-800" },
  accepted: { label: "Accepted", color: "bg-indigo-100 text-indigo-800" },
  en_route: { label: "En Route", color: "bg-cyan-100 text-cyan-800" },
  arrived: { label: "Arrived", color: "bg-teal-100 text-teal-800" },
  in_progress: { label: "In Progress", color: "bg-orange-100 text-orange-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
  no_show: { label: "No Show", color: "bg-red-100 text-red-800" },
  driver_no_show: { label: "Driver No Show", color: "bg-red-100 text-red-800" },
  customer_no_show: { label: "Customer No Show", color: "bg-red-100 text-red-800" },
  on_hold: { label: "On Hold", color: "bg-zinc-100 text-zinc-800" },
  rescheduled: { label: "Rescheduled", color: "bg-amber-100 text-amber-800" },
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" }
};

const AdminDashboard = () => {
  const { activeTab } = useOutletContext();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [fixedRoutes, setFixedRoutes] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [fleetFilter, setFleetFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  
  // Dialogs
  const [newJobDialogOpen, setNewJobDialogOpen] = useState(false);
  const [editJobDialogOpen, setEditJobDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [fleetDialogOpen, setFleetDialogOpen] = useState(false);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingFleet, setEditingFleet] = useState(null);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, bookingsRes, vehiclesRes, pricingRes, routesRes, fleetsRes, driversRes, allVehiclesRes, invoicesRes, customersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
        axios.get(`${API}/vehicles`),
        axios.get(`${API}/pricing`),
        axios.get(`${API}/fixed-routes`),
        axios.get(`${API}/fleets`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/drivers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/vehicles`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/invoices`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/customers`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setVehicles(vehiclesRes.data);
      setPricingRules(pricingRes.data);
      setFixedRoutes(routesRes.data);
      setFleets(fleetsRes.data);
      setDrivers(driversRes.data);
      setAllVehicles(allVehiclesRes.data);
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fleet Impersonation Handler
  const impersonateFleet = async (fleet) => {
    try {
      setImpersonating(true);
      const response = await axios.post(
        `${API}/admin/fleets/${fleet.id}/impersonate`,
        {},
        { headers }
      );
      
      // Store impersonation data in sessionStorage
      sessionStorage.setItem("impersonation_token", response.data.access_token);
      sessionStorage.setItem("impersonation_fleet", JSON.stringify(response.data.fleet));
      sessionStorage.setItem("impersonation_id", response.data.impersonation_id);
      sessionStorage.setItem("admin_token", token); // Store original admin token for returning
      
      toast.success(`Accessing ${fleet.name} dashboard...`);
      
      // Redirect to fleet dashboard with impersonation
      window.location.href = `/fleet/dashboard?impersonate=true`;
    } catch (error) {
      console.error("Impersonation error:", error);
      toast.error("Failed to access fleet dashboard");
    } finally {
      setImpersonating(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = JOB_STATUSES[status] || { label: status, color: "bg-zinc-100 text-zinc-800" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      b.booking_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.dropoff_location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateFrom = !dateFrom || b.pickup_date >= dateFrom;
    const matchesDateTo = !dateTo || b.pickup_date <= dateTo;
    const matchesFleet = fleetFilter === "all" || b.assigned_fleet_id === fleetFilter;
    const matchesDriver = driverFilter === "all" || b.assigned_driver_id === driverFilter;
    return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo && matchesFleet && matchesDriver;
  });

  // Quick filters
  const today = new Date().toISOString().split('T')[0];
  const getTodayBookings = () => bookings.filter(b => b.pickup_date === today);
  const getUnassignedBookings = () => bookings.filter(b => b.status === "unassigned" || b.status === "new");
  const getNoShowBookings = () => bookings.filter(b => ["no_show", "driver_no_show", "customer_no_show"].includes(b.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  // ==================== RENDER FUNCTIONS ====================

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Jobs" value={stats?.total_bookings || 0} icon={Calendar} color="bg-blue-500" />
        <StatCard title="Today" value={stats?.today_bookings || 0} icon={Clock} color="bg-cyan-500" />
        <StatCard title="Unassigned" value={stats?.unassigned_bookings || 0} icon={AlertTriangle} color="bg-yellow-500" />
        <StatCard title="Revenue" value={`£${(stats?.total_revenue || 0).toFixed(0)}`} icon={DollarSign} color="bg-green-500" />
        <StatCard title="Profit" value={`£${(stats?.total_profit || 0).toFixed(0)}`} icon={TrendingUp} color="bg-[#D4AF37]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Jobs</CardTitle>
            <Button size="sm" onClick={() => setNewJobDialogOpen(true)} className="bg-[#0A0F1C]">
              <Plus className="w-4 h-4 mr-1" /> New Job
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 5).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">{booking.booking_ref}</TableCell>
                    <TableCell>{booking.customer_name}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="font-medium">£{(booking.customer_price || booking.price || 0).toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-green-600">£{(booking.profit || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-sm">
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Fleets</span>
              <span className="font-bold">{stats?.active_fleets || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-sm">
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Drivers</span>
              <span className="font-bold">{stats?.total_drivers || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-sm">
              <span className="flex items-center gap-2"><Truck className="w-4 h-4" /> Vehicles</span>
              <span className="font-bold">{stats?.total_vehicles || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      {/* Quick Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
          All Jobs ({bookings.length})
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setDateFrom(today); setDateTo(today); setStatusFilter("all"); }}>
          Today ({getTodayBookings().length})
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatusFilter("unassigned")} className="text-yellow-700">
          Unassigned ({getUnassignedBookings().length})
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatusFilter("no_show")} className="text-red-700">
          No-Shows ({getNoShowBookings().length})
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatusFilter("cancelled")} className="text-red-700">
          Cancelled ({bookings.filter(b => b.status === "cancelled").length})
        </Button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs text-zinc-500">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Ref, name, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-[140px]">
          <Label className="text-xs text-zinc-500">Date From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-[140px]">
          <Label className="text-xs text-zinc-500">Date To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="w-[160px]">
          <Label className="text-xs text-zinc-500">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(JOB_STATUSES).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[160px]">
          <Label className="text-xs text-zinc-500">Fleet</Label>
          <Select value={fleetFilter} onValueChange={setFleetFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fleets</SelectItem>
              {fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => { setSearchTerm(""); setDateFrom(""); setDateTo(""); setStatusFilter("all"); setFleetFilter("all"); setDriverFilter("all"); }} variant="ghost" size="sm">
          Clear
        </Button>
        <Button onClick={() => setNewJobDialogOpen(true)} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-1" /> New Job
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Ref</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Dropoff</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-zinc-50">
                  <TableCell className="font-mono text-xs">{booking.booking_ref}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">{booking.pickup_date}</div>
                    <div className="text-xs text-zinc-500">{booking.pickup_time}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{booking.customer_name}</div>
                    <div className="text-xs text-zinc-500">{booking.customer_phone}</div>
                  </TableCell>
                  <TableCell className="max-w-[120px]">
                    <div className="truncate text-sm" title={booking.pickup_location}>{booking.pickup_location}</div>
                  </TableCell>
                  <TableCell className="max-w-[120px]">
                    <div className="truncate text-sm" title={booking.dropoff_location}>{booking.dropoff_location}</div>
                  </TableCell>
                  <TableCell className="text-sm">{booking.vehicle_name || booking.vehicle_category_id}</TableCell>
                  <TableCell>
                    {booking.assigned_driver_name || booking.assigned_fleet_name ? (
                      <div className="text-sm">
                        {booking.assigned_driver_name && <div className="font-medium">{booking.assigned_driver_name}</div>}
                        {booking.assigned_fleet_name && <div className="text-xs text-zinc-500">{booking.assigned_fleet_name}</div>}
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="text-right font-medium">£{(booking.customer_price || booking.price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-zinc-600">£{(booking.driver_price || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">£{(booking.profit || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setEditJobDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setAssignDialogOpen(true); }}>
                        <Send className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-zinc-500">No bookings found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderFleets = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fleet Management</h2>
        <Button onClick={() => { setEditingFleet(null); setFleetDialogOpen(true); }} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" /> Add Fleet
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleets.map((fleet) => (
                <TableRow key={fleet.id}>
                  <TableCell>
                    <div className="font-medium">{fleet.name}</div>
                    <div className="text-xs text-zinc-500">{fleet.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{fleet.contact_person}</div>
                    <div className="text-xs text-zinc-500">{fleet.phone}</div>
                  </TableCell>
                  <TableCell>{fleet.city}</TableCell>
                  <TableCell>
                    {fleet.commission_type === "percentage" ? `${fleet.commission_value}%` : `£${fleet.commission_value}`}
                  </TableCell>
                  <TableCell className="capitalize">{fleet.payment_terms}</TableCell>
                  <TableCell>
                    <Badge className={fleet.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {fleet.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingFleet(fleet); setFleetDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fleets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-zinc-500">No fleets added yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderDrivers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Driver Management</h2>
        <Button onClick={() => { setEditingDriver(null); setDriverDialogOpen(true); }} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" /> Add Driver
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fleet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => {
                const fleet = fleets.find(f => f.id === driver.fleet_id);
                return (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      <div>{driver.phone}</div>
                      <div className="text-xs text-zinc-500">{driver.email}</div>
                    </TableCell>
                    <TableCell>{driver.license_number || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{driver.driver_type}</Badge>
                    </TableCell>
                    <TableCell>{fleet ? fleet.name : <span className="text-zinc-400">Internal</span>}</TableCell>
                    <TableCell>
                      <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingDriver(driver); setDriverDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-zinc-500">No drivers added yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderVehicles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Vehicle Management</h2>
        <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Name/Model</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Fleet</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVehicles.map((vehicle) => {
                const fleet = fleets.find(f => f.id === vehicle.fleet_id);
                const driver = drivers.find(d => d.id === vehicle.driver_id);
                const category = vehicles.find(v => v.id === vehicle.category_id);
                return (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-medium">{vehicle.plate_number}</TableCell>
                    <TableCell>
                      <div>{vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`}</div>
                      {vehicle.color && <div className="text-xs text-zinc-500">{vehicle.color} {vehicle.year}</div>}
                    </TableCell>
                    <TableCell>{category?.name || vehicle.category_id}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Users className="w-3 h-3" /> {vehicle.passenger_capacity}
                      </span>
                    </TableCell>
                    <TableCell>{fleet ? fleet.name : <span className="text-zinc-400">-</span>}</TableCell>
                    <TableCell>{driver ? driver.name : <span className="text-zinc-400">-</span>}</TableCell>
                    <TableCell>
                      <Badge className={vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {allVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">No vehicles added yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderInvoices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Invoice Management</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{invoice.invoice_type}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{invoice.entity_name}</div>
                    <div className="text-xs text-zinc-500">{invoice.entity_email}</div>
                  </TableCell>
                  <TableCell>{invoice.booking_ids?.length || 0}</TableCell>
                  <TableCell className="text-right">£{invoice.subtotal?.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {invoice.commission > 0 ? `-£${invoice.commission?.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold">£{invoice.total?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={
                      invoice.status === "paid" ? "bg-green-100 text-green-800" :
                      invoice.status === "issued" ? "bg-blue-100 text-blue-800" :
                      invoice.status === "overdue" ? "bg-red-100 text-red-800" :
                      "bg-zinc-100"
                    }>{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => window.open(`${API}/invoices/${invoice.id}/pdf`, '_blank')}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-zinc-500">No invoices generated yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderPricing = () => (
    <PricingModule token={token} />
  );

  const renderRoutes = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Fixed Route Pricing</h2>
      <div className="grid gap-4">
        {fixedRoutes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{route.name}</span>
                <Badge className={route.is_active ? "bg-green-100 text-green-800" : "bg-zinc-100"}>{route.is_active ? "Active" : "Inactive"}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div><span className="text-sm text-zinc-500">Pickup:</span> <span className="font-medium">{route.pickup_location}</span></div>
                <div><span className="text-sm text-zinc-500">Drop-off:</span> <span className="font-medium">{route.dropoff_location}</span></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(route.prices || {}).map(([vehicleId, price]) => {
                  const vehicle = vehicles.find(v => v.id === vehicleId);
                  return (
                    <Badge key={vehicleId} variant="outline">{vehicle?.name || vehicleId}: £{price}</Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderVehicleCategories = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Vehicle Categories</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="overflow-hidden">
            <div className="h-40 bg-zinc-100">
              <img src={vehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400"} alt={vehicle.name} className="w-full h-full object-cover" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">{vehicle.name}</h3>
                <Badge className={vehicle.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                  {vehicle.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500 mb-3">{vehicle.description}</p>
              <div className="flex items-center gap-4 text-sm text-zinc-600">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {vehicle.max_passengers}</span>
                <span className="flex items-center gap-1"><Car className="w-4 h-4" /> {vehicle.max_luggage} bags</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ==================== DIALOGS ====================

  const content = {
    dashboard: renderDashboard(),
    bookings: renderBookings(),
    fleets: renderFleets(),
    drivers: renderDrivers(),
    vehicles: renderVehicles(),
    pricing: renderPricing(),
    invoices: renderInvoices(),
    settings: <CMSManager token={token} />
  };

  return (
    <div className="p-8" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "dashboard" ? "Dashboard Overview" : activeTab === "vehicle-categories" ? "Vehicle Categories" : activeTab.replace("-", " ")}
        </h1>
      </div>
      {content[activeTab] || content.dashboard}

      {/* New Job Dialog */}
      <NewJobDialog 
        open={newJobDialogOpen} 
        onClose={() => setNewJobDialogOpen(false)} 
        vehicles={vehicles}
        fleets={fleets}
        drivers={drivers}
        customers={customers}
        headers={headers}
        onSuccess={fetchData}
      />

      {/* Edit Job Dialog */}
      <EditJobDialog
        open={editJobDialogOpen}
        onClose={() => { setEditJobDialogOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        vehicles={vehicles}
        fleets={fleets}
        drivers={drivers}
        headers={headers}
        onSuccess={fetchData}
      />

      {/* Assign Dialog */}
      <AssignDialog
        open={assignDialogOpen}
        onClose={() => { setAssignDialogOpen(false); setSelectedBooking(null); }}
        booking={selectedBooking}
        fleets={fleets}
        drivers={drivers}
        allVehicles={allVehicles}
        headers={headers}
        onSuccess={fetchData}
      />

      {/* Fleet Dialog */}
      <FleetDialog
        open={fleetDialogOpen}
        onClose={() => { setFleetDialogOpen(false); setEditingFleet(null); }}
        fleet={editingFleet}
        headers={headers}
        onSuccess={fetchData}
      />

      {/* Driver Dialog */}
      <DriverDialog
        open={driverDialogOpen}
        onClose={() => { setDriverDialogOpen(false); setEditingDriver(null); }}
        driver={editingDriver}
        fleets={fleets}
        allVehicles={allVehicles}
        headers={headers}
        onSuccess={fetchData}
      />

      {/* Vehicle Dialog */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onClose={() => { setVehicleDialogOpen(false); setEditingVehicle(null); }}
        vehicle={editingVehicle}
        vehicles={vehicles}
        fleets={fleets}
        drivers={drivers}
        headers={headers}
        onSuccess={fetchData}
      />
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-[#0A0F1C] mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-sm flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// New Job Dialog Component
const NewJobDialog = ({ open, onClose, vehicles, fleets, drivers, customers, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_reference: "",
    pickup_date: "",
    pickup_time: "",
    pickup_location: "",
    pickup_postcode: "",
    pickup_lat: null,
    pickup_lng: null,
    dropoff_location: "",
    dropoff_postcode: "",
    dropoff_lat: null,
    dropoff_lng: null,
    vehicle_category_id: "",
    passengers: 1,
    small_bags: 0,
    large_bags: 0,
    flight_number: "",
    meet_greet: false,
    customer_price: 0,
    driver_price: 0,
    extras: [],
    pickup_notes: "",
    dropoff_notes: "",
    admin_notes: "",
    assigned_fleet_id: "",
    assigned_driver_id: ""
  });
  const [loading, setLoading] = useState(false);

  const profit = (formData.customer_price || 0) - (formData.driver_price || 0) + 
    formData.extras.reduce((sum, e) => sum + (e.price || 0) - (e.affects_driver_cost ? (e.price || 0) : 0), 0);

  const addExtra = () => {
    setFormData({ ...formData, extras: [...formData.extras, { name: "", price: 0, notes: "", affects_driver_cost: false }] });
  };

  const removeExtra = (index) => {
    setFormData({ ...formData, extras: formData.extras.filter((_, i) => i !== index) });
  };

  const updateExtra = (index, field, value) => {
    const newExtras = [...formData.extras];
    newExtras[index][field] = value;
    setFormData({ ...formData, extras: newExtras });
  };

  const handleSubmit = async () => {
    if (!formData.customer_name || !formData.pickup_location || !formData.dropoff_location || !formData.pickup_date || !formData.vehicle_category_id) {
      toast.error("Please fill in required fields");
      return;
    }
    setLoading(true);
    try {
      // Convert "none" values to null/empty for API
      const submitData = {
        ...formData,
        assigned_fleet_id: formData.assigned_fleet_id === "none" ? null : formData.assigned_fleet_id || null,
        assigned_driver_id: formData.assigned_driver_id === "none" ? null : formData.assigned_driver_id || null
      };
      await axios.post(`${API}/admin/bookings/manual`, submitData, { headers });
      toast.success("Job created successfully!");
      onClose();
      onSuccess();
      setFormData({
        customer_name: "", customer_email: "", customer_phone: "", customer_reference: "",
        pickup_date: "", pickup_time: "", pickup_location: "", pickup_postcode: "",
        pickup_lat: null, pickup_lng: null,
        dropoff_location: "", dropoff_postcode: "", dropoff_lat: null, dropoff_lng: null,
        vehicle_category_id: "", passengers: 1,
        small_bags: 0, large_bags: 0, flight_number: "", meet_greet: false,
        customer_price: 0, driver_price: 0, extras: [], pickup_notes: "", dropoff_notes: "",
        admin_notes: "", assigned_fleet_id: "", assigned_driver_id: ""
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Create New Job</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Customer Details</h3>
            <div className="space-y-3">
              <div>
                <Label>Customer Name *</Label>
                <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} placeholder="John Smith" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} placeholder="+44..." />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.customer_email} onChange={(e) => setFormData({...formData, customer_email: e.target.value})} />
                </div>
              </div>
              <div>
                <Label>Customer Reference</Label>
                <Input value={formData.customer_reference} onChange={(e) => setFormData({...formData, customer_reference: e.target.value})} placeholder="PO Number, etc." />
              </div>
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Trip Details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={formData.pickup_date} onChange={(e) => setFormData({...formData, pickup_date: e.target.value})} />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={formData.pickup_time} onChange={(e) => setFormData({...formData, pickup_time: e.target.value})} />
                </div>
              </div>
              <div>
                <Label>Flight Number</Label>
                <Input value={formData.flight_number} onChange={(e) => setFormData({...formData, flight_number: e.target.value})} placeholder="BA123" />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="col-span-2 space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Locations</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pickup Address *</Label>
                <PlacesAutocomplete
                  value={formData.pickup_location}
                  onChange={(value) => setFormData({...formData, pickup_location: value})}
                  onPlaceSelect={(place) => setFormData({
                    ...formData, 
                    pickup_location: place.address,
                    pickup_lat: place.lat,
                    pickup_lng: place.lng
                  })}
                  placeholder="Search for pickup location..."
                  data-testid="new-job-pickup-input"
                />
                <Input value={formData.pickup_postcode} onChange={(e) => setFormData({...formData, pickup_postcode: e.target.value})} placeholder="Postcode" className="w-32" />
              </div>
              <div className="space-y-2">
                <Label>Drop-off Address *</Label>
                <PlacesAutocomplete
                  value={formData.dropoff_location}
                  onChange={(value) => setFormData({...formData, dropoff_location: value})}
                  onPlaceSelect={(place) => setFormData({
                    ...formData, 
                    dropoff_location: place.address,
                    dropoff_lat: place.lat,
                    dropoff_lng: place.lng
                  })}
                  placeholder="Search for drop-off location..."
                  data-testid="new-job-dropoff-input"
                />
                <Input value={formData.dropoff_postcode} onChange={(e) => setFormData({...formData, dropoff_postcode: e.target.value})} placeholder="Postcode" className="w-32" />
              </div>
            </div>
          </div>

          {/* Vehicle & Passengers */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Car className="w-4 h-4" /> Vehicle & Passengers</h3>
            <div className="space-y-3">
              <div>
                <Label>Vehicle Class *</Label>
                <Select value={formData.vehicle_category_id} onValueChange={(v) => setFormData({...formData, vehicle_category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Passengers</Label>
                <Input type="number" min="1" value={formData.passengers} onChange={(e) => setFormData({...formData, passengers: parseInt(e.target.value) || 1})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Small Bags</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, small_bags: Math.max(0, formData.small_bags - 1)})}><Minus className="w-3 h-3" /></Button>
                    <span className="w-8 text-center">{formData.small_bags}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, small_bags: formData.small_bags + 1})}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div>
                  <Label>Large Bags</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, large_bags: Math.max(0, formData.large_bags - 1)})}><Minus className="w-3 h-3" /></Button>
                    <span className="w-8 text-center">{formData.large_bags}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData({...formData, large_bags: formData.large_bags + 1})}><Plus className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
              <div className="text-sm text-zinc-500">Total: {formData.small_bags + formData.large_bags} bags</div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4" /> Pricing</h3>
            <div className="space-y-3">
              <div>
                <Label>Customer Price (£) *</Label>
                <Input type="number" step="0.01" value={formData.customer_price} onChange={(e) => setFormData({...formData, customer_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>Driver Price (£)</Label>
                <Input type="number" step="0.01" value={formData.driver_price} onChange={(e) => setFormData({...formData, driver_price: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="p-3 bg-green-50 rounded-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Profit</span>
                  <span className="text-xl font-bold text-green-600">£{profit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Extras */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Extras</h3>
              <Button type="button" variant="outline" size="sm" onClick={addExtra}><Plus className="w-3 h-3 mr-1" /> Add Extra</Button>
            </div>
            {formData.extras.map((extra, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-sm">
                <Input placeholder="Name" value={extra.name} onChange={(e) => updateExtra(i, 'name', e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Price" value={extra.price} onChange={(e) => updateExtra(i, 'price', parseFloat(e.target.value) || 0)} className="w-24" />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input type="checkbox" checked={extra.affects_driver_cost} onChange={(e) => updateExtra(i, 'affects_driver_cost', e.target.checked)} />
                  Driver cost
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeExtra(i)}><X className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          {/* Assignment */}
          <div className="col-span-2 space-y-4">
            <h3 className="font-semibold">Assignment (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign to Fleet</Label>
                <Select value={formData.assigned_fleet_id} onValueChange={(v) => setFormData({...formData, assigned_fleet_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select fleet" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {fleets.filter(f => f.status === "active").map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to Driver</Label>
                <Select value={formData.assigned_driver_id} onValueChange={(v) => setFormData({...formData, assigned_driver_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="col-span-2 space-y-3">
            <h3 className="font-semibold">Notes</h3>
            <Textarea placeholder="Admin notes (internal)" value={formData.admin_notes} onChange={(e) => setFormData({...formData, admin_notes: e.target.value})} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Creating..." : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit Job Dialog
const EditJobDialog = ({ open, onClose, booking, vehicles, fleets, drivers, headers, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setFormData({ ...booking });
    }
  }, [booking]);

  if (!booking) return null;

  const profit = (formData.customer_price || 0) - (formData.driver_price || 0);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/admin/bookings/${booking.id}`, formData, { headers });
      toast.success("Job updated successfully!");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job - {booking.booking_ref}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(JOB_STATUSES).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Payment Status</Label>
            <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer Name</Label>
            <Input value={formData.customer_name || ""} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} />
          </div>
          <div>
            <Label>Customer Phone</Label>
            <Input value={formData.customer_phone || ""} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} />
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={formData.pickup_date || ""} onChange={(e) => setFormData({...formData, pickup_date: e.target.value})} />
          </div>
          <div>
            <Label>Time</Label>
            <Input type="time" value={formData.pickup_time || ""} onChange={(e) => setFormData({...formData, pickup_time: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Pickup Location</Label>
            <PlacesAutocomplete
              value={formData.pickup_location || ""}
              onChange={(value) => setFormData({...formData, pickup_location: value})}
              onPlaceSelect={(place) => setFormData({
                ...formData, 
                pickup_location: place.address,
                pickup_lat: place.lat,
                pickup_lng: place.lng
              })}
              placeholder="Search for pickup location..."
              data-testid="edit-job-pickup-input"
            />
          </div>
          <div className="col-span-2">
            <Label>Drop-off Location</Label>
            <PlacesAutocomplete
              value={formData.dropoff_location || ""}
              onChange={(value) => setFormData({...formData, dropoff_location: value})}
              onPlaceSelect={(place) => setFormData({
                ...formData, 
                dropoff_location: place.address,
                dropoff_lat: place.lat,
                dropoff_lng: place.lng
              })}
              placeholder="Search for drop-off location..."
              data-testid="edit-job-dropoff-input"
            />
          </div>
          <div>
            <Label>Vehicle Class</Label>
            <Select value={formData.vehicle_category_id || ""} onValueChange={(v) => setFormData({...formData, vehicle_category_id: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Passengers</Label>
            <Input type="number" min="1" value={formData.passengers || 1} onChange={(e) => setFormData({...formData, passengers: parseInt(e.target.value) || 1})} />
          </div>
          <div>
            <Label>Customer Price (£)</Label>
            <Input type="number" step="0.01" value={formData.customer_price || 0} onChange={(e) => setFormData({...formData, customer_price: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <Label>Driver Price (£)</Label>
            <Input type="number" step="0.01" value={formData.driver_price || 0} onChange={(e) => setFormData({...formData, driver_price: parseFloat(e.target.value) || 0})} />
          </div>
          <div className="col-span-2 p-3 bg-green-50 rounded-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium">Calculated Profit</span>
              <span className="text-xl font-bold text-green-600">£{profit.toFixed(2)}</span>
            </div>
          </div>
          <div className="col-span-2">
            <Label>Admin Notes</Label>
            <Textarea value={formData.admin_notes || ""} onChange={(e) => setFormData({...formData, admin_notes: e.target.value})} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Assign Dialog
const AssignDialog = ({ open, onClose, booking, fleets, drivers, allVehicles, headers, onSuccess }) => {
  const [fleetId, setFleetId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking) {
      setFleetId(booking.assigned_fleet_id || "");
      setDriverId(booking.assigned_driver_id || "");
      setVehicleId(booking.assigned_vehicle_id || "");
    }
  }, [booking]);

  if (!booking) return null;

  const handleAssign = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/bookings/${booking.id}/assign`, {
        fleet_id: fleetId && fleetId !== "none" ? fleetId : null,
        driver_id: driverId && driverId !== "none" ? driverId : null,
        vehicle_id: vehicleId && vehicleId !== "none" ? vehicleId : null
      }, { headers });
      toast.success("Job assigned successfully!");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign job");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/bookings/${booking.id}/unassign`, {}, { headers });
      toast.success("Job unassigned");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to unassign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Job - {booking.booking_ref}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-zinc-50 rounded-sm text-sm">
            <div><strong>Route:</strong> {booking.pickup_location} → {booking.dropoff_location}</div>
            <div><strong>Date:</strong> {booking.pickup_date} {booking.pickup_time}</div>
          </div>
          <div>
            <Label>Assign to Fleet</Label>
            <Select value={fleetId} onValueChange={setFleetId}>
              <SelectTrigger><SelectValue placeholder="Select fleet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {fleets.filter(f => f.status === "active").map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assign to Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.driver_type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assign Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allVehicles.filter(v => v.status === "active").map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.name || v.make}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          {(booking.assigned_fleet_id || booking.assigned_driver_id) && (
            <Button variant="destructive" onClick={handleUnassign} disabled={loading}>Unassign</Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Fleet Dialog
const FleetDialog = ({ open, onClose, fleet, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "", contact_person: "", email: "", phone: "", whatsapp: "",
    city: "", operating_area: "", commission_type: "percentage",
    commission_value: 15, payment_terms: "weekly", notes: "", status: "active", password: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fleet) {
      setFormData({ ...fleet, password: "" });
    } else {
      setFormData({
        name: "", contact_person: "", email: "", phone: "", whatsapp: "",
        city: "", operating_area: "", commission_type: "percentage",
        commission_value: 15, payment_terms: "weekly", notes: "", status: "active", password: ""
      });
    }
  }, [fleet]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Name and email are required");
      return;
    }
    setLoading(true);
    try {
      if (fleet) {
        await axios.put(`${API}/fleets/${fleet.id}`, formData, { headers });
        toast.success("Fleet updated!");
      } else {
        const res = await axios.post(`${API}/fleets`, formData, { headers });
        if (res.data.temporary_password) {
          toast.success(`Fleet created! Password: ${res.data.temporary_password}`);
        } else {
          toast.success("Fleet created!");
        }
      }
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save fleet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fleet ? "Edit Fleet" : "Add New Fleet"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Fleet Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <Label>Contact Person</Label>
            <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
          </div>
          <div>
            <Label>Operating Area</Label>
            <Input value={formData.operating_area} onChange={(e) => setFormData({...formData, operating_area: e.target.value})} />
          </div>
          <div>
            <Label>Commission Type</Label>
            <Select value={formData.commission_type} onValueChange={(v) => setFormData({...formData, commission_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Commission Value</Label>
            <Input type="number" value={formData.commission_value} onChange={(e) => setFormData({...formData, commission_value: parseFloat(e.target.value) || 0})} />
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Select value={formData.payment_terms} onValueChange={(v) => setFormData({...formData, payment_terms: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!fleet && (
            <div className="col-span-2">
              <Label>Password (leave blank for auto-generated)</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Auto-generated if empty" />
            </div>
          )}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : (fleet ? "Update Fleet" : "Create Fleet")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Driver Dialog
const DriverDialog = ({ open, onClose, driver, fleets, allVehicles, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", license_number: "", license_expiry: "",
    driver_type: "internal", fleet_id: "", vehicle_id: "", notes: "", status: "active"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driver) {
      setFormData({ ...driver });
    } else {
      setFormData({
        name: "", email: "", phone: "", license_number: "", license_expiry: "",
        driver_type: "internal", fleet_id: "", vehicle_id: "", notes: "", status: "active"
      });
    }
  }, [driver]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        fleet_id: formData.fleet_id && formData.fleet_id !== "none" ? formData.fleet_id : null,
        vehicle_id: formData.vehicle_id && formData.vehicle_id !== "none" ? formData.vehicle_id : null
      };
      if (driver) {
        await axios.put(`${API}/drivers/${driver.id}`, submitData, { headers });
        toast.success("Driver updated!");
      } else {
        await axios.post(`${API}/drivers`, submitData, { headers });
        toast.success("Driver created!");
      }
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save driver");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{driver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="col-span-2">
            <Label>Full Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <Label>License Number</Label>
            <Input value={formData.license_number} onChange={(e) => setFormData({...formData, license_number: e.target.value})} />
          </div>
          <div>
            <Label>License Expiry</Label>
            <Input type="date" value={formData.license_expiry} onChange={(e) => setFormData({...formData, license_expiry: e.target.value})} />
          </div>
          <div>
            <Label>Driver Type</Label>
            <Select value={formData.driver_type} onValueChange={(v) => setFormData({...formData, driver_type: v, fleet_id: v === "internal" ? "" : formData.fleet_id})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal Driver</SelectItem>
                <SelectItem value="fleet">Fleet Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.driver_type === "fleet" && (
            <div>
              <Label>Fleet</Label>
              <Select value={formData.fleet_id} onValueChange={(v) => setFormData({...formData, fleet_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select fleet" /></SelectTrigger>
                <SelectContent>
                  {fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Default Vehicle</Label>
            <Select value={formData.vehicle_id} onValueChange={(v) => setFormData({...formData, vehicle_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allVehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : (driver ? "Update Driver" : "Create Driver")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Vehicle Dialog
const VehicleDialog = ({ open, onClose, vehicle, vehicles, fleets, drivers, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "", plate_number: "", category_id: "", make: "", model: "",
    year: null, color: "", passenger_capacity: 4, luggage_capacity: 2,
    fleet_id: "", driver_id: "", notes: "", status: "active"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({ ...vehicle });
    } else {
      setFormData({
        name: "", plate_number: "", category_id: "", make: "", model: "",
        year: null, color: "", passenger_capacity: 4, luggage_capacity: 2,
        fleet_id: "", driver_id: "", notes: "", status: "active"
      });
    }
  }, [vehicle]);

  const handleSubmit = async () => {
    if (!formData.plate_number || !formData.category_id) {
      toast.error("Plate number and category are required");
      return;
    }
    setLoading(true);
    try {
      const submitData = {
        ...formData,
        fleet_id: formData.fleet_id && formData.fleet_id !== "none" ? formData.fleet_id : null,
        driver_id: formData.driver_id && formData.driver_id !== "none" ? formData.driver_id : null
      };
      if (vehicle) {
        await axios.put(`${API}/admin/vehicles/${vehicle.id}`, submitData, { headers });
        toast.success("Vehicle updated!");
      } else {
        await axios.post(`${API}/admin/vehicles`, submitData, { headers });
        toast.success("Vehicle created!");
      }
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div>
            <Label>Plate Number *</Label>
            <Input value={formData.plate_number} onChange={(e) => setFormData({...formData, plate_number: e.target.value})} placeholder="AB12 CDE" />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="E.g. Mercedes E-Class" />
          </div>
          <div>
            <Label>Make</Label>
            <Input value={formData.make} onChange={(e) => setFormData({...formData, make: e.target.value})} placeholder="Mercedes" />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="E-Class" />
          </div>
          <div>
            <Label>Year</Label>
            <Input type="number" value={formData.year || ""} onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || null})} placeholder="2023" />
          </div>
          <div>
            <Label>Color</Label>
            <Input value={formData.color} onChange={(e) => setFormData({...formData, color: e.target.value})} placeholder="Black" />
          </div>
          <div>
            <Label>Passenger Capacity</Label>
            <Input type="number" value={formData.passenger_capacity} onChange={(e) => setFormData({...formData, passenger_capacity: parseInt(e.target.value) || 4})} />
          </div>
          <div>
            <Label>Luggage Capacity</Label>
            <Input type="number" value={formData.luggage_capacity} onChange={(e) => setFormData({...formData, luggage_capacity: parseInt(e.target.value) || 2})} />
          </div>
          <div>
            <Label>Fleet</Label>
            <Select value={formData.fleet_id || ""} onValueChange={(v) => setFormData({...formData, fleet_id: v})}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {fleets.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned Driver</Label>
            <Select value={formData.driver_id || ""} onValueChange={(v) => setFormData({...formData, driver_id: v})}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : (vehicle ? "Update Vehicle" : "Create Vehicle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDashboard;
