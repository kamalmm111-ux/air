import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  Calendar as CalendarIcon, Users, MapPin, UserCheck, Check, Play, CheckCircle,
  AlertTriangle, Navigation, Copy, ExternalLink, Send, Loader2,
  User, Phone, Car, Plane, StickyNote, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const JobDetailDialog = ({ open, onClose, job, headers, onStatusChange, onAssign, getStatusBadge, drivers, vehicles, onRefresh }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  useEffect(() => {
    if (open && job) {
      fetchComments();
      fetchTracking();
    }
  }, [open, job]);

  // Auto-refresh tracking data every 10 seconds when active
  useEffect(() => {
    if (open && job && trackingData?.session?.status === "active") {
      const interval = setInterval(fetchTracking, 10000);
      return () => clearInterval(interval);
    }
  }, [open, job, trackingData?.session?.status]);
  
  const fetchComments = async () => {
    if (!job) return;
    setLoadingComments(true);
    try {
      const res = await axios.get(`${API}/bookings/${job.id}/comments`, { headers });
      setComments(res.data);
    } catch (e) {
      console.error("Error fetching comments:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const fetchTracking = async () => {
    if (!job) return;
    try {
      const res = await axios.get(`${API}/fleet/tracking/${job.id}`, { headers });
      setTrackingData(res.data);
    } catch (e) {
      setTrackingData(null);
    }
  };

  const generateTrackingLink = async () => {
    setTrackingLoading(true);
    try {
      await axios.post(`${API}/tracking/generate/${job.id}`, {}, { headers });
      toast.success("Tracking link generated!");
      fetchTracking();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate tracking link");
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyTrackingLink = () => {
    if (trackingData?.session?.token) {
      // Use production domain for tracking links
      const productionDomain = 'https://aircabio.com';
      const url = `${productionDomain}/driver-tracking/${trackingData.session.token}`;
      navigator.clipboard.writeText(url);
      toast.success("Tracking link copied!");
    }
  };

  const sendTrackingEmail = async () => {
    setTrackingLoading(true);
    try {
      await axios.post(`${API}/tracking/send-email/${job.id}`, {}, { headers });
      toast.success("Tracking link sent to driver!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send email");
    } finally {
      setTrackingLoading(false);
    }
  };
  
  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API}/bookings/${job.id}/comments`, { comment: newComment }, { headers });
      setNewComment("");
      fetchComments();
      toast.success("Comment added");
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };
  
  if (!job) return null;
  
  const needsAssignment = !job.assigned_driver_id || !job.assigned_vehicle_id;
  const hasDriver = job.assigned_driver_name || job.assigned_driver_id;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="job-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono bg-zinc-100 px-2 py-1 rounded">{job.booking_ref}</span>
            {getStatusBadge(job.status)}
            <span className="text-[#D4AF37] font-bold">£{job.price?.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="job-details-tab">Job Details</TabsTrigger>
            <TabsTrigger value="tracking" data-testid="job-tracking-tab">
              <Navigation className="w-3 h-3 mr-1" /> Tracking
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="job-comments-tab">
              Comments {comments.length > 0 && <Badge className="ml-1 bg-[#D4AF37]">{comments.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Passenger Info */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">PASSENGER</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="font-medium">{job.customer_name || job.passenger_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span>{job.customer_phone || job.passenger_phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>{job.passengers || job.passenger_count || 1} passengers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-zinc-400" />
                  <span>{job.vehicle_name || job.vehicle_category_id}</span>
                </div>
              </div>
            </div>
            
            {/* Trip Info */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">TRIP DETAILS</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#D4AF37] mt-1" />
                  <div>
                    <div className="font-medium">{job.pickup_date} at {job.pickup_time}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-green-500 mt-1" />
                  <div>
                    <div className="text-xs text-zinc-500">PICKUP</div>
                    <div>{job.pickup_location}</div>
                    {job.pickup_notes && <div className="text-sm text-zinc-500 mt-1">{job.pickup_notes}</div>}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-1" />
                  <div>
                    <div className="text-xs text-zinc-500">DROP-OFF</div>
                    <div>{job.dropoff_location}</div>
                    {job.dropoff_notes && <div className="text-sm text-zinc-500 mt-1">{job.dropoff_notes}</div>}
                  </div>
                </div>
                {job.flight_number && (
                  <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                    <Plane className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Flight: {job.flight_number}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Special Instructions */}
            {(job.special_instructions || job.admin_notes) && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h3 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-2">
                  <StickyNote className="w-4 h-4" /> SPECIAL INSTRUCTIONS
                </h3>
                <p className="text-sm">{job.special_instructions || job.admin_notes}</p>
              </div>
            )}
            
            {/* Assignment */}
            <div className="bg-zinc-50 p-4 rounded-lg">
              <h3 className="font-bold text-sm text-zinc-500 mb-2">ASSIGNMENT</h3>
              {job.assigned_driver_name ? (
                <div className="flex items-center gap-2 text-green-700">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">{job.assigned_driver_name}</span>
                  {job.assigned_vehicle_plate && <span className="font-mono bg-white px-2 py-0.5 rounded">({job.assigned_vehicle_plate})</span>}
                </div>
              ) : (
                <div className="text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Not assigned yet</span>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Tracking Tab */}
          <TabsContent value="tracking" className="mt-4">
            <div className="space-y-4">
              {!hasDriver ? (
                <div className="text-center py-8 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-bold text-amber-800 mb-1">No Driver Assigned</h3>
                  <p className="text-sm text-amber-700">Assign a driver to enable tracking.</p>
                </div>
              ) : !trackingData?.session ? (
                <div className="text-center py-8 bg-zinc-50 rounded-lg">
                  <Navigation className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                  <h3 className="font-bold text-zinc-700 mb-2">Tracking Not Started</h3>
                  <p className="text-sm text-zinc-500 mb-4">Generate a tracking link for driver <strong>{job.assigned_driver_name}</strong></p>
                  <Button onClick={generateTrackingLink} disabled={trackingLoading} className="bg-[#0A0F1C]" data-testid="generate-tracking-link-btn">
                    {trackingLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
                    Generate Tracking Link
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        trackingData.session.status === "active" ? "bg-green-500 animate-pulse" :
                        trackingData.session.status === "completed" ? "bg-blue-500" : "bg-amber-500"
                      }`} />
                      <div>
                        <p className="font-medium">{trackingData.session.driver_name}</p>
                        <p className="text-sm text-zinc-500">Status: <span className="font-medium capitalize">{trackingData.session.status}</span></p>
                      </div>
                    </div>
                    <Badge className={
                      trackingData.session.status === "active" ? "bg-green-100 text-green-800" :
                      trackingData.session.status === "completed" ? "bg-blue-100 text-blue-800" :
                      "bg-amber-100 text-amber-800"
                    }>
                      {trackingData.session.status === "active" ? "LIVE" : trackingData.session.status?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {/* Auto-refresh indicator */}
                  {trackingData.session.status === "active" && (
                    <div className="flex items-center justify-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Live tracking • Auto-refreshing every 10s
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={copyTrackingLink} data-testid="copy-link-btn">
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={sendTrackingEmail} disabled={trackingLoading} data-testid="email-link-btn">
                      {trackingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />} Email
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/driver-tracking/${trackingData.session.token}`, '_blank')} data-testid="open-link-btn">
                      <ExternalLink className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </div>
                  
                  {/* Live Map */}
                  {trackingData.latest_location && (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-sm text-green-800 mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Driver Location (Live)
                      </h4>
                      
                      {/* OpenStreetMap Embed */}
                      <div className="mb-3 rounded-lg overflow-hidden border border-green-300 h-40">
                        <iframe
                          title="Driver Location"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${trackingData.latest_location.longitude - 0.01}%2C${trackingData.latest_location.latitude - 0.01}%2C${trackingData.latest_location.longitude + 0.01}%2C${trackingData.latest_location.latitude + 0.01}&layer=mapnik&marker=${trackingData.latest_location.latitude}%2C${trackingData.latest_location.longitude}`}
                          style={{ border: 0 }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-zinc-500">Lat:</span> <span className="font-mono">{trackingData.latest_location.latitude?.toFixed(6)}</span></div>
                        <div><span className="text-zinc-500">Lng:</span> <span className="font-mono">{trackingData.latest_location.longitude?.toFixed(6)}</span></div>
                        {trackingData.latest_location.speed > 0 && (
                          <div><span className="text-zinc-500">Speed:</span> {trackingData.latest_location.speed?.toFixed(1)} km/h</div>
                        )}
                        <div><span className="text-zinc-500">Updated:</span> {trackingData.latest_location.timestamp?.slice(11, 19)}</div>
                      </div>
                      
                      <a 
                        href={`https://www.google.com/maps?q=${trackingData.latest_location.latitude},${trackingData.latest_location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mt-2"
                      >
                        <ExternalLink className="w-3 h-3" /> View in Google Maps
                      </a>
                    </div>
                  )}
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-zinc-50 p-2 rounded">
                      <p className="text-lg font-bold">{trackingData.total_locations || 0}</p>
                      <p className="text-xs text-zinc-500">Points</p>
                    </div>
                    <div className="bg-zinc-50 p-2 rounded">
                      <p className="text-xs font-medium">{trackingData.session.started_at?.slice(11, 16) || "—"}</p>
                      <p className="text-xs text-zinc-500">Started</p>
                    </div>
                    <div className="bg-zinc-50 p-2 rounded">
                      <p className="text-xs font-medium">{trackingData.session.ended_at?.slice(11, 16) || "—"}</p>
                      <p className="text-xs text-zinc-500">Ended</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="comments" className="mt-4">
            <div className="space-y-4">
              {/* Comments List */}
              <div className="max-h-60 overflow-y-auto space-y-3">
                {loadingComments ? (
                  <div className="text-center py-4 text-zinc-400">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet</p>
                  </div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className={`p-3 rounded-lg ${c.user_role === "super_admin" ? "bg-blue-50 border-l-4 border-blue-400" : "bg-zinc-50 border-l-4 border-zinc-300"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{c.user_name}</span>
                        <span className="text-xs text-zinc-400">{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>
              
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note or comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1"
                  data-testid="comment-input"
                />
                <Button onClick={addComment} disabled={!newComment.trim()} className="bg-[#0A0F1C]" data-testid="add-comment-btn">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 flex-wrap gap-2">
          {needsAssignment && job.status !== "completed" && job.status !== "cancelled" && (
            <Button onClick={onAssign} variant="outline" className="border-amber-400 text-amber-700" data-testid="assign-driver-vehicle-btn">
              <UserCheck className="w-4 h-4 mr-1" /> Assign Driver & Vehicle
            </Button>
          )}
          
          {job.status === "assigned" && (
            <Button onClick={() => onStatusChange(job.id, "accepted")} className="bg-green-600 hover:bg-green-700" data-testid="accept-job-dialog-btn">
              <Check className="w-4 h-4 mr-1" /> Accept Job
            </Button>
          )}
          {job.status === "accepted" && !needsAssignment && (
            <Button onClick={() => onStatusChange(job.id, "en_route")} className="bg-cyan-600 hover:bg-cyan-700" data-testid="start-trip-btn">
              <Play className="w-4 h-4 mr-1" /> Start Trip
            </Button>
          )}
          {job.status === "en_route" && (
            <Button onClick={() => onStatusChange(job.id, "arrived")} className="bg-teal-600 hover:bg-teal-700" data-testid="arrived-pickup-btn">Arrived at Pickup</Button>
          )}
          {job.status === "arrived" && (
            <Button onClick={() => onStatusChange(job.id, "in_progress")} className="bg-orange-600 hover:bg-orange-700" data-testid="start-journey-dialog-btn">Start Journey</Button>
          )}
          {job.status === "in_progress" && (
            <Button onClick={() => onStatusChange(job.id, "completed")} className="bg-green-600 hover:bg-green-700" data-testid="complete-job-dialog-btn">
              <CheckCircle className="w-4 h-4 mr-1" /> Complete Job
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailDialog;
