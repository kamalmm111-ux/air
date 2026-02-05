import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { 
  MapPin, Navigation, Clock, User, Car, Play, Square, 
  AlertTriangle, CheckCircle, Loader2, Phone, Map, Navigation2,
  ArrowRight, CircleDot, Flag
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Status flow for driver
const STATUS_FLOW = [
  { id: "en_route", label: "En Route to Pickup", icon: Navigation2, color: "bg-cyan-500" },
  { id: "arrived", label: "Arrived at Pickup", icon: MapPin, color: "bg-teal-500" },
  { id: "in_progress", label: "Journey Started", icon: Play, color: "bg-orange-500" },
  { id: "completed", label: "Completed", icon: Flag, color: "bg-green-500" },
];

const DriverTrackingPage = () => {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("en_route");
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch tracking session
  const fetchSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tracking/session/${token}`);
      setSession(res.data);
      setLocationCount(res.data.location_count || 0);
      setCurrentStatus(res.data.booking?.status || "en_route");
      
      // If session is already active, resume tracking
      if (res.data.status === "active") {
        setTracking(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid tracking link");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Send location to server
  const sendLocation = useCallback(async (position) => {
    if (!token) return;
    
    try {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed ? position.coords.speed * 3.6 : null, // Convert m/s to km/h
        heading: position.coords.heading,
        timestamp: new Date().toISOString()
      };
      
      setLocation(locationData);
      
      await axios.post(`${API}/tracking/location/${token}`, locationData);
      setLocationCount(prev => prev + 1);
    } catch (err) {
      console.error("Failed to send location:", err);
    }
  }, [token]);

  // Start tracking
  const startTracking = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    try {
      // Request permission and start tracking
      await axios.post(`${API}/tracking/control/${token}?action=start`);
      setTracking(true);
      toast.success("Tracking started");

      // Get current position immediately
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocation(position);
        },
        (err) => {
          console.error("Geolocation error:", err);
          toast.error("Could not get your location. Please enable GPS.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Set up interval for sending location every 10 seconds
      intervalRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            sendLocation(position);
          },
          (err) => {
            console.error("Geolocation error:", err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }, 10000); // 10 seconds

      // Also use watchPosition for continuous updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed ? position.coords.speed * 3.6 : null,
            heading: position.coords.heading
          });
        },
        (err) => {
          console.error("Watch error:", err);
        },
        { enableHighAccuracy: true, maximumAge: 5000 }
      );

    } catch (err) {
      toast.error("Failed to start tracking");
      console.error(err);
    }
  };

  // Stop tracking
  const stopTracking = async () => {
    try {
      await axios.post(`${API}/tracking/control/${token}?action=stop`);
      setTracking(false);
      toast.success("Tracking stopped");

      // Clear watch and interval
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Refresh session to get final status
      fetchSession();
    } catch (err) {
      toast.error("Failed to stop tracking");
      console.error(err);
    }
  };

  // Update job status
  const updateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await axios.post(`${API}/tracking/update-status/${token}`, { status: newStatus });
      setCurrentStatus(newStatus);
      toast.success(`Status updated to: ${STATUS_FLOW.find(s => s.id === newStatus)?.label}`);
      
      // If completed, stop tracking
      if (newStatus === "completed") {
        stopTracking();
      }
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Get next status in flow
  const getNextStatus = () => {
    const currentIndex = STATUS_FLOW.findIndex(s => s.id === currentStatus);
    if (currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-zinc-600">Loading tracking session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-800 mb-2">Invalid Tracking Link</h2>
            <p className="text-zinc-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = session?.status === "completed" || currentStatus === "completed";
  const nextStatus = getNextStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-zinc-900 pb-20">
      {/* Header */}
      <div className="bg-[#0A0F1C] text-white py-4 px-4 border-b border-zinc-800 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-[#D4AF37]" />
            <span className="font-bold text-lg">Driver Tracking</span>
          </div>
          <Badge 
            className={
              isCompleted ? "bg-green-500" : 
              tracking ? "bg-green-500 animate-pulse" : 
              "bg-zinc-600"
            }
          >
            {isCompleted ? "Completed" : tracking ? "LIVE" : "Ready"}
          </Badge>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Driver Info Card */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-[#D4AF37]" />
              {session?.driver_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-600">
                Booking: <span className="font-bold text-zinc-800">{session?.booking?.ref}</span>
              </div>
              <Badge className={
                currentStatus === "en_route" ? "bg-cyan-100 text-cyan-800" :
                currentStatus === "arrived" ? "bg-teal-100 text-teal-800" :
                currentStatus === "in_progress" ? "bg-orange-100 text-orange-800" :
                "bg-green-100 text-green-800"
              }>
                {STATUS_FLOW.find(s => s.id === currentStatus)?.label || currentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Route Card with Pickup & Dropoff */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Trip Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pickup */}
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <CircleDot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-green-700">PICKUP LOCATION</p>
                <p className="font-medium text-zinc-800 mt-1">{session?.booking?.pickup_location}</p>
                {location && currentStatus === "en_route" && (
                  <p className="text-sm text-green-600 mt-1 font-medium">
                    ~ Heading to pickup
                  </p>
                )}
              </div>
            </div>
            
            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-zinc-300 rotate-90" />
            </div>
            
            {/* Dropoff */}
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <Flag className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-red-700">DROP-OFF LOCATION</p>
                <p className="font-medium text-zinc-800 mt-1">{session?.booking?.dropoff_location}</p>
              </div>
            </div>
            
            {/* Date/Time & Customer */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-zinc-500 text-xs">Pickup Time</p>
                  <p className="font-medium">{session?.booking?.pickup_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-zinc-400" />
                <div>
                  <p className="text-zinc-500 text-xs">Customer</p>
                  <p className="font-medium">{session?.booking?.customer_name}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Progress Card */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-[#D4AF37]" />
              Journey Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Status Steps */}
            <div className="flex items-center justify-between mb-4">
              {STATUS_FLOW.map((status, index) => {
                const StatusIcon = status.icon;
                const isActive = currentStatus === status.id;
                const isPast = STATUS_FLOW.findIndex(s => s.id === currentStatus) > index;
                
                return (
                  <div key={status.id} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive ? status.color : isPast ? 'bg-green-500' : 'bg-zinc-200'
                    }`}>
                      {isPast ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <StatusIcon className={`w-5 h-5 ${isActive || isPast ? 'text-white' : 'text-zinc-400'}`} />
                      )}
                    </div>
                    <p className={`text-xs mt-1 text-center max-w-[60px] ${isActive ? 'font-bold text-zinc-800' : 'text-zinc-400'}`}>
                      {status.label.split(' ')[0]}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Next Status Button */}
            {!isCompleted && nextStatus && tracking && (
              <Button 
                onClick={() => updateStatus(nextStatus.id)}
                disabled={statusUpdating}
                className={`w-full h-12 text-lg ${nextStatus.color} hover:opacity-90`}
              >
                {statusUpdating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <nextStatus.icon className="w-5 h-5 mr-2" />
                )}
                {nextStatus.label}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Tracking Control Card */}
        <Card className={`${tracking ? 'bg-green-50 border-green-200' : isCompleted ? 'bg-zinc-50' : 'bg-white'}`}>
          <CardContent className="pt-6">
            {isCompleted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-800 mb-2">Journey Completed</h3>
                <p className="text-zinc-600">Thank you! This trip has been completed successfully.</p>
                <p className="text-sm text-zinc-500 mt-2">{locationCount} location points recorded</p>
              </div>
            ) : tracking ? (
              <div className="text-center py-4">
                <div className="relative inline-block mb-4">
                  <Navigation className="w-16 h-16 text-green-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Tracking Active</h3>
                <p className="text-green-700 mb-4">Location updating every 10 seconds</p>
                
                {location && (
                  <div className="bg-white rounded-lg p-4 mb-4 text-left">
                    <p className="text-xs text-zinc-500 mb-1">Current Location</p>
                    <p className="font-mono text-sm">
                      {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                    </p>
                    {location.speed !== null && location.speed > 0 && (
                      <p className="text-sm text-zinc-600 mt-1">
                        Speed: {location.speed?.toFixed(1)} km/h
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Accuracy: ±{location.accuracy?.toFixed(0)}m • Updates: {locationCount}
                    </p>
                  </div>
                )}

                <Button 
                  onClick={stopTracking} 
                  className="w-full bg-red-600 hover:bg-red-700 h-14 text-lg"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Tracking
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <Map className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-800 mb-2">Ready to Start</h3>
                <p className="text-zinc-600 mb-6">
                  Tap the button below when you start driving to enable live location tracking.
                </p>
                <Button 
                  onClick={startTracking} 
                  className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Tracking
                </Button>
                <p className="text-xs text-zinc-500 mt-4">
                  Your location will be shared with dispatch for this trip only.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Links */}
        {!isCompleted && (
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="pt-4 space-y-2">
              {currentStatus === "en_route" || currentStatus === "arrived" ? (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(session?.booking?.pickup_location || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-50 hover:bg-green-100 rounded-lg text-green-700 font-medium transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                  Navigate to Pickup
                </a>
              ) : (
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(session?.booking?.dropoff_location || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 hover:bg-red-100 rounded-lg text-red-700 font-medium transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                  Navigate to Drop-off
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0F1C] text-white py-3 px-4 text-center text-xs">
        <p className="text-zinc-400">Powered by Aircabio • Secure Location Sharing</p>
      </div>
    </div>
  );
};

export default DriverTrackingPage;
