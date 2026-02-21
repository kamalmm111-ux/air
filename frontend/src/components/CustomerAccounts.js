import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Building2, Plus, Edit, Trash2, Search, Eye, Phone, Mail, MapPin, FileText, MailCheck, MailX } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomerAccounts = ({ token }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, statusFilter]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const res = await axios.get(`${API}/admin/customers?${params}`, { headers });
      setCustomers(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (customerId) => {
    if (!window.confirm("Delete this customer account? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/admin/customers/${customerId}`, { headers });
      toast.success("Customer deleted");
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete customer");
    }
  };

  const openEdit = (customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const openView = (customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const openCreate = () => {
    setEditingCustomer(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F1C]">Customer Accounts</h2>
          <p className="text-zinc-500">Manage B2B corporate customer accounts</p>
        </div>
        <Button onClick={openCreate} className="bg-[#0A0F1C]">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search by company, contact, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={customers.length} />
        <StatCard title="Active" value={customers.filter(c => c.status === "active").length} color="text-green-600" />
        <StatCard title="Inactive" value={customers.filter(c => c.status === "inactive").length} color="text-zinc-500" />
        <StatCard title="Suspended" value={customers.filter(c => c.status === "suspended").length} color="text-red-600" />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-600">No customer accounts</h3>
              <p className="text-zinc-400 mb-4">Create your first B2B customer account</p>
              <Button onClick={openCreate} className="bg-[#0A0F1C]">
                <Plus className="w-4 h-4 mr-2" /> Add Customer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.company_name}</TableCell>
                    <TableCell>{customer.contact_person}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.payment_terms || "-"}</TableCell>
                    <TableCell>
                      <Badge className={
                        customer.status === "active" ? "bg-green-100 text-green-800" :
                        customer.status === "suspended" ? "bg-red-100 text-red-800" :
                        "bg-zinc-100 text-zinc-800"
                      }>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(customer)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(customer)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteCustomer(customer.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CustomerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customer={editingCustomer}
        token={token}
        onSuccess={fetchCustomers}
      />

      {/* View Dialog */}
      <CustomerViewDialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        customer={selectedCustomer}
      />
    </div>
  );
};

const StatCard = ({ title, value, color = "text-[#0A0F1C]" }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-zinc-500">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </CardContent>
  </Card>
);

const CustomerDialog = ({ open, onClose, customer, token, onSuccess }) => {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    billing_address: "",
    notes: "",
    payment_terms: "",
    credit_limit: "",
    send_invoice_email: true,
    accounts_email: "",
    status: "active"
  });
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (customer) {
      setFormData({
        company_name: customer.company_name || "",
        contact_person: customer.contact_person || "",
        email: customer.email || "",
        phone: customer.phone || "",
        billing_address: customer.billing_address || "",
        notes: customer.notes || "",
        payment_terms: customer.payment_terms || "",
        credit_limit: customer.credit_limit || "",
        send_invoice_email: customer.send_invoice_email !== false,
        accounts_email: customer.accounts_email || "",
        status: customer.status || "active"
      });
    } else {
      setFormData({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        billing_address: "",
        notes: "",
        payment_terms: "",
        credit_limit: "",
        send_invoice_email: true,
        accounts_email: "",
        status: "active"
      });
    }
  }, [customer, open]);

  const handleSubmit = async () => {
    if (!formData.company_name || !formData.contact_person || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null
      };

      if (customer) {
        await axios.put(`${API}/admin/customers/${customer.id}`, data, { headers });
        toast.success("Customer updated");
      } else {
        await axios.post(`${API}/admin/customers`, data, { headers });
        toast.success("Customer created");
      }
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{customer ? "Edit Customer Account" : "Create Customer Account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label>Company Name *</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="ABC Corporation"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Contact Person *</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="bookings@company.com"
            />
          </div>
          <div>
            <Label>Billing Address</Label>
            <Textarea
              value={formData.billing_address}
              onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
              placeholder="123 Business Park, London EC1"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={(v) => setFormData({ ...formData, payment_terms: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="On Booking">On Booking</SelectItem>
                  <SelectItem value="Net 7">Net 7</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Limit (£)</Label>
              <Input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                placeholder="5000"
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes about this customer..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#0A0F1C]">
            {loading ? "Saving..." : (customer ? "Update" : "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomerViewDialog = ({ open, onClose, customer }) => {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {customer.company_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Contact Person</p>
                <p className="font-medium">{customer.contact_person}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-500">Phone</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="font-medium">{customer.email}</p>
            </div>
          </div>
          {customer.billing_address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-zinc-400 mt-1" />
              <div>
                <p className="text-xs text-zinc-500">Billing Address</p>
                <p className="font-medium">{customer.billing_address}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-xs text-zinc-500">Payment Terms</p>
              <p className="font-medium">{customer.payment_terms || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Credit Limit</p>
              <p className="font-medium">{customer.credit_limit ? `£${customer.credit_limit.toLocaleString()}` : "-"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <Badge className={
              customer.status === "active" ? "bg-green-100 text-green-800" :
              customer.status === "suspended" ? "bg-red-100 text-red-800" :
              "bg-zinc-100 text-zinc-800"
            }>
              {customer.status}
            </Badge>
          </div>
          {customer.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-zinc-500 mb-1">Notes</p>
              <p className="text-sm bg-zinc-50 p-2 rounded">{customer.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerAccounts;
