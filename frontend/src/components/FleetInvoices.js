import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { 
  FileText, Download, Eye, DollarSign, Clock, CheckCircle, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const FleetInvoices = ({ token, fleetId }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, totalAmount: 0 });

  const headers = { Authorization: `Bearer ${token}` };

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/invoices`, { headers });
      const data = res.data || [];
      setInvoices(data);
      
      // Calculate stats
      setStats({
        total: data.length,
        pending: data.filter(i => ["pending_approval", "approved", "issued"].includes(i.status)).length,
        paid: data.filter(i => i.status === "paid").length,
        totalAmount: data.reduce((sum, i) => sum + (i.total || 0), 0)
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

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-zinc-100 text-zinc-800",
      pending_approval: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      issued: "bg-indigo-100 text-indigo-800",
      paid: "bg-green-100 text-green-800"
    };
    const labels = {
      draft: "Draft",
      pending_approval: "Pending Review",
      approved: "Approved",
      issued: "Awaiting Payment",
      paid: "Paid"
    };
    return <Badge className={styles[status] || "bg-zinc-100"}>{labels[status] || status}</Badge>;
  };

  const downloadPdf = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/pdf`, {
        headers,
        responseType: 'blob'
      });
      
      // Create blob and download
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
      console.error("Download error:", error);
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500">Total Earnings</p>
                <p className="text-2xl font-bold text-[#D4AF37]">£{stats.totalAmount.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-[#D4AF37] opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800">Automatic Invoice Generation</p>
            <p className="text-sm text-blue-700">
              Invoices are automatically generated every 15 days (1st and 16th of each month) for all completed jobs. 
              They require approval from the admin before being issued for payment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Your Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Jobs</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Net Payout</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                  <TableCell>
                    {invoice.period_start ? (
                      <span className="text-sm">
                        {invoice.period_start} → {invoice.period_end}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-500">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>{invoice.booking_ids?.length || 0}</TableCell>
                  <TableCell className="text-right">£{invoice.subtotal?.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-zinc-500">
                    {invoice.commission > 0 ? `-£${invoice.commission?.toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    £{invoice.total?.toFixed(2)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{invoice.due_date?.slice(0, 10)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-[#D4AF37]" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => downloadPdf(invoice.id)}
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-zinc-500">
                    No invoices yet. Invoices will be generated automatically for completed jobs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={() => { setViewDialogOpen(false); setSelectedInvoice(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                  Invoice #{selectedInvoice.invoice_number}
                  <span className="ml-2">{getStatusBadge(selectedInvoice.status)}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Period Info */}
                <div className="grid grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-zinc-500">Invoice Date</p>
                    <p className="font-medium">{selectedInvoice.created_at?.slice(0, 10)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Due Date</p>
                    <p className="font-medium">{selectedInvoice.due_date?.slice(0, 10)}</p>
                  </div>
                  {selectedInvoice.period_start && (
                    <>
                      <div>
                        <p className="text-sm text-zinc-500">Period Start</p>
                        <p className="font-medium">{selectedInvoice.period_start}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Period End</p>
                        <p className="font-medium">{selectedInvoice.period_end}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Line Items */}
                <div>
                  <h4 className="font-semibold mb-2">Jobs Included ({selectedInvoice.line_items?.length || 0})</h4>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.line_items?.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{item.booking_ref}</TableCell>
                            <TableCell className="whitespace-nowrap">{item.date}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{item.description}</TableCell>
                            <TableCell>{item.customer_name}</TableCell>
                            <TableCell className="text-right font-medium">£{item.amount?.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Gross Total:</span>
                        <span>£{selectedInvoice.subtotal?.toFixed(2)}</span>
                      </div>
                      {selectedInvoice.commission > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Commission ({selectedInvoice.commission_type === "percentage" ? `${selectedInvoice.commission_value}%` : "flat"}):</span>
                          <span>-£{selectedInvoice.commission?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold text-green-600 border-t pt-2">
                        <span>Net Payout:</span>
                        <span>£{selectedInvoice.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedInvoice.notes && (
                  <div className="bg-zinc-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm text-zinc-500 mb-1">Notes</h4>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}

                {/* Status Messages */}
                {selectedInvoice.status === "pending_approval" && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-800">Awaiting Admin Approval</p>
                      <p className="text-sm text-yellow-700">This invoice is currently under review. You will be notified once it is approved.</p>
                    </div>
                  </div>
                )}
                {selectedInvoice.status === "issued" && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800">Payment Due</p>
                      <p className="text-sm text-blue-700">Payment is due by {selectedInvoice.due_date?.slice(0, 10)}. Please contact admin for payment details.</p>
                    </div>
                  </div>
                )}
                {selectedInvoice.status === "paid" && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Payment Received</p>
                      <p className="text-sm text-green-700">
                        This invoice has been paid{selectedInvoice.paid_date ? ` on ${selectedInvoice.paid_date.slice(0, 10)}` : ""}.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
                <Button onClick={() => downloadPdf(selectedInvoice.id)} className="bg-[#0A0F1C]">
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetInvoices;
