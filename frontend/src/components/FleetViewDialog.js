import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { 
  Building2, Phone, Mail, MapPin, Users, Truck, Calendar,
  DollarSign, FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  User, Car
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const FleetViewDialog = ({ open, onClose, fleet, token }) => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, in_progress: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (open && fleet) {
      fetchFleetData();
    }
  }, [open, fleet]);

  const fetchFleetData = async () => {
    if (!fleet) return;
    setLoading(true);
    try {
      // Fetch fleet's drivers
      const driversRes = await axios.get(`${API}/drivers?fleet_id=${fleet.id}`, { headers });
      setDrivers(driversRes.data || []);

      // Fetch fleet's vehicles  
      const vehiclesRes = await axios.get(`${API}/admin/vehicles?fleet_id=${fleet.id}`, { headers });
      setVehicles(vehiclesRes.data || []);

      // Fetch jobs assigned to this fleet
      const jobsRes = await axios.get(`${API}/admin/bookings?fleet_id=${fleet.id}`, { headers });
      const fleetJobs = jobsRes.data || [];
      setJobs(fleetJobs);

      // Calculate stats
      const completed = fleetJobs.filter(j => j.status === "completed").length;
      const inProgress = fleetJobs.filter(j => ["en_route", "arrived", "in_progress"].includes(j.status)).length;
      const revenue = fleetJobs
        .filter(j => j.status === "completed")
        .reduce((sum, j) => sum + (j.driver_price || 0), 0);
      
      setStats({
        total: fleetJobs.length,
        completed,
        in_progress: inProgress,
        revenue
      });
    } catch (error) {
      console.error("Error fetching fleet data:", error);
      toast.error("Failed to load fleet details");
    } finally {
      setLoading(false);
    }
  };

  if (!fleet) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-zinc-100 text-zinc-800";
      case "suspended": return "bg-red-100 text-red-800";
      default: return "bg-zinc-100 text-zinc-800";
    }
  };

  const getJobStatusColor = (status) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      unassigned: "bg-yellow-100 text-yellow-800",
      assigned: "bg-purple-100 text-purple-800",
      accepted: "bg-indigo-100 text-indigo-800",
      en_route: "bg-cyan-100 text-cyan-800",
      arrived: "bg-teal-100 text-teal-800",
      in_progress: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-zinc-100 text-zinc-800";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <Building2 className="w-6 h-6 text-[#D4AF37]" />
            <span className="text-xl">{fleet.name}</span>
            <Badge className={getStatusColor(fleet.status)}>
              {fleet.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="drivers">
              Drivers {drivers.length > 0 && <Badge className="ml-1 bg-zinc-500 text-white text-xs">{drivers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="vehicles">
              Vehicles {vehicles.length > 0 && <Badge className="ml-1 bg-zinc-500 text-white text-xs">{vehicles.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="jobs">
              Jobs {jobs.length > 0 && <Badge className="ml-1 bg-zinc-500 text-white text-xs">{jobs.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Jobs" value={stats.total} icon={Calendar} color="text-blue-600" />
                  <StatCard title="Completed" value={stats.completed} icon={CheckCircle} color="text-green-600" />
                  <StatCard title="In Progress" value={stats.in_progress} icon={Clock} color="text-orange-600" />
                  <StatCard title="Total Earnings" value={`£${stats.revenue.toFixed(0)}`} icon={DollarSign} color="text-[#D4AF37]" />
                </div>

                {/* Contact Info */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-bold text-sm text-zinc-500">CONTACT INFORMATION</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <InfoRow icon={User} label="Contact Person" value={fleet.contact_person} />
                      <InfoRow icon={Phone} label="Phone" value={fleet.phone} />
                      <InfoRow icon={Mail} label="Email" value={fleet.email} />
                      <InfoRow icon={MapPin} label="City" value={fleet.city} />
                    </div>
                  </CardContent>
                </Card>

                {/* Business Info */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <h3 className="font-bold text-sm text-zinc-500">BUSINESS DETAILS</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <InfoRow 
                        icon={DollarSign} 
                        label="Commission" 
                        value={fleet.commission_type === "percentage" 
                          ? `${fleet.commission_value}%` 
                          : `£${fleet.commission_value} flat`} 
                      />
                      <InfoRow icon={FileText} label="Payment Terms" value={fleet.payment_terms || "Not set"} />
                      <InfoRow icon={Users} label="Total Drivers" value={drivers.length} />
                      <InfoRow icon={Truck} label="Total Vehicles" value={vehicles.length} />
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {fleet.notes && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm text-zinc-500 mb-2">NOTES</h3>
                      <p className="text-sm">{fleet.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Warning for suspended fleets */}
                {fleet.status === "suspended" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800">Fleet Suspended</p>
                      <p className="text-sm text-red-600">This fleet cannot receive new job assignments until reactivated.</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* DRIVERS TAB */}
              <TabsContent value="drivers" className="mt-4">
                {drivers.length === 0 ? (
                  <EmptyState icon={Users} message="No drivers registered for this fleet" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">{driver.phone}</div>
                            <div className="text-xs text-zinc-500">{driver.email}</div>
                          </TableCell>
                          <TableCell>{driver.license_number || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{driver.driver_type || "standard"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {driver.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* VEHICLES TAB */}
              <TabsContent value="vehicles" className="mt-4">
                {vehicles.length === 0 ? (
                  <EmptyState icon={Truck} message="No vehicles registered for this fleet" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plate</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-mono font-medium">{vehicle.plate_number}</TableCell>
                          <TableCell>
                            <div>{vehicle.name || `${vehicle.make || ''} ${vehicle.model || ''}`}</div>
                            {vehicle.color && <div className="text-xs text-zinc-500">{vehicle.color} {vehicle.year}</div>}
                          </TableCell>
                          <TableCell>{vehicle.category_id}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {vehicle.passenger_capacity}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={vehicle.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {vehicle.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* JOBS TAB */}
              <TabsContent value="jobs" className="mt-4">
                {jobs.length === 0 ? (
                  <EmptyState icon={Calendar} message="No jobs assigned to this fleet yet" />
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Payout</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobs.slice(0, 20).map((job) => (
                            <TableRow key={job.id}>
                              <TableCell className="font-mono text-xs">{job.booking_ref}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div className="text-sm">{job.pickup_date}</div>
                                <div className="text-xs text-zinc-500">{job.pickup_time}</div>
                              </TableCell>
                              <TableCell className="max-w-[150px]">
                                <div className="truncate text-xs" title={job.pickup_location}>{job.pickup_location}</div>
                                <div className="truncate text-xs text-zinc-500" title={job.dropoff_location}>→ {job.dropoff_location}</div>
                              </TableCell>
                              <TableCell>{job.assigned_driver_name || "-"}</TableCell>
                              <TableCell className="font-medium">£{(job.driver_price || 0).toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={getJobStatusColor(job.status)}>
                                  {job.status?.replace("_", " ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {jobs.length > 20 && (
                      <p className="text-sm text-zinc-500 text-center">Showing 20 of {jobs.length} jobs</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color} opacity-50`} />
      </div>
    </CardContent>
  </Card>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3">
    <Icon className="w-4 h-4 text-zinc-400" />
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-12 text-zinc-400">
    <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
    <p>{message}</p>
  </div>
);

export default FleetViewDialog;
