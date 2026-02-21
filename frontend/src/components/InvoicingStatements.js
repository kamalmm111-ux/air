import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { 
  FileText, Plus, Download, Eye, Edit, Check, X, Search, 
  Calendar, DollarSign, Users, Building2, Truck, Clock, Printer,
  AlertTriangle, CheckCircle, Send, Trash2, RefreshCw, UserCircle,
  FileSpreadsheet, Receipt, CreditCard, PenLine, FilePlus
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const InvoicingStatements = ({ token }) => {
  const [activeMainTab, setActiveMainTab] = useState("statements");
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Entity data
  const [drivers, setDrivers] = useState([]);
  const [fleets, setFleets] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [driverStatementOpen, setDriverStatementOpen] = useState(false);
  const [fleetStatementOpen, setFleetStatementOpen] = useState(false);
  const [customerStatementOpen, setCustomerStatementOpen] = useState(false);
  const [customInvoiceOpen, setCustomInvoiceOpen] = useState(false);
  const [amendDialogOpen, setAmendDialogOpen] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0, draft: 0, pending: 0, issued: 0, paid: 0, overdue: 0,
    totalAmount: 0, totalProfit: 0, driverStatements: 0, fleetStatements: 0, customerInvoices: 0
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [invoicesRes, driversRes, fleetsRes, customersRes] = await Promise.all([
        axios.get(`${API}/invoices`, { headers }),
        axios.get(`${API}/drivers`, { headers }),
        axios.get(`${API}/fleets`, { headers }),
        axios.get(`${API}/admin/customers`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      const data = invoicesRes.data || [];
      setInvoices(data);
      setDrivers(driversRes.data || []);
      setFleets(fleetsRes.data || []);
      setCustomers(customersRes.data || []);
      
      const now = new Date();
      setStats({
        total: data.length,
        draft: data.filter(i => i.status === "draft").length,
        pending: data.filter(i => i.status === "pending_approval").length,
        issued: data.filter(i => i.status === "issued" || i.status === "approved").length,
        paid: data.filter(i => i.status === "paid").length,
        overdue: data.filter(i => i.status === "issued" && new Date(i.due_date) < now).length,
        totalAmount: data.reduce((sum, i) => sum + (i.total || 0), 0),
        totalProfit: data.filter(i => i.invoice_type === "customer").reduce((sum, i) => sum + (i.profit_total || 0), 0),
        driverStatements: data.filter(i => i.invoice_type === "driver").length,
        fleetStatements: data.filter(i => i.invoice_type === "fleet").length,
        customerInvoices: data.filter(i => i.invoice_type === "customer").length
      });
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = searchTerm === "" || 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesType = typeFilter === "all" || inv.invoice_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-zinc-100 text-zinc-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      issued: "bg-indigo-100 text-indigo-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-zinc-300 text-zinc-600"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{status?.replace("_", " ")}</Badge>;
  };

  const getTypeBadge = (type) => {
    const styles = {
      customer: "bg-purple-100 text-purple-800",
      fleet: "bg-blue-100 text-blue-800",
      driver: "bg-orange-100 text-orange-800",
      custom: "bg-teal-100 text-teal-800"
    };
    const icons = {
      customer: <Building2 className="w-3 h-3 mr-1" />,
      fleet: <Truck className="w-3 h-3 mr-1" />,
      driver: <UserCircle className="w-3 h-3 mr-1" />,
      custom: <FileSpreadsheet className="w-3 h-3 mr-1" />
    };
    return (
      <Badge className={`${styles[type] || "bg-zinc-100"} flex items-center`}>
        {icons[type]}{type}
      </Badge>
    );
  };

  const handleApprove = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/approve`, {}, { headers });
      toast.success("Invoice approved");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve invoice");
    }
  };

  const handleIssue = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/issue`, {}, { headers });
      toast.success("Invoice issued");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to issue invoice");
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/mark-paid`, {}, { headers });
      toast.success("Invoice marked as paid");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to mark invoice as paid");
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await axios.delete(`${API}/invoices/${invoiceId}`, { headers });
      toast.success("Invoice deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete invoice");
    }
  };

  const downloadPdf = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Invoice downloaded");
    } catch (error) {
      // Fallback to HTML download
      try {
        const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, { headers });
        const blob = new Blob([response.data], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice_${invoiceId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Invoice downloaded (HTML)");
      } catch (e) {
        toast.error("Failed to download invoice");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoicing-statements">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Total Documents" value={stats.total} icon={FileText} color="text-zinc-600" />
        <StatCard title="Driver Statements" value={stats.driverStatements} icon={UserCircle} color="text-orange-600" />
        <StatCard title="Fleet Statements" value={stats.fleetStatements} icon={Truck} color="text-blue-600" />
        <StatCard title="Customer Invoices" value={stats.customerInvoices} icon={Building2} color="text-purple-600" />
        <StatCard title="Paid" value={stats.paid} icon={CheckCircle} color="text-green-600" />
        <StatCard title="Total Value" value={`£${stats.totalAmount.toFixed(0)}`} icon={DollarSign} color="text-[#D4AF37]" />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Generate Statements
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" /> All Invoices
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <FilePlus className="w-4 h-4" /> Custom Invoice
          </TabsTrigger>
        </TabsList>

        {/* Generate Statements Tab */}
        <TabsContent value="statements" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Driver Statement Card */}
            <Card className="border-orange-200 hover:border-orange-400 transition-colors cursor-pointer" onClick={() => setDriverStatementOpen(true)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <UserCircle className="w-6 h-6" />
                  Driver Statement
                </CardTitle>
                <CardDescription>
                  Generate earning statements for individual drivers showing completed jobs, earnings, and payout details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-orange-600 hover:bg-orange-700" data-testid="generate-driver-statement">
                  <Plus className="w-4 h-4 mr-2" /> Generate Driver Statement
                </Button>
              </CardContent>
            </Card>

            {/* Fleet Statement Card */}
            <Card className="border-blue-200 hover:border-blue-400 transition-colors cursor-pointer" onClick={() => setFleetStatementOpen(true)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Truck className="w-6 h-6" />
                  Fleet Statement
                </CardTitle>
                <CardDescription>
                  Generate partner statements for fleet operators with revenue, commission, and net payment breakdown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" data-testid="generate-fleet-statement">
                  <Plus className="w-4 h-4 mr-2" /> Generate Fleet Statement
                </Button>
              </CardContent>
            </Card>

            {/* Customer Invoice Card */}
            <Card className="border-purple-200 hover:border-purple-400 transition-colors cursor-pointer" onClick={() => setCustomerStatementOpen(true)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Building2 className="w-6 h-6" />
                  Customer Invoice
                </CardTitle>
                <CardDescription>
                  Generate consolidated monthly invoices for corporate B2B customers listing all their bookings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-600 hover:bg-purple-700" data-testid="generate-customer-invoice">
                  <Plus className="w-4 h-4 mr-2" /> Generate Customer Invoice
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Statements */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Statements</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.slice(0, 10).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{getTypeBadge(invoice.invoice_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.entity_name}</div>
                        <div className="text-xs text-zinc-500">{invoice.entity_email}</div>
                      </TableCell>
                      <TableCell>
                        {invoice.period_start ? (
                          <div className="text-xs">{invoice.period_start} → {invoice.period_end}</div>
                        ) : (
                          <span className="text-sm">{invoice.booking_ids?.length || 0} jobs</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">£{invoice.total?.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}>
                            <Eye className="w-4 h-4 text-[#D4AF37]" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(invoice.id)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Invoices Tab */}
        <TabsContent value="invoices" className="mt-6">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-zinc-500">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input
                      placeholder="Search by invoice # or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="invoice-search"
                    />
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-zinc-500">Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger data-testid="invoice-type-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="fleet">Fleet</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-zinc-500">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="invoice-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setTypeFilter("all"); }}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Period/Jobs</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{getTypeBadge(invoice.invoice_type)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.entity_name}</div>
                        <div className="text-xs text-zinc-500">{invoice.entity_email}</div>
                      </TableCell>
                      <TableCell>
                        {invoice.period_start ? (
                          <div className="text-xs">{invoice.period_start} → {invoice.period_end}</div>
                        ) : (
                          <span className="text-sm">{invoice.booking_ids?.length || 0} jobs</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">£{invoice.subtotal?.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-zinc-500">
                        {invoice.commission > 0 ? `-£${invoice.commission?.toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold">£{invoice.total?.toFixed(2)}</TableCell>
                      <TableCell className="whitespace-nowrap">{invoice.due_date?.slice(0, 10)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }} title="View">
                            <Eye className="w-4 h-4 text-[#D4AF37]" />
                          </Button>
                          {invoice.status === "draft" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setEditDialogOpen(true); }} title="Edit">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setAmendDialogOpen(true); }} title="Amend">
                                <PenLine className="w-4 h-4 text-purple-600" />
                              </Button>
                            </>
                          )}
                          {invoice.status === "pending_approval" && (
                            <Button variant="ghost" size="sm" onClick={() => handleApprove(invoice.id)} title="Approve" className="text-green-600">
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {(invoice.status === "draft" || invoice.status === "approved") && (
                            <Button variant="ghost" size="sm" onClick={() => handleIssue(invoice.id)} title="Issue" className="text-blue-600">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.status === "issued" && (
                            <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(invoice.id)} title="Mark Paid" className="text-green-600">
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(invoice.id)} title="Download PDF">
                            <Download className="w-4 h-4" />
                          </Button>
                          {invoice.status === "draft" && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)} title="Delete" className="text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-zinc-500">No invoices found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Invoice Tab */}
        <TabsContent value="custom" className="mt-6">
          <CustomInvoiceForm token={token} headers={headers} onSuccess={fetchData} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DriverStatementDialog
        open={driverStatementOpen}
        onClose={() => setDriverStatementOpen(false)}
        drivers={drivers}
        token={token}
        onSuccess={fetchData}
      />
      
      <FleetStatementDialog
        open={fleetStatementOpen}
        onClose={() => setFleetStatementOpen(false)}
        fleets={fleets}
        token={token}
        onSuccess={fetchData}
      />
      
      <CustomerStatementDialog
        open={customerStatementOpen}
        onClose={() => setCustomerStatementOpen(false)}
        customers={customers}
        token={token}
        onSuccess={fetchData}
      />

      <ViewInvoiceDialog
        open={viewDialogOpen}
        onClose={() => { setViewDialogOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        token={token}
        onDownload={downloadPdf}
      />

      <EditInvoiceDialog
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        token={token}
        onSuccess={fetchData}
      />

      <AmendInvoiceDialog
        open={amendDialogOpen}
        onClose={() => { setAmendDialogOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        token={token}
        onSuccess={fetchData}
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">{title}</p>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`w-6 h-6 ${color} opacity-50`} />
      </div>
    </CardContent>
  </Card>
);

// Driver Statement Dialog
const DriverStatementDialog = ({ open, onClose, drivers, token, onSuccess }) => {
  const [driverId, setDriverId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  const handlePreview = async () => {
    if (!driverId || !dateFrom || !dateTo) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/statements/driver/${driverId}/summary?date_from=${dateFrom}&date_to=${dateTo}`,
        { headers }
      );
      setPreview(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to fetch preview");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!driverId || !dateFrom || !dateTo) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/statements/driver/generate?driver_id=${driverId}&date_from=${dateFrom}&date_to=${dateTo}`,
        {},
        { headers }
      );
      toast.success(`Statement generated: ${res.data.invoice_number}`);
      onClose();
      onSuccess();
      setDriverId("");
      setDateFrom("");
      setDateTo("");
      setPreview(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate statement");
    } finally {
      setLoading(false);
    }
  };

  // Set default dates (last 30 days)
  useEffect(() => {
    if (open && !dateFrom && !dateTo) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      setDateTo(today.toISOString().split('T')[0]);
      setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-orange-600" /> Generate Driver Statement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-1">
              <Label>Select Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger data-testid="driver-select">
                  <SelectValue placeholder="Choose driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.filter(d => d.status === "active").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="date-from" />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="date-to" />
            </div>
          </div>

          <Button variant="outline" onClick={handlePreview} disabled={loading || !driverId}>
            {loading ? "Loading..." : "Preview Statement"}
          </Button>

          {preview && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg">{preview.driver?.name}</h4>
                    <p className="text-sm text-zinc-600">{preview.driver?.email}</p>
                    <p className="text-sm text-zinc-600">{preview.driver?.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Period</p>
                    <p className="font-medium">{dateFrom} → {dateTo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Total Jobs</p>
                    <p className="text-2xl font-bold">{preview.summary?.total_jobs || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">£{(preview.summary?.total_earnings || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Avg per Job</p>
                    <p className="text-2xl font-bold">£{(preview.summary?.avg_earning_per_job || 0).toFixed(2)}</p>
                  </div>
                </div>

                {preview.weekly_breakdown?.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Weekly Breakdown</h5>
                    <div className="space-y-1">
                      {preview.weekly_breakdown.slice(0, 4).map((w, i) => (
                        <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span>{w.week}</span>
                          <span>{w.jobs} jobs - <strong>£{w.earnings.toFixed(2)}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !driverId || !preview}
            className="bg-orange-600 hover:bg-orange-700"
            data-testid="confirm-generate-driver-statement"
          >
            {loading ? "Generating..." : "Generate & Save Statement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Fleet Statement Dialog
const FleetStatementDialog = ({ open, onClose, fleets, token, onSuccess }) => {
  const [fleetId, setFleetId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  
  const headers = { Authorization: `Bearer ${token}` };

  const handlePreview = async () => {
    if (!fleetId || !dateFrom || !dateTo) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/statements/fleet/${fleetId}/summary?date_from=${dateFrom}&date_to=${dateTo}`,
        { headers }
      );
      setPreview(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to fetch preview");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!fleetId || !dateFrom || !dateTo) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/statements/fleet/generate?fleet_id=${fleetId}&date_from=${dateFrom}&date_to=${dateTo}`,
        {},
        { headers }
      );
      toast.success(`Statement generated: ${res.data.invoice_number}`);
      onClose();
      onSuccess();
      setFleetId("");
      setDateFrom("");
      setDateTo("");
      setPreview(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate statement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !dateFrom && !dateTo) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      setDateTo(today.toISOString().split('T')[0]);
      setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" /> Generate Fleet Statement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3 md:col-span-1">
              <Label>Select Fleet</Label>
              <Select value={fleetId} onValueChange={setFleetId}>
                <SelectTrigger data-testid="fleet-select">
                  <SelectValue placeholder="Choose fleet..." />
                </SelectTrigger>
                <SelectContent>
                  {fleets.filter(f => f.status === "active").map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <Button variant="outline" onClick={handlePreview} disabled={loading || !fleetId}>
            {loading ? "Loading..." : "Preview Statement"}
          </Button>

          {preview && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg">{preview.fleet?.name}</h4>
                    <p className="text-sm text-zinc-600">{preview.fleet?.email}</p>
                    <p className="text-sm text-zinc-600">Commission: {preview.fleet?.commission_rate}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">Period</p>
                    <p className="font-medium">{dateFrom} → {dateTo}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Total Jobs</p>
                    <p className="text-2xl font-bold">{preview.summary?.total_jobs || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Revenue</p>
                    <p className="text-2xl font-bold">£{(preview.summary?.total_revenue || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Cost</p>
                    <p className="text-2xl font-bold text-blue-600">£{(preview.summary?.total_cost || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-sm">
                    <p className="text-xs text-zinc-500">Profit</p>
                    <p className="text-2xl font-bold text-green-600">£{(preview.summary?.total_profit || 0).toFixed(2)}</p>
                  </div>
                </div>

                {preview.driver_breakdown?.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Driver Breakdown</h5>
                    <div className="space-y-1">
                      {preview.driver_breakdown.map((d, i) => (
                        <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                          <span>{d.name || "Unknown"}</span>
                          <span>{d.jobs} jobs - <strong>£{d.earnings.toFixed(2)}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !fleetId || !preview}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="confirm-generate-fleet-statement"
          >
            {loading ? "Generating..." : "Generate & Save Statement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Customer Statement Dialog
const CustomerStatementDialog = ({ open, onClose, customers, token, onSuccess }) => {
  const [customerId, setCustomerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };

  const handleGenerate = async () => {
    if (!customerId || !dateFrom || !dateTo) {
      toast.error("Please fill all fields");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/statements/customer/generate?customer_id=${customerId}&date_from=${dateFrom}&date_to=${dateTo}`,
        {},
        { headers }
      );
      toast.success(`Invoice generated: ${res.data.invoice_number}`);
      onClose();
      onSuccess();
      setCustomerId("");
      setDateFrom("");
      setDateTo("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !dateFrom && !dateTo) {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateTo(today.toISOString().split('T')[0]);
      setDateFrom(firstOfMonth.toISOString().split('T')[0]);
    }
  }, [open]);

  const activeCustomers = customers.filter(c => c.status === "active");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" /> Generate Customer Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {activeCustomers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No active B2B customer accounts found.</p>
              <p className="text-sm">Create a customer account first.</p>
            </div>
          ) : (
            <>
              <div>
                <Label>Select Customer Account</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger data-testid="customer-select">
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date From</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label>Date To</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
              <p className="text-sm text-zinc-500">
                This will generate a consolidated invoice for all completed bookings 
                for this customer within the selected date range.
              </p>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading || !customerId || activeCustomers.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="confirm-generate-customer-invoice"
          >
            {loading ? "Generating..." : "Generate Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Custom Invoice Form
const CustomInvoiceForm = ({ token, headers, onSuccess }) => {
  const [formData, setFormData] = useState({
    invoice_type: "custom",
    entity_name: "",
    entity_email: "",
    entity_phone: "",
    entity_address: "",
    tax_rate: 0,
    due_days: 30,
    notes: "",
    line_items: [{ description: "", quantity: 1, unit_price: 0 }]
  });
  const [loading, setLoading] = useState(false);

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: "", quantity: 1, unit_price: 0 }]
    });
  };

  const removeLineItem = (index) => {
    setFormData({
      ...formData,
      line_items: formData.line_items.filter((_, i) => i !== index)
    });
  };

  const updateLineItem = (index, field, value) => {
    const items = [...formData.line_items];
    items[index][field] = value;
    // Calculate total for each line
    items[index].total = (items[index].quantity || 1) * (items[index].unit_price || 0);
    setFormData({ ...formData, line_items: items });
  };

  const subtotal = formData.line_items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)), 0);
  const tax = subtotal * (formData.tax_rate / 100);
  const total = subtotal + tax;

  const handleSubmit = async () => {
    if (!formData.entity_name || !formData.entity_email || formData.line_items.length === 0) {
      toast.error("Please fill required fields and add at least one line item");
      return;
    }

    setLoading(true);
    try {
      // Prepare line items with totals
      const lineItems = formData.line_items.map(item => ({
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: (item.quantity || 1) * (item.unit_price || 0)
      }));

      const res = await axios.post(`${API}/invoices/custom`, {
        invoice_type: formData.invoice_type,
        entity_name: formData.entity_name,
        entity_email: formData.entity_email,
        entity_phone: formData.entity_phone || null,
        entity_address: formData.entity_address || null,
        line_items: lineItems,
        tax_rate: formData.tax_rate,
        due_days: formData.due_days,
        notes: formData.notes || null
      }, { headers });

      toast.success(`Custom invoice created: ${res.data.invoice_number}`);
      onSuccess();
      // Reset form
      setFormData({
        invoice_type: "custom",
        entity_name: "",
        entity_email: "",
        entity_phone: "",
        entity_address: "",
        tax_rate: 0,
        due_days: 30,
        notes: "",
        line_items: [{ description: "", quantity: 1, unit_price: 0 }]
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FilePlus className="w-5 h-5 text-teal-600" />
          Create Custom Invoice
        </CardTitle>
        <CardDescription>
          Create an ad-hoc invoice with custom line items, not linked to any booking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Invoice Type</Label>
            <Select value={formData.invoice_type} onValueChange={(v) => setFormData({...formData, invoice_type: v})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="fleet">Fleet</SelectItem>
                <SelectItem value="driver">Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due In (Days)</Label>
            <Select value={String(formData.due_days)} onValueChange={(v) => setFormData({...formData, due_days: parseInt(v)})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Bill To (Name) *</Label>
            <Input 
              value={formData.entity_name} 
              onChange={(e) => setFormData({...formData, entity_name: e.target.value})}
              placeholder="Company or Person Name"
              data-testid="custom-invoice-name"
            />
          </div>
          <div>
            <Label>Email *</Label>
            <Input 
              type="email"
              value={formData.entity_email} 
              onChange={(e) => setFormData({...formData, entity_email: e.target.value})}
              placeholder="email@example.com"
              data-testid="custom-invoice-email"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input 
              value={formData.entity_phone} 
              onChange={(e) => setFormData({...formData, entity_phone: e.target.value})}
              placeholder="+44..."
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input 
              value={formData.entity_address} 
              onChange={(e) => setFormData({...formData, entity_address: e.target.value})}
              placeholder="Billing address"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <Label className="text-base font-semibold">Line Items</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Line
            </Button>
          </div>
          
          <div className="space-y-2">
            {formData.line_items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-zinc-50 rounded-sm">
                <Input 
                  placeholder="Description" 
                  value={item.description} 
                  onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                  className="flex-1"
                  data-testid={`line-item-${i}-description`}
                />
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={item.quantity} 
                  onChange={(e) => updateLineItem(i, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-20"
                  min="1"
                />
                <div className="flex items-center">
                  <span className="text-zinc-500 mr-1">£</span>
                  <Input 
                    type="number" 
                    placeholder="Price" 
                    value={item.unit_price} 
                    onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-24"
                    step="0.01"
                    data-testid={`line-item-${i}-price`}
                  />
                </div>
                <span className="w-24 text-right font-medium">
                  £{((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}
                </span>
                {formData.line_items.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(i)}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tax & Notes */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>VAT Rate (%)</Label>
            <Input 
              type="number" 
              value={formData.tax_rate} 
              onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value) || 0})}
              placeholder="0"
              step="0.1"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>

        {/* Totals */}
        <Card className="bg-zinc-50">
          <CardContent className="p-4">
            <div className="space-y-2 text-right">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">£{subtotal.toFixed(2)}</span>
              </div>
              {formData.tax_rate > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>VAT ({formData.tax_rate}%):</span>
                  <span>£{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-[#0A0F1C]">£{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSubmit} 
          disabled={loading || !formData.entity_name || !formData.entity_email}
          className="w-full bg-teal-600 hover:bg-teal-700"
          data-testid="create-custom-invoice-btn"
        >
          {loading ? "Creating..." : "Create Custom Invoice"}
        </Button>
      </CardContent>
    </Card>
  );
};

// View Invoice Dialog
const ViewInvoiceDialog = ({ open, onClose, invoice, token, onDownload }) => {
  if (!invoice) return null;

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-zinc-100 text-zinc-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      issued: "bg-indigo-100 text-indigo-800",
      paid: "bg-green-100 text-green-800"
    };
    return colors[status] || "bg-zinc-100";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              Invoice #{invoice.invoice_number}
            </span>
            <Badge className={getStatusColor(invoice.status)}>{invoice.status?.replace("_", " ")}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-zinc-500 text-sm mb-2">BILL TO</h4>
              <p className="font-medium">{invoice.entity_name}</p>
              <p className="text-sm text-zinc-600">{invoice.entity_email}</p>
              {invoice.entity_phone && <p className="text-sm text-zinc-600">{invoice.entity_phone}</p>}
              {invoice.entity_address && <p className="text-sm text-zinc-600">{invoice.entity_address}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm"><span className="text-zinc-500">Invoice Date:</span> {invoice.created_at?.slice(0, 10)}</p>
              <p className="text-sm"><span className="text-zinc-500">Due Date:</span> {invoice.due_date?.slice(0, 10)}</p>
              <p className="text-sm"><span className="text-zinc-500">Payment Terms:</span> {invoice.payment_terms}</p>
              {invoice.period_start && (
                <p className="text-sm"><span className="text-zinc-500">Period:</span> {invoice.period_start} → {invoice.period_end}</p>
              )}
              {invoice.amendment_count > 0 && (
                <p className="text-sm text-orange-600">Amended {invoice.amendment_count}x</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-zinc-500 text-sm mb-2">LINE ITEMS</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{invoice.booking_ids?.length > 0 ? "Ref" : "#"}</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{item.booking_ref || idx + 1}</TableCell>
                    <TableCell className="text-sm max-w-[200px]">
                      <div className="truncate">{item.description}</div>
                      {item.details && <div className="text-xs text-zinc-500 truncate">{item.details}</div>}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity || 1}</TableCell>
                    <TableCell className="text-right">£{(item.unit_price || item.amount || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">£{(item.total || item.amount || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal:</span>
                  <span>£{invoice.subtotal?.toFixed(2)}</span>
                </div>
                {invoice.commission > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Commission:</span>
                    <span>-£{invoice.commission?.toFixed(2)}</span>
                  </div>
                )}
                {invoice.tax > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>VAT ({invoice.tax_rate}%):</span>
                    <span>£{invoice.tax?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>£{invoice.total?.toFixed(2)}</span>
                </div>
                {invoice.profit_total != null && (
                  <div className={`flex justify-between font-medium ${invoice.profit_total >= 0 ? "text-green-600" : "text-red-600"}`}>
                    <span>Profit:</span>
                    <span>£{invoice.profit_total?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h4 className="font-semibold text-zinc-500 text-sm mb-2">NOTES</h4>
              <p className="text-sm bg-zinc-50 p-3 rounded">{invoice.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => onDownload(invoice.id)} className="bg-[#0A0F1C]">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Edit Invoice Dialog
const EditInvoiceDialog = ({ open, onClose, invoice, token, onSuccess }) => {
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (invoice) {
      setNotes(invoice.notes || "");
      setPaymentTerms(invoice.payment_terms || "Net 14");
      setTaxRate(invoice.tax_rate || 0);
    }
  }, [invoice]);

  const handleSave = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      const subtotal = invoice.subtotal || 0;
      const tax = subtotal * (taxRate / 100);
      const total = subtotal - (invoice.commission || 0) + tax;
      
      await axios.put(`${API}/invoices/${invoice.id}`, {
        notes,
        payment_terms: paymentTerms,
        tax_rate: taxRate,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100
      }, { headers });
      
      toast.success("Invoice updated");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update invoice");
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Invoice #{invoice.invoice_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Payment Terms</Label>
            <Select value={paymentTerms} onValueChange={setPaymentTerms}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Net 7">Net 7 Days</SelectItem>
                <SelectItem value="Net 14">Net 14 Days</SelectItem>
                <SelectItem value="Net 30">Net 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>VAT Rate (%)</Label>
            <Input 
              type="number" 
              value={taxRate} 
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-zinc-50 p-4 rounded-lg">
            <p className="text-sm">Subtotal: £{invoice.subtotal?.toFixed(2)}</p>
            {invoice.commission > 0 && <p className="text-sm text-zinc-600">Commission: -£{invoice.commission?.toFixed(2)}</p>}
            {taxRate > 0 && <p className="text-sm text-zinc-600">VAT ({taxRate}%): £{(invoice.subtotal * taxRate / 100).toFixed(2)}</p>}
            <p className="text-lg font-bold mt-2">
              New Total: £{(invoice.subtotal - (invoice.commission || 0) + (invoice.subtotal * taxRate / 100)).toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Amend Invoice Dialog
const AmendInvoiceDialog = ({ open, onClose, invoice, token, onSuccess }) => {
  const [lineItems, setLineItems] = useState([]);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (invoice && invoice.line_items) {
      setLineItems(invoice.line_items.map(item => ({...item})));
    }
  }, [invoice]);

  const updateLineItem = (index, field, value) => {
    const items = [...lineItems];
    items[index][field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      items[index].total = (items[index].quantity || 1) * (items[index].unit_price || items[index].amount || 0);
    }
    setLineItems(items);
  };

  const handleAmend = async () => {
    if (!invoice || !adjustmentReason) {
      toast.error("Please provide a reason for the amendment");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/invoices/${invoice.id}/amend`, {
        line_items: lineItems.length > 0 ? lineItems : null,
        adjustment_amount: adjustmentAmount || null,
        adjustment_reason: adjustmentReason,
        notes: null
      }, { headers });
      
      toast.success("Invoice amended successfully");
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to amend invoice");
    } finally {
      setLoading(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-purple-600" /> Amend Invoice #{invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2 text-yellow-600" />
            Amendments are tracked. The original invoice data will be preserved in amendment history.
          </div>

          {/* Line Items */}
          <div>
            <Label className="text-base font-semibold">Line Items</Label>
            <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-zinc-50 rounded text-sm">
                  <span className="w-20 font-mono">{item.booking_ref || `#${i+1}`}</span>
                  <Input 
                    value={item.description || ""} 
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    className="flex-1"
                    placeholder="Description"
                  />
                  <Input 
                    type="number"
                    value={item.unit_price || item.amount || 0} 
                    onChange={(e) => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-24"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Adjustment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Adjustment Amount (£)</Label>
              <Input 
                type="number" 
                value={adjustmentAmount} 
                onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              <p className="text-xs text-zinc-500 mt-1">Use negative for discounts</p>
            </div>
            <div>
              <Label>Reason for Amendment *</Label>
              <Textarea 
                value={adjustmentReason} 
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Explain the changes..."
                rows={2}
                data-testid="amendment-reason"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleAmend} 
            disabled={loading || !adjustmentReason}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="confirm-amend-invoice"
          >
            {loading ? "Amending..." : "Apply Amendment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicingStatements;
