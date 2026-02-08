import { Outlet, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import {
  Car, LayoutDashboard, CalendarDays, DollarSign, LogOut, ChevronLeft, Bell, Truck, FileText, AlertTriangle, Users, X, Check
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetLayout = () => {
  const { user, logout, isFleetAdmin, loading, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("jobs");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Check for impersonation mode - SIMPLE CHECK
  const isImpersonating = searchParams.get("impersonate") === "true" || !!sessionStorage.getItem("impersonation_token");
  const impersonationToken = sessionStorage.getItem("impersonation_token");
  const impersonationFleet = JSON.parse(sessionStorage.getItem("impersonation_fleet") || "{}");
  const impersonationId = sessionStorage.getItem("impersonation_id");
  
  // Use impersonation token if available
  const effectiveToken = isImpersonating ? impersonationToken : token;
  const isAuthenticated = isImpersonating ? !!impersonationToken : isFleetAdmin;

  useEffect(() => {
    // Only redirect if not loading and not authenticated AND not impersonating
    if (!loading && !isFleetAdmin && !isImpersonating) {
      navigate("/fleet/login");
    }
  }, [user, isFleetAdmin, loading, navigate, isImpersonating]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!effectiveToken) return;
      try {
        const response = await axios.get(`${API}/fleet/notifications`, {
          headers: { Authorization: `Bearer ${effectiveToken}` }
        });
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [effectiveToken, isAuthenticated]);

  const handleLogout = () => {
    if (isImpersonating) {
      exitImpersonation();
    } else {
      logout();
      navigate("/fleet/login");
    }
  };

  const exitImpersonation = async () => {
    try {
      // Log the exit
      if (impersonationId) {
        const adminToken = sessionStorage.getItem("admin_token");
        await axios.post(
          `${API}/admin/impersonation/${impersonationId}/exit`,
          {},
          { headers: { Authorization: `Bearer ${adminToken}` } }
        ).catch(() => {});
      }
      
      // Clear impersonation data
      sessionStorage.removeItem("impersonation_token");
      sessionStorage.removeItem("impersonation_fleet");
      sessionStorage.removeItem("impersonation_id");
      sessionStorage.removeItem("admin_token");
      
      // Redirect back to admin
      window.location.href = "/admin";
    } catch (error) {
      console.error("Error exiting impersonation:", error);
      window.location.href = "/admin";
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.patch(
        `${API}/fleet/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const acceptJob = async (notificationId, bookingId) => {
    try {
      await axios.post(
        `${API}/fleet/jobs/${bookingId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      markNotificationRead(notificationId);
      setShowNotifications(false);
      window.location.reload();
    } catch (error) {
      console.error("Error accepting job:", error);
    }
  };

  const declineJob = async (notificationId, bookingId) => {
    try {
      await axios.post(
        `${API}/fleet/jobs/${bookingId}/decline`,
        {},
        { headers: { Authorization: `Bearer ${effectiveToken}` } }
      );
      markNotificationRead(notificationId);
    } catch (error) {
      console.error("Error declining job:", error);
    }
  };

  if (loading && !isImpersonating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const fleetName = isImpersonating ? impersonationFleet.name : user?.fleet_name || "Fleet Portal";

  const sidebarItems = [
    { id: "jobs", name: "Jobs", icon: CalendarDays },
    { id: "drivers", name: "My Drivers", icon: Users },
    { id: "vehicles", name: "My Vehicles", icon: Truck },
    { id: "earnings", name: "Earnings", icon: DollarSign },
    { id: "invoices", name: "Invoices", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-900">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              Impersonation Mode: Viewing {impersonationFleet.name || "Fleet"} as Super Admin
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/20 hover:bg-white/30 border-black/30"
            onClick={exitImpersonation}
          >
            Exit to Admin Panel
          </Button>
        </div>
      )}
      
      {/* Sidebar */}
      <div className={`w-64 bg-[#0A0F1C] flex flex-col ${isImpersonating ? "pt-12" : ""}`}>
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-2">
            <Car className="w-8 h-8 text-[#D4AF37]" />
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Fleet Portal
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? "bg-[#D4AF37] text-[#0A0F1C]"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Fleet Info */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <Car className="w-5 h-5 text-[#0A0F1C]" />
            </div>
            <div>
              <p className="text-white font-medium text-sm truncate max-w-[140px]">
                {fleetName}
                {isImpersonating && <span className="text-amber-400 ml-1">(Impersonation)</span>}
              </p>
              <p className="text-zinc-500 text-xs">
                {isImpersonating ? "Super Admin View" : "Fleet Admin"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-zinc-700 text-zinc-400 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isImpersonating ? "Exit" : "Logout"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${isImpersonating ? "pt-12" : ""}`}>
        {/* Header */}
        <header className="bg-[#0A0F1C] border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to Website
              </Button>
            </div>
            
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-96 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-50">
                  <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
                    <h3 className="font-medium text-white">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotifications(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-zinc-700 ${!notification.read ? 'bg-zinc-700/50' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{notification.title}</p>
                              <p className="text-zinc-400 text-xs mt-1">{notification.message}</p>
                              {notification.booking_ref && (
                                <p className="text-[#D4AF37] text-xs mt-1">Ref: {notification.booking_ref}</p>
                              )}
                            </div>
                            {notification.type === "new_job" && !notification.read && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 h-8 px-2"
                                  onClick={() => acceptJob(notification.id, notification.booking_id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-600 text-red-400 hover:bg-red-600/20 h-8 px-2"
                                  onClick={() => declineJob(notification.id, notification.booking_id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-zinc-500 text-xs mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-zinc-900 overflow-y-auto">
          <Outlet context={{ activeTab, setActiveTab, effectiveToken, isImpersonating, impersonationFleet }} />
        </main>
      </div>
    </div>
  );
};

export default FleetLayout;
