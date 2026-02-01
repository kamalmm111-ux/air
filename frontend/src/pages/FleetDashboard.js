import { useState, useEffect } from "react";
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
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, DollarSign, Clock, CheckCircle, TrendingUp, MapPin, Users, 
  Briefcase, Play, Check, Eye, FileText, Download, LogOut, AlertTriangle,
  Plus, Edit, Trash2, Car, User, Phone, Mail, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetDashboard = () => {
  const { activeTab } = useOutletContext();
  const { token: authToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check for impersonation mode
  const isImpersonating = searchParams.get("impersonate") === "true" || sessionStorage.getItem("impersonation_token");
  const impersonationToken = sessionStorage.getItem("impersonation_token");
  const impersonationFleet = JSON.parse(sessionStorage.getItem("impersonation_fleet") || "{}");
  const impersonationId = sessionStorage.getItem("impersonation_id");
  
  // Use impersonation token if in impersonation mode, otherwise use regular auth token
  const token = isImpersonating ? impersonationToken : authToken;
  
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleCategories, setVehicleCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      if (!isImpersonating) {
        navigate("/fleet/login");
      }
      return;
    }
    fetchData();
    // Poll for updates every 30 seconds
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
        await axios.post(
          `${API}/admin/impersonation/${impersonationId}/exit`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        ).catch(() => {});
      }
      
      sessionStorage.removeItem("impersonation_token");
      sessionStorage.removeItem("impersonation_fleet");
      sessionStorage.removeItem("impersonation_id");
      sessionStorage.removeItem("admin_token");
      
      toast.success("Exited impersonation mode");
      window.location.href = "/admin?tab=fleets";
    } catch (error) {
      console.error("Exit impersonation error:", error);
      sessionStorage.clear();
      window.location.href = "/admin";
    }
  };

  const acceptJob = async (bookingId) => {
    try {
      await axios.put(`${API}/fleet/jobs/${bookingId}/accept`, {}, { headers });
      toast.success("Job accepted!");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to accept job");
    }
  };

  const updateJobStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/bookings/${bookingId}/status?status=${status}`, {}, { headers });
      toast.success(`Job ${status.replace("_", " ")}!`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update job");
    }
  };

  const openAssignDialog = (job) => {
    setSelectedJob(job);
    setAssignDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      new: "bg-blue-100 text-blue-800",
      unassigned: "bg-yellow-100 text-yellow-800",
      assigned: "bg-purple-100 text-purple-800",
      accepted: "bg-indigo-100 text-indigo-800",
      en_route: "bg-cyan-100 text-cyan-800",
      arrived: "bg-teal-100 text-teal-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      no_show: "bg-red-100 text-red-800",
      driver_no_show: "bg-red-100 text-red-800",
      customer_no_show: "bg-red-100 text-red-800"
    };
    const labels = {
      en_route: "En Route",
      in_progress: "In Progress",
      driver_no_show: "Driver No Show",
      customer_no_show: "Customer No Show"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{labels[status] || status?.replace("_", " ")}</Badge>;
  };

  const filteredJobs = jobs.filter(j => {
    if (statusFilter === "all") return true;
    return j.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  // ==================== JOBS TAB ====================
  const renderJobs = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant={statusFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("all")}>
            All ({jobs.length})
          </Button>
          <Button variant={statusFilter === "assigned" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("assigned")} className="text-purple-700">
            New ({jobs.filter(j => j.status === "assigned").length})
          </Button>
          <Button variant={statusFilter === "accepted" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("accepted")}>
            Accepted ({jobs.filter(j => j.status === "accepted").length})
          </Button>
          <Button variant={statusFilter === "completed" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("completed")} className="text-green-700">
            Completed ({jobs.filter(j => j.status === "completed").length})
          </Button>
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No jobs found</h3>
            <p className="text-zinc-400">Jobs assigned to you will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredJobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow" data-testid={`job-card-${job.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-mono text-sm bg-zinc-100 px-2 py-1 rounded">{job.booking_ref || job.id.slice(0, 8).toUpperCase()}</span>
                      {getStatusBadge(job.status)}
                      <span className="text-xl font-bold text-[#D4AF37]">£{job.price?.toFixed(2)}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <span>{job.pickup_date} at {job.pickup_time}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                        <span className="text-zinc-600">{job.pickup_location}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                        <span className="text-zinc-600">{job.dropoff_location}</span>
                      </div>
                      <div className="flex items-center gap-4 text-zinc-500">
                        <span><Users className="w-4 h-4 inline mr-1" />{job.passengers} pax</span>
                        <span>{job.vehicle_name}</span>
                      </div>
                      {/* Show assigned driver/vehicle */}
                      {job.assigned_driver_name && (
                        <div className="flex items-center gap-2 text-green-600 font-medium mt-2">
                          <UserCheck className="w-4 h-4" />
                          <span>Assigned: {job.assigned_driver_name}</span>
                          {job.assigned_vehicle_plate && <span>({job.assigned_vehicle_plate})</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {job.status === "assigned" && (
                      <>
                        <Button onClick={() => acceptJob(job.id)} className="bg-green-600 hover:bg-green-700" data-testid={`accept-job-${job.id}`}>
                          <Check className="w-4 h-4 mr-1" /> Accept
                        </Button>
                        <Button variant="outline" onClick={() => openAssignDialog(job)} data-testid={`assign-driver-${job.id}`}>
                          <UserCheck className="w-4 h-4 mr-1" /> Assign Driver
                        </Button>
                      </>
                    )}
                    {job.status === "accepted" && (
                      <>
                        {/* Show warning if driver/vehicle not assigned */}
                        {(!job.assigned_driver_id || !job.assigned_vehicle_id) && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mb-2">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {!job.assigned_driver_id && !job.assigned_vehicle_id 
                              ? "Assign driver & vehicle to start"
                              : !job.assigned_driver_id 
                                ? "Assign driver to start"
                                : "Assign vehicle to start"}
                          </div>
                        )}
                        {job.assigned_driver_id && job.assigned_vehicle_id ? (
                          <Button onClick={() => updateJobStatus(job.id, "en_route")} className="bg-cyan-600 hover:bg-cyan-700">
                            <Play className="w-4 h-4 mr-1" /> Start Trip
                          </Button>
                        ) : (
                          <Button disabled className="bg-zinc-300 cursor-not-allowed" title="Assign driver and vehicle first">
                            <Play className="w-4 h-4 mr-1" /> Start Trip
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => openAssignDialog(job)} className={(!job.assigned_driver_id || !job.assigned_vehicle_id) ? "border-amber-400 text-amber-700" : ""}>
                          <UserCheck className="w-4 h-4 mr-1" /> {job.assigned_driver_id ? "Change Assignment" : "Assign Driver"}
                        </Button>
                      </>
                    )}
                    {job.status === "en_route" && (
                      <Button onClick={() => updateJobStatus(job.id, "arrived")} className="bg-teal-600 hover:bg-teal-700">
                        Arrived at Pickup
                      </Button>
                    )}
                    {job.status === "arrived" && (
                      <Button onClick={() => updateJobStatus(job.id, "in_progress")} className="bg-orange-600 hover:bg-orange-700">
                        Start Journey
                      </Button>
                    )}
                    {job.status === "in_progress" && (
                      <Button onClick={() => updateJobStatus(job.id, "completed")} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ==================== DRIVERS TAB ====================
  const renderDrivers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0A0F1C]">My Drivers</h2>
        <Button onClick={() => { setEditingDriver(null); setDriverDialogOpen(true); }} className="bg-[#0A0F1C]" data-testid="add-driver-btn">
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
                  <TableRow key={driver.id} data-testid={`driver-row-${driver.id}`}>
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
        <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }} className="bg-[#0A0F1C]" data-testid="add-vehicle-btn">
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
                  <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
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
        <CardHeader>
          <CardTitle>Recent Completed Jobs</CardTitle>
        </CardHeader>
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
                  <TableCell className="max-w-[200px] truncate">
                    {job.pickup_location} → {job.dropoff_location}
                  </TableCell>
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
  const renderInvoices = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0A0F1C]">Your Invoices</h2>
      
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-600">No invoices yet</h3>
            <p className="text-zinc-400">Your invoices will appear here once generated</p>
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
                    <TableCell>{invoice.created_at?.slice(0, 10)}</TableCell>
                    <TableCell>{invoice.booking_ids?.length || 0}</TableCell>
                    <TableCell>£{invoice.subtotal?.toFixed(2)}</TableCell>
                    <TableCell className="text-red-600">-£{invoice.commission?.toFixed(2)}</TableCell>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`${API}/invoices/${invoice.id}/pdf`, '_blank')}
                      >
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

  // ==================== CRUD HANDLERS ====================
  const deleteDriver = async (driverId) => {
    if (!window.confirm("Are you sure you want to delete this driver?")) return;
    try {
      await axios.delete(`${API}/fleet/drivers/${driverId}`, { headers });
      toast.success("Driver deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete driver");
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      await axios.delete(`${API}/fleet/vehicles/${vehicleId}`, { headers });
      toast.success("Vehicle deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete vehicle");
    }
  };

  const content = {
    jobs: renderJobs(),
    drivers: renderDrivers(),
    vehicles: renderVehicles(),
    earnings: renderEarnings(),
    invoices: renderInvoices()
  };

  return (
    <div className="p-8" data-testid="fleet-dashboard">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="mb-6 bg-amber-500 text-white px-4 py-3 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">
              Impersonation Mode: You are viewing <strong>{impersonationFleet.name || "Fleet"}</strong> dashboard as Super Admin
            </span>
          </div>
          <Button 
            onClick={exitImpersonation}
            variant="outline"
            className="bg-white text-amber-600 hover:bg-amber-50 border-white"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit Impersonation
          </Button>
        </div>
      )}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "jobs" ? "Your Jobs" : activeTab === "drivers" ? "My Drivers" : activeTab === "vehicles" ? "My Vehicles" : activeTab}
        </h1>
      </div>
      {content[activeTab] || content.jobs}
      
      {/* Driver Dialog */}
      <DriverDialog
        open={driverDialogOpen}
        onClose={() => setDriverDialogOpen(false)}
        driver={editingDriver}
        headers={headers}
        onSuccess={fetchData}
      />
      
      {/* Vehicle Dialog */}
      <VehicleDialog
        open={vehicleDialogOpen}
        onClose={() => setVehicleDialogOpen(false)}
        vehicle={editingVehicle}
        categories={vehicleCategories}
        headers={headers}
        onSuccess={fetchData}
      />
      
      {/* Assign Driver Dialog */}
      <AssignDriverDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        job={selectedJob}
        drivers={drivers}
        vehicles={vehicles}
        headers={headers}
        onSuccess={fetchData}
      />
    </div>
  );
};

// ==================== DIALOGS ====================

const DriverDialog = ({ open, onClose, driver, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    license_number: "",
    license_expiry: "",
    notes: "",
    status: "active"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (driver) {
      setFormData({ ...driver });
    } else {
      setFormData({
        name: "",
        phone: "",
        email: "",
        license_number: "",
        license_expiry: "",
        notes: "",
        status: "active"
      });
    }
  }, [driver, open]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }
    setLoading(true);
    try {
      if (driver) {
        await axios.put(`${API}/fleet/drivers/${driver.id}`, formData, { headers });
        toast.success("Driver updated");
      } else {
        await axios.post(`${API}/fleet/drivers`, formData, { headers });
        toast.success("Driver created");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver ? "Edit Driver" : "Add Driver"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} data-testid="driver-name-input" />
          </div>
          <div>
            <Label>Phone *</Label>
            <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} data-testid="driver-phone-input" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>
          <div>
            <Label>License Number</Label>
            <Input value={formData.license_number || ""} onChange={(e) => setFormData({...formData, license_number: e.target.value})} />
          </div>
          <div>
            <Label>License Expiry</Label>
            <Input type="date" value={formData.license_expiry || ""} onChange={(e) => setFormData({...formData, license_expiry: e.target.value})} />
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
          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes || ""} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]" data-testid="save-driver-btn">
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const VehicleDialog = ({ open, onClose, vehicle, categories, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    plate_number: "",
    make: "",
    model: "",
    year: "",
    color: "",
    category_id: "",
    passenger_capacity: 4,
    luggage_capacity: 2,
    notes: "",
    status: "active"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData({ ...vehicle, year: vehicle.year || "" });
    } else {
      setFormData({
        plate_number: "",
        make: "",
        model: "",
        year: "",
        color: "",
        category_id: categories[0]?.id || "",
        passenger_capacity: 4,
        luggage_capacity: 2,
        notes: "",
        status: "active"
      });
    }
  }, [vehicle, open, categories]);

  const handleSubmit = async () => {
    if (!formData.plate_number || !formData.category_id) {
      toast.error("Plate number and category are required");
      return;
    }
    setLoading(true);
    try {
      const data = { ...formData, year: formData.year ? parseInt(formData.year) : null };
      if (vehicle) {
        await axios.put(`${API}/fleet/vehicles/${vehicle.id}`, data, { headers });
        toast.success("Vehicle updated");
      } else {
        await axios.post(`${API}/fleet/vehicles`, data, { headers });
        toast.success("Vehicle created");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Plate Number *</Label>
            <Input value={formData.plate_number} onChange={(e) => setFormData({...formData, plate_number: e.target.value})} data-testid="vehicle-plate-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Make</Label>
              <Input value={formData.make || ""} onChange={(e) => setFormData({...formData, make: e.target.value})} placeholder="e.g. Toyota" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={formData.model || ""} onChange={(e) => setFormData({...formData, model: e.target.value})} placeholder="e.g. Camry" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Year</Label>
              <Input type="number" value={formData.year || ""} onChange={(e) => setFormData({...formData, year: e.target.value})} placeholder="e.g. 2022" />
            </div>
            <div>
              <Label>Color</Label>
              <Input value={formData.color || ""} onChange={(e) => setFormData({...formData, color: e.target.value})} placeholder="e.g. Black" />
            </div>
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={formData.category_id} onValueChange={(v) => setFormData({...formData, category_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Passengers</Label>
              <Input type="number" min="1" value={formData.passenger_capacity} onChange={(e) => setFormData({...formData, passenger_capacity: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <Label>Luggage</Label>
              <Input type="number" min="0" value={formData.luggage_capacity} onChange={(e) => setFormData({...formData, luggage_capacity: parseInt(e.target.value) || 0})} />
            </div>
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
          <div>
            <Label>Notes</Label>
            <Textarea value={formData.notes || ""} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]" data-testid="save-vehicle-btn">
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AssignDriverDialog = ({ open, onClose, job, drivers, vehicles, headers, onSuccess }) => {
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job) {
      setDriverId(job.assigned_driver_id || "");
      setVehicleId(job.assigned_vehicle_id || "");
    }
  }, [job, open]);

  if (!job) return null;

  const handleAssign = async () => {
    if (!driverId) {
      toast.error("Please select a driver");
      return;
    }
    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API}/fleet/jobs/${job.id}/assign-driver`, {
        driver_id: driverId,
        vehicle_id: vehicleId
      }, { headers });
      toast.success("Driver and vehicle assigned to job!");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign driver");
    } finally {
      setLoading(false);
    }
  };

  const hasDrivers = drivers.filter(d => d.status === "active").length > 0;
  const hasVehicles = vehicles.filter(v => v.status === "active").length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Driver & Vehicle to Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-zinc-50 rounded-sm text-sm">
            <div className="font-mono text-xs mb-2">{job.booking_ref}</div>
            <div><strong>Route:</strong> {job.pickup_location} → {job.dropoff_location}</div>
            <div><strong>Date:</strong> {job.pickup_date} at {job.pickup_time}</div>
            <div><strong>Payout:</strong> £{job.price?.toFixed(2)}</div>
          </div>
          
          {!hasDrivers || !hasVehicles ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm text-center">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-amber-700 font-medium">Setup Required</p>
              {!hasDrivers && <p className="text-sm text-amber-600 mt-1">Add drivers in the "My Drivers" tab</p>}
              {!hasVehicles && <p className="text-sm text-amber-600 mt-1">Add vehicles in the "My Vehicles" tab</p>}
              <p className="text-xs text-amber-500 mt-2">You must have both drivers and vehicles to start jobs.</p>
            </div>
          ) : (
            <>
              <div>
                <Label>Select Driver *</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger data-testid="select-driver-dropdown"><SelectValue placeholder="Choose a driver" /></SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === "active").map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name} ({d.phone})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Select Vehicle *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger data-testid="select-vehicle-dropdown"><SelectValue placeholder="Choose a vehicle" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === "active").map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number} - {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading || !hasDrivers || !hasVehicles || !driverId || !vehicleId} className="bg-[#0A0F1C]" data-testid="confirm-assign-driver-btn">
            {loading ? "Assigning..." : "Assign Driver & Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export default FleetDashboard;
