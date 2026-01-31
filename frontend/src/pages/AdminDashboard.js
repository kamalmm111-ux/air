import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { Calendar, DollarSign, Users, Car, TrendingUp, Download, Eye, Edit, Plus, Search, Filter } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, vehiclesRes, pricingRes, routesRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
        axios.get(`${API}/vehicles`),
        axios.get(`${API}/pricing`),
        axios.get(`${API}/fixed-routes`)
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setVehicles(vehiclesRes.data);
      setPricingRules(pricingRes.data);
      setFixedRoutes(routesRes.data);
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

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{status}</Badge>;
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
        <StatCard
          title="Total Bookings"
          value={stats?.total_bookings || 0}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatCard
          title="Pending"
          value={stats?.pending_bookings || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="Completed"
          value={stats?.completed_bookings || 0}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Total Revenue"
          value={`£${stats?.total_revenue?.toFixed(2) || 0}`}
          icon={DollarSign}
          color="bg-[#D4AF37]"
        />
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Bookings</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.slice(0, 5).map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono text-sm">
                    {booking.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{booking.passenger_name}</p>
                      <p className="text-sm text-zinc-500">{booking.passenger_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {booking.pickup_location} → {booking.dropoff_location}
                  </TableCell>
                  <TableCell>{booking.pickup_date}</TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="font-bold">£{booking.price?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id} data-testid={`admin-booking-row-${booking.id}`}>
                  <TableCell className="font-mono text-sm">
                    {booking.id.slice(0, 8).toUpperCase()}
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
                    <Select
                      value={booking.status}
                      onValueChange={(value) => updateBookingStatus(booking.id, value)}
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={booking.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {booking.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">£{booking.price?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <h2 className="text-xl font-bold">Fixed Route Pricing</h2>
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
        <h2 className="text-xl font-bold">Fleet Management</h2>
        <Button className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
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
    pricing: renderPricing(),
    routes: renderRoutes(),
    vehicles: renderVehicles(),
    customers: <div className="p-8 text-center text-zinc-500">Customer management coming soon</div>,
    settings: <div className="p-8 text-center text-zinc-500">Settings panel coming soon</div>
  };

  return (
    <div className="p-8" data-testid="admin-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "dashboard" ? "Dashboard Overview" : activeTab}
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

// Missing imports for the component
import { Clock, CheckCircle, Briefcase } from "lucide-react";

export default AdminDashboard;
