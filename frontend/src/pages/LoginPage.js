import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Car, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      toast.success("Welcome back!");
      
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center py-12 px-4" data-testid="login-page">
      <Card className="w-full max-w-md border-zinc-200">
        <CardHeader className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
            <Car className="w-8 h-8 text-[#0A0F1C]" />
            <span className="text-2xl font-black text-[#0A0F1C]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              AIRCABIO
            </span>
          </Link>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to manage your bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-12"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#0A0F1C] hover:bg-[#0A0F1C]/90"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-zinc-500">Don't have an account? </span>
            <Link to="/register" className="text-[#0A0F1C] font-medium hover:underline" data-testid="register-link">
              Create Account
            </Link>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-zinc-100 rounded-sm">
            <p className="text-xs text-zinc-500 mb-2">Demo Admin Credentials:</p>
            <p className="text-sm font-mono">admin@aircabio.com / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
