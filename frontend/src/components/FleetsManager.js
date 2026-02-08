import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Building2, Edit, Plus, Search, Eye, LogIn, Key, AlertTriangle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetsManager = ({ token, onViewFleet }) => {
  const navigate = useNavigate();
  const [fleets, setFleets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [fleetToSuspend, setFleetToSuspend] = useState(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [fleetToReset, setFleetToReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  
  const headers = { Authorization: `Bearer ${token}` };

  const fetchFleets = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/fleets`, { headers });
      setFleets(response.data || []);
    } catch (error) {
      console.error("Error fetching fleets:", error);
      toast.error("Failed to load fleets");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const filteredFleets = fleets.filter(fleet => {
    const matchesSearch = !searchTerm || 
      fleet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fleet.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fleet.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fleet.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || fleet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveFleet = async () => {
    try {
      if (editingFleet?.id) {
        await axios.put(`${API}/fleets/${editingFleet.id}`, editingFleet, { headers });
        toast.success("Fleet updated successfully");
      } else {
        await axios.post(`${API}/fleets`, editingFleet, { headers });
        toast.success("Fleet created successfully");
      }
      setDialogOpen(false);
      setEditingFleet(null);
      fetchFleets();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save fleet");
    }
  };

  const handleSuspendFleet = async () => {
    if (!fleetToSuspend) return;
    try {
      const newStatus = fleetToSuspend.status === "suspended" ? "active" : "suspended";
      await axios.put(`${API}/fleets/${fleetToSuspend.id}`, { status: newStatus }, { headers });
      toast.success(`Fleet ${newStatus === "suspended" ? "suspended" : "reactivated"} successfully`);
      setSuspendDialogOpen(false);
      setFleetToSuspend(null);
      fetchFleets();
    } catch (error) {
      toast.error("Failed to update fleet status");
    }
  };

  const handleResetPassword = async () => {
    if (!fleetToReset || !newPassword) return;
    try {
      await axios.post(`${API}/fleets/${fleetToReset.id}/reset-password`, { password: newPassword }, { headers });
      toast.success("Password reset successfully");
      setResetPasswordDialogOpen(false);
      setFleetToReset(null);
      setNewPassword("");
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const handleLoginAsFleet = async (fleetId) => {
    try {
      const response = await axios.post(`${API}/admin/fleets/${fleetId}/impersonate`, {}, { headers });
      const fleetToken = response.data.access_token;
      const fleetData = response.data.fleet;
      const impersonationId = response.data.impersonation_id;
      
      // Store impersonation data in sessionStorage for the new window
      // We need to encode this in the URL since sessionStorage doesn't work across windows
      const impersonationData = encodeURIComponent(JSON.stringify({
        token: fleetToken,
        fleet: fleetData,
        impersonation_id: impersonationId,
        admin_token: token
      }));
      
      // Open fleet dashboard with impersonation data
      window.open(`/fleet/dashboard?impersonate=true&data=${impersonationData}`, "_blank");
    } catch (error) {
      console.error("Impersonation error:", error);
      toast.error(error.response?.data?.detail || "Failed to login as fleet");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fleets-manager">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="text-xl font-bold">Fleet Partners</h2>
          <Badge variant="outline" className="ml-2">{fleets.length} Total</Badge>
        </div>
        <Button
          onClick={() => {
            setEditingFleet({ 
              status: "active", 
              commission_type: "percentage", 
              commission_value: 15,
              payment_terms: "weekly"
            });
            setDialogOpen(true);
          }}
          className="bg-[#0A0F1C]"
          data-testid="add-fleet-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Fleet
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-zinc-500">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search by name, email, contact, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="fleet-search-input"
                />
              </div>
            </div>
            <div className="w-[160px]">
              <Label className="text-xs text-zinc-500">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="fleet-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Fleets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFleets.map((fleet) => (
                <TableRow key={fleet.id}>
                  <TableCell>
                    <div className="font-medium">{fleet.name}</div>
                    <div className="text-xs text-zinc-500">{fleet.email}</div>
                  </TableCell>
                  <TableCell>
                    <div>{fleet.contact_person}</div>
                    <div className="text-xs text-zinc-500">{fleet.phone}</div>
                  </TableCell>
                  <TableCell>{fleet.city}</TableCell>
                  <TableCell>
                    {fleet.commission_type === "percentage" ? `${fleet.commission_value}%` : `£${fleet.commission_value}`}
                  </TableCell>
                  <TableCell className="capitalize">{fleet.payment_terms}</TableCell>
                  <TableCell>
                    <Badge className={
                      fleet.status === "active" ? "bg-green-100 text-green-800" : 
                      fleet.status === "suspended" ? "bg-red-100 text-red-800" :
                      "bg-zinc-100 text-zinc-800"
                    }>
                      {fleet.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onViewFleet?.(fleet)} title="View Details">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingFleet({ ...fleet }); setDialogOpen(true); }} title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleLoginAsFleet(fleet.id)} title="Login As">
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setFleetToReset(fleet); setResetPasswordDialogOpen(true); }} title="Reset Password">
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setFleetToSuspend(fleet); setSuspendDialogOpen(true); }}
                        className={fleet.status === "suspended" ? "text-green-600" : "text-red-600"}
                        title={fleet.status === "suspended" ? "Reactivate" : "Suspend"}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredFleets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                    {searchTerm || statusFilter !== "all"
                      ? "No fleets match your search criteria"
                      : "No fleet partners added yet"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fleet Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFleet?.id ? "Edit Fleet Partner" : "Add Fleet Partner"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fleet Name *</Label>
                <Input
                  value={editingFleet?.name || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, name: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person *</Label>
                <Input
                  value={editingFleet?.contact_person || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, contact_person: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editingFleet?.email || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, email: e.target.value })}
                  placeholder="fleet@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={editingFleet?.phone || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, phone: e.target.value })}
                  placeholder="+44 7xxx xxx xxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={editingFleet?.city || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, city: e.target.value })}
                  placeholder="London"
                />
              </div>
              <div className="space-y-2">
                <Label>Operating Area</Label>
                <Input
                  value={editingFleet?.operating_area || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, operating_area: e.target.value })}
                  placeholder="Greater London"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Commission Type</Label>
                <Select
                  value={editingFleet?.commission_type || "percentage"}
                  onValueChange={(value) => setEditingFleet({ ...editingFleet, commission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Commission Value</Label>
                <Input
                  type="number"
                  value={editingFleet?.commission_value || 15}
                  onChange={(e) => setEditingFleet({ ...editingFleet, commission_value: parseFloat(e.target.value) || 0 })}
                  placeholder={editingFleet?.commission_type === "percentage" ? "15" : "10.00"}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select
                  value={editingFleet?.payment_terms || "weekly"}
                  onValueChange={(value) => setEditingFleet({ ...editingFleet, payment_terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingFleet?.id && (
              <div className="space-y-2">
                <Label>Initial Password *</Label>
                <Input
                  type="password"
                  value={editingFleet?.password || ""}
                  onChange={(e) => setEditingFleet({ ...editingFleet, password: e.target.value })}
                  placeholder="Set fleet login password"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editingFleet?.notes || ""}
                onChange={(e) => setEditingFleet({ ...editingFleet, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingFleet(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveFleet} className="bg-[#0A0F1C]">
              {editingFleet?.id ? "Update Fleet" : "Add Fleet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {fleetToSuspend?.status === "suspended" ? "Reactivate Fleet" : "Suspend Fleet"}
            </DialogTitle>
            <DialogDescription>
              {fleetToSuspend?.status === "suspended" 
                ? `Are you sure you want to reactivate ${fleetToSuspend?.name}?`
                : `Are you sure you want to suspend ${fleetToSuspend?.name}? They will no longer be able to receive jobs.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSuspendFleet}
              className={fleetToSuspend?.status === "suspended" ? "bg-green-600" : "bg-red-600"}
            >
              {fleetToSuspend?.status === "suspended" ? "Reactivate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {fleetToReset?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetPasswordDialogOpen(false); setNewPassword(""); }}>Cancel</Button>
            <Button onClick={handleResetPassword} className="bg-[#0A0F1C]" disabled={!newPassword}>
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FleetsManager;
