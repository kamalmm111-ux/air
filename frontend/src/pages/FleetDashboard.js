import { useState, useEffect, useMemo } from "react";
import { useOutletContext, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import FleetInvoices from "../components/FleetInvoices";
import { 
  Calendar as CalendarIcon, DollarSign, Clock, CheckCircle, TrendingUp, MapPin, Users, 
  Briefcase, Play, Check, Eye, FileText, Download, LogOut, AlertTriangle,
  Plus, Edit, Trash2, Car, User, Phone, Mail, UserCheck, ChevronLeft, ChevronRight,
  Filter, X, MessageSquare, Send, Plane, StickyNote, List, Grid3X3, CalendarDays,
  Navigation, Copy, ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status colors
const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  unassigned: "bg-yellow-100 text-yellow-800 border-yellow-200",
  assigned: "bg-purple-100 text-purple-800 border-purple-200",
  accepted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  en_route: "bg-cyan-100 text-cyan-800 border-cyan-200",
  arrived: "bg-teal-100 text-teal-800 border-teal-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-red-100 text-red-800 border-red-200"
};

const STATUS_LABELS = {
  en_route: "En Route",
  in_progress: "In Progress",
  driver_no_show: "Driver No Show",
  customer_no_show: "Customer No Show"
};

const FleetDashboard = () => {
  const { activeTab } = useOutletContext();
  const { token: authToken, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Impersonation
  const isImpersonating = searchParams.get("impersonate") === "true" || sessionStorage.getItem("impersonation_token");
  const impersonationToken = sessionStorage.getItem("impersonation_token");
  const impersonationFleet = JSON.parse(sessionStorage.getItem("impersonation_fleet") || "{}");
  const impersonationId = sessionStorage.getItem("impersonation_id");
  const token = isImpersonating ? impersonationToken : authToken;
  
  // State
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // View mode: list or calendar
  const [viewMode, setViewMode] = useState("list");
  const [calendarView, setCalendarView] = useState("month"); // month, week, day
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Filters
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    driverId: "all",
    vehicleType: "all",
    search: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialogs
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      if (!isImpersonating) navigate("/fleet/login");
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    try {
      const [statsRes, jobsRes, invoicesRes, driversRes, vehiclesRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/fleet/stats`, { headers }),
        axios.get(`${API}/fleet/jobs`, { headers }),
        axios.get(`${API}/invoices`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/fleet/drivers`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/fleet/vehicles`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/vehicles`).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data);
      setInvoices(invoicesRes.data);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
      setVehicleCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exitImpersonation = async () => {
    try {
      if (impersonationId) {
        const adminToken = sessionStorage.getItem("admin_token");
        await axios.post(`${API}/admin/impersonation/${impersonationId}/exit`, {}, 
          { headers: { Authorization: `Bearer ${adminToken}` } }).catch(() => {});
      }
      sessionStorage.removeItem("impersonation_token");
      sessionStorage.removeItem("impersonation_fleet");
      sessionStorage.removeItem("impersonation_id");
      sessionStorage.removeItem("admin_token");
      toast.success("Exited impersonation mode");
      window.location.href = "/admin?tab=fleets";
    } catch (error) {
      sessionStorage.clear();
      window.location.href = "/admin";
    }
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (filters.status !== "all" && job.status !== filters.status) return false;
      if (filters.dateFrom && job.pickup_date < filters.dateFrom) return false;
      if (filters.dateTo && job.pickup_date > filters.dateTo) return false;
      if (filters.driverId !== "all" && job.assigned_driver_id !== filters.driverId) return false;
      if (filters.vehicleType !== "all" && job.vehicle_category_id !== filters.vehicleType) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchFields = [
          job.booking_ref, job.customer_name, job.pickup_location, 
          job.dropoff_location, job.passenger_name
        ].map(f => (f || "").toLowerCase());
        if (!searchFields.some(f => f.includes(search))) return false;
      }
      return true;
    });
  }, [jobs, filters]);

  // Jobs grouped by date for calendar
  const jobsByDate = useMemo(() => {
    const grouped = {};
    jobs.forEach(job => {
      const date = job.pickup_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(job);
    });
    return grouped;
  }, [jobs]);

  const acceptJob = async (jobId) => {
    try {
      await axios.put(`${API}/fleet/jobs/${jobId}/accept`, {}, { headers });
      toast.success("Job accepted!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to accept job");
    }
  };

  const updateJobStatus = async (jobId, status) => {
    try {
      await axios.put(`${API}/bookings/${jobId}/status?status=${status}`, {}, { headers });
      toast.success(`Job ${status.replace("_", " ")}!`);
      fetchData();
      setJobDetailOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update job");
    }
  };

  const openJobDetail = (job) => {
    setSelectedJob(job);
    setJobDetailOpen(true);
  };

  const openAssignDialog = (job) => {
    setSelectedJob(job);
    setAssignDialogOpen(true);
  };

  const getStatusBadge = (status) => (
    <Badge className={`${STATUS_COLORS[status] || "bg-zinc-100"} border`}>
      {STATUS_LABELS[status] || status?.replace("_", " ")}
    </Badge>
  );

  const clearFilters = () => {
    setFilters({ status: "all", dateFrom: "", dateTo: "", driverId: "all", vehicleType: "all", search: "" });
  };

  const deleteDriver = async (driverId) => {
    if (!window.confirm("Delete this driver?")) return;
    try {
      await axios.delete(`${API}/fleet/drivers/${driverId}`, { headers });
      toast.success("Driver deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete driver");
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await axios.delete(`${API}/fleet/vehicles/${vehicleId}`, { headers });
      toast.success("Vehicle deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete vehicle");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  // ==================== JOBS TAB ====================
  const renderJobs = () => (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={stats?.total_jobs || 0} icon={Briefcase} color="bg-blue-500" />
        <StatCard title="New Jobs" value={jobs.filter(j => j.status === "assigned").length} icon={Clock} color="bg-purple-500" />
        <StatCard title="In Progress" value={jobs.filter(j => ["accepted", "en_route", "arrived", "in_progress"].includes(j.status)).length} icon={Play} color="bg-orange-500" />
        <StatCard title="Completed" value={stats?.completed_jobs || 0} icon={CheckCircle} color="bg-green-500" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4 mr-1" /> List
          </Button>
          <Button variant={viewMode === "calendar" ? "default" : "outline"} size="sm" onClick={() => setViewMode("calendar")}>
            <CalendarIcon className="w-4 h-4 mr-1" /> Calendar
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search jobs..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-1" /> Filters
            {Object.values(filters).some(v => v && v !== "all") && (
              <Badge className="ml-1 bg-[#D4AF37] text-white">!</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border-[#D4AF37]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" /> Clear All
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="assigned">New/Assigned</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">From Date</Label>
                <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">To Date</Label>
                <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Driver</Label>
                <Select value={filters.driverId} onValueChange={(v) => setFilters({ ...filters, driverId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Drivers</SelectItem>
                    {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vehicle Type</Label>
                <Select value={filters.vehicleType} onValueChange={(v) => setFilters({ ...filters, vehicleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {vehicleCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {viewMode === "list" ? renderJobList() : renderCalendar()}
    </div>
  );

  // Job List View
  const renderJobList = () => (
    <div className="space-y-3">
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No jobs found</h3>
            <p className="text-zinc-400">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        filteredJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onView={() => openJobDetail(job)}
            onAccept={() => acceptJob(job.id)}
            onAssign={() => openAssignDialog(job)}
            onStatusChange={updateJobStatus}
            getStatusBadge={getStatusBadge}
          />
        ))
      )}
    </div>
  );

  // Calendar View
  const renderCalendar = () => {
    const today = new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    const prevMonth = () => setSelectedDate(new Date(year, month - 1, 1));
    const nextMonth = () => setSelectedDate(new Date(year, month + 1, 1));
    
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <h2 className="text-xl font-bold">{monthNames[month]} {year}</h2>
            <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">{day}</div>
            ))}
            {days.map((day, idx) => {
              if (!day) return <div key={idx} className="h-20 bg-zinc-50 rounded" />;
              
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayJobs = jobsByDate[dateStr] || [];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              
              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (dayJobs.length > 0) {
                      setFilters({ ...filters, dateFrom: dateStr, dateTo: dateStr });
                      setViewMode("list");
                    }
                  }}
                  className={`h-20 p-1 border rounded cursor-pointer transition-colors ${
                    isToday ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-zinc-200 hover:bg-zinc-50"
                  } ${dayJobs.length > 0 ? "hover:border-[#D4AF37]" : ""}`}
                >
                  <div className={`text-sm font-medium ${isToday ? "text-[#D4AF37]" : ""}`}>{day}</div>
                  {dayJobs.length > 0 && (
                    <div className="mt-1">
                      <Badge className="bg-[#0A0F1C] text-white text-xs">{dayJobs.length} jobs</Badge>
                      <div className="mt-1 space-y-0.5">
                        {dayJobs.slice(0, 2).map(j => (
                          <div key={j.id} className={`text-xs px-1 rounded truncate ${STATUS_COLORS[j.status]}`}>
                            {j.pickup_time}
                          </div>
                        ))}
                        {dayJobs.length > 2 && <div className="text-xs text-zinc-400">+{dayJobs.length - 2} more</div>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ==================== DRIVERS TAB ====================
  const renderDrivers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0A0F1C]">My Drivers</h2>
        <Button onClick={() => { setEditingDriver(null); setDriverDialogOpen(true); }} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-1" /> Add Driver
        </Button>
      </div>
      
      {drivers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No drivers yet</h3>
            <p className="text-zinc-400 mb-4">Add drivers to assign them to jobs</p>
            <Button onClick={() => { setEditingDriver(null); setDriverDialogOpen(true); }} className="bg-[#0A0F1C]">
              <Plus className="w-4 h-4 mr-1" /> Add Your First Driver
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell>{driver.email || "-"}</TableCell>
                    <TableCell>{driver.license_number || "-"}</TableCell>
                    <TableCell>
                      <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-zinc-100"}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDriver(driver); setDriverDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteDriver(driver.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ==================== VEHICLES TAB ====================
  const renderVehicles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0A0F1C]">My Vehicles</h2>
        <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-1" /> Add Vehicle
        </Button>
      </div>
      
      {vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Car className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No vehicles yet</h3>
            <p className="text-zinc-400 mb-4">Add vehicles to assign them to jobs</p>
            <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }} className="bg-[#0A0F1C]">
              <Plus className="w-4 h-4 mr-1" /> Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate Number</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-medium">{vehicle.plate_number}</TableCell>
                    <TableCell>{vehicle.make} {vehicle.model} {vehicle.year ? `(${vehicle.year})` : ""}</TableCell>
                    <TableCell>{vehicleCategories.find(c => c.id === vehicle.category_id)?.name || vehicle.category_id}</TableCell>
                    <TableCell>{vehicle.passenger_capacity} pax / {vehicle.luggage_capacity} bags</TableCell>
                    <TableCell>
                      <Badge className={vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-zinc-100"}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingVehicle(vehicle); setVehicleDialogOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteVehicle(vehicle.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ==================== EARNINGS TAB ====================
  const renderEarnings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Jobs" value={stats?.total_jobs || 0} icon={Briefcase} color="bg-blue-500" />
        <StatCard title="Completed" value={stats?.completed_jobs || 0} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Total Earnings" value={`£${(stats?.total_earnings || 0).toFixed(2)}`} icon={DollarSign} color="bg-[#D4AF37]" />
        <StatCard title="Net Earnings" value={`£${(stats?.net_earnings || 0).toFixed(2)}`} icon={TrendingUp} color="bg-emerald-500" />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Completed Jobs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Earnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.filter(j => j.status === "completed").slice(0, 10).map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono">{job.booking_ref || job.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{job.pickup_location} → {job.dropoff_location}</TableCell>
                  <TableCell>{job.pickup_date}</TableCell>
                  <TableCell className="font-bold text-green-600">£{job.price?.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // ==================== INVOICES TAB ====================
  const downloadInvoice = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice downloaded");
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const renderInvoices = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0A0F1C]">Your Invoices</h2>
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No invoices yet</h3>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.created_at?.slice(0, 10)}</TableCell>
                    <TableCell>{invoice.booking_ids?.length || 0}</TableCell>
                    <TableCell className="font-bold">£{invoice.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={invoice.status === "paid" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => downloadInvoice(invoice.id)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Determine fleet ID - use impersonation fleet ID if impersonating, otherwise from user
  const fleetId = isImpersonating ? impersonationFleet.id : user?.fleet_id;

  const content = {
    jobs: renderJobs(),
    drivers: renderDrivers(),
    vehicles: renderVehicles(),
    earnings: renderEarnings(),
    invoices: <FleetInvoices token={token} fleetId={fleetId} />
  };

  return (
    <div className="p-6 md:p-8" data-testid="fleet-dashboard">
      {isImpersonating && (
        <div className="mb-6 bg-amber-500 text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Impersonation Mode: Viewing <strong>{impersonationFleet.name || "Fleet"}</strong> dashboard</span>
          </div>
          <Button onClick={exitImpersonation} variant="outline" className="bg-white text-amber-600 hover:bg-amber-50 border-white">
            <LogOut className="w-4 h-4 mr-2" /> Exit
          </Button>
        </div>
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "jobs" ? "Job Dashboard" : activeTab === "drivers" ? "My Drivers" : activeTab === "vehicles" ? "My Vehicles" : activeTab === "invoices" ? "My Invoices" : activeTab}
        </h1>
      </div>
      
      {content[activeTab] || content.jobs}
      
      {/* Dialogs */}
      <DriverDialog open={driverDialogOpen} onClose={() => setDriverDialogOpen(false)} driver={editingDriver} headers={headers} onSuccess={fetchData} />
      <VehicleDialog open={vehicleDialogOpen} onClose={() => setVehicleDialogOpen(false)} vehicle={editingVehicle} categories={vehicleCategories} headers={headers} onSuccess={fetchData} />
      <AssignDriverDialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} job={selectedJob} drivers={drivers} vehicles={vehicles} headers={headers} onSuccess={fetchData} />
      <JobDetailDialog open={jobDetailOpen} onClose={() => setJobDetailOpen(false)} job={selectedJob} headers={headers} onStatusChange={updateJobStatus} onAssign={() => { setJobDetailOpen(false); openAssignDialog(selectedJob); }} getStatusBadge={getStatusBadge} drivers={drivers} vehicles={vehicles} onRefresh={fetchData} />
    </div>
  );
};

// ==================== COMPONENTS ====================

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-[#0A0F1C]">{value}</p>
        </div>
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const JobCard = ({ job, onView, onAccept, onAssign, onStatusChange, getStatusBadge }) => {
  const needsAssignment = !job.assigned_driver_id || !job.assigned_vehicle_id;
  
  return (
    <Card className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: job.status === "assigned" ? "#9333ea" : job.status === "completed" ? "#22c55e" : "#D4AF37" }}>
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm bg-zinc-100 px-2 py-1 rounded font-bold">{job.booking_ref || job.id.slice(0, 8).toUpperCase()}</span>
              {getStatusBadge(job.status)}
              <span className="text-lg font-bold text-[#D4AF37]">£{job.price?.toFixed(2)}</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{job.pickup_date} at {job.pickup_time}</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{job.passengers || job.passenger_count || 1} passengers • {job.vehicle_name || job.vehicle_category_id}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-600 truncate">{job.pickup_location}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-600 truncate">{job.dropoff_location}</span>
              </div>
            </div>
            
            {/* Assignment Info */}
            {job.assigned_driver_name && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-2 py-1 rounded w-fit">
                <UserCheck className="w-4 h-4" />
                <span>{job.assigned_driver_name}</span>
                {job.assigned_vehicle_plate && <span className="font-mono">({job.assigned_vehicle_plate})</span>}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onView} className="flex-1 md:flex-none">
              <Eye className="w-4 h-4 mr-1" /> Details
            </Button>
            
            {job.status === "assigned" && (
              <>
                <Button onClick={onAccept} size="sm" className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none">
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button variant="outline" size="sm" onClick={onAssign} className="flex-1 md:flex-none">
                  <UserCheck className="w-4 h-4 mr-1" /> Assign
                </Button>
              </>
            )}
            
            {job.status === "accepted" && (
              <>
                {needsAssignment && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded text-center">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Assign driver & vehicle
                  </div>
                )}
                {!needsAssignment ? (
                  <Button onClick={() => onStatusChange(job.id, "en_route")} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                    <Play className="w-4 h-4 mr-1" /> Start
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onAssign} className="border-amber-400 text-amber-700">
                    <UserCheck className="w-4 h-4 mr-1" /> Assign
                  </Button>
                )}
              </>
            )}
            
            {job.status === "en_route" && (
              <Button onClick={() => onStatusChange(job.id, "arrived")} size="sm" className="bg-teal-600 hover:bg-teal-700">Arrived</Button>
            )}
            {job.status === "arrived" && (
              <Button onClick={() => onStatusChange(job.id, "in_progress")} size="sm" className="bg-orange-600 hover:bg-orange-700">Start Journey</Button>
            )}
            {job.status === "in_progress" && (
              <Button onClick={() => onStatusChange(job.id, "completed")} size="sm" className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Job Detail Dialog with Comments
const JobDetailDialog = ({ open, onClose, job, headers, onStatusChange, onAssign, getStatusBadge, drivers, vehicles, onRefresh }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  
  useEffect(() => {
    if (open && job) {
      fetchComments();
    }
  }, [open, job]);
  
  const fetchComments = async () => {
    if (!job) return;
    setLoadingComments(true);
    try {
      const res = await axios.get(`${API}/bookings/${job.id}/comments`, { headers });
      setComments(res.data);
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setLoadingComments(false);
    }
  };
  
  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API}/bookings/${job.id}/comments`, { comment: newComment }, { headers });
      setNewComment("");
      fetchComments();
      toast.success("Comment added");
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };
  
  if (!job) return null;
  
  const needsAssignment = !job.assigned_driver_id || !job.assigned_vehicle_id;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono bg-zinc-100 px-2 py-1 rounded">{job.booking_ref}</span>
            {getStatusBadge(job.status)}
            <span className="text-[#D4AF37] font-bold">£{job.price?.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Job Details</TabsTrigger>
            <TabsTrigger value="comments">
              Comments {comments.length > 0 && <Badge className="ml-1 bg-[#D4AF37]">{comments.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Passenger Info */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">PASSENGER</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium">{job.customer_name || job.passenger_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span>{job.customer_phone || job.passenger_phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>{job.passengers || job.passenger_count || 1} passengers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-zinc-400" />
                  <span>{job.vehicle_name || job.vehicle_category_id}</span>
                </div>
              </div>
            </div>
            
            {/* Trip Info */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">TRIP DETAILS</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#D4AF37] mt-1" />
                  <div>
                    <div className="font-medium">{job.pickup_date} at {job.pickup_time}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-500 mt-1" />
                  <div>
                    <div className="text-xs text-zinc-500">PICKUP</div>
                    <div>{job.pickup_location}</div>
                    {job.pickup_notes && <div className="text-sm text-zinc-500 mt-1">{job.pickup_notes}</div>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-1" />
                  <div>
                    <div className="text-xs text-zinc-500">DROP-OFF</div>
                    <div>{job.dropoff_location}</div>
                    {job.dropoff_notes && <div className="text-sm text-zinc-500 mt-1">{job.dropoff_notes}</div>}
                  </div>
                </div>
                {job.flight_number && (
                  <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                    <Plane className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Flight: {job.flight_number}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Special Instructions */}
            {(job.special_instructions || job.admin_notes) && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" /> SPECIAL INSTRUCTIONS
                </h3>
                <p className="text-sm">{job.special_instructions || job.admin_notes}</p>
              </div>
            )}
            
            {/* Assignment */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">ASSIGNMENT</h3>
              {job.assigned_driver_name ? (
                <div className="flex items-center gap-2 text-green-700">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">{job.assigned_driver_name}</span>
                  {job.assigned_vehicle_plate && <span className="font-mono bg-white px-2 py-0.5 rounded">({job.assigned_vehicle_plate})</span>}
                </div>
              ) : (
                <div className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Not assigned yet</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-4">
            <div className="space-y-4">
              {/* Comments List */}
              <div className="max-h-60 overflow-y-auto space-y-3">
                {loadingComments ? (
                  <div className="text-center py-4 text-zinc-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className={`p-3 rounded-lg ${c.user_role === "super_admin" ? "bg-blue-50 border-l-4 border-blue-400" : "bg-zinc-50 border-l-4 border-zinc-300"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{c.user_name}</span>
                        <span className="text-xs text-zinc-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>
              
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note or comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addComment} disabled={!newComment.trim()} className="bg-[#0A0F1C]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 flex-wrap gap-2">
          {needsAssignment && job.status !== "completed" && job.status !== "cancelled" && (
            <Button onClick={onAssign} variant="outline" className="border-amber-400 text-amber-700">
              <UserCheck className="w-4 h-4 mr-1" /> Assign Driver & Vehicle
            </Button>
          )}
          
          {job.status === "assigned" && (
            <Button onClick={() => onStatusChange(job.id, "accepted")} className="bg-green-600 hover:bg-green-700">
              <Check className="w-4 h-4 mr-1" /> Accept Job
            </Button>
          )}
          {job.status === "accepted" && !needsAssignment && (
            <Button onClick={() => onStatusChange(job.id, "en_route")} className="bg-cyan-600 hover:bg-cyan-700">
              <Play className="w-4 h-4 mr-1" /> Start Trip
            </Button>
          )}
          {job.status === "en_route" && (
            <Button onClick={() => onStatusChange(job.id, "arrived")} className="bg-teal-600 hover:bg-teal-700">Arrived at Pickup</Button>
          )}
          {job.status === "arrived" && (
            <Button onClick={() => onStatusChange(job.id, "in_progress")} className="bg-orange-600 hover:bg-orange-700">Start Journey</Button>
          )}
          {job.status === "in_progress" && (
            <Button onClick={() => onStatusChange(job.id, "completed")} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-1" /> Complete Job
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Driver Dialog
const DriverDialog = ({ open, onClose, driver, headers, onSuccess }) => {
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", license_number: "", license_expiry: "", notes: "", status: "active" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driver) setFormData({ ...driver });
    else setFormData({ name: "", phone: "", email: "", license_number: "", license_expiry: "", notes: "", status: "active" });
  }, [driver, open]);

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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Name *</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
          <div><Label>Phone *</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
          <div><Label>Email</Label><Input type="email" value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
          <div><Label>License Number</Label><Input value={formData.license_number || ""} onChange={(e) => setFormData({...formData, license_number: e.target.value})} /></div>
          <div><Label>License Expiry</Label><Input type="date" value={formData.license_expiry || ""} onChange={(e) => setFormData({...formData, license_expiry: e.target.value})} /></div>
          <div><Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">{loading ? "Saving..." : "Save"}</Button>
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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div><Label>Plate Number *</Label><Input value={formData.plate_number} onChange={(e) => setFormData({...formData, plate_number: e.target.value})} /></div>
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
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Passengers</Label><Input type="number" min="1" value={formData.passenger_capacity} onChange={(e) => setFormData({...formData, passenger_capacity: parseInt(e.target.value) || 1})} /></div>
            <div><Label>Luggage</Label><Input type="number" min="0" value={formData.luggage_capacity} onChange={(e) => setFormData({...formData, luggage_capacity: parseInt(e.target.value) || 0})} /></div>
          </div>
          <div><Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">{loading ? "Saving..." : "Save"}</Button>
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
      <DialogContent className="max-w-md">
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
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.phone})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.filter(v => v.status === "active").map(v => <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading || !hasDrivers || !hasVehicles || !driverId || !vehicleId} className="bg-[#0A0F1C]">
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FleetDashboard;
