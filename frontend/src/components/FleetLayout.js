import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  Car, LayoutDashboard, CalendarDays, DollarSign, LogOut, ChevronLeft, Bell, Truck, FileText
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FleetLayout = () => {
  const { user, logout, isFleetAdmin, loading, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("jobs");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || !isFleetAdmin)) {
      navigate("/fleet/login");
    }
  }, [user, isFleetAdmin, loading, navigate]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token || !isFleetAdmin) return;
      try {
        const response = await axios.get(`${API}/fleet/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(response.data);
        setUnreadCount(response.data.filter(n => !n.read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token, isFleetAdmin]);

  const handleLogout = () => {
    logout();
    navigate("/fleet/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isFleetAdmin) {
    return null;
  }

  const sidebarItems = [
    { id: "jobs", name: "Jobs", icon: CalendarDays },
    { id: "earnings", name: "Earnings", icon: DollarSign },
    { id: "invoices", name: "Invoices", icon: FileText },
    { id: "vehicles", name: "My Vehicles", icon: Truck },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0F1C] text-white flex flex-col">
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
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 relative">
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
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-zinc-500">Fleet Admin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-zinc-400 hover:text-white"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Site
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-zinc-400 hover:text-white"
              onClick={handleLogout}
              data-testid="fleet-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ activeTab, setActiveTab, notifications }} />
      </main>
    </div>
  );
};

export default FleetLayout;
