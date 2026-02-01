import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  Car, LayoutDashboard, CalendarDays, DollarSign, Settings, LogOut, ChevronLeft, Users, Route, Truck, Building2, FileText, MapPin
} from "lucide-react";
import { useEffect, useState } from "react";

const AdminLayout = () => {
  const { user, logout, isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate("/login");
    }
  }, [user, isSuperAdmin, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A0F1C]"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const sidebarItems = [
    { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", name: "Jobs / Bookings", icon: CalendarDays },
    { id: "fleets", name: "Fleets", icon: Building2 },
    { id: "drivers", name: "Drivers", icon: Users },
    { id: "vehicles", name: "Vehicles", icon: Truck },
    { id: "pricing", name: "Pricing", icon: DollarSign },
    { id: "invoices", name: "Invoices", icon: FileText },
    { id: "settings", name: "Website CMS", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A0F1C] text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-2">
            <Car className="w-8 h-8" />
            <span className="text-xl font-black" style={{ fontFamily: 'Chivo, sans-serif' }}>AIRCABIO</span>
          </Link>
          <p className="text-xs text-zinc-500 mt-1">Super Admin</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {sidebarItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                  data-testid={`admin-nav-${item.id}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

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
              <p className="text-xs text-zinc-500">{user?.email}</p>
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
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ activeTab, setActiveTab }} />
      </main>
    </div>
  );
};

export default AdminLayout;
