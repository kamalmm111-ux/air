import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { 
  Calendar, DollarSign, Clock, CheckCircle, TrendingUp, MapPin, Users, 
  Briefcase, Play, Check, Eye, FileText, Download
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetDashboard = () => {
  const { activeTab } = useOutletContext();
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    try {
      const [statsRes, jobsRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/fleet/stats`, { headers }),
        axios.get(`${API}/fleet/jobs`, { headers }),
        axios.get(`${API}/invoices`, { headers })
      ]);
      setStats(statsRes.data);
      setJobs(jobsRes.data);
      setInvoices(invoicesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  const startJob = async (bookingId) => {
    await updateJobStatus(bookingId, "en_route");
  };

  const completeJob = async (bookingId) => {
    await updateJobStatus(bookingId, "completed");
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
    return <Badge className={styles[status] || "bg-zinc-100"}>{labels[status] || status.replace("_", " ")}</Badge>;
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

  const renderJobs = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="New Jobs" value={stats?.new_jobs || 0} icon={Calendar} color="bg-yellow-500" />
        <StatCard title="Accepted" value={stats?.accepted_jobs || 0} icon={CheckCircle} color="bg-blue-500" />
        <StatCard title="In Progress" value={stats?.in_progress_jobs || 0} icon={Play} color="bg-purple-500" />
        <StatCard title="Completed" value={stats?.completed_jobs || 0} icon={Check} color="bg-green-500" />
      </div>

      {/* Filter */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#0A0F1C]">Assigned Jobs</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            <SelectItem value="assigned">New</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="en_route">En Route</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-600">No jobs found</h3>
              <p className="text-zinc-400">Jobs assigned to your fleet will appear here</p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="border-l-4 border-l-[#D4AF37]" data-testid={`fleet-job-${job.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                      {getStatusBadge(job.status)}
                      <span className="font-mono text-sm text-zinc-500">
                        {job.booking_ref || job.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-600 mt-1" />
                        <div>
                          <p className="text-xs text-zinc-500">PICKUP</p>
                          <p className="font-medium">{job.pickup_location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-600 mt-1" />
                        <div>
                          <p className="text-xs text-zinc-500">DROP-OFF</p>
                          <p className="font-medium">{job.dropoff_location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {job.pickup_date} at {job.pickup_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {job.passengers} pax
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {job.luggage} bags
                      </span>
                      <span className="font-medium">{job.vehicle_name}</span>
                    </div>

                    {/* Passenger */}
                    <div className="text-sm">
                      <span className="text-zinc-500">Passenger: </span>
                      <span className="font-medium">{job.customer_name || job.passenger_name}</span>
                      <span className="text-zinc-400 ml-2">{job.customer_phone || job.passenger_phone}</span>
                    </div>
                  </div>

                  {/* Price & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <p className="text-2xl font-bold text-[#0A0F1C]">£{job.price?.toFixed(2)}</p>
                    
                    {job.status === "assigned" && (
                      <Button
                        onClick={() => acceptJob(job.id)}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`accept-job-${job.id}`}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Accept Job
                      </Button>
                    )}
                    
                    {job.status === "accepted" && (
                      <Button
                        onClick={() => startJob(job.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                        data-testid={`start-job-${job.id}`}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        En Route
                      </Button>
                    )}
                    
                    {job.status === "en_route" && (
                      <Button
                        onClick={() => updateJobStatus(job.id, "arrived")}
                        className="bg-teal-600 hover:bg-teal-700"
                        data-testid={`arrived-job-${job.id}`}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        Arrived
                      </Button>
                    )}

                    {job.status === "arrived" && (
                      <Button
                        onClick={() => updateJobStatus(job.id, "in_progress")}
                        className="bg-purple-600 hover:bg-purple-700"
                        data-testid={`start-trip-${job.id}`}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Trip
                      </Button>
                    )}
                    
                    {job.status === "in_progress" && (
                      <Button
                        onClick={() => completeJob(job.id)}
                        className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0F1C]"
                        data-testid={`complete-job-${job.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderEarnings = () => (
    <div className="space-y-6">
      {/* Earnings Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B]">
          <CardContent className="p-6 text-[#0A0F1C]">
            <p className="text-sm opacity-80">Total Earnings</p>
            <p className="text-4xl font-bold mt-2">£{stats?.total_earnings?.toFixed(2) || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Net Earnings (After Commission)</p>
            <p className="text-4xl font-bold text-green-600 mt-2">£{stats?.net_earnings?.toFixed(2) || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500">Completed Jobs</p>
            <p className="text-4xl font-bold text-[#0A0F1C] mt-2">{stats?.completed_jobs || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
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

  const renderVehicles = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#0A0F1C]">Coming Soon</h2>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-zinc-500">Vehicle management will be available in the next update</p>
        </CardContent>
      </Card>
    </div>
  );

  const content = {
    jobs: renderJobs(),
    earnings: renderEarnings(),
    invoices: renderInvoices(),
    vehicles: renderVehicles()
  };

  return (
    <div className="p-8" data-testid="fleet-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A0F1C] capitalize" style={{ fontFamily: 'Chivo, sans-serif' }}>
          {activeTab === "jobs" ? "Your Jobs" : activeTab}
        </h1>
      </div>
      {content[activeTab] || content.jobs}
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

export default FleetDashboard;
