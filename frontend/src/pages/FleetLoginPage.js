import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Car, Mail, Lock, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

const FleetLoginPage = () => {
  const navigate = useNavigate();
  const { fleetLogin } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fleetLogin(formData.email, formData.password);
      toast.success("Welcome to Fleet Dashboard!");
      navigate("/fleet/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center py-12 px-4" data-testid="fleet-login-page">
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Car className="w-8 h-8 text-[#D4AF37]" />
            <span className="text-2xl font-black text-white" style={{ fontFamily: 'Chivo, sans-serif' }}>
              AIRCABIO
            </span>
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-[#D4AF37]" />
            <CardTitle className="text-xl font-bold text-white">Fleet Portal</CardTitle>
          </div>
          <CardDescription className="text-zinc-400">Sign in to manage your fleet operations</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="fleet@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                  data-testid="fleet-login-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  required
                  data-testid="fleet-login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0A0F1C] font-bold"
              data-testid="fleet-login-submit"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In to Fleet Portal"
              )}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-zinc-800 rounded-sm">
            <p className="text-xs text-zinc-500 mb-2">Demo Fleet Credentials:</p>
            <p className="text-sm font-mono text-zinc-300">fleet1@aircabio.com / fleet123</p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-zinc-400 hover:text-white">
              ← Back to Main Site
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FleetLoginPage;
