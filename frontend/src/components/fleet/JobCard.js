import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { 
  Calendar as CalendarIcon, Users, MapPin, UserCheck, Check, Eye, Play, CheckCircle,
  AlertTriangle, Navigation, Copy, ExternalLink, Send, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status colors
const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  unassigned: "bg-yellow-100 text-yellow-800 border-yellow-200",
  assigned: "bg-purple-100 text-purple-800 border-purple-200",
  accepted: "bg-indigo-100 text-indigo-800 border-indigo-200",
  en_route: "bg-cyan-100 text-cyan-800 border-cyan-200",
  arrived: "bg-teal-100 text-teal-800 border-teal-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  no_show: "bg-red-100 text-red-800 border-red-200"
};

const JobCard = ({ job, onView, onAccept, onAssign, onStatusChange, getStatusBadge, token, onRefresh }) => {
  const needsAssignment = !job.assigned_driver_id || !job.assigned_vehicle_id;
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingLink, setTrackingLink] = useState(job.tracking_token || null);
  
  const headers = { Authorization: `Bearer ${token}` };
  
  // Generate tracking link
  const generateTrackingLink = async () => {
    setTrackingLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/generate/${job.id}`, {}, { headers });
      setTrackingLink(res.data.token);
      toast.success("Tracking link generated!");
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to generate tracking link");
    } finally {
      setTrackingLoading(false);
    }
  };
  
  // Copy tracking link to clipboard
  const copyTrackingLink = () => {
    // Use production domain for tracking links
    const productionDomain = 'https://aircabio.com';
    const url = `${productionDomain}/driver-tracking/${trackingLink}`;
    navigator.clipboard.writeText(url);
    toast.success("Tracking link copied!");
  };
  
  // Send tracking link via email
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
  
  const hasDriver = job.assigned_driver_name || job.assigned_driver_id;
  const showTrackingActions = hasDriver && ["assigned", "accepted", "en_route", "arrived", "in_progress"].includes(job.status);
  
  return (
    <Card 
      data-testid={`job-card-${job.id}`}
      className="hover:shadow-md transition-shadow border-l-4" 
      style={{ borderLeftColor: job.status === "assigned" ? "#9333ea" : job.status === "completed" ? "#22c55e" : "#D4AF37" }}
    >
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm bg-zinc-100 px-2 py-1 rounded font-bold">{job.booking_ref || job.id.slice(0, 8).toUpperCase()}</span>
              {getStatusBadge(job.status)}
              <span className="text-lg font-bold text-[#D4AF37]">£{job.price?.toFixed(2)}</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-start gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{job.pickup_date} at {job.pickup_time}</span>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{job.passengers || job.passenger_count || 1} passengers • {job.vehicle_name || job.vehicle_category_id}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-600 truncate">{job.pickup_location}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-600 truncate">{job.dropoff_location}</span>
              </div>
            </div>
            
            {/* Assignment Info */}
            {job.assigned_driver_name && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-2 py-1 rounded w-fit">
                <UserCheck className="w-4 h-4" />
                <span>{job.assigned_driver_name}</span>
                {job.assigned_vehicle_plate && <span className="font-mono">({job.assigned_vehicle_plate})</span>}
              </div>
            )}
            
            {/* Tracking Link Section - Shows when driver is assigned */}
            {showTrackingActions && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <Navigation className="w-4 h-4 text-blue-600" />
                {trackingLink ? (
                  <>
                    <span className="text-xs text-blue-700 font-medium">Tracking Ready</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={copyTrackingLink}
                      className="h-7 px-2 text-blue-700 hover:bg-blue-100"
                      data-testid="copy-tracking-btn"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={sendTrackingEmail}
                      disabled={trackingLoading}
                      className="h-7 px-2 text-blue-700 hover:bg-blue-100"
                      data-testid="email-tracking-btn"
                    >
                      {trackingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                      Email
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.open(`/driver-tracking/${trackingLink}`, '_blank')}
                      className="h-7 px-2 text-blue-700 hover:bg-blue-100"
                      data-testid="open-tracking-btn"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" /> Open
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-blue-700">Driver assigned - </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={generateTrackingLink}
                      disabled={trackingLoading}
                      className="h-7 px-2 text-blue-700 hover:bg-blue-100"
                      data-testid="generate-tracking-btn"
                    >
                      {trackingLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Navigation className="w-3 h-3 mr-1" />}
                      Generate Tracking Link
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onView} className="flex-1 md:flex-none" data-testid="view-job-btn">
              <Eye className="w-4 h-4 mr-1" /> Details
            </Button>
            
            {job.status === "assigned" && (
              <>
                <Button onClick={onAccept} size="sm" className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none" data-testid="accept-job-btn">
                  <Check className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button variant="outline" size="sm" onClick={onAssign} className="flex-1 md:flex-none" data-testid="assign-job-btn">
                  <UserCheck className="w-4 h-4 mr-1" /> Assign
                </Button>
              </>
            )}
            
            {job.status === "accepted" && (
              <>
                {needsAssignment && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded text-center">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Assign driver & vehicle
                  </div>
                )}
                {!needsAssignment ? (
                  <Button onClick={() => onStatusChange(job.id, "en_route")} size="sm" className="bg-cyan-600 hover:bg-cyan-700" data-testid="start-job-btn">
                    <Play className="w-4 h-4 mr-1" /> Start
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={onAssign} className="border-amber-400 text-amber-700" data-testid="assign-driver-btn">
                    <UserCheck className="w-4 h-4 mr-1" /> Assign
                  </Button>
                )}
              </>
            )}
            
            {job.status === "en_route" && (
              <Button onClick={() => onStatusChange(job.id, "arrived")} size="sm" className="bg-teal-600 hover:bg-teal-700" data-testid="arrived-btn">Arrived</Button>
            )}
            {job.status === "arrived" && (
              <Button onClick={() => onStatusChange(job.id, "in_progress")} size="sm" className="bg-orange-600 hover:bg-orange-700" data-testid="start-journey-btn">Start Journey</Button>
            )}
            {job.status === "in_progress" && (
              <Button onClick={() => onStatusChange(job.id, "completed")} size="sm" className="bg-green-600 hover:bg-green-700" data-testid="complete-job-btn">
                <CheckCircle className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { JobCard, STATUS_COLORS };
export default JobCard;
