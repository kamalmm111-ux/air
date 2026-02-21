import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Car, LayoutDashboard, CalendarDays, DollarSign, Settings, LogOut, ChevronLeft, Users, Route, Truck, Building2, FileText, MapPin, Briefcase, Key, Cog, BarChart3
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminLayout = () => {
  const { user, logout, isSuperAdmin, loading, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      navigate("/login");
    }
  }, [user, isSuperAdmin, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setChangingPassword(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: passwords.current,
        new_password: passwords.new
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success("Password changed successfully!");
      setPasswordDialogOpen(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
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
    { id: "customers", name: "Customers (B2B)", icon: Briefcase },
    { id: "fleets", name: "Fleets", icon: Building2 },
    { id: "drivers", name: "Drivers", icon: Users },
    { id: "vehicles", name: "Vehicles", icon: Truck },
    { id: "pricing", name: "Pricing", icon: DollarSign },
    { id: "invoices", name: "Invoices", icon: FileText },
    { id: "crm-reports", name: "CRM & Reports", icon: BarChart3 },
    { id: "system-settings", name: "System Settings", icon: Cog },
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
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-zinc-400 hover:text-white"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>
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
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ activeTab, setActiveTab }} />
      </main>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" /> Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Current Password</Label>
              <Input 
                type="password" 
                value={passwords.current} 
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                placeholder="Enter current password"
              />
            </div>
            <div>
              <Label>New Password</Label>
              <Input 
                type="password" 
                value={passwords.new} 
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input 
                type="password" 
                value={passwords.confirm} 
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="bg-[#0A0F1C]">
              {changingPassword ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLayout;
