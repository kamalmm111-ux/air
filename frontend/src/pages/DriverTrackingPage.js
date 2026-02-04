import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { 
  MapPin, Navigation, Clock, User, Car, Play, Square, 
  AlertTriangle, CheckCircle, Loader2, Phone, Map
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DriverTrackingPage = () => {
  const { token } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  // Fetch tracking session
  const fetchSession = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tracking/session/${token}`);
      setSession(res.data);
      setLocationCount(res.data.location_count || 0);
      
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

  const isCompleted = session?.status === "completed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A0F1C] to-zinc-900">
      {/* Header */}
      <div className="bg-[#0A0F1C] text-white py-4 px-4 border-b border-zinc-800">
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
            <div className="text-sm text-zinc-600">
              Booking: <span className="font-bold text-zinc-800">{session?.booking?.ref}</span>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details Card */}
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="text-xs text-zinc-500">PICKUP</p>
                <p className="font-medium text-zinc-800">{session?.booking?.pickup_location}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
              <div>
                <p className="text-xs text-zinc-500">DROP-OFF</p>
                <p className="font-medium text-zinc-800">{session?.booking?.dropoff_location}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-sm">{session?.booking?.pickup_date} at {session?.booking?.pickup_time}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-zinc-400" />
              <span>Customer: {session?.booking?.customer_name}</span>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Status Card */}
        <Card className={`${tracking ? 'bg-green-50 border-green-200' : isCompleted ? 'bg-zinc-50' : 'bg-white'}`}>
          <CardContent className="pt-6">
            {isCompleted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-800 mb-2">Tracking Completed</h3>
                <p className="text-zinc-600">Thank you! This trip's tracking has been recorded.</p>
                <p className="text-sm text-zinc-500 mt-2">{locationCount} location points recorded</p>
              </div>
            ) : tracking ? (
              <div className="text-center py-4">
                <div className="relative inline-block mb-4">
                  <Navigation className="w-16 h-16 text-green-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">Tracking Active</h3>
                <p className="text-green-700 mb-4">Your location is being shared every 10 seconds</p>
                
                {location && (
                  <div className="bg-white rounded-lg p-4 mb-4 text-left">
                    <p className="text-xs text-zinc-500 mb-1">Current Location</p>
                    <p className="font-mono text-sm">
                      {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                    </p>
                    {location.speed !== null && (
                      <p className="text-sm text-zinc-600 mt-1">
                        Speed: {location.speed?.toFixed(1)} km/h
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1">
                      Accuracy: ±{location.accuracy?.toFixed(0)}m • Points: {locationCount}
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

        {/* Open in Maps */}
        {session?.booking?.pickup_location && !isCompleted && (
          <Card className="bg-white/95 backdrop-blur">
            <CardContent className="pt-4">
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(session.booking.pickup_location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 font-medium transition-colors"
              >
                <Navigation className="w-5 h-5" />
                Navigate to Pickup
              </a>
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
