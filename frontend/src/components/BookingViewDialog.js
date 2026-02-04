import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { 
  User, Phone, Mail, MapPin, Calendar, Clock, Car, Users, Plane, 
  DollarSign, UserCheck, Building2, FileText, Send, Edit, Trash2,
  History, StickyNote, AlertTriangle, CheckCircle, XCircle, Navigation,
  Download, Copy, ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_COLORS = {
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
  pending: "bg-yellow-100 text-yellow-800"
};

const PAYMENT_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-zinc-100 text-zinc-800"
};

export const BookingViewDialog = ({ open, onClose, booking, token, onRefresh }) => {
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (open && booking) {
      fetchNotes();
      fetchHistory();
      fetchTracking();
    }
  }, [open, booking]);

  const fetchNotes = async () => {
    if (!booking) return;
    try {
      const res = await axios.get(`${API}/admin/bookings/${booking.id}/notes`, { headers });
      setNotes(res.data);
    } catch (e) {
      console.error("Error fetching notes:", e);
    }
  };

  const fetchHistory = async () => {
    if (!booking) return;
    try {
      const res = await axios.get(`${API}/admin/bookings/${booking.id}/history`, { headers });
      setHistory(res.data);
    } catch (e) {
      console.error("Error fetching history:", e);
    }
  };

  const fetchTracking = async () => {
    if (!booking) return;
    try {
      const res = await axios.get(`${API}/admin/tracking/${booking.id}`, { headers });
      setTrackingData(res.data);
    } catch (e) {
      // No tracking session yet - that's OK
      setTrackingData(null);
    }
  };

  const generateTrackingLink = async () => {
    setTrackingLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/generate/${booking.id}`, {}, { headers });
      toast.success("Tracking link generated!");
      setTrackingData({
        session: {
          token: res.data.token,
          status: "pending",
          driver_name: res.data.driver_name || booking.assigned_driver_name
        }
      });
      // Refresh to get full tracking data
      fetchTracking();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate tracking link");
    } finally {
      setTrackingLoading(false);
    }
  };

  const sendTrackingEmail = async () => {
    setTrackingLoading(true);
    try {
      await axios.post(`${API}/tracking/send-email/${booking.id}`, {}, { headers });
      toast.success("Tracking link sent to driver via email!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send email");
    } finally {
      setTrackingLoading(false);
    }
  };

  const downloadTrackingReport = async () => {
    try {
      const response = await axios.get(`${API}/admin/tracking/${booking.id}/report`, {
        headers,
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tracking_report_${booking.booking_ref}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Tracking report downloaded");
    } catch (e) {
      toast.error("Failed to download report");
    }
  };

  const copyTrackingLink = () => {
    if (trackingData?.session?.token) {
      const url = `${window.location.origin}/driver-tracking/${trackingData.session.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Tracking link copied to clipboard!");
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      await axios.post(`${API}/admin/bookings/${booking.id}/notes`, { note: newNote }, { headers });
      setNewNote("");
      fetchNotes();
      fetchHistory();
      toast.success("Note added");
    } catch (e) {
      toast.error("Failed to add note");
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await axios.delete(`${API}/admin/bookings/${booking.id}/notes/${noteId}`, { headers });
      fetchNotes();
      toast.success("Note deleted");
    } catch (e) {
      toast.error("Failed to delete note");
    }
  };

  if (!booking) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case "created": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "status_changed": return <Clock className="w-4 h-4 text-blue-500" />;
      case "fleet_assigned": return <UserCheck className="w-4 h-4 text-purple-500" />;
      case "driver_price_updated": return <DollarSign className="w-4 h-4 text-amber-500" />;
      case "note_added": return <StickyNote className="w-4 h-4 text-zinc-500" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <History className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono bg-zinc-100 px-3 py-1 rounded text-lg">{booking.booking_ref}</span>
            <Badge className={STATUS_COLORS[booking.status] || "bg-zinc-100"}>
              {booking.status?.replace("_", " ")}
            </Badge>
            <Badge className={PAYMENT_COLORS[booking.payment_status] || "bg-zinc-100"}>
              {booking.payment_status || "pending"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="tracking">
              <Navigation className="w-3 h-3 mr-1" /> Tracking
            </TabsTrigger>
            <TabsTrigger value="notes">
              Notes {notes.length > 0 && <Badge className="ml-1 bg-[#D4AF37] text-white text-xs">{notes.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">
              History {history.length > 0 && <Badge className="ml-1 bg-zinc-500 text-white text-xs">{history.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* DETAILS TAB */}
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Customer Account */}
            {booking.customer_account_name && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-sm text-blue-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> CUSTOMER ACCOUNT (B2B)
                </h3>
                <p className="font-medium text-blue-900">{booking.customer_account_name}</p>
              </div>
            )}

            {/* Passenger Info */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">PASSENGER DETAILS</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <InfoRow icon={User} label="Name" value={booking.customer_name || booking.passenger_name || "N/A"} />
                <InfoRow icon={Phone} label="Phone" value={booking.customer_phone || booking.passenger_phone || "N/A"} />
                <InfoRow icon={Mail} label="Email" value={booking.customer_email || booking.passenger_email || "N/A"} />
                <InfoRow icon={Users} label="Passengers" value={booking.passengers || booking.passenger_count || 1} />
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">TRIP DETAILS</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500">DATE & TIME</p>
                    <p className="font-medium">{booking.pickup_date} at {booking.pickup_time}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500">PICKUP</p>
                    <p className="font-medium">{booking.pickup_location}</p>
                    {booking.pickup_notes && <p className="text-sm text-zinc-500 mt-1">{booking.pickup_notes}</p>}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500">DROP-OFF</p>
                    <p className="font-medium">{booking.dropoff_location}</p>
                    {booking.dropoff_notes && <p className="text-sm text-zinc-500 mt-1">{booking.dropoff_notes}</p>}
                  </div>
                </div>
                {booking.flight_number && (
                  <div className="flex items-center gap-3 bg-blue-50 p-2 rounded">
                    <Plane className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-zinc-500">FLIGHT NUMBER</p>
                      <p className="font-medium">{booking.flight_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">VEHICLE</h3>
              <div className="flex items-center gap-3">
                <Car className="w-5 h-5 text-zinc-600" />
                <span className="font-medium">{booking.vehicle_name || booking.vehicle_category_id}</span>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">PRICING</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-zinc-500">CUSTOMER PRICE</p>
                  <p className="text-xl font-bold text-[#0A0F1C]">£{(booking.customer_price || booking.price || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-zinc-500">DRIVER COST</p>
                  <p className="text-xl font-bold text-amber-600">£{(booking.driver_price || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-zinc-500">PROFIT</p>
                  <p className="text-xl font-bold text-green-600">£{(booking.profit || 0).toFixed(2)}</p>
                </div>
              </div>
              {booking.extras && booking.extras.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500 mb-2">EXTRAS</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.extras.map((extra, i) => (
                      <Badge key={i} variant="outline">{extra.name}: £{extra.price}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assignment */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">ASSIGNMENT</h3>
              {booking.assigned_fleet_name ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Fleet: {booking.assigned_fleet_name}</span>
                  </div>
                  {booking.assigned_driver_name && (
                    <div className="flex items-center gap-2 text-green-700">
                      <UserCheck className="w-4 h-4" />
                      <span>Driver: {booking.assigned_driver_name}</span>
                      {booking.assigned_vehicle_plate && (
                        <span className="font-mono bg-white px-2 py-0.5 rounded border">({booking.assigned_vehicle_plate})</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Not assigned to any fleet</span>
                </div>
              )}
            </div>

            {/* Admin Notes */}
            {booking.admin_notes && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" /> ADMIN NOTES
                </h3>
                <p className="text-sm">{booking.admin_notes}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-3">TIMESTAMPS</h3>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div><span className="text-zinc-500">Created:</span> {formatDate(booking.created_at)}</div>
                {booking.assigned_at && <div><span className="text-zinc-500">Assigned:</span> {formatDate(booking.assigned_at)}</div>}
                {booking.accepted_at && <div><span className="text-zinc-500">Accepted:</span> {formatDate(booking.accepted_at)}</div>}
                {booking.completed_at && <div><span className="text-zinc-500">Completed:</span> {formatDate(booking.completed_at)}</div>}
              </div>
            </div>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="mt-4">
            <div className="space-y-4">
              {/* Add Note */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add internal note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={addNote} disabled={loading || !newNote.trim()} className="bg-[#0A0F1C]">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No internal notes yet</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-zinc-50 p-3 rounded-lg border-l-4 border-[#D4AF37]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{note.user_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">{formatDate(note.created_at)}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)} className="h-6 w-6 p-0 text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history" className="mt-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No history yet</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                    <div className="mt-0.5">{getActionIcon(entry.action)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{entry.description}</p>
                      {entry.old_value && entry.new_value && (
                        <p className="text-xs text-zinc-500 mt-1">
                          <span className="line-through text-red-500">{entry.old_value}</span>
                          {" → "}
                          <span className="text-green-600">{entry.new_value}</span>
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 mt-1">
                        {entry.user_name} • {formatDate(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <Icon className="w-4 h-4 text-zinc-400" />
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  </div>
);

export default BookingViewDialog;
