import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { 
  FileText, Plus, Download, Eye, Edit, Check, X, Search, 
  Calendar, DollarSign, Users, Building2, Truck, Clock,
  AlertTriangle, CheckCircle, Send, Trash2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const InvoiceManager = ({ token }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    issued: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    totalProfit: 0
  });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/invoices`, { headers });
      const data = res.data || [];
      setInvoices(data);
      
      // Calculate stats
      const now = new Date();
      setStats({
        total: data.length,
        draft: data.filter(i => i.status === "draft").length,
        pending: data.filter(i => i.status === "pending_approval").length,
        issued: data.filter(i => i.status === "issued" || i.status === "approved").length,
        paid: data.filter(i => i.status === "paid").length,
        overdue: data.filter(i => i.status === "issued" && new Date(i.due_date) < now).length,
        totalAmount: data.reduce((sum, i) => sum + (i.total || 0), 0),
        totalProfit: data.filter(i => i.invoice_type === "customer").reduce((sum, i) => sum + (i.profit_total || 0), 0)
      });
    } catch (error) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = searchTerm === "" || 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.entity_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesType = typeFilter === "all" || inv.invoice_type === typeFilter;
    const matchesTab = activeTab === "all" || inv.invoice_type === activeTab;
    return matchesSearch && matchesStatus && matchesType && matchesTab;
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
      driver: "bg-orange-100 text-orange-800"
    };
    return <Badge className={styles[type] || "bg-zinc-100"}>{type}</Badge>;
  };

  const handleAutoGenerate = async () => {
    try {
      const res = await axios.post(`${API}/invoices/auto-generate-fleet`, {}, { headers });
      toast.success(res.data.message);
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to auto-generate invoices");
    }
  };

  const handleApprove = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/approve`, {}, { headers });
      toast.success("Invoice approved");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve invoice");
    }
  };

  const handleIssue = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/issue`, {}, { headers });
      toast.success("Invoice issued");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to issue invoice");
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await axios.post(`${API}/invoices/${invoiceId}/mark-paid`, {}, { headers });
      toast.success("Invoice marked as paid");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to mark invoice as paid");
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await axios.delete(`${API}/invoices/${invoiceId}`, { headers });
      toast.success("Invoice deleted");
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete invoice");
    }
  };

  const downloadPdf = (invoiceId) => {
    window.open(`${API}/invoices/${invoiceId}/pdf?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard title="Total Invoices" value={stats.total} icon={FileText} color="text-zinc-600" />
        <StatCard title="Draft" value={stats.draft} icon={Edit} color="text-zinc-500" />
        <StatCard title="Pending Approval" value={stats.pending} icon={Clock} color="text-yellow-600" />
        <StatCard title="Issued" value={stats.issued} icon={Send} color="text-blue-600" />
        <StatCard title="Paid" value={stats.paid} icon={CheckCircle} color="text-green-600" />
        <StatCard title="Total Amount" value={`£${stats.totalAmount.toFixed(0)}`} icon={DollarSign} color="text-[#D4AF37]" />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-[#0A0F1C]">
            <Plus className="w-4 h-4 mr-2" /> Create Invoice
          </Button>
          <Button variant="outline" onClick={handleAutoGenerate}>
            <RefreshCw className="w-4 h-4 mr-2" /> Auto-Generate Fleet Invoices
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({invoices.length})</TabsTrigger>
          <TabsTrigger value="customer">Customer ({invoices.filter(i => i.invoice_type === "customer").length})</TabsTrigger>
          <TabsTrigger value="fleet">Fleet ({invoices.filter(i => i.invoice_type === "fleet").length})</TabsTrigger>
          <TabsTrigger value="driver">Driver ({invoices.filter(i => i.invoice_type === "driver").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
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
                    />
                  </div>
                </div>
                <div className="w-[150px]">
                  <Label className="text-xs text-zinc-500">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
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
                <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
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
                          <div className="text-xs">
                            {invoice.period_start} → {invoice.period_end}
                          </div>
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-[#D4AF37]" />
                          </Button>
                          {invoice.status === "draft" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { setSelectedInvoice(invoice); setEditDialogOpen(true); }}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.status === "pending_approval" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleApprove(invoice.id)}
                              title="Approve"
                              className="text-green-600"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {(invoice.status === "draft" || invoice.status === "approved") && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleIssue(invoice.id)}
                              title="Issue"
                              className="text-blue-600"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.status === "issued" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleMarkPaid(invoice.id)}
                              title="Mark Paid"
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => downloadPdf(invoice.id)}
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {invoice.status === "draft" && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(invoice.id)}
                              title="Delete"
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-zinc-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        token={token}
        onSuccess={fetchInvoices}
      />

      {/* View Invoice Dialog */}
      <ViewInvoiceDialog
        open={viewDialogOpen}
        onClose={() => { setViewDialogOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        token={token}
        onDownload={downloadPdf}
      />

      {/* Edit Invoice Dialog */}
      <EditInvoiceDialog
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        token={token}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};

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

// Create Invoice Dialog
const CreateInvoiceDialog = ({ open, onClose, token, onSuccess }) => {
  const [invoiceType, setInvoiceType] = useState("customer");
  const [entityId, setEntityId] = useState("");
  const [bookings, setBookings] = useState([]);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [entities, setEntities] = useState([]);
  const [taxRate, setTaxRate] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("Net 14");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

  useEffect(() => {
    if (open) {
      fetchEntities();
    }
  }, [open, invoiceType]);

  useEffect(() => {
    if (entityId) {
      fetchUninvoicedBookings();
    }
  }, [entityId, invoiceType]);

  const fetchEntities = async () => {
    try {
      let endpoint = "";
      if (invoiceType === "customer") {
        // For customers, we'll get unique customers from completed bookings
        const res = await axios.get(`${API_URL}/invoices/uninvoiced-bookings?invoice_type=customer`, { headers });
        const uniqueCustomers = [];
        const seen = new Set();
        res.data.forEach(b => {
          const key = b.customer_email || b.customer_name;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCustomers.push({
              id: b.customer_email || b.id,
              name: b.customer_name,
              email: b.customer_email
            });
          }
        });
        setEntities(uniqueCustomers);
      } else if (invoiceType === "fleet") {
        const res = await axios.get(`${API_URL}/fleets`, { headers });
        setEntities(res.data.filter(f => f.status === "active"));
      } else if (invoiceType === "driver") {
        const res = await axios.get(`${API_URL}/drivers`, { headers });
        setEntities(res.data.filter(d => d.status === "active" && !d.fleet_id));
      }
    } catch (error) {
      console.error("Error fetching entities:", error);
    }
  };

  const fetchUninvoicedBookings = async () => {
    try {
      let url = `${API_URL}/invoices/uninvoiced-bookings?invoice_type=${invoiceType}`;
      if (invoiceType === "fleet" || invoiceType === "driver") {
        url += `&entity_id=${entityId}`;
      }
      const res = await axios.get(url, { headers });
      
      // For customer type, filter by customer email/name
      let filtered = res.data;
      if (invoiceType === "customer") {
        filtered = res.data.filter(b => (b.customer_email || b.customer_name) === entityId);
      }
      setBookings(filtered);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const toggleBooking = (bookingId) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const selectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map(b => b.id));
    }
  };

  const calculateTotals = () => {
    const selected = bookings.filter(b => selectedBookings.includes(b.id));
    const subtotal = selected.reduce((sum, b) => 
      sum + (invoiceType === "customer" ? (b.customer_price || b.price || 0) : (b.driver_price || 0)), 0
    );
    const tax = subtotal * (taxRate / 100);
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleCreate = async () => {
    if (!entityId || selectedBookings.length === 0) {
      toast.error("Please select an entity and at least one booking");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/invoices/generate`, {
        invoice_type: invoiceType,
        entity_id: entityId,
        booking_ids: selectedBookings,
        tax_rate: taxRate,
        payment_terms: paymentTerms,
        notes: notes
      }, { headers });
      
      toast.success("Invoice created successfully!");
      onClose();
      onSuccess();
      // Reset form
      setEntityId("");
      setSelectedBookings([]);
      setNotes("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create New Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invoice Type */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Invoice Type</Label>
              <Select value={invoiceType} onValueChange={(v) => { setInvoiceType(v); setEntityId(""); setSelectedBookings([]); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer Invoice</SelectItem>
                  <SelectItem value="fleet">Fleet Payout</SelectItem>
                  <SelectItem value="driver">Driver Payout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{invoiceType === "customer" ? "Customer" : invoiceType === "fleet" ? "Fleet" : "Driver"}</Label>
              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${invoiceType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.email && `(${e.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {/* Bookings Selection */}
          {entityId && (
            <>
              <div className="flex justify-between items-center">
                <Label>Select Completed Jobs ({bookings.length} available)</Label>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  {selectedBookings.length === bookings.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Ref</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">
                        {invoiceType === "customer" ? "Price" : "Payout"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map(booking => (
                      <TableRow 
                        key={booking.id} 
                        className={selectedBookings.includes(booking.id) ? "bg-blue-50" : ""}
                        onClick={() => toggleBooking(booking.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <TableCell>
                          <Checkbox checked={selectedBookings.includes(booking.id)} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{booking.booking_ref}</TableCell>
                        <TableCell className="whitespace-nowrap">{booking.pickup_date}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {booking.pickup_location} → {booking.dropoff_location}
                        </TableCell>
                        <TableCell>{booking.customer_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          £{(invoiceType === "customer" ? (booking.customer_price || booking.price || 0) : (booking.driver_price || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {bookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-zinc-500">
                          No uninvoiced bookings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Totals */}
          {selectedBookings.length > 0 && (
            <Card className="bg-zinc-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>VAT Rate (%)</Label>
                    <Input 
                      type="number" 
                      value={taxRate} 
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm">Subtotal: <strong>£{totals.subtotal.toFixed(2)}</strong></p>
                    {taxRate > 0 && <p className="text-sm">VAT ({taxRate}%): <strong>£{totals.tax.toFixed(2)}</strong></p>}
                    <p className="text-lg font-bold">Total: £{totals.total.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div>
            <Label>Notes (Optional)</Label>
            <Textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes to appear on the invoice..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading || selectedBookings.length === 0}
            className="bg-[#0A0F1C]"
          >
            {loading ? "Creating..." : `Create Invoice (${selectedBookings.length} jobs)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-zinc-500 text-sm mb-2">BILL TO</h4>
              <p className="font-medium">{invoice.entity_name}</p>
              <p className="text-sm text-zinc-600">{invoice.entity_email}</p>
              {invoice.entity_phone && <p className="text-sm text-zinc-600">{invoice.entity_phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm"><span className="text-zinc-500">Invoice Date:</span> {invoice.created_at?.slice(0, 10)}</p>
              <p className="text-sm"><span className="text-zinc-500">Due Date:</span> {invoice.due_date?.slice(0, 10)}</p>
              <p className="text-sm"><span className="text-zinc-500">Payment Terms:</span> {invoice.payment_terms}</p>
              {invoice.period_start && (
                <p className="text-sm"><span className="text-zinc-500">Period:</span> {invoice.period_start} → {invoice.period_end}</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h4 className="font-semibold text-zinc-500 text-sm mb-2">LINE ITEMS</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {invoice.invoice_type === "customer" && invoice.line_items?.[0]?.profit !== undefined && (
                    <TableHead className="text-right">Profit</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs">{item.booking_ref}</TableCell>
                    <TableCell className="whitespace-nowrap">{item.date}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{item.description}</TableCell>
                    <TableCell className="text-right">£{item.amount?.toFixed(2)}</TableCell>
                    {invoice.invoice_type === "customer" && item.profit !== undefined && (
                      <TableCell className={`text-right ${item.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        £{item.profit?.toFixed(2)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal:</span>
                  <span>£{invoice.subtotal?.toFixed(2)}</span>
                </div>
                {invoice.commission > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>Commission ({invoice.commission_type === "percentage" ? `${invoice.commission_value}%` : "flat"}):</span>
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
                {invoice.profit_total !== null && invoice.profit_total !== undefined && (
                  <div className={`flex justify-between font-medium ${invoice.profit_total >= 0 ? "text-green-600" : "text-red-600"}`}>
                    <span>Total Profit:</span>
                    <span>£{invoice.profit_total?.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
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

export default InvoiceManager;
