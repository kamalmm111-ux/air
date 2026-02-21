import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Car, Calendar,
  MapPin, Star, Clock, Download, RefreshCw, Building2, Truck,
  CheckCircle, XCircle, AlertTriangle, Eye, FileText, Navigation
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ["#D4AF37", "#0A0F1C", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

const CRMReports = ({ token }) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [groupBy, setGroupBy] = useState("day");
  
  // Report data states
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [bookingsData, setBookingsData] = useState(null);
  const [routesData, setRoutesData] = useState(null);
  const [customersData, setCustomersData] = useState(null);
  const [fleetsData, setFleetsData] = useState(null);
  const [driversData, setDriversData] = useState(null);
  const [cancellationsData, setCancellationsData] = useState(null);
  
  // Driver tracking dialog
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverTrackingData, setDriverTrackingData] = useState(null);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/dashboard?${params}`, { headers });
      setDashboardData(res.data);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchRevenue = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      params.append("group_by", groupBy);
      const res = await axios.get(`${API}/reports/revenue?${params}`, { headers });
      setRevenueData(res.data);
    } catch (error) {
      console.error("Error fetching revenue:", error);
    }
  }, [dateFrom, dateTo, groupBy, token]);

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/bookings?${params}`, { headers });
      setBookingsData(res.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchRoutes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/routes?${params}`, { headers });
      setRoutesData(res.data);
    } catch (error) {
      console.error("Error fetching routes:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/customers?${params}`, { headers });
      setCustomersData(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchFleets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/fleets?${params}`, { headers });
      setFleetsData(res.data);
    } catch (error) {
      console.error("Error fetching fleets:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchDrivers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/drivers?${params}`, { headers });
      setDriversData(res.data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchCancellations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/cancellations?${params}`, { headers });
      setCancellationsData(res.data);
    } catch (error) {
      console.error("Error fetching cancellations:", error);
    }
  }, [dateFrom, dateTo, token]);

  const fetchDriverTracking = async (driverId, driverName) => {
    setSelectedDriver({ id: driverId, name: driverName });
    setTrackingDialogOpen(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      const res = await axios.get(`${API}/reports/driver-tracking/${driverId}?${params}`, { headers });
      setDriverTrackingData(res.data);
    } catch (error) {
      toast.error("Failed to load driver tracking data");
    }
  };

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDashboard(),
      fetchRevenue(),
      fetchBookings(),
      fetchRoutes(),
      fetchCustomers(),
      fetchFleets(),
      fetchDrivers(),
      fetchCancellations()
    ]);
    setLoading(false);
    toast.success("Reports refreshed");
  };

  useEffect(() => {
    refreshAllData();
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (activeTab === "revenue") fetchRevenue();
  }, [groupBy]);

  const setQuickRange = (range) => {
    const today = new Date();
    let from = new Date();
    
    switch (range) {
      case "today":
        from = today;
        break;
      case "yesterday":
        from.setDate(today.getDate() - 1);
        setDateTo(from.toISOString().split('T')[0]);
        setDateFrom(from.toISOString().split('T')[0]);
        return;
      case "7days":
        from.setDate(today.getDate() - 7);
        break;
      case "30days":
        from.setDate(today.getDate() - 30);
        break;
      case "90days":
        from.setDate(today.getDate() - 90);
        break;
      case "thisMonth":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case "lastMonth":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        setDateTo(lastDay.toISOString().split('T')[0]);
        setDateFrom(from.toISOString().split('T')[0]);
        return;
      case "thisYear":
        from = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        break;
    }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  };

  const exportToCSV = (data, filename) => {
    if (!data || !data.length) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  };

  const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = "text-[#0A0F1C]" }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg ${trend > 0 ? "bg-green-100" : trend < 0 ? "bg-red-100" : "bg-zinc-100"}`}>
            <Icon className={`w-5 h-5 ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-zinc-600"}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center mt-2 text-xs ${trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-zinc-500"}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
            {trend > 0 ? "+" : ""}{trend}% vs previous period
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="crm-reports">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F1C]">CRM & Reports</h2>
          <p className="text-zinc-500">Comprehensive business analytics and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={refreshAllData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-2">
              {["today", "7days", "30days", "thisMonth", "lastMonth", "thisYear"].map((range) => (
                <Button
                  key={range}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickRange(range)}
                  className="text-xs"
                >
                  {range === "today" ? "Today" : 
                   range === "7days" ? "7 Days" :
                   range === "30days" ? "30 Days" :
                   range === "thisMonth" ? "This Month" :
                   range === "lastMonth" ? "Last Month" : "This Year"}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div>
                <Label className="text-xs">From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36" />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="fleets">Fleets</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="cancellations">Issues</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboardData && (
            <>
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <KPICard title="Total Revenue" value={`£${dashboardData.kpis.total_revenue.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
                <KPICard title="Total Profit" value={`£${dashboardData.kpis.total_profit.toLocaleString()}`} subtitle={`${dashboardData.kpis.profit_margin}% margin`} icon={TrendingUp} color="text-[#D4AF37]" />
                <KPICard title="Total Bookings" value={dashboardData.kpis.total_bookings} subtitle={`${dashboardData.kpis.completion_rate}% completed`} icon={Calendar} />
                <KPICard title="Avg Booking Value" value={`£${dashboardData.kpis.avg_booking_value}`} icon={DollarSign} />
                <KPICard title="Unique Customers" value={dashboardData.kpis.unique_customers} subtitle={`${dashboardData.kpis.new_customers} new`} icon={Users} />
                <KPICard title="Today's Revenue" value={`£${dashboardData.kpis.today_revenue}`} subtitle={`${dashboardData.kpis.today_bookings} bookings`} icon={Clock} color="text-blue-600" />
              </div>

              {/* B2B vs B2C */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Revenue Split</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "B2B Corporate", value: dashboardData.kpis.b2b_revenue },
                            { name: "B2C Direct", value: dashboardData.kpis.b2c_revenue }
                          ]}
                          cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#D4AF37" />
                          <Cell fill="#0A0F1C" />
                        </Pie>
                        <Tooltip formatter={(v) => `£${v.toLocaleString()}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Booking Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Completed</span>
                        <span className="font-bold">{dashboardData.kpis.completed_bookings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Cancelled</span>
                        <span className="font-bold">{dashboardData.kpis.cancelled_bookings}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> No Shows</span>
                        <span className="font-bold">{dashboardData.kpis.no_show_bookings}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Operations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><Truck className="w-4 h-4 text-blue-500" /> Active Fleets</span>
                        <span className="font-bold">{dashboardData.kpis.active_fleets}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" /> Active Drivers</span>
                        <span className="font-bold">{dashboardData.kpis.active_drivers}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-500" /> Driver Costs</span>
                        <span className="font-bold">£{dashboardData.kpis.total_driver_cost.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="flex items-center justify-between">
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(revenueData?.trend, "revenue_report")}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>

          {revenueData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Total Revenue" value={`£${revenueData.totals.revenue.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
                <KPICard title="Total Cost" value={`£${revenueData.totals.cost.toLocaleString()}`} icon={TrendingDown} color="text-red-500" />
                <KPICard title="Net Profit" value={`£${revenueData.totals.profit.toLocaleString()}`} icon={TrendingUp} color="text-[#D4AF37]" />
                <KPICard title="Avg Per Booking" value={`£${revenueData.totals.avg_revenue_per_booking}`} icon={DollarSign} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={revenueData.trend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `£${v.toLocaleString()}`} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b98133" name="Revenue" />
                      <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef444433" name="Cost" />
                      <Area type="monotone" dataKey="profit" stroke="#D4AF37" fill="#D4AF3733" name="Profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          {bookingsData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={bookingsData.status_breakdown} cx="50%" cy="50%" outerRadius={100} dataKey="count" label={({ status, count }) => `${status}: ${count}`}>
                          {bookingsData.status_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vehicle Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={bookingsData.category_breakdown.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#D4AF37" name="Bookings" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Booking Times Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={bookingsData.hourly_distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#0A0F1C" name="Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-6">
          {routesData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-green-500" /> Top Pickup Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Bookings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routesData.top_pickup_locations.slice(0, 10).map((loc, i) => (
                          <TableRow key={i}>
                            <TableCell className="truncate max-w-[200px]" title={loc.location}>{loc.location}</TableCell>
                            <TableCell className="text-right font-medium">{loc.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-red-500" /> Top Dropoff Locations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Bookings</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {routesData.top_dropoff_locations.slice(0, 10).map((loc, i) => (
                          <TableRow key={i}>
                            <TableCell className="truncate max-w-[200px]" title={loc.location}>{loc.location}</TableCell>
                            <TableCell className="text-right font-medium">{loc.count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top Routes by Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="text-right">Bookings</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routesData.top_routes.slice(0, 15).map((route, i) => (
                        <TableRow key={i}>
                          <TableCell className="truncate max-w-[400px]" title={route.route}>{route.route}</TableCell>
                          <TableCell className="text-right">{route.count}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">£{route.revenue.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(customersData?.top_customers, "customers_report")}>
            <Download className="w-4 h-4 mr-2" /> Export Customers
          </Button>

          {customersData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Total Customers" value={customersData.total_customers} icon={Users} />
                <KPICard title="B2B Accounts" value={customersData.summary.b2b_customer_count} icon={Building2} />
                <KPICard title="Avg Bookings/Customer" value={customersData.summary.avg_bookings_per_customer} icon={Calendar} />
                <KPICard title="Avg Customer Value" value={`£${customersData.summary.avg_customer_value}`} icon={DollarSign} color="text-green-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Customers by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Bookings</TableHead>
                          <TableHead className="text-right">Spent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customersData.top_customers.slice(0, 20).map((c, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-zinc-500">{c.email}</div>
                            </TableCell>
                            <TableCell className="text-right">{c.completed_bookings}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">£{c.total_spend.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> B2B Corporate Accounts</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Bookings</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customersData.b2b_accounts.map((acc, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <div className="font-medium">{acc.company_name}</div>
                              <div className="text-xs text-zinc-500">{acc.payment_terms}</div>
                            </TableCell>
                            <TableCell className="text-right">{acc.completed_bookings}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">£{acc.revenue.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Fleets Tab */}
        <TabsContent value="fleets" className="space-y-6">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(fleetsData?.fleets, "fleet_report")}>
            <Download className="w-4 h-4 mr-2" /> Export Fleet Data
          </Button>

          {fleetsData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Total Fleets" value={fleetsData.totals.total_fleets} icon={Truck} />
                <KPICard title="Active Fleets" value={fleetsData.totals.active_fleets} icon={CheckCircle} color="text-green-600" />
                <KPICard title="Total Revenue" value={`£${fleetsData.totals.total_revenue.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
                <KPICard title="Total Profit" value={`£${fleetsData.totals.total_profit.toLocaleString()}`} icon={TrendingUp} color="text-[#D4AF37]" />
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fleet</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Drivers</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fleetsData.fleets.map((fleet) => (
                        <TableRow key={fleet.id}>
                          <TableCell className="font-medium">{fleet.name}</TableCell>
                          <TableCell>
                            <Badge className={fleet.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {fleet.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{fleet.total_bookings}</TableCell>
                          <TableCell className="text-right">{fleet.completed_bookings}</TableCell>
                          <TableCell className="text-right">{fleet.completion_rate}%</TableCell>
                          <TableCell className="text-right font-medium text-green-600">£{fleet.revenue.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-[#D4AF37]">£{fleet.profit.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{fleet.driver_count}</TableCell>
                          <TableCell className="text-right">
                            {fleet.avg_rating > 0 && (
                              <span className="flex items-center justify-end gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                {fleet.avg_rating}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(driversData?.drivers, "drivers_report")}>
              <Download className="w-4 h-4 mr-2" /> Export Driver Data
            </Button>
          </div>

          {driversData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard title="Total Drivers" value={driversData.summary.total_drivers} icon={Users} />
                <KPICard title="Active Drivers" value={driversData.summary.active_drivers} icon={CheckCircle} color="text-green-600" />
                <KPICard title="Jobs Assigned" value={driversData.summary.total_jobs_assigned} icon={Calendar} />
                <KPICard title="Total Earnings" value={`£${driversData.summary.total_earnings.toLocaleString()}`} icon={DollarSign} color="text-green-600" />
                <KPICard title="Avg Rating" value={driversData.summary.avg_rating} icon={Star} color="text-amber-500" />
              </div>

              {/* Leaderboards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top by Jobs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driversData.leaderboard.by_jobs.slice(0, 5).map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold">{d.completed_jobs} jobs</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top by Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driversData.leaderboard.by_earnings.slice(0, 5).map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">£{d.earnings.toLocaleString()}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top by Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driversData.leaderboard.by_rating.slice(0, 5).map((d, i) => (
                      <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-400">#{i + 1}</span>
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-bold">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {d.avg_rating}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Full Driver Table */}
              <Card>
                <CardHeader>
                  <CardTitle>All Drivers Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Fleet</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Jobs</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Earnings</TableHead>
                        <TableHead className="text-right">Rating</TableHead>
                        <TableHead className="text-right">On-Time</TableHead>
                        <TableHead>Tracking</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driversData.drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell>
                            <div className="font-medium">{driver.name}</div>
                            <div className="text-xs text-zinc-500">{driver.phone}</div>
                          </TableCell>
                          <TableCell className="text-sm">{driver.fleet_name}</TableCell>
                          <TableCell>
                            <Badge className={driver.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {driver.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{driver.total_jobs}</TableCell>
                          <TableCell className="text-right">{driver.completed_jobs}</TableCell>
                          <TableCell className="text-right">{driver.completion_rate}%</TableCell>
                          <TableCell className="text-right font-medium text-green-600">£{driver.earnings.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {driver.avg_rating > 0 && (
                              <span className="flex items-center justify-end gap-1">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                {driver.avg_rating}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{driver.on_time_rate}%</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchDriverTracking(driver.id, driver.name)}
                              title="View Job Tracking"
                            >
                              <Navigation className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Cancellations/Issues Tab */}
        <TabsContent value="cancellations" className="space-y-6">
          {cancellationsData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KPICard title="Total Cancellations" value={cancellationsData.total_cancellations} icon={XCircle} color="text-red-500" />
                <KPICard title="Lost Revenue" value={`£${cancellationsData.total_lost_revenue.toLocaleString()}`} icon={TrendingDown} color="text-red-500" />
                <KPICard title="Most Common" value={cancellationsData.status_breakdown[0]?.status || "-"} icon={AlertTriangle} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Issue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={cancellationsData.status_breakdown} cx="50%" cy="50%" outerRadius={80} dataKey="count" label={({ status, count }) => `${status}: ${count}`}>
                          {cancellationsData.status_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cancellation Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={cancellationsData.by_date}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Issues</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Lost Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancellationsData.recent_cancellations.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.booking_ref}</TableCell>
                          <TableCell>{b.pickup_date}</TableCell>
                          <TableCell>{b.customer_name}</TableCell>
                          <TableCell className="truncate max-w-[200px]">{b.pickup_location} → {b.dropoff_location}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-800">{b.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-red-600">£{(b.customer_price || b.price || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Driver Tracking Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Job Tracking: {selectedDriver?.name}
            </DialogTitle>
          </DialogHeader>
          
          {driverTrackingData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-zinc-50 p-3 rounded-lg">
                  <p className="text-xs text-zinc-500">Total Jobs</p>
                  <p className="text-xl font-bold">{driverTrackingData.summary.total_jobs}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-zinc-500">Completed</p>
                  <p className="text-xl font-bold text-green-600">{driverTrackingData.summary.completed_jobs}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-zinc-500">Tracking Rate</p>
                  <p className="text-xl font-bold text-blue-600">{driverTrackingData.summary.tracking_rate}%</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-xs text-zinc-500">Earnings</p>
                  <p className="text-xl font-bold text-amber-600">£{driverTrackingData.summary.total_earnings}</p>
                </div>
              </div>

              {/* Jobs List */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverTrackingData.jobs.map((job) => (
                    <TableRow key={job.booking_id}>
                      <TableCell className="font-mono text-xs">{job.booking_ref}</TableCell>
                      <TableCell>{job.pickup_date} {job.pickup_time}</TableCell>
                      <TableCell>{job.customer_name}</TableCell>
                      <TableCell className="truncate max-w-[150px]" title={`${job.pickup_location} → ${job.dropoff_location}`}>
                        {job.pickup_location?.split(",")[0]} → {job.dropoff_location?.split(",")[0]}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          job.status === "completed" ? "bg-green-100 text-green-800" :
                          job.status === "cancelled" ? "bg-red-100 text-red-800" :
                          "bg-zinc-100 text-zinc-800"
                        }>{job.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          job.tracking_status === "completed" ? "bg-green-100 text-green-800" :
                          job.tracking_status === "active" ? "bg-blue-100 text-blue-800" :
                          "bg-zinc-100 text-zinc-800"
                        }>{job.tracking_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">£{(job.driver_price || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMReports;
