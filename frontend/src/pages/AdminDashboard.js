import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, DollarSign, Users, Car, TrendingUp, Download, Eye, Edit, Plus, Search, Filter,
  Clock, CheckCircle, Briefcase, Building2, Truck, FileText, MapPin, Send, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { activeTab } = useOutletContext();
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [pricingRules, setPricingRules] = useState([]);
  const [fixedRoutes, setFixedRoutes] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [radiusZones, setRadiusZones] = useState([]);
  const [radiusRoutes, setRadiusRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedFleetId, setSelectedFleetId] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, vehiclesRes, pricingRes, routesRes, fleetsRes, driversRes, invoicesRes, zonesRes, radiusRoutesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
        axios.get(`${API}/vehicles`),
        axios.get(`${API}/pricing`),
        axios.get(`${API}/fixed-routes`),
        axios.get(`${API}/fleets`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/drivers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/invoices`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/radius-zones`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/radius-routes`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setVehicles(vehiclesRes.data);
      setPricingRules(pricingRes.data);
      setFixedRoutes(routesRes.data);
      setFleets(fleetsRes.data);
      setDrivers(driversRes.data);
      setInvoices(invoicesRes.data);
      setRadiusZones(zonesRes.data);
      setRadiusRoutes(radiusRoutesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/admin/bookings/${bookingId}`, { status }, { headers });
      setBookings(bookings.map(b => b.id === bookingId ? { ...b, status } : b));
      toast.success("Booking status updated");
    } catch (error) {
      toast.error("Failed to update booking");
    }
  };

  const assignBookingToFleet = async () => {
    if (!selectedBooking || !selectedFleetId) return;
    
    try {
      await axios.post(`${API}/bookings/${selectedBooking.id}/assign`, {
        fleet_id: selectedFleetId
      }, { headers });
      toast.success("Booking assigned to fleet!");
      setAssignDialogOpen(false);
      setSelectedBooking(null);
      setSelectedFleetId("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign booking");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      accepted: "bg-indigo-100 text-indigo-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{status?.replace("_", " ")}</Badge>;
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch = searchTerm === "" || 
      b.passenger_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.passenger_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.pickup_location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Bookings" value={stats?.total_bookings || 0} icon={Calendar} color="bg-blue-500" />
        <StatCard title="Pending" value={stats?.pending_bookings || 0} icon={Clock} color="bg-yellow-500" />
        <StatCard title="Active Fleets" value={stats?.active_fleets || 0} icon={Building2} color="bg-purple-500" />
        <StatCard title="Total Revenue" value={`£${stats?.total_revenue?.toFixed(2) || 0}`} icon={DollarSign} color="bg-[#D4AF37]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 5).map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">
                      {booking.booking_ref || booking.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>{booking.passenger_name}</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="font-bold">£{booking.price?.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Fleets Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Fleets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fleet Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleets.slice(0, 5).map((fleet) => (
                  <TableRow key={fleet.id}>
                    <TableCell className="font-medium">{fleet.name}</TableCell>
                    <TableCell>{fleet.city}</TableCell>
                    <TableCell>
                      <Badge className={fleet.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {fleet.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search by name, email, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="booking-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Fleet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} data-testid={`admin-booking-row-${booking.id}`}>
                  <TableCell className="font-mono text-sm">
                    {booking.booking_ref || booking.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.passenger_name}</p>
                      <p className="text-xs text-zinc-500">{booking.passenger_phone}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    <p className="truncate text-sm">{booking.pickup_location}</p>
                    <p className="truncate text-xs text-zinc-500">→ {booking.dropoff_location}</p>
                  </TableCell>
                  <TableCell>
                    <p>{booking.pickup_date}</p>
                    <p className="text-xs text-zinc-500">{booking.pickup_time}</p>
                  </TableCell>
                  <TableCell>{booking.vehicle_name}</TableCell>
                  <TableCell>
                    {booking.assigned_fleet_name ? (
                      <Badge variant="outline">{booking.assigned_fleet_name}</Badge>
                    ) : (
                      <span className="text-zinc-400 text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="font-bold">£{booking.price?.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!booking.assigned_fleet_id && booking.status === "confirmed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setAssignDialogOpen(true);
                          }}
                          title="Assign to Fleet"
                        >
                          <Send className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Fleet</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-zinc-600 mb-4">
              Assign booking <strong>{selectedBooking?.booking_ref || selectedBooking?.id?.slice(0, 8).toUpperCase()}</strong> to a fleet:
            </p>
            <Select value={selectedFleetId} onValueChange={setSelectedFleetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a fleet" />
              </SelectTrigger>
              <SelectContent>
                {fleets.filter(f => f.status === "active").map((fleet) => (
                  <SelectItem key={fleet.id} value={fleet.id}>
                    {fleet.name} ({fleet.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={assignBookingToFleet} disabled={!selectedFleetId}>
              <Send className="w-4 h-4 mr-2" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderFleets = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fleet Management</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Fleet
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleets.map((fleet) => (
                <TableRow key={fleet.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{fleet.name}</p>
                      <p className="text-xs text-zinc-500">{fleet.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>{fleet.contact_person}</p>
                    <p className="text-xs text-zinc-500">{fleet.phone}</p>
                  </TableCell>
                  <TableCell>{fleet.city}</TableCell>
                  <TableCell>
                    {fleet.commission_type === "percentage" 
                      ? `${fleet.commission_value}%` 
                      : `£${fleet.commission_value}`}
                  </TableCell>
                  <TableCell>
                    <Badge className={fleet.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {fleet.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" title="View Fleet Dashboard">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
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
                      <p>{driver.phone}</p>
                      <p className="text-xs text-zinc-500">{driver.email}</p>
                    </TableCell>
                    <TableCell>{driver.license_number}</TableCell>
                    <TableCell>
                      {fleet ? (
                        <Badge variant="outline">{fleet.name}</Badge>
                      ) : (
                        <span className="text-zinc-400">Internal</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                    No drivers added yet
                  </TableCell>
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
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Generate Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{invoice.invoice_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{invoice.entity_name}</p>
                    <p className="text-xs text-zinc-500">{invoice.entity_email}</p>
                  </TableCell>
                  <TableCell>£{invoice.subtotal?.toFixed(2)}</TableCell>
                  <TableCell className="text-red-600">
                    {invoice.commission > 0 ? `-£${invoice.commission?.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="font-bold">£{invoice.total?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={
                      invoice.status === "paid" ? "bg-green-100 text-green-800" :
                      invoice.status === "issued" ? "bg-blue-100 text-blue-800" :
                      invoice.status === "overdue" ? "bg-red-100 text-red-800" :
                      "bg-zinc-100"
                    }>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`${API}/invoices/${invoice.id}/pdf`, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                    No invoices generated yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRadiusZones = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Radius-Based Pricing Zones</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Zone
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Zones List */}
        <Card>
          <CardHeader>
            <CardTitle>Defined Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {radiusZones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between p-4 border rounded-sm">
                  <div>
                    <p className="font-medium">{zone.name}</p>
                    <p className="text-sm text-zinc-500">
                      {zone.radius_km} km radius • {zone.zone_type}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {zone.center_lat.toFixed(4)}, {zone.center_lng.toFixed(4)}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">{zone.zone_type}</Badge>
                </div>
              ))}
              {radiusZones.length === 0 && (
                <p className="text-center py-4 text-zinc-500">No zones defined yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Radius Routes */}
        <Card>
          <CardHeader>
            <CardTitle>Radius Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {radiusRoutes.map((route) => (
                <div key={route.id} className="p-4 border rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{route.name}</p>
                    <Badge className={route.is_active ? "bg-green-100 text-green-800" : "bg-zinc-100"}>
                      {route.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-500 mb-2">
                    {route.pickup_zone_name} → {route.dropoff_zone_name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(route.prices || {}).map(([vehicleId, price]) => {
                      const vehicle = vehicles.find(v => v.id === vehicleId);
                      return (
                        <Badge key={vehicleId} variant="outline" className="text-xs">
                          {vehicle?.name || vehicleId}: £{price}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
              {radiusRoutes.length === 0 && (
                <p className="text-center py-4 text-zinc-500">No radius routes defined yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-zinc-100 rounded-sm flex items-center justify-center">
            <div className="text-center text-zinc-500">
              <MapPin className="w-12 h-12 mx-auto mb-2 text-zinc-300" />
              <p>Interactive map for drawing zones</p>
              <p className="text-sm">Coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Mileage-Based Pricing Rules</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Base Fee</TableHead>
                <TableHead>Per KM</TableHead>
                <TableHead>Minimum Fare</TableHead>
                <TableHead>Airport Surcharge</TableHead>
                <TableHead>Meet & Greet</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingRules.map((rule) => {
                const vehicle = vehicles.find(v => v.id === rule.vehicle_category_id);
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{vehicle?.name || rule.vehicle_category_id}</TableCell>
                    <TableCell>£{rule.base_fee?.toFixed(2)}</TableCell>
                    <TableCell>£{rule.per_km_rate?.toFixed(2)}</TableCell>
                    <TableCell>£{rule.minimum_fare?.toFixed(2)}</TableCell>
                    <TableCell>£{rule.airport_surcharge?.toFixed(2)}</TableCell>
                    <TableCell>£{rule.meet_greet_fee?.toFixed(2)}</TableCell>
                    <TableCell>{rule.currency}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRoutes = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Fixed Route Pricing (Text-Based)</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Route
        </Button>
      </div>

      <div className="grid gap-6">
        {fixedRoutes.map((route) => (
          <Card key={route.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{route.name}</span>
                <Badge className={route.is_active ? "bg-green-100 text-green-800" : "bg-zinc-100"}>
                  {route.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-zinc-500">Pickup</p>
                  <p className="font-medium">{route.pickup_location}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Drop-off</p>
                  <p className="font-medium">{route.dropoff_location}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-zinc-500 mb-2">Prices by Vehicle</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(route.prices || {}).map(([vehicleId, price]) => {
                    const vehicle = vehicles.find(v => v.id === vehicleId);
                    return (
                      <Badge key={vehicleId} variant="outline" className="text-sm">
                        {vehicle?.name || vehicleId}: £{price}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderVehicles = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Vehicle Categories</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <Card key={vehicle.id} className="overflow-hidden">
            <div className="h-40 bg-zinc-100">
              <img
                src={vehicle.image_url || "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400"}
                alt={vehicle.name}
                className="w-full h-full object-cover"
              />
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
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {vehicle.max_passengers}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {vehicle.max_luggage}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const content = {
    dashboard: renderDashboard(),
    bookings: renderBookings(),
    fleets: renderFleets(),
    drivers: renderDrivers(),
    pricing: renderPricing(),
    routes: renderRoutes(),
    "radius-routes": renderRadiusZones(),
    vehicles: renderVehicles(),
    invoices: renderInvoices(),
    settings: <div className="p-8 text-center text-zinc-500">Settings panel coming soon</div>
  };

  return (
    <div className="p-8" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "dashboard" ? "Dashboard Overview" : 
           activeTab === "radius-routes" ? "Radius Zones" : activeTab}
        </h1>
      </div>
      {content[activeTab] || content.dashboard}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">{title}</p>
          <p className="text-3xl font-bold text-[#0A0F1C] mt-1" style={{ fontFamily: 'Chivo, sans-serif' }}>
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-sm flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AdminDashboard;
