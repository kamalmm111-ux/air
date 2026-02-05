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
  
  // Check for impersonation mode
  const isImpersonating = searchParams.get("impersonate") === "true" || sessionStorage.getItem("impersonation_token");
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
      
      window.location.href = "/admin?tab=fleets";
    } catch (error) {
      console.error("Exit impersonation error:", error);
      sessionStorage.clear();
      window.location.href = "/admin";
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

  const displayName = isImpersonating ? impersonationFleet.name : user?.name;

  const sidebarItems = [
    { id: "jobs", name: "Jobs", icon: CalendarDays },
    { id: "drivers", name: "My Drivers", icon: Users },
    { id: "vehicles", name: "My Vehicles", icon: Truck },
    { id: "earnings", name: "Earnings", icon: DollarSign },
    { id: "invoices", name: "Invoices", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Impersonation Banner at Top */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">
              Impersonation Mode: Viewing <strong>{impersonationFleet.name || "Fleet"}</strong> as Super Admin
            </span>
          </div>
          <Button 
            onClick={exitImpersonation}
            size="sm"
            className="bg-white text-amber-600 hover:bg-amber-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit Impersonation
          </Button>
        </div>
      )}
      
      {/* Sidebar */}
      <aside className={`w-64 bg-[#0A0F1C] text-white flex flex-col ${isImpersonating ? 'mt-12' : ''}`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/fleet/dashboard" className="flex items-center gap-2">
            <Car className="w-8 h-8 text-[#D4AF37]" />
            <span className="text-xl font-black" style={{ fontFamily: 'Chivo, sans-serif' }}>AIRCABIO</span>
          </Link>
          <p className="text-xs text-[#D4AF37] mt-1 font-medium">Fleet Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-3">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`fleet-nav-${item.id}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Notifications */}
        <div className="px-3 pb-4">
          <button 
            onClick={() => setShowNotifications(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 relative"
          >
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <span className="absolute right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center">
              <span className="text-sm font-bold text-[#0A0F1C]">
                {displayName?.charAt(0).toUpperCase() || "F"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{displayName || "Fleet"}</p>
              <p className="text-xs text-zinc-500">{isImpersonating ? "Impersonation" : "Fleet Admin"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isImpersonating && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-zinc-400 hover:text-white"
                onClick={() => navigate("/")}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Site
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={`${isImpersonating ? 'w-full' : 'flex-1'} text-zinc-400 hover:text-white`}
              onClick={handleLogout}
              data-testid="fleet-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-1" />
              {isImpersonating ? "Exit" : "Logout"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isImpersonating ? 'mt-12' : ''}`}>
        <Outlet context={{ activeTab, setActiveTab, notifications, isImpersonating, impersonationFleet }} />
      </main>
    </div>
  );
};

export default FleetLayout;
